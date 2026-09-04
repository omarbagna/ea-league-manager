"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, LogIn, HelpCircle } from "lucide-react";
import { signInWithPassword, type AuthActionState } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm({ errorParam }: { errorParam?: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);

  return (
    <AuthShell subtitle="Sign in to your dashboard">
      {(errorParam === "banned" || errorParam === "auth" || state.error) && (
        <p className="rounded-lg border border-error bg-error-container/20 px-3 py-2 text-sm text-error">
          {errorParam === "banned"
            ? "Your account has been suspended."
            : errorParam === "auth"
              ? "Sign in failed. Please try again."
              : state.error}
        </p>
      )}

      <p className="rounded-lg border border-outline-variant/50 bg-surface-container/30 px-3 py-2 text-sm text-on-surface-variant">
        Accounts use a password. First time after this change? Use{" "}
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password
        </Link>{" "}
        to set one.
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            showLockIcon
          />
        </div>
        <Button type="submit" loading={pending} className="w-full">
          <LogIn className="size-4" />
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-on-surface-variant">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create account
        </Link>
      </p>

      <p className="text-center text-sm text-on-surface-variant">
        <Link href="/league" className="text-primary hover:underline">
          View standings without an account →
        </Link>
      </p>

      <div className="border-t border-outline-variant pt-4 text-center">
        <a
          href="mailto:support@darkeliteleague.com"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
        >
          <HelpCircle className="size-4" />
          Need help signing in?
        </a>
      </div>
    </AuthShell>
  );
}
