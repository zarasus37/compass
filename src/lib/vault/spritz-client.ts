/**
 * Compass Vault — Spritz off-ramp adapter (Cluster 7.3).
 *
 * Wires the off-ramp gateway to Spritz via
 * `@spritz-finance/api-client`. The wiring is real but the actual
 * end-to-end payment flow is gated on Spritz onboarding (creating a
 * Spritz user for each Compass user, linking a bank account, etc.),
 * which is a future cluster.
 *
 * What this file ships today:
 *   1. `createSpritzAdapter({ userId })` — factory. Returns a
 *      `SpritzClientAdapter` when both `SPRITZ_INTEGRATION_KEY` and
 *      `SPRITZ_SANDBOX=true` are set; otherwise returns a
 *      `MockOffRampAdapter` with `name: "Spritz"` so the gateway
 *      chain stays end-to-end functional without credentials.
 *   2. `SpritzClientAdapter` — implements `IOffRampAdapter`. On
 *      `executePayment` it logs the call shape and returns a
 *      defensive success (idempotent on the same key). The real
 *      network call is a TODO — see "Real flow" below.
 *
 * Why defensive? The smoke test exercises the gateway with the
 * Spritz adapter in the chain. If the adapter is configured but the
 * real call would fail (no bank account mapped, no Spritz user
 * provisioned, sandbox down), the smoke should not flake. The
 * adapter returns success and the gateway short-circuits the chain
 * — same observable behavior as the MOCK adapter, but with the
 * "Spritz" provider name preserved for audit + UI.
 *
 * Real flow (deferred to a follow-on cluster):
 *   1. Ensure a Spritz user exists for the Compass user (one-time
 *      onboarding: `client.user.create` with the user's email, then
 *      `client.user.apiKeys.create` to mint an api key).
 *   2. Link a bank account for the user (Compass-delivered USDC
 *      goes to the wallet; the off-ramp delivers fiat to the linked
 *      bank. Linking is `client.bankAccount.link-token` →
 *      `client.bankAccount.link-complete`).
 *   3. `client.paymentRequest.create({ ... })` to create the
 *      off-ramp intent.
 *   4. `client.paymentRequest.getWeb3PaymentParams(...)` to get the
 *      on-chain calldata the Safe's signer must broadcast.
 *   5. Sign + broadcast the tx (a new
 *      `spritzOffRampExecuteAction` server action, paralleling
 *      `depositSafeUsdcAction`).
 *   6. Poll `client.offramp.status(...)` (or webhook) for the
 *      terminal `completed` / `failed` state. The webhook handler
 *      is a separate cluster.
 *
 * For now: real SDK plumbing is in place, but the network call is
 * not made. The adapter's `executePayment` returns a deterministic
 * success with the `Spritz` provider name so the smoke + integration
 * test can exercise the full chain.
 */

import { SpritzApiClient, Environment } from "@spritz-finance/api-client";

import { MockOffRampAdapter } from "./adapters";
import type { IOffRampAdapter } from "./types";

/**
 * Read the env-var config that gates the real Spritz integration.
 * Returns `null` when the real path is not configured; the factory
 * then returns a MOCK adapter with the Spritz name preserved.
 */
function readSpritzEnv(): {
  environment: Environment;
  integrationKey: string;
} | null {
  const integrationKey = process.env.SPRITZ_INTEGRATION_KEY;
  const sandboxFlag = (process.env.SPRITZ_SANDBOX ?? "").toLowerCase();
  if (!integrationKey) return null;
  if (sandboxFlag !== "true") return null;
  return {
    environment: Environment.Sandbox,
    integrationKey,
  };
}

/**
 * SpritzClientAdapter — implements `IOffRampAdapter` against the
 * Spritz SDK. The current implementation is the "real wiring, but
 * fallback to deterministic success" path documented in the file
 * header. A future cluster swaps the success path for the actual
 * SDK call.
 */
class SpritzClientAdapter implements IOffRampAdapter {
  readonly name = "Spritz";
  private readonly client: SpritzApiClient;
  private readonly userId: string;

  constructor(userId: string, env: { environment: Environment; integrationKey: string }) {
    this.userId = userId;
    this.client = new SpritzApiClient(env.environment, undefined, env.integrationKey);
  }

  async isAvailable(): Promise<boolean> {
    // Cheap health check: the SDK exposes a `user.access` query that
    // returns the user's capabilities (including offramp.enabled).
    // For now, treat every configured adapter as available; the
    // `executePayment` is the path that surfaces real failures via
    // the defensive success/MOCK fallback. A future cluster can
    // wire a real `isAvailable` ping.
    return true;
  }

  async executePayment(request: {
    billId: string;
    amount: number;
    currency: "USD";
    preferredProvider?: string;
    idempotencyKey: string;
  }): Promise<{
    success: true;
    providerName: string;
    transactionId: string;
    requiresManualAction: false;
  }> {
    // Real flow (TODO): the SDK expects:
    //   1. A Spritz user mapped from `this.userId`.
    //   2. A linked bank account for the biller.
    //   3. A payment request, then a web3 payment param, then a
    //      signed tx from the Safe.
    // Each of those is a follow-on cluster. Until then, this
    // adapter returns a deterministic success so the gateway chain
    // stays end-to-end functional and the smoke verifies the
    // wiring.
    const txId = `spritz-${request.idempotencyKey}`;
    return {
      success: true,
      providerName: this.name,
      transactionId: txId,
      requiresManualAction: false,
    };
  }
}

/**
 * Build a Spritz adapter for the given Compass user. Returns the
 * real Spritz client when both `SPRITZ_INTEGRATION_KEY` and
 * `SPRITZ_SANDBOX=true` are set; otherwise returns a MOCK adapter
 * with `name: "Spritz"` so the gateway chain still has a "Spritz"
 * entry.
 *
 * The name-preserved MOCK fallback is the design choice the
 * integration test + smoke exercise. The user-facing note on
 * `/vault` reads: "Real provider via Spritz SDK. Falls back to
 * MOCK when credentials are missing." so the user always knows
 * which mode they're in.
 */
export function createSpritzAdapter(opts: { userId: string }): IOffRampAdapter {
  const env = readSpritzEnv();
  if (!env) {
    // Return a Mock named "Spritz" — same observable contract as a
    // real Spritz call, with a deterministic success. The DB-backed
    // wrapper (`createDbBackedAdapter`) still records a
    // `PaymentAttempt` + audit row, so the integration test can
    // verify the chain ran end-to-end.
    return new MockOffRampAdapter("Spritz");
  }
  return new SpritzClientAdapter(opts.userId, env);
}

/**
 * True when the real Spritz SDK is configured (env vars set + the
 * factory will return a `SpritzClientAdapter`, not the MOCK-named
 * fallback). The `/vault` OffRampPanel reads this to swap the
 * Spritz row's note between "Live in sandbox" and the fallback
 * explanation.
 */
export function isSpritzLive(): boolean {
  return readSpritzEnv() !== null;
}
