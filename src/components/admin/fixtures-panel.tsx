"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Rows3 } from "lucide-react";
import { AdminFixtureForfeitDialog } from "@/components/admin/admin-fixture-forfeit-dialog";
import { AdminFixtureRevertDialog } from "@/components/admin/admin-fixture-revert-dialog";
import { AdminFixturesTable } from "@/components/admin/admin-fixtures-table";
import { MatchFixtureCard } from "@/components/league/match-fixture-card";
import {
  MatchweekFixturesGroup,
  useMatchweekExpansion,
} from "@/components/league/matchweek-fixtures-group";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AdminActionState } from "@/actions/admin";
import type { RevertableSubmission } from "@/lib/queries/submissions";
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
  revertableByFixtureId = new Map(),
  generateSeasonSchedule,
}: {
  seasonId: string;
  seasonName: string;
  seasonStartsAt: string | null;
  seasonStatus: string;
  matchweeks: Matchweek[];
  teams: Team[];
  grouped: Group[];
  revertableByFixtureId?: Map<string, RevertableSubmission>;
  generateSeasonSchedule: (
    seasonId: string,
    startDate?: string
  ) => Promise<AdminActionState>;
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [scheduleStart, setScheduleStart] = useState(seasonStartsAt ?? "");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<"table" | "cards">("table");
  const hasSchedule = matchweeks.length > 0;
  const isGenerating = pendingAction === "generate";

  // Table's rightmost action column sits off-screen on a phone until
  // scrolled horizontally — default to Cards there. Runs once on mount
  // (not a live resize listener) so a later manual pick always wins.
  useEffect(() => {
    if (window.matchMedia?.("(max-width: 767px)").matches) {
      setView("cards");
    }
  }, []);

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

  const { expandedIds, toggle } = useMatchweekExpansion(filtered);


  const handleGenerate = () => {
    setPendingAction("generate");
    startTransition(async () => {
      await generateSeasonSchedule(seasonId, scheduleStart || undefined);
      window.location.reload();
    });
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
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
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
                Fixtures
              </h2>
              <p className="font-data mt-1 text-sm text-on-surface-variant">
                {seasonName} · {seasonStatus}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
                <TabsContent value={status} className="hidden" />
              </Tabs>
              <div className="flex overflow-hidden rounded-lg border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setView("table")}
                  aria-pressed={view === "table"}
                  aria-label="Table view"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 font-data text-xs transition-colors",
                    view === "table"
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  <Rows3 className="size-4" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  aria-pressed={view === "cards"}
                  aria-label="Card view"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 font-data text-xs transition-colors",
                    view === "cards"
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  <LayoutGrid className="size-4" />
                  Cards
                </button>
              </div>
            </div>
          </div>

          {view === "table" ? (
            <AdminFixturesTable
              groups={filtered}
              teams={teams}
              revertableByFixtureId={revertableByFixtureId}
              seasonStatus={seasonStatus}
            />
          ) : (
            <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <p className="text-center text-on-surface-variant">
                No fixtures match this filter.
              </p>
            ) : (
              filtered.map(({ matchweek, fixtures }) => (
                <MatchweekFixturesGroup
                  key={matchweek.id}
                  matchweek={matchweek}
                  fixtureCount={fixtures.length}
                  expanded={expandedIds.has(matchweek.id)}
                  onToggle={() => toggle(matchweek.id)}
                >
                  {fixtures.map((fixture) => {
                    const revertable = revertableByFixtureId.get(fixture.id);
                    const isForfeit =
                      fixture.status === "completed" && !!fixture.forfeited_team_id;

                    return (
                      <MatchFixtureCard
                        key={fixture.id}
                        fixture={fixture}
                        matchweek={matchweek}
                        linkToReport={false}
                        matchCentreHref={`/fixtures/${fixture.id}`}
                        footer={
                          seasonStatus !== "active"
                            ? undefined
                            : fixture.status !== "completed"
                              ? <AdminFixtureForfeitDialog fixture={fixture} />
                              : revertable && !isForfeit
                                ? (
                                  <AdminFixtureRevertDialog
                                    fixture={fixture}
                                    revertable={revertable}
                                  />
                                )
                                : undefined
                        }
                      />
                    );
                  })}
                </MatchweekFixturesGroup>
              ))
            )}
            </div>
          )}
        </>
      )}

      <Link href="/admin/seasons" className="text-sm text-primary hover:underline">
        ← Back to seasons
      </Link>
    </div>
  );
}
