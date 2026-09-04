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
      <div className="max-w-xl">
        <Label htmlFor="fixture-report-select" className="text-on-surface-variant">
          Matchweek {matchweek.number}
          {weekend ? ` · ${weekend}` : ""}
        </Label>
        <Select
          {...(selectedValue ? { value: selectedValue } : {})}
          onValueChange={(id) => router.push(`/matches/report?fixtureId=${id}`)}
        >
          <SelectTrigger id="fixture-report-select" className="mt-2">
            <SelectValue placeholder="Select a fixture to report" />
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
    </section>
  );
}
