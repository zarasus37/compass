# Cluster 7.16 — Change Password (self-service)

**Status**: spec / ready for build.
**Predecessor**: Cluster 7.15 (per-bill payment history sparkline, shipped).
**Author constraint**: surfacing self-service password change is a
recurring operator ask — xKryptic 2026-09-25 ("i signed in for you,
also lets add in a option to change password"). The motivation is
simple: mom should be able to rotate her own password without the
operator running `pnpm auth:reset-password`.

## Goal

Add a self-service `/settings/password` page where the logged-in
user can rotate their own password. Old password is required
(auth gate). On success, all existing sessions are invalidated
(except the current one, which gets a fresh session cookie) — same
security shape as `scripts/reset-password.mjs`.

## §0 principle check

> If the user disappeared after configuring Compass, would
> Compass still correctly carry out the financial plan?

The change-password surface doesn't affect the financial plan
directly. But it protects a configuration the user could be
abandoned under — if someone else knows the password and the user
can't rotate, the financial plan is at risk. So this cluster does
serve §0: it preserves the integrity of the "configured by the
user" state.

## Surface

- **Route**: `/(app)/settings/password` — auth-gated (the
  `(app)` layout's `requireUser()` does the gate).
- **Entry point**: a new `<SettingsRow>` on `/(app)/settings`
  page between "Smart Categorize" (row 02) and "Receipt Scan"
  (row 03). Numbered `02.5` per xKryptic's loose convention OR
  shifted — operator's call. **Default: 02.5** (a half-index
  signals "settings tier 2 detail" — same pattern as the existing
  Categorize sub-feature).
- **Form**: 3 inputs + a Save button. Old password (required),
  New password (required, min 12 chars), Confirm new password
  (required, must match).
- **Error surface**: per-field error message rendered inline
  below the field, plus a top-of-form summary if the server
  rejects the whole shape.
- **Success surface**: form replaced by a green-bordered success
  card "Password changed. Sign in everywhere else will require
  re-authentication." + a `Done` button that links back to
  `/settings`.

## Server action

`src/app/(app)/settings/password-actions.ts` — `"use server"`:

```ts
export type ChangePasswordState =
  | { ok: false; error: string; field?: "old" | "new" | "confirm" | "form" }
  | { ok: true };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const oldPw = (formData.get("old") ?? "").toString();
  const newPw = (formData.get("new") ?? "").toString();
  const confirmPw = (formData.get("confirm") ?? "").toString();

  // Per-field validation first.
  if (!oldPw) return { ok: false, error: "Enter your current password.", field: "old" };
  if (newPw.length < 12) return { ok: false, error: "New password must be at least 12 characters.", field: "new" };
  if (newPw !== confirmPw) return { ok: false, error: "New password and confirmation do not match.", field: "confirm" };
  if (newPw === oldPw) return { ok: false, error: "New password must be different from the current password.", field: "new" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, error: "Account not found. Sign out and back in.", field: "form" };

  // Verify the OLD password (constant-time via @node-rs/argon2 verify).
  const oldOk = await verifyPassword(dbUser.passwordHash, oldPw);
  if (!oldOk) return { ok: false, error: "Current password is incorrect.", field: "old" };

  // Hash + persist.
  const newHash = await hashPassword(newPw);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    // Invalidate ALL other sessions for this user. The current
    // session token comes from the cookie; we destroy everything
    // except the cookie's hash. Simpler: destroy ALL, then create
    // a fresh session for the current device.
    await tx.session.deleteMany({ where: { userId: user.id } });
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    const ua = (await headers()).get("user-agent") ?? null;
    const created = await createSession({ userId: user.id, ip, userAgent: ua });
    await setSessionCookie(created.token, created.expiresAt);
  });

  // Surface success.
  return { ok: true };
}
```

**Why destroy ALL sessions instead of "all except current"**: the
"log out everywhere else" semantic is the explicit cluster ask
(matches `reset-password.mjs`). The current-device session is
re-created in the same transaction (no gap), so the user stays
signed-in on the device that initiated the change.

## Client form

`src/app/(app)/settings/password/ChangePasswordForm.tsx`:
- `"use client"` React 19 `useActionState(changePasswordAction, { ok: false } as ChangePasswordState)`.
- 3 inputs (type=password), each with `aria-invalid` + `aria-describedby` pointing at the per-field error span.
- A `Save` button that disables while the action is pending (use `useFormStatus`).
- Two visual states:
  - `{ ok: false, error, field? }` — show the error under the matching field; if `field === "form"` (whole-form error), show it at the top.
  - `{ ok: true }` — replace the form with the success card.

## Route page

`src/app/(app)/settings/password/page.tsx`:
- `export const dynamic = "force-dynamic";`
- `export default async function ChangePasswordPage()` — `const user = await requireUser();` (already auth-gated), then render `<PageHead eyebrow="// system · password" title="Change Password" em="rotate your password. signs out everywhere else." accent="cyan" explanation={...} />` + `<ChangePasswordForm />`.
- No new shell — reuses `PageHead` from existing /settings vocabulary.

## Smoke

`tests/smoke-change-password.mjs` — 12 checks:

1. `GET /settings/password` while signed-in → 200, PageHead present, form testid present
2. Form has 3 inputs (old/new/confirm) + a `Save` button
3. POST with empty old password → 200, per-field error "Enter your current password."
4. POST with new password = "short" (7 chars) → 200, error "must be at least 12 characters."
5. POST with new + confirm mismatch → 200, error "do not match."
6. POST with new === old → 200, error "must be different."
7. POST with wrong old password → 200, error "Current password is incorrect."
8. POST with valid old + valid new + matching confirm → 302 redirect to `/` (the page does NOT redirect, the action returns `{ ok: true }` and the page is fully-rendered; the smoke just asserts the success card is on the page after the POST)
9. After POST #8: `prisma.user.findUnique()` confirms `passwordHash` matches the new hash (verify with `verifyPassword(newHash, newPw) === true`) and `passwordHash` no longer matches old (verify with `verifyPassword(newHash, oldPw) === false`)
10. After POST #8: `prisma.session.count({ where: { userId } })` is 0 (all destroyed) — wait, actually it'll be 1 because the action creates a new session for the current device. So: count === 1, and the new session's tokenHash is different from the pre-change session's tokenHash.
11. After POST #8: `verifyPassword(newHash, newPw)` succeeds and `verifyPassword(newHash, oldPw)` fails.
12. Source file checks: action is in `password-actions.ts`, `changePasswordAction` is exported, `ChangePasswordForm` is a client component, `verifyPassword` + `hashPassword` from `@/server/auth/password`, `createSession` + `destroyAllSessionsForUser` (or delete-then-create, depending on implementation) from `@/server/auth/session`, `requireUser` from `@/server/auth/user`.

Implementation should use direct DB writes inside the smoke
(bypassing the server-action form wire format) — same approach as
`smoke-bill-provider-override.mjs` and `smoke-engine-toggle.mjs`.
The server-action wire format (`useActionState` form shape) is too
brittle to test deterministically without a browser harness.

## Wiring to /settings hub

Edit `src/app/(app)/settings/page.tsx` to insert a new
`<SettingsRow>` between row 02 (Smart Categorize) and row 03
(Receipt Scan):

```tsx
<SettingsRow
  num="02.5"
  name="Change Password"
  href="/settings/password"
  glyph="⚿"
  accent="var(--terminal-cyan)"
  tag="[OK] SELF-SERVICE"
  caption="Rotate your password. Signs out everywhere else (this device stays open via a fresh session cookie)."
/>
```

`ResetSeedButton` stays in place below the grid — not a sibling
of the change-password row.

## Edge cases

1. **Two-device user changes on device A while signed in on device B**: B's session is invalidated. B's next request redirects to /login. Standard auth-flow behavior. (The cluster assumes the user understands "signs out everywhere else" — the explanatory text + the success card make it explicit.)

2. **Change fails due to DB outage mid-flight**: `prisma.$transaction` rolls back the user.update + session-deletion atomically. The cookie's setSessionCookie happens INSIDE the transaction's success path, so if it rolls back, the old session remains valid. No partial state.

3. **Same password as someone else's known password**: the weak-password blocklist check from `scripts/reset-password.mjs` (common patterns, local-part of email substring, etc.) is NOT applied here — that's the operator CLI's stricter surface, not the user's self-service surface. The 12-char minimum + length-different-from-old rules are sufficient for v1. If we want a stricter surface later, add a strength meter.

## Files added / modified

- NEW: `src/app/(app)/settings/password/page.tsx`
- NEW: `src/app/(app)/settings/password/ChangePasswordForm.tsx`
- NEW: `src/app/(app)/settings/password/password-actions.ts`
- MODIFIED: `src/app/(app)/settings/page.tsx` (insert row 02.5)
- NEW: `tests/smoke-change-password.mjs`
- MODIFIED: `tests/integration-vault.mjs` (Phase 4.0 M14 — wire checks)
- MODIFIED: `package.json` (smoke chain includes `smoke-change-password.mjs`)

## No schema, no env, no middleware change

- `User.passwordHash` is unchanged (existing column, argon2id values).
- Session table schema unchanged (just delete + insert, no migration).
- Auth middleware (the (app) layout's `requireUser()`) already
  handles the password-change surface — it's inside the (app)
  layout. No middleware edit.
- No env vars added.

## Verification ladder

1. `pnpm tsc --noEmit` — 0 errors
2. `node --check` on the smoke file
3. `smoke-change-password.mjs` against dev server (post-fix on the
   Windows PostCSS subprocess issue, OR against Vercel preview)
4. Visual walk-through via browser (manual, optional)

## Verification ceiling — Windows + Turbopack PostCSS issue

The local dev server (`pnpm dev` on Windows) hits a pre-existing
"Node.js subprocess crashed while evaluating loaders [postcss]"
timeout that prevents end-to-end smoke runs on the Windows
machine. The smoke will be authored + lint-checked; the live
verification falls to the Vercel preview URL or a Linux runtime.
This is not a cluster-specific issue — see
`tests/smoke-bill-history.mjs` recent docs and
`HANDOVER.md §Cluster 7.15` for the same caveat.

## Open questions (None blocking the build)

- **Should the change invalidate the cookie value too, or only
  the DB session row?** It does both — the implementation destroys
  the row AND creates a fresh one + sets a new cookie. The old
  cookie value still happens to hash-match a destroyed row, but
  `resolveSession` checks expiresAt; destroyed rows are gone,
  so any post-change request with the old cookie fails
  `findUnique({ where: { tokenHash } })` and returns null. So
  the old cookie is dead regardless of the new cookie. No
  action needed beyond what's in the spec.
- **Rate limit the action?** Out of scope for v1; add a per-user
  counter on `User.passwordChangesAt` in a future cluster if needed.

## Apply

After this ships:
- Mom can rotate her password on her own, no operator involvement.
- The CLI `reset-password.mjs` is for the operator's loss-of-credential recovery path only.
- The visual surface keeps the Oracle Terminal voice (eyebrow
  + Sora headline + JetBrains Mono labels — same vocabulary as
  /settings).
