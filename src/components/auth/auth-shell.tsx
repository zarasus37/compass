"use client";

/**
 * Shared client wrapper for the auth pages (login + welcome).
 * Renders the title/subtitle, the form, and any error state. The form
 * itself is composed by the calling page so signup vs. login actions
 * can stay in their respective files.
 */
import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/app/(auth)/actions";

interface AuthField {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder?: string;
  required?: boolean;
}

interface AuthFormProps {
  title: string;
  subtitle: string;
  fields: AuthField[];
  submitLabel: string;
  pendingLabel: string;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  footer?: React.ReactNode;
  /** Field that should receive focus on mount. Defaults to the first field. */
  focusField?: string;
}

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  pendingLabel,
  action,
  footer,
  focusField,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusField) {
      const el = document.querySelector<HTMLInputElement>(
        `input[name="${focusField}"]`,
      );
      el?.focus();
    } else {
      firstRef.current?.focus();
    }
  }, [focusField]);

  const topError = state?.error;

  return (
    <div className="w-full max-w-sm space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Compass
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <form action={formAction} className="space-y-5" noValidate>
        {topError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {topError}
          </div>
        ) : null}

        {fields.map((field, idx) => {
          const error = state?.fieldErrors?.[field.name];
          const id = `field-${field.name}`;
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>{field.label}</Label>
              <Input
                ref={idx === 0 ? firstRef : undefined}
                id={id}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                required={field.required}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={cn(error && "border-destructive")}
              />
              {error ? (
                <p
                  id={`${id}-error`}
                  className="text-xs font-medium text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>

      {footer ? (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      ) : null}
    </div>
  );
}
