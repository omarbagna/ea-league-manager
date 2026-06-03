"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { formatWeekendRange } from "@/lib/format-weekend";
import { cn } from "@/lib/utils";
import type { AdminActionState } from "@/actions/admin";
import type { FixtureWithTeams } from "@/types/database";

type Matchweek = {
  id: string;
  number: number;
  starts_at: string | null;
  ends_at: string | null;
};
type Team = { id: string; name: string };

type Group = {
  matchweek: Matchweek;
  fixtures: FixtureWithTeams[];
};

export function AdminFixturesPanel({
  seasonId,
  seasonName,
  seasonStartsAt,
  seasonStatus,
  matchweeks,
  teams,
  grouped,
  generateSeasonSchedule,
}: {
  seasonId: string;
  seasonName: string;
  seasonStartsAt: string | null;
  seasonStatus: string;
  matchweeks: Matchweek[];
  teams: Team[];
  grouped: Group[];
  generateSeasonSchedule: (
    seasonId: string,
    startDate?: string
  ) => Promise<AdminActionState>;
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [scheduleStart, setScheduleStart] = useState(seasonStartsAt ?? "");
  const hasSchedule = matchweeks.length > 0;
  const isGenerating = pendingAction === "generate";

  const previewCount =
    teams.length >= 2 ? teams.length * (teams.length - 1) : 0;

  const handleGenerate = () => {
    setPendingAction("generate");
    startTransition(async () => {
      await generateSeasonSchedule(seasonId, scheduleStart || undefined);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">
          Fixtures — {seasonName}
        </h1>
        <p className="mt-1 font-data text-xs uppercase text-on-surface-variant">
          {seasonStatus}
        </p>
      </div>

      {teams.length < 2 && (
        <p className="text-sm text-on-surface-variant">
          At least two teams must register before generating fixtures.
        </p>
      )}

      {!hasSchedule && (
        <div
          className={cn(
            "rounded-xl border border-outline-variant p-4",
            isGenerating && "pointer-events-none opacity-60"
          )}
          aria-busy={isGenerating}
        >
          <h2 className="font-display font-semibold">Generate Season Schedule</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Creates a double round-robin across weekend matchweeks. With 3 or more
            teams, each matchweek includes two games per team; two-team leagues play
            once per week. Return legs are not scheduled back-to-back.
            {teams.length >= 2 && (
              <> Expected: {previewCount} fixtures.</>
            )}
          </p>
          {!seasonStartsAt && (
            <div className="mt-4 max-w-xs">
              <Label htmlFor="scheduleStart">First weekend</Label>
              <DatePicker
                id="scheduleStart"
                name="scheduleStart"
                weekendOnly
                placeholder="Pick first Saturday"
                defaultValue={scheduleStart || undefined}
                onValueChange={setScheduleStart}
              />
            </div>
          )}
          <Button
            className="mt-4"
            loading={isGenerating}
            disabled={isGenerating || teams.length < 2}
            onClick={handleGenerate}
          >
            {isGenerating ? "Generating…" : "Generate Season Schedule"}
          </Button>
        </div>
      )}

      {hasSchedule &&
        matchweeks.map((mw) => {
          const weekend = formatWeekendRange(mw.starts_at, mw.ends_at);
          const weekFixtures =
            grouped.find((g) => g.matchweek.id === mw.id)?.fixtures ?? [];

          return (
            <div
              key={mw.id}
              className="rounded-xl border border-outline-variant p-4"
            >
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold">
                  Matchweek {mw.number}
                </h2>
                {weekend && (
                  <p className="font-data text-xs text-on-surface-variant">
                    {weekend}
                  </p>
                )}
              </div>

              <ul className="space-y-1 text-sm">
                {weekFixtures.map((f) => (
                  <li key={f.id} className="font-data text-on-surface-variant">
                    {f.home_team?.name ?? "?"} vs {f.away_team?.name ?? "?"} —{" "}
                    {f.status}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

      <Link href="/admin/seasons" className="text-sm text-primary hover:underline">
        ← Back to seasons
      </Link>
    </div>
  );
}
