"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { signUpWithPassword, type AuthActionState } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, initialState);

  return (
    <AuthShell subtitle="Create your account">
      {state.error && (
        <p className="rounded-lg border border-error bg-error-container/20 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

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
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">Password</Label>
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
          <UserPlus className="size-4" />
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
