"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { requestPasswordReset, type AuthActionState } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <AuthShell subtitle="Reset your password">
      {state.error && (
        <p className="rounded-lg border border-error bg-error-container/20 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-primary-container/30 bg-primary-container/10 px-3 py-2 text-sm text-primary-fixed">
          {state.success}
        </p>
      )}

      <p className="text-sm text-on-surface-variant">
        Enter your email and we will send a link to set a new password.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="player@team.com"
              autoComplete="email"
              required
              className="pl-11"
            />
          </div>
        </div>
        <Button type="submit" loading={pending} className="w-full">
          <Send className="size-4" />
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-on-surface-variant">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
