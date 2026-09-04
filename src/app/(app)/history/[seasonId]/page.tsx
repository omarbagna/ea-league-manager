import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crosshair, Shield, Trophy } from "lucide-react";
import { getSeasonArchive } from "@/lib/queries/season-archive";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StandingsTable } from "@/components/league/standings-table";
import { TeamCrest } from "@/components/league/team-crest";
import { formatWeekendRange } from "@/lib/format-weekend";
import type { StandingRow } from "@/types/database";

function RecordCard({
  icon: Icon,
  label,
  row,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  row: StandingRow | null;
  value: string;
}) {
  if (!row) return null;
  return (
    <Card variant="raised" className="p-4">
      <span className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-wide text-on-surface-variant">
        <Icon className="size-3.5 text-primary-fixed" />
        {label}
      </span>
      <Link
        href={`/teams/${row.team_id}`}
        className="mt-2 flex items-center gap-2 hover:text-primary"
      >
        <TeamCrest
          name={row.team?.name ?? "—"}
          seed={row.team?.crest_seed}
          crestUrl={row.team?.crest_url}
          size="sm"
          className="size-7"
        />
        <span className="truncate font-display font-semibold">
          {row.team?.name ?? "—"}
        </span>
      </Link>
      <p className="mt-1 font-data text-xs text-primary-fixed">{value}</p>
    </Card>
  );
}

export default async function SeasonArchivePage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const archive = await getSeasonArchive(seasonId);
  if (!archive) notFound();

  const { season, table, topScorer, bestDefense, mostWins } = archive;
  const champion = table[0] ?? null;
  const range = formatWeekendRange(season.startsAt, season.endsAt);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 font-data text-xs text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Hall of Fame
      </Link>

      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          {season.name}
        </h2>
        {range && (
          <p className="mt-1 font-data text-sm text-on-surface-variant">
            {range} · final standings
          </p>
        )}
      </div>

      {table.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No final table"
          description="This season finished without any recorded results."
        />
      ) : (
        <>
          {champion && (
            <Card variant="accent" className="p-5">
              <span className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-widest text-secondary-fixed">
                <Trophy className="size-3.5" />
                Champions
              </span>
              <Link
                href={`/teams/${champion.team_id}`}
                className="mt-2 flex items-center gap-4 hover:text-primary"
              >
                <TeamCrest
                  name={champion.team?.name ?? "—"}
                  seed={champion.team?.crest_seed}
                  crestUrl={champion.team?.crest_url}
                  size="lg"
                />
                <div>
                  <p className="font-display text-2xl font-bold leading-tight">
                    {champion.team?.name ?? "—"}
                  </p>
                  <p className="mt-1 font-data text-sm text-on-surface-variant">
                    {champion.points} pts · {champion.won}W-{champion.drawn}D-
                    {champion.lost}L · GD{" "}
                    {champion.goal_difference > 0
                      ? `+${champion.goal_difference}`
                      : champion.goal_difference}
                  </p>
                </div>
              </Link>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <RecordCard
              icon={Crosshair}
              label="Most goals"
              row={topScorer}
              value={topScorer ? `${topScorer.goals_for} scored` : ""}
            />
            <RecordCard
              icon={Shield}
              label="Best defense"
              row={bestDefense}
              value={bestDefense ? `${bestDefense.goals_against} conceded` : ""}
            />
            <RecordCard
              icon={Trophy}
              label="Most wins"
              row={mostWins}
              value={mostWins ? `${mostWins.won} wins` : ""}
            />
          </div>

          <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
            <StandingsTable standings={table} totalTeams={table.length} />
          </section>
        </>
      )}
    </div>
  );
}
