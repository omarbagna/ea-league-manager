"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { changePassword, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-lg border border-error/50 bg-error/10 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-secondary-fixed/40 bg-secondary-fixed/10 px-3 py-2 text-sm text-secondary-fixed">
          {state.success}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            showLockIcon
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            showLockIcon
          />
        </div>
      </div>
      <p className="text-xs text-on-surface-variant">
        At least 8 characters. You stay signed in on this device after changing
        it.
      </p>
      <Button
        type="submit"
        loading={pending}
        className="w-full sm:w-auto sm:self-start"
      >
        <KeyRound className="size-4" />
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
