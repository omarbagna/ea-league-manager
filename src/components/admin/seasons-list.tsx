"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarRange, ChevronDown } from "lucide-react";
import type { Season } from "@/types/database";
import type { FixtureWithTeams } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { SeasonEditForm } from "@/components/admin/season-edit-form";
import { SeasonSchedule } from "@/components/admin/season-schedule";
import { EndSeasonDialog } from "@/components/admin/end-season-dialog";
import type { AdminActionState } from "@/actions/admin";
import { formatWeekendRange } from "@/lib/format-weekend";
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <span className="font-data text-[10px] uppercase tracking-wide text-outline">
        {label}
      </span>
      <span className="font-data text-base tabular text-on-surface">{value}</span>
    </div>
  );
}

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
    <div className="space-y-3">
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
        const dates = formatWeekendRange(s.starts_at, s.ends_at);
        const pct =
          meta.fixtureCount > 0
            ? Math.round((meta.reportedFixtureCount / meta.fixtureCount) * 100)
            : 0;

        return (
          <Card
            key={s.id}
            variant={s.status === "active" ? "accent" : "raised"}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                      {s.name}
                    </h3>
                    <StatusPill
                      tone={STATUS_TONE[s.status]}
                      pulse={s.status === "active"}
                    >
                      {s.status}
                    </StatusPill>
                  </div>
                  {dates && (
                    <p className="mt-0.5 font-data text-xs text-on-surface-variant">
                      {dates}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
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
                          : "Set active"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <Stat label="Teams" value={meta.teamCount} />
                <Stat label="Matchweeks" value={meta.matchweekCount} />
                <Stat label="Fixtures" value={meta.fixtureCount} />
                <div className="min-w-[160px] flex-1">
                  <div className="mb-1 flex items-baseline justify-between font-data text-[10px] uppercase tracking-wide text-outline">
                    <span>Reported</span>
                    <span className="tabular text-on-surface-variant">
                      {meta.reportedFixtureCount}/{meta.fixtureCount} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width]",
                        pct >= 100 ? "bg-secondary-fixed" : "bg-primary-container"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : s.id)}
                aria-expanded={expanded}
                className="flex items-center gap-1.5 self-start font-data text-xs text-primary-fixed transition-colors hover:text-primary"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
                {expanded ? "Hide details" : "Manage"}
              </button>
            </div>

            {expanded && (
              <div className="space-y-4 border-t border-outline-variant/60 bg-surface-container-lowest/60 p-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-data text-xs">
                  <Link
                    href={`/admin/fixtures?season=${s.id}`}
                    className="text-primary-fixed hover:underline"
                  >
                    Manage fixtures →
                  </Link>
                  <Link
                    href={`/admin/standings?season=${s.id}`}
                    className="text-primary-fixed hover:underline"
                  >
                    View standings →
                  </Link>
                  {s.status === "completed" && (
                    <Link
                      href={`/history/${s.id}`}
                      className="text-primary-fixed hover:underline"
                    >
                      Hall of Fame →
                    </Link>
                  )}
                </div>

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
                        {isGenerating ? "Generating…" : "Generate schedule"}
                      </Button>
                    )}
                  </>
                )}

                <div>
                  <h4 className="mb-2 font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Schedule
                  </h4>
                  <SeasonSchedule grouped={meta.grouped} />
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
