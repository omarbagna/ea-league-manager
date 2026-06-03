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

export function FixturesClient({
  grouped,
  seasonName,
}: {
  grouped: Group[];
  seasonName: string;
}) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

  const filtered = useMemo(() => {
    return grouped
      .map((g) => ({
        ...g,
        fixtures: g.fixtures.filter((f) => {
          if (filter === "upcoming") return f.status !== "completed";
          if (filter === "completed") return f.status === "completed";
          return true;
        }),
      }))
      .filter((g) => g.fixtures.length > 0);
  }, [grouped, filter]);

  const currentMw = filtered[0]?.matchweek;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase italic tracking-tight text-secondary-fixed">
            {currentMw ? `Matchweek ${currentMw.number}` : "Fixtures"}
          </h2>
          <p className="font-data mt-2 text-sm text-primary">{seasonName}</p>
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="hidden" />
        </Tabs>
      </div>

      <div className="flex flex-col gap-8">
        {filtered.length === 0 ? (
          <p className="text-center text-on-surface-variant">No fixtures match this filter.</p>
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
