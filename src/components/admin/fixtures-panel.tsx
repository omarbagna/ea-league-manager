"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AdminFixtureForfeitDialog } from "@/components/admin/admin-fixture-forfeit-dialog";
import { MatchFixtureCard } from "@/components/league/match-fixture-card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type StatusFilter = "all" | "upcoming" | "completed";

function fixtureMatchesStatus(fixture: FixtureWithTeams, status: StatusFilter): boolean {
  if (status === "upcoming") return fixture.status !== "completed";
  if (status === "completed") return fixture.status === "completed";
  return true;
}

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
  const [status, setStatus] = useState<StatusFilter>("all");
  const hasSchedule = matchweeks.length > 0;
  const isGenerating = pendingAction === "generate";

  const previewCount =
    teams.length >= 2 ? teams.length * (teams.length - 1) : 0;

  const filtered = useMemo(() => {
    return grouped
      .map((g) => ({
        ...g,
        fixtures: g.fixtures.filter((f) => fixtureMatchesStatus(f, status)),
      }))
      .filter((g) => g.fixtures.length > 0);
  }, [grouped, status]);

  const currentMw = filtered[0]?.matchweek;

  const handleGenerate = () => {
    setPendingAction("generate");
    startTransition(async () => {
      await generateSeasonSchedule(seasonId, scheduleStart || undefined);
      window.location.reload();
    });
  };

  return (
    <div className="mx-auto max-w-[1024px] space-y-8">
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

      {hasSchedule && (
        <>
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase italic tracking-tight text-secondary-fixed">
                {currentMw ? `Matchweek ${currentMw.number}` : "Fixtures"}
              </h2>
              <p className="font-data mt-2 text-sm text-primary">{seasonName}</p>
              <p className="font-data mt-1 text-xs uppercase text-on-surface-variant">
                {seasonStatus}
              </p>
            </div>
            <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value={status} className="hidden" />
            </Tabs>
          </div>

          <div className="flex flex-col gap-8">
            {filtered.length === 0 ? (
              <p className="text-center text-on-surface-variant">
                No fixtures match this filter.
              </p>
            ) : (
              filtered.map(({ matchweek, fixtures }) => {
                const weekend = formatWeekendRange(
                  matchweek.starts_at,
                  matchweek.ends_at
                );
                return (
                  <div key={matchweek.id}>
                    <h3 className="font-display text-xl font-bold text-primary">
                      Matchweek {matchweek.number}
                    </h3>
                    {weekend && (
                      <p className="mb-4 font-data text-xs text-on-surface-variant">
                        {weekend}
                      </p>
                    )}
                    <div className="flex flex-col gap-4">
                      {fixtures.map((fixture) => (
                        <MatchFixtureCard
                          key={fixture.id}
                          fixture={fixture}
                          matchweek={matchweek}
                          linkToReport={false}
                          footer={
                            fixture.status !== "completed" ? (
                              <AdminFixtureForfeitDialog fixture={fixture} />
                            ) : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <Link href="/admin/seasons" className="text-sm text-primary hover:underline">
        ← Back to seasons
      </Link>
    </div>
  );
}
