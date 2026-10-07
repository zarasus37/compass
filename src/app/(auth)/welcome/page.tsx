/**
 * /welcome — public registration.
 *
 * Cluster 7.32b — this page used to redirect to /login whenever any
 * user existed, which made signup a one-shot bootstrap reachable only
 * on a freshly-minted database. That redirect is gone: signup is
 * public, so the form is always served.
 *
 * /login still sends a visitor here when the database has no users at
 * all, since there is nothing to sign in to yet.
 */
import { signupAction } from "../actions";
import { AuthForm } from "@/components/auth/auth-shell";

export default async function WelcomePage() {
  return (
    <AuthForm
      title="Create your account"
      subtitle="Set up your own Compass. Your data stays yours."
      focusField="name"
      submitLabel="Create account"
      pendingLabel="Creating account…"
      action={signupAction}
      fields={[
        {
          name: "name",
          label: "Your name",
          type: "text",
          autoComplete: "name",
          placeholder: "Mom",
          required: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          placeholder: "you@example.com",
          required: true,
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "new-password",
          required: true,
        },
        {
          name: "confirm",
          label: "Confirm password",
          type: "password",
          autoComplete: "new-password",
          required: true,
        },
      ]}
      footer="Use at least 12 characters. Pick something you can remember."
    />
  );
}
