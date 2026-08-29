/**
 * Next.js instrumentation hook.
 *
 * Cluster: Production deploy prep (2026-08-28).
 *
 * Runs once at boot in both edge and node runtimes. We use the
 * node-runtime branch to validate production env (the edge branch
 * has limited Node API surface and isn't a place to run env
 * validation).
 *
 * Next 13+ convention: the file lives at the project root and is
 * auto-discovered. See https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import so the dev path doesn't load prod.ts unless
    // we're actually in production. The validateProdEnv() call
    // itself is a no-op in non-prod, but the dynamic import
    // keeps the module graph lean in dev.
    const { assertProdEnv } = await import("./src/lib/env/prod");
    assertProdEnv();
  }
}
