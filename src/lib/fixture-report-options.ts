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
    homeTeamName: fixture.home_team?.name ?? "Unknown",
    awayTeamName: fixture.away_team?.name ?? "Unknown",
    homeEaId: fixture.home_team?.profile?.ea_id ?? null,
    awayEaId: fixture.away_team?.profile?.ea_id ?? null,
    statusHint,
  };
}

export function formatFixtureReportLabel(
  option: FixtureReportOption,
  { includeHint = true }: { includeHint?: boolean } = {}
): string {
  const home = `${option.homeTeamName} (${formatEaId(option.homeEaId)})`;
  const away = `${option.awayTeamName} (${formatEaId(option.awayEaId)})`;
  const base = `${home} vs ${away}`;
  return includeHint && option.statusHint
    ? `${base} — ${option.statusHint}`
    : base;
}

export function resolveFixturePickerValue(
  fixtures: FixtureReportOption[],
  selectedFixtureId?: string
): string | undefined {
  if (!selectedFixtureId) return undefined;
  return fixtures.some((f) => f.id === selectedFixtureId)
    ? selectedFixtureId
    : undefined;
}
