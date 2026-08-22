/**
 * /welcome — shown only when there are zero users in the DB.
 * The first user is created here. After that, this route always
 * redirects to /login (gated in the page itself).
 */
import { redirect } from "next/navigation";
import { countUsers } from "@/server/auth/user";
import { signupAction } from "../actions";
import { AuthForm } from "@/components/auth/auth-shell";

export default async function WelcomePage() {
  if ((await countUsers()) > 0) {
    redirect("/login");
  }

  return (
    <AuthForm
      title="Create your account"
      subtitle="This will be the only account on this Compass install. You're setting it up once."
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
