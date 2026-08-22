/**
 * /login — the only sign-in entry point once an account exists.
 * If no user exists yet, /login redirects to /welcome so the first
 * user can be created.
 */
import { redirect } from "next/navigation";
import { countUsers } from "@/server/auth/user";
import { loginAction } from "../actions";
import { AuthForm } from "@/components/auth/auth-shell";

export default async function LoginPage() {
  if ((await countUsers()) === 0) {
    redirect("/welcome");
  }

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to Compass."
      focusField="email"
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      action={loginAction}
      fields={[
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
          autoComplete: "current-password",
          required: true,
        },
      ]}
    />
  );
}
