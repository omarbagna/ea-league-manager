"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarOff, ChevronsDown } from "lucide-react";
import { MatchFixtureCard } from "@/components/league/match-fixture-card";
import {
  MatchweekFixturesGroup,
  resolveDefaultExpandedMatchweekId,
  useMatchweekExpansion,
} from "@/components/league/matchweek-fixtures-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  defaultExpandedMatchweekId,
}: {
  grouped: Group[];
  seasonName: string;
  userTeamId?: string | null;
  userProfileId?: string;
  defaultExpandedMatchweekId?: string | null;
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

  const { expandedIds, toggle } = useMatchweekExpansion(
    filtered,
    defaultExpandedMatchweekId
  );

  const currentMwId = resolveDefaultExpandedMatchweekId(
    filtered,
    defaultExpandedMatchweekId
  );
  const currentMw = filtered.find((g) => g.matchweek.id === currentMwId)?.matchweek;
  const isFirstShown = filtered[0]?.matchweek.id === currentMwId;

  const highlightTeamId = scope === "league" ? (userTeamId ?? undefined) : undefined;

  const jumpToCurrent = useCallback(() => {
    if (!currentMwId) return;
    if (!expandedIds.has(currentMwId)) toggle(currentMwId);
    document
      .getElementById(`mw-anchor-${currentMwId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentMwId, expandedIds, toggle]);

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
            Fixtures
          </h2>
          <p className="mt-1 font-data text-sm text-on-surface-variant">
            {seasonName}
            {currentMw ? ` · Matchweek ${currentMw.number} in play` : ""}
          </p>
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

      {currentMw && !isFirstShown && (
        <button
          type="button"
          onClick={jumpToCurrent}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-primary-container/40 bg-primary-container/[0.06] px-3 py-1.5 font-data text-xs text-primary-fixed transition-colors hover:bg-primary-container/10"
        >
          <ChevronsDown className="size-3.5" />
          Jump to Matchweek {currentMw.number}
        </button>
      )}

      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={
              scope === "mine" && !userTeamId
                ? "You're not in this season yet"
                : "No fixtures match this filter"
            }
            description={
              scope === "mine" && !userTeamId
                ? "Your league admin adds you when the season starts, or finish onboarding beforehand."
                : "Try a different scope or status filter."
            }
          />
        ) : (
          filtered.map(({ matchweek, fixtures }) => {
            const done = fixtures.filter((f) => f.status === "completed").length;
            return (
              <MatchweekFixturesGroup
                key={matchweek.id}
                matchweek={matchweek}
                fixtureCount={fixtures.length}
                expanded={expandedIds.has(matchweek.id)}
                onToggle={() => toggle(matchweek.id)}
                active={matchweek.id === currentMwId}
                anchorId={`mw-anchor-${matchweek.id}`}
                subLabel={`${done}/${fixtures.length} played`}
              >
                {fixtures.map((fixture) => {
                  const mine =
                    !!userTeamId && fixtureMatchesTeam(fixture, userTeamId);
                  return (
                    <MatchFixtureCard
                      key={fixture.id}
                      fixture={fixture}
                      matchweek={matchweek}
                      linkToReport={fixture.status !== "completed" && mine}
                      matchCentreHref={`/fixtures/${fixture.id}`}
                      highlightTeamId={highlightTeamId}
                      userProfileId={userProfileId}
                    />
                  );
                })}
              </MatchweekFixturesGroup>
            );
          })
        )}
      </div>
    </>
  );
}
