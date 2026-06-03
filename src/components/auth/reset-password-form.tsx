"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { updatePassword, type AuthActionState } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <AuthShell subtitle="Set a new password">
      {state.error && (
        <p className="rounded-lg border border-error bg-error-container/20 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">New Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            showLockIcon
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            showLockIcon
          />
        </div>
        <Button type="submit" loading={pending} className="w-full">
          <KeyRound className="size-4" />
          {pending ? "Updating…" : "Update password"}
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
