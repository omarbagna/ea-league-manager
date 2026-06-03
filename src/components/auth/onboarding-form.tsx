"use client";

import { useActionState } from "react";
import { Gamepad2, ArrowRight, LogOut } from "lucide-react";
import { completeOnboarding, signOut, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);

  return (
    <main className="relative z-10 w-full max-w-[440px] rounded-xl border border-outline-variant p-6 glass-panel neon-glow-active md:p-8">
      <header className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="font-display text-xl font-extrabold italic tracking-tight text-primary-container uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.3)] md:text-2xl">
          Dark Elite League
        </h1>
        <h2 className="font-display text-lg font-semibold text-on-surface">
          Complete Your Profile
        </h2>
        <p className="text-sm text-on-surface-variant">
          Set your team name and EA ID. Your league admin will add you to the season when it starts.
        </p>
      </header>

      {state.error && (
        <p className="mb-4 rounded-lg border border-error px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="teamName" className="font-display text-xs uppercase tracking-wider">
            Team Name
          </Label>
          <Input id="teamName" name="teamName" placeholder="e.g. Invictus FC" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="eaId" className="font-display text-xs uppercase tracking-wider">
            EA ID
          </Label>
          <div className="relative">
            <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline-variant" />
            <Input
              id="eaId"
              name="eaId"
              placeholder="Enter your gamertag"
              required
              className="pl-11"
            />
          </div>
        </div>
        <Button type="submit" loading={pending} className="mt-2 h-12 w-full">
          <span>{pending ? "Saving…" : "Save Profile"}</span>
          <ArrowRight className="size-5" />
        </Button>
      </form>

      <div className="mt-6 border-t border-outline-variant pt-4 text-center">
        <form action={signOut}>
          <SubmitButton variant="ghost" pendingText="Signing out…" className="text-on-surface-variant hover:text-primary">
            <LogOut className="size-4" />
            Sign out
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
