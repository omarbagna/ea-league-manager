"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  StatusPill,
  REPORT_STATUS_TONE,
} from "@/components/ui/status-pill";
import { formatWeekendRange } from "@/lib/format-weekend";
import { cn } from "@/lib/utils";
import {
  formatFixtureReportLabel,
  resolveFixturePickerValue,
  type FixtureReportOption,
} from "@/lib/fixture-report-options";

export type { FixtureReportOption };

export function FixtureReportPicker({
  fixtures,
  selectedFixtureId,
  matchweek,
}: {
  fixtures: FixtureReportOption[];
  selectedFixtureId?: string;
  matchweek: {
    number: number;
    starts_at: string | null;
    ends_at: string | null;
  };
}) {
  const router = useRouter();
  const weekend = formatWeekendRange(matchweek.starts_at, matchweek.ends_at);

  if (fixtures.length === 0) {
    return null;
  }

  if (fixtures.length === 1) {
    const fixture = fixtures[0];
    return (
      <section className="mb-6 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-data text-xs uppercase tracking-widest text-primary">
            Matchweek {matchweek.number}
            {weekend ? ` · ${weekend}` : ""}
          </p>
          {fixture.statusHint && (
            <StatusPill
              tone={REPORT_STATUS_TONE[fixture.statusHint] ?? "neutral"}
            >
              {fixture.statusHint}
            </StatusPill>
          )}
        </div>
        <p className="mt-1 font-display text-lg font-semibold text-on-surface">
          {formatFixtureReportLabel(fixture, { includeHint: false })}
        </p>
      </section>
    );
  }

  const selectedValue = resolveFixturePickerValue(fixtures, selectedFixtureId);

  return (
    <section className="mb-6 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-data text-xs uppercase tracking-widest text-primary">
          Matchweek {matchweek.number}
          {weekend ? ` · ${weekend}` : ""}
        </p>
        <span className="font-data text-[11px] text-outline">
          {fixtures.length} fixtures
        </span>
      </div>

      {fixtures.length > 5 && (
        <div className="mb-3 max-w-xl">
          <Label
            htmlFor="fixture-report-select"
            className="sr-only"
          >
            Jump to a fixture
          </Label>
          <Select
            {...(selectedValue ? { value: selectedValue } : {})}
            onValueChange={(id) => router.push(`/matches/report?fixtureId=${id}`)}
          >
            <SelectTrigger id="fixture-report-select">
              <SelectValue placeholder="Jump to a fixture…" />
            </SelectTrigger>
            <SelectContent>
              {fixtures.map((fixture) => (
                <SelectItem key={fixture.id} value={fixture.id}>
                  {formatFixtureReportLabel(fixture)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {fixtures.map((fixture) => {
          const active = fixture.id === selectedFixtureId;
          return (
            <li key={fixture.id}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/matches/report?fixtureId=${fixture.id}`)
                }
                aria-current={active}
                className={cn(
                  "flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-primary-container/50 bg-primary-container/[0.08]"
                    : "border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high/40"
                )}
              >
                <span className="font-display font-semibold">
                  {fixture.homeTeamName}{" "}
                  <span className="font-normal text-outline">v</span>{" "}
                  {fixture.awayTeamName}
                </span>
                {fixture.statusHint && (
                  <StatusPill
                    tone={REPORT_STATUS_TONE[fixture.statusHint] ?? "neutral"}
                  >
                    {fixture.statusHint}
                  </StatusPill>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
