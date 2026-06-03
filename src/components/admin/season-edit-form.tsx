"use client";

import { useActionState, useEffect } from "react";
import type { AdminActionState } from "@/actions/admin";
import type { Season } from "@/types/database";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SeasonEditForm({
  season,
  updateSeason,
}: {
  season: Season;
  updateSeason: (
    seasonId: string,
    prev: AdminActionState,
    formData: FormData
  ) => Promise<AdminActionState>;
}) {
  const [state, formAction, pending] = useActionState(
    updateSeason.bind(null, season.id),
    {}
  );

  useEffect(() => {
    if (state.success) {
      window.location.reload();
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-outline-variant/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        Edit draft season
      </p>
      <div>
        <Label htmlFor={`name-${season.id}`}>Name</Label>
        <Input
          id={`name-${season.id}`}
          name="name"
          defaultValue={season.name}
          required
        />
      </div>
      <div>
        <Label htmlFor={`starts-${season.id}`}>Start date</Label>
        <DatePicker
          id={`starts-${season.id}`}
          name="startsAt"
          defaultValue={season.starts_at ?? undefined}
          placeholder="Pick start date"
        />
      </div>
      <p className="text-xs text-on-surface-variant">
        {season.ends_at
          ? `End date: ${season.ends_at} (set from fixture schedule)`
          : "End date is set automatically when fixtures are generated."}
      </p>
      {state.error && (
        <p className="text-sm text-error">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-secondary-fixed">{state.success}</p>
      )}
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
