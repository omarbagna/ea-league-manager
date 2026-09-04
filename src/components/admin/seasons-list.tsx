"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarRange, ChevronDown } from "lucide-react";
import type { Season } from "@/types/database";
import type { FixtureWithTeams } from "@/types/database";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { SeasonEditForm } from "@/components/admin/season-edit-form";
import { SeasonSchedule } from "@/components/admin/season-schedule";
import { EndSeasonDialog } from "@/components/admin/end-season-dialog";
import type { AdminActionState } from "@/actions/admin";
import { cn } from "@/lib/utils";

type MatchweekGroup = {
  matchweek: {
    id: string;
    number: number;
    starts_at: string | null;
    ends_at: string | null;
  };
  fixtures: FixtureWithTeams[];
};

type SeasonMeta = {
  teamCount: number;
  matchweekCount: number;
  fixtureCount: number;
  reportedFixtureCount: number;
  grouped: MatchweekGroup[];
};

const STATUS_TONE = {
  draft: "neutral",
  active: "positive",
  completed: "info",
} as const;

export function SeasonsList({
  seasons,
  seasonMeta,
  activateSeason,
  updateSeason,
  generateSeasonSchedule,
}: {
  seasons: Season[];
  seasonMeta: Record<string, SeasonMeta>;
  activateSeason: (id: string) => Promise<AdminActionState>;
  updateSeason: (
    seasonId: string,
    prev: AdminActionState,
    formData: FormData
  ) => Promise<AdminActionState>;
  generateSeasonSchedule: (
    seasonId: string,
    startDate?: string
  ) => Promise<AdminActionState>;
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (seasons.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No seasons yet"
        description="Create your first season above, then generate a schedule to bring the league online."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {seasons.map((s) => {
        const meta = seasonMeta[s.id] ?? {
          teamCount: 0,
          matchweekCount: 0,
          fixtureCount: 0,
          reportedFixtureCount: 0,
          grouped: [],
        };
        const expanded = expandedId === s.id;
        const canGenerate =
          s.status === "draft" &&
          meta.teamCount >= 2 &&
          meta.matchweekCount === 0;
        const activateKey = `activate-${s.id}`;
        const generateKey = `generate-${s.id}`;
        const isActivating = pendingAction === activateKey;
        const isGenerating = pendingAction === generateKey;

        return (
          <li
            key={s.id}
            className="rounded-lg border border-outline-variant bg-surface-container-low"
          >
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() => setExpandedId(expanded ? null : s.id)}
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-on-surface-variant transition-transform",
                    expanded && "rotate-180"
                  )}
                />
                <div>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <StatusPill
                      tone={STATUS_TONE[s.status]}
                      pulse={s.status === "active"}
                    >
                      {s.status}
                    </StatusPill>
                  </span>
                  <p className="font-data text-xs text-on-surface-variant">
                    {meta.fixtureCount} fixtures · {meta.matchweekCount} matchweeks
                    · {meta.teamCount} teams
                  </p>
                </div>
              </button>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Link
                  href={`/admin/standings?season=${s.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Standings
                </Link>
                <Link
                  href={`/admin/fixtures?season=${s.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Fixtures
                </Link>
                {s.status === "completed" && (
                  <Link
                    href={`/history/${s.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Hall of Fame
                  </Link>
                )}
                {s.status === "active" && (
                  <EndSeasonDialog
                    seasonName={s.name}
                    seasonId={s.id}
                    totalFixtures={meta.fixtureCount}
                    reportedFixtures={meta.reportedFixtureCount}
                  />
                )}
                {s.status !== "active" && (
                  <Button
                    size="sm"
                    variant={s.status === "completed" ? "outline" : "default"}
                    loading={isActivating}
                    disabled={!!pendingAction}
                    onClick={() => {
                      setPendingAction(activateKey);
                      startTransition(async () => {
                        await activateSeason(s.id);
                        window.location.reload();
                      });
                    }}
                  >
                    {isActivating
                      ? "Activating…"
                      : s.status === "completed"
                        ? "Reopen"
                        : "Set Active"}
                  </Button>
                )}
              </div>
            </div>

            {expanded && (
              <div className="space-y-4 border-t border-outline-variant/60 px-4 py-4">
                {s.status === "draft" && (
                  <>
                    <SeasonEditForm season={s} updateSeason={updateSeason} />
                    {meta.matchweekCount > 0 && (
                      <p className="text-xs text-on-surface-variant">
                        Changing dates does not shift existing matchweek weekends.
                        Clear fixtures manually if you need a new schedule.
                      </p>
                    )}
                    {canGenerate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={isGenerating}
                        disabled={!!pendingAction}
                        onClick={() => {
                          setPendingAction(generateKey);
                          startTransition(async () => {
                            await generateSeasonSchedule(
                              s.id,
                              s.starts_at ?? undefined
                            );
                            window.location.reload();
                          });
                        }}
                      >
                        {isGenerating ? "Generating…" : "Generate Schedule"}
                      </Button>
                    )}
                  </>
                )}

                <div>
                  <h4 className="mb-2 font-display text-sm font-semibold text-primary">
                    Schedule
                  </h4>
                  <SeasonSchedule grouped={meta.grouped} />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
