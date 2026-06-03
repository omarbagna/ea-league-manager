"use client";

import { useActionState } from "react";
import { Gamepad2 } from "lucide-react";
import { updatePlayerProfile, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ProfileSettingsForm({
  defaultTeamName,
  defaultEaId,
}: {
  defaultTeamName: string;
  defaultEaId: string;
}) {
  const [state, formAction, pending] = useActionState(updatePlayerProfile, initialState);

  return (
    <div className="mx-auto max-w-lg">
      {state.error && (
        <p className="mb-4 rounded-lg border border-error px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-fixed/5 px-3 py-2 text-sm text-primary-fixed">
          {state.success}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="teamName" className="font-display text-xs uppercase tracking-wider">
            Team Name
          </Label>
          <Input
            id="teamName"
            name="teamName"
            defaultValue={defaultTeamName}
            placeholder="e.g. Invictus FC"
            required
          />
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
              defaultValue={defaultEaId}
              placeholder="Enter your gamertag"
              required
              className="pl-11"
            />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          Changes apply to your profile and your enrolled team in the active season.
        </p>
        <Button type="submit" loading={pending} className="mt-2 w-full sm:w-auto">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
