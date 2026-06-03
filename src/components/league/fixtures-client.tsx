"use client";

import { useMemo, useState } from "react";
import { MatchFixtureCard } from "@/components/league/match-fixture-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWeekendRange } from "@/lib/format-weekend";
import type { FixtureWithTeams } from "@/types/database";

type Group = {
  matchweek: { id: string; number: number; starts_at: string | null; ends_at: string | null };
  fixtures: FixtureWithTeams[];
};

type ScopeFilter = "league" | "mine";
type StatusFilter = "all" | "upcoming" | "completed";

function fixtureMatchesTeam(fixture: FixtureWithTeams, teamId: string): boolean {
  return fixture.home_team_id === teamId || fixture.away_team_id === teamId;
}

function fixtureMatchesStatus(fixture: FixtureWithTeams, status: StatusFilter): boolean {
  if (status === "upcoming") return fixture.status !== "completed";
  if (status === "completed") return fixture.status === "completed";
  return true;
}

export function FixturesClient({
  grouped,
  seasonName,
  userTeamId,
  userProfileId,
}: {
  grouped: Group[];
  seasonName: string;
  userTeamId?: string | null;
  userProfileId?: string;
}) {
  const [scope, setScope] = useState<ScopeFilter>("league");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (scope === "mine" && !userTeamId) {
      return [];
    }

    return grouped
      .map((g) => ({
        ...g,
        fixtures: g.fixtures.filter((f) => {
          if (scope === "mine" && userTeamId && !fixtureMatchesTeam(f, userTeamId)) {
            return false;
          }
          return fixtureMatchesStatus(f, status);
        }),
      }))
      .filter((g) => g.fixtures.length > 0);
  }, [grouped, scope, status, userTeamId]);

  const currentMw = filtered[0]?.matchweek;
  const highlightTeamId = scope === "league" ? (userTeamId ?? undefined) : undefined;

  const emptyMessage =
    scope === "mine" && !userTeamId
      ? "You are not enrolled in the active season yet. Your league admin will add you when the season starts, or complete onboarding before the season begins."
      : scope === "mine"
        ? "No fixtures for your team match this filter."
        : "No fixtures match this filter.";

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase italic tracking-tight text-secondary-fixed">
            {currentMw ? `Matchweek ${currentMw.number}` : "Fixtures"}
          </h2>
          <p className="font-data mt-2 text-sm text-primary">{seasonName}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
            <TabsList>
              <TabsTrigger value="league">League</TabsTrigger>
              <TabsTrigger value="mine">My team</TabsTrigger>
            </TabsList>
            <TabsContent value={scope} className="hidden" />
          </Tabs>
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value={status} className="hidden" />
          </Tabs>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {filtered.length === 0 ? (
          <p className="text-center text-on-surface-variant">{emptyMessage}</p>
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
                      linkToReport={fixture.status !== "completed"}
                      highlightTeamId={highlightTeamId}
                      userProfileId={userProfileId}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
