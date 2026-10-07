/**
 * /login — the sign-in entry point.
 *
 * If no user exists yet, /login redirects to /welcome: there is nothing
 * to sign in to, and signup is the only useful next step.
 *
 * Cluster 7.32b — signup is public, so /login also links to /welcome.
 * That link is the only discoverable route to registration now that
 * neither page force-redirects the other once a user exists.
 */
import Link from "next/link";
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
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/welcome"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Create one
          </Link>
        </>
      }
    />
  );
}
