import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { requireUser } from "@/server/auth/user";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

/**
 * Cluster 7.16 — /settings/password
 *
 * Self-service password rotation page. Lives inside the (app) layout
 * (auth-gated by `requireUser()`); redirects to /login when no
 * valid session.
 *
 * The page is server-rendered. The form (`ChangePasswordForm`) is
 * a client component using React 19 `useActionState` against
 * `changePasswordAction`. The action handles its own validation,
 * password verification, atomic write + session invalidation +
 * cookie refresh — see `password-actions.ts`.
 */
export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <div>
      <PageHead
        eyebrow="// system · settings · password"
        title="Change Password"
        em="rotate your password. signs out everywhere else."
        accent="cyan"
        explanation={
          <>
            Enter your current password, then your new password twice.
            Compass will sign you out everywhere except this device.
          </>
        }
      />

      <ChangePasswordForm />
    </div>
  );
}
