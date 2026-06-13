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
import { formatWeekendRange } from "@/lib/format-weekend";
import type { FixtureWithTeams } from "@/types/database";

export type FixtureReportOption = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeEaId: string | null;
  awayEaId: string | null;
  statusHint?: string;
};

function formatEaId(eaId: string | null | undefined): string {
  return eaId?.trim() || "—";
}

export function fixtureToReportOption(
  fixture: FixtureWithTeams,
  statusHint?: string
): FixtureReportOption {
  return {
    id: fixture.id,
    homeTeamName: fixture.home_team.name,
    awayTeamName: fixture.away_team.name,
    homeEaId: fixture.home_team.profile?.ea_id ?? null,
    awayEaId: fixture.away_team.profile?.ea_id ?? null,
    statusHint,
  };
}

export function formatFixtureReportLabel(option: FixtureReportOption): string {
  const home = `${option.homeTeamName} (${formatEaId(option.homeEaId)})`;
  const away = `${option.awayTeamName} (${formatEaId(option.awayEaId)})`;
  const base = `${home} vs ${away}`;
  return option.statusHint ? `${base} — ${option.statusHint}` : base;
}

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
        <p className="font-data text-xs uppercase tracking-widest text-primary">
          Matchweek {matchweek.number}
          {weekend ? ` · ${weekend}` : ""}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-on-surface">
          {formatFixtureReportLabel(fixture)}
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
      <div className="max-w-xl">
        <Label htmlFor="fixture-report-select" className="text-on-surface-variant">
          Matchweek {matchweek.number}
          {weekend ? ` · ${weekend}` : ""}
        </Label>
        <Select
          value={selectedFixtureId ?? fixtures[0]?.id}
          onValueChange={(id) => router.push(`/matches/report?fixtureId=${id}`)}
        >
          <SelectTrigger id="fixture-report-select" className="mt-2">
            <SelectValue placeholder="Select a fixture" />
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
