/**
 * End-to-end smoke test for auth.
 *
 * Walks: / → /login (no users yet) → /welcome → signup → /
 *   → logout → /login → login (with wrong creds) → login (good) → / → logout.
 *
 * Run with: node tests/smoke-auth.mjs
 *
 * The test resets the DB (deletes every user + every session) before
 * running so it's idempotent. Make sure the dev server is running.
 */
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// Use the project's Prisma client directly to reset state.
// The generated client is at src/generated/prisma (its package.json
// exports "./client" → "./index.js"). We require it as a package
// so the exports field resolves correctly. Path matches the app's
// own dbFilePath() (prisma/dev.db relative to project root) so
// tests and the dev server see the same file.
const require = createRequire(import.meta.url);
const generated = require(
  join(process.cwd(), "src/generated/prisma/client"),
);
const { PrismaClient } = generated;
const { PrismaBetterSqlite3 } = require(
  join(process.cwd(), "node_modules/@prisma/adapter-better-sqlite3"),
);
const path = require("node:path");
const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const prisma = new PrismaClient({ adapter });

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const COOKIE_JAR = join(process.cwd(), "tests", ".cookies.json");

function loadJar() {
  if (existsSync(COOKIE_JAR)) {
    try {
      return JSON.parse(readFileSync(COOKIE_JAR, "utf8"));
    } catch {}
  }
  return {};
}

function saveJar(jar) {
  writeFileSync(COOKIE_JAR, JSON.stringify(jar, null, 2));
}

function applyCookies(headers, jar) {
  const cookies = Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookies) headers.set("cookie", cookies);
}

function captureSetCookies(headers, jar) {
  const list = headers.getSetCookie?.() ?? [];
  for (const sc of list) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    if (!k) continue;
    const v = rest.join("=").replace(/^"|"$/g, "");
    if (v === "" || /Expires=.*1970/i.test(sc)) {
      delete jar[k];
    } else {
      jar[k] = v;
    }
  }
}

async function step(label, fn) {
  process.stdout.write(`▸ ${label} ... `);
  try {
    const result = await fn();
    console.log("ok");
    return result;
  } catch (err) {
    console.log("FAIL");
    console.error(err);
    process.exit(1);
  }
}

async function get(path, jar, { redirect = "manual" } = {}) {
  const headers = new Headers();
  applyCookies(headers, jar);
  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers,
    redirect,
  });
  captureSetCookies(res.headers, jar);
  return res;
}

async function postForm(path, jar, fields, { actionId, kind = "bound" } = {}) {
  const headers = new Headers();
  applyCookies(headers, jar);
  const form = new FormData();
  if (actionId) {
    if (kind === "bound") {
      // Form has bound args: $ACTION_REF_1, $ACTION_1:0, $ACTION_1:1
      form.append("$ACTION_REF_1", "");
      form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
      form.append("$ACTION_1:1", "[\"$undefined\"]");
    } else {
      // Unbound form: hidden input is named $ACTION_ID_<hex>
      form.append(`$ACTION_ID_${actionId}`, "");
    }
  }
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
  });
  captureSetCookies(res.headers, jar);
  return res;
}

function extractAction(html) {
  // Server-action ids appear in two shapes depending on whether the
  // action has bound args (e.g. signup/login via useActionState) or
  // not (e.g. logout, plain form action):
  //   1. Bound: hidden input with `value` containing JSON `"id":"<hex>"`
  //   2. Unbound: hidden input whose NAME is `$ACTION_ID_<hex>`
  // Returns { id, kind: "bound" | "unbound" } so the caller can build
  // the matching multipart payload.
  const raw = html.match(/"id":"([a-f0-9]{20,})"/);
  if (raw) return { id: raw[1], kind: "bound" };
  const encoded = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (encoded) return { id: encoded[1], kind: "bound" };
  const literal = html.match(/\$ACTION_ID_([a-f0-9]{20,})/);
  if (literal) return { id: literal[1], kind: "unbound" };
  throw new Error("No server-action id found in HTML");
}

function extractActionId(html) {
  return extractAction(html).id;
}

async function main() {
  // Reset DB to a known state.
  await step("reset DB", async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const count = await prisma.user.count();
    if (count !== 0) throw new Error(`expected 0 users, got ${count}`);
  });

  if (existsSync(COOKIE_JAR)) unlinkSync(COOKIE_JAR);
  const jar = {};

  await step("unauth / redirects to /login", async () => {
    const r = await get("/", jar);
    if (r.status !== 307) throw new Error(`expected 307, got ${r.status}`);
    if (r.headers.get("location") !== "/login")
      throw new Error(`expected /login, got ${r.headers.get("location")}`);
  });

  await step("/login redirects to /welcome (no users)", async () => {
    const r = await get("/login", jar);
    if (r.status !== 307) throw new Error(`expected 307, got ${r.status}`);
    if (r.headers.get("location") !== "/welcome")
      throw new Error(`expected /welcome, got ${r.headers.get("location")}`);
  });

  let actionId;
  await step("/welcome renders the signup form", async () => {
    const r = await get("/welcome", jar);
    if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    const html = await r.text();
    if (!html.includes("Create your account"))
      throw new Error("missing 'Create your account' heading");
    if (!html.includes('name="email"'))
      throw new Error("missing email field");
    actionId = extractActionId(html);
  });

  await step("signup with valid credentials", async () => {
    const r = await postForm(
      "/welcome",
      jar,
      {
        name: "Mom",
        email: "mom@compass.local",
        password: "correct-horse-battery-staple",
        confirm: "correct-horse-battery-staple",
      },
      { actionId },
    );
    if (r.status !== 303 && r.status !== 307 && r.status !== 302) {
      const text = await r.text();
      throw new Error(
        `expected redirect, got ${r.status}: ${text.slice(0, 300)}`,
      );
    }
    if (!jar["compass_session"]) {
      throw new Error("no session cookie set after signup");
    }
  });

  await step("user row exists in DB", async () => {
    const u = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
    if (!u) throw new Error("user not created");
    if (u.name !== "Mom") throw new Error(`name = ${u.name}`);
  });

  await step("authed / serves the welcome page", async () => {
    const r = await get("/", jar);
    if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    const html = await r.text();
    // React injects comment markers between text and variables during SSR
    // (`Welcome, <!-- -->Mom<!-- -->.`), so we check both pieces separately.
    if (!html.includes("Welcome,") || !html.includes(">Mom<"))
      throw new Error("missing 'Welcome, Mom' heading");
  });

  await step("authed /login redirects to /", async () => {
    const r = await get("/login", jar);
    if (r.status !== 307) throw new Error(`expected 307, got ${r.status}`);
    if (r.headers.get("location") !== "/")
      throw new Error(`expected /, got ${r.headers.get("location")}`);
  });

  let logoutAction;
  await step("authed / exposes logout action", async () => {
    const r = await get("/", jar);
    const html = await r.text();
    logoutAction = extractAction(html);
  });

  await step("logout clears the session", async () => {
    const r = await postForm("/", jar, {}, {
      actionId: logoutAction.id,
      kind: logoutAction.kind,
    });
    if (r.status !== 303 && r.status !== 307 && r.status !== 302) {
      throw new Error(`expected redirect, got ${r.status}`);
    }
    if (jar["compass_session"]) {
      throw new Error("session cookie still present after logout");
    }
  });

  await step("session row removed from DB", async () => {
    const count = await prisma.session.count();
    if (count !== 0) throw new Error(`expected 0 sessions, got ${count}`);
  });

  await step("after logout, / redirects to /login", async () => {
    const r = await get("/", jar);
    if (r.status !== 307) throw new Error(`expected 307, got ${r.status}`);
    if (r.headers.get("location") !== "/login")
      throw new Error(`expected /login, got ${r.headers.get("location")}`);
  });

  await step("/login is reachable (user exists now)", async () => {
    const r = await get("/login", jar);
    if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
    const html = await r.text();
    if (!html.includes("Welcome back"))
      throw new Error("missing 'Welcome back' heading");
  });

  await step("/welcome redirects to /login when user exists", async () => {
    const r = await get("/welcome", jar);
    if (r.status !== 307) throw new Error(`expected 307, got ${r.status}`);
    if (r.headers.get("location") !== "/login")
      throw new Error(`expected /login, got ${r.headers.get("location")}`);
  });

  let loginActionId;
  await step("/login exposes login action", async () => {
    const r = await get("/login", jar);
    const html = await r.text();
    loginActionId = extractActionId(html);
  });

  await step("login with wrong password fails", async () => {
    const r = await postForm(
      "/login",
      jar,
      { email: "mom@compass.local", password: "wrong-password-12345" },
      { actionId: loginActionId },
    );
    if (r.status !== 200 && r.status !== 303 && r.status !== 307) {
      throw new Error(`unexpected status ${r.status}`);
    }
    if (jar["compass_session"]) {
      throw new Error("session cookie was set despite wrong password");
    }
  });

  await step("login with correct password", async () => {
    const r = await postForm(
      "/login",
      jar,
      {
        email: "mom@compass.local",
        password: "correct-horse-battery-staple",
      },
      { actionId: loginActionId },
    );
    if (r.status !== 303 && r.status !== 307 && r.status !== 302) {
      throw new Error(`expected redirect, got ${r.status}`);
    }
    if (!jar["compass_session"]) {
      throw new Error("no session cookie after login");
    }
  });

  await step("post-login / serves the welcome page", async () => {
    const r = await get("/", jar);
    if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`);
  });

  if (existsSync(COOKIE_JAR)) unlinkSync(COOKIE_JAR);
  await prisma.$disconnect();

  console.log("\n✓ all auth smoke checks passed");
}

main().catch(async (err) => {
  console.error("\n✗ smoke test crashed");
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
