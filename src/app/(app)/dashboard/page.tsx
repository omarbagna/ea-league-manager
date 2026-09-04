import Link from "next/link";
import { BarChart3, CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import {
  getStandings,
  getSeasonProgress,
  getPreviousPositions,
} from "@/lib/standings";
import { getNextFixture, getActiveMatchweekFixture } from "@/lib/queries/fixtures";
import { getRecentForm, getTeamStats } from "@/lib/queries/stats";
import { StandingsTableCard } from "@/components/league/standings-table";
import { ThisWeekBlock } from "@/components/league/this-week-block";
import { SeasonStatsStrip } from "@/components/league/season-stats-strip";
import { SeasonProgressChart } from "@/components/league/season-progress-chart";
import { formatWeekendRange } from "@/lib/format-weekend";
import { isMatchweekEnded, isMatchweekActive } from "@/lib/forfeit-eligibility";
import { getForfeitEligibility } from "@/lib/queries/forfeits";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const season = await getActiveSeason();

  if (!season || !user) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">
          Overview
        </h2>
        <EmptyState
          icon={CalendarOff}
          title="No season is running"
          description="Your dashboard lights up as soon as your league admin activates a season."
        />
      </div>
    );
  }

  const teamId = await getCurrentUserTeamId(user.id, season.id);
  const [standings, prevPositions] = await Promise.all([
    getStandings(season.id),
    getPreviousPositions(season.id),
  ]);

  const activeFixture = teamId
    ? await getActiveMatchweekFixture(season.id, teamId)
    : null;
  const nextFixture =
    activeFixture ?? (teamId ? await getNextFixture(season.id, teamId) : null);

  const opponentEntity =
    nextFixture && teamId
      ? nextFixture.home_team_id === teamId
        ? nextFixture.away_team
        : nextFixture.home_team
      : null;
  const myTeamEntity =
    nextFixture && teamId
      ? nextFixture.home_team_id === teamId
        ? nextFixture.home_team
        : nextFixture.away_team
      : null;
  const opponentTeamId = opponentEntity?.id ?? null;

  const [form, opponentForm, stats, progress, forfeitEligible] =
    await Promise.all([
      teamId ? getRecentForm(season.id, teamId) : Promise.resolve([]),
      opponentTeamId
        ? getRecentForm(season.id, opponentTeamId)
        : Promise.resolve([]),
      teamId
        ? getTeamStats(season.id, teamId)
        : Promise.resolve({
            goalsFor: 0,
            goalsAgainst: 0,
            cleanSheets: 0,
            maxGoals: 30,
          }),
      teamId ? getSeasonProgress(season.id, teamId) : Promise.resolve([]),
      nextFixture
        ? getForfeitEligibility(nextFixture.id, user.id).then((r) => r.eligible)
        : Promise.resolve(false),
    ]);

  const nextWeekend = nextFixture
    ? formatWeekendRange(
        (nextFixture.matchweek as { starts_at?: string | null })?.starts_at,
        (nextFixture.matchweek as { ends_at?: string | null })?.ends_at
      )
    : null;
  const nextMatchweek = nextFixture?.matchweek as
    | { starts_at?: string | null; ends_at?: string | null }
    | undefined;
  const nextMatchweekEndsAt = nextMatchweek?.ends_at;
  const matchweekLive = isMatchweekActive(
    nextMatchweek?.starts_at,
    nextMatchweek?.ends_at
  );

  // Standings window: your row with two above and two below.
  const myIndex = teamId
    ? standings.findIndex((r) => r.team_id === teamId)
    : -1;
  let windowStart = 0;
  if (myIndex >= 0) {
    windowStart = Math.min(
      Math.max(0, myIndex - 2),
      Math.max(0, standings.length - 5)
    );
  }
  const windowRows = standings.slice(windowStart, windowStart + 5);
  const myRow = myIndex >= 0 ? standings[myIndex] : null;

  const movement = new Map<string, number>();
  standings.forEach((row, i) => {
    const prev = prevPositions.get(row.team_id);
    if (prev !== undefined) movement.set(row.team_id, prev - (i + 1));
  });

  const leaderPoints = standings[0]?.points ?? null;

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">
            Overview
          </h2>
          <p className="mt-1 text-on-surface-variant">
            Welcome back to {season.name}.
          </p>
        </div>
        <StatusPill tone="live" pulse={matchweekLive}>
          {matchweekLive ? "Matchweek live" : "Season live"}
        </StatusPill>
      </div>

      {nextFixture && myTeamEntity && opponentEntity ? (
        <ThisWeekBlock
          fixtureId={nextFixture.id}
          matchweekNumber={
            (nextFixture.matchweek as { number?: number })?.number ?? "—"
          }
          weekendRange={nextWeekend}
          endsAt={nextMatchweekEndsAt}
          matchweekEnded={isMatchweekEnded(nextMatchweekEndsAt)}
          myTeam={{
            id: myTeamEntity.id,
            name: myTeamEntity.name,
            crestSeed: myTeamEntity.crest_seed,
            crestUrl: myTeamEntity.crest_url,
          }}
          opponent={{
            id: opponentEntity.id,
            name: opponentEntity.name,
            crestSeed: opponentEntity.crest_seed,
            crestUrl: opponentEntity.crest_url,
          }}
          opponentEaId={opponentEntity.profile?.ea_id ?? null}
          opponentForm={opponentForm}
          forfeitEligible={forfeitEligible}
        />
      ) : (
        <Card className="p-6">
          <EmptyState
            compact
            icon={CalendarOff}
            title="No upcoming fixture"
            description={
              teamId
                ? "You're all caught up for now. Your next matchweek will appear here."
                : "You're not enrolled in this season yet — your admin adds you when the season starts."
            }
          />
        </Card>
      )}

      {myRow && (
        <SeasonStatsStrip
          form={form}
          record={{ won: myRow.won, drawn: myRow.drawn, lost: myRow.lost }}
          goalsFor={stats.goalsFor}
          goalsAgainst={stats.goalsAgainst}
          cleanSheets={stats.cleanSheets}
        />
      )}

      {standings.length > 0 && (
        <StandingsTableCard
          standings={windowRows}
          highlightTeamId={teamId ?? undefined}
          movement={movement}
          positionOffset={windowStart}
          totalTeams={standings.length}
          title={myRow ? "Your position" : "League standings"}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
            <BarChart3 className="size-5" />
            Season Progress
          </h3>
          <div className="flex items-center gap-3 font-data text-xs text-on-surface-variant">
            {leaderPoints !== null && myRow && (
              <span>
                {myRow.points} pts · leader {leaderPoints}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary-container" />
              Points
            </span>
          </div>
        </div>
        <div className="p-4">
          <SeasonProgressChart data={progress} leaderPoints={leaderPoints} />
        </div>
      </section>

      <p className="text-center">
        <Link
          href="/standings"
          className="font-data text-xs text-on-surface-variant hover:text-primary hover:underline"
        >
          View the full league table →
        </Link>
      </p>
    </div>
  );
}
