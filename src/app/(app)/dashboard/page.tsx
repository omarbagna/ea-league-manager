import Link from "next/link";
import { Calendar, TrendingUp, BarChart3, CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import { getStandings, getSeasonProgress } from "@/lib/standings";
import { getNextFixture, getActiveMatchweekFixture } from "@/lib/queries/fixtures";
import { getRecentForm, getTeamStats } from "@/lib/queries/stats";
import { StandingsTableCard } from "@/components/league/standings-table";
import { FormBadge } from "@/components/league/form-badge";
import { TeamCrest } from "@/components/league/team-crest";
import { SeasonProgressChart } from "@/components/league/season-progress-chart";
import { Button } from "@/components/ui/button";
import { formatWeekendRange } from "@/lib/format-weekend";
import { isMatchweekEnded } from "@/lib/forfeit-eligibility";
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
  const standings = await getStandings(season.id);
  const activeFixture = teamId
    ? await getActiveMatchweekFixture(season.id, teamId)
    : null;
  const nextFixture =
    activeFixture ??
    (teamId ? await getNextFixture(season.id, teamId) : null);
  const form = teamId ? await getRecentForm(season.id, teamId) : [];
  const stats = teamId
    ? await getTeamStats(season.id, teamId)
    : { goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, maxGoals: 30 };
  const progress = teamId ? await getSeasonProgress(season.id, teamId) : [];

  const opponent =
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

  const nextWeekend = nextFixture
    ? formatWeekendRange(
        (nextFixture.matchweek as { starts_at?: string | null; ends_at?: string | null })
          ?.starts_at,
        (nextFixture.matchweek as { starts_at?: string | null; ends_at?: string | null })
          ?.ends_at
      )
    : null;

  const nextMatchweekEndsAt = (
    nextFixture?.matchweek as { ends_at?: string | null } | undefined
  )?.ends_at;

  const forfeitEligible =
    nextFixture && user
      ? (await getForfeitEligibility(nextFixture.id, user.id)).eligible
      : false;

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold italic tracking-tight text-primary uppercase md:text-3xl">
            Overview
          </h2>
          <p className="mt-1 text-on-surface-variant">
            Welcome back. {season.name} is live.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-1 glow-effect">
          <span className="size-2 animate-pulse rounded-full bg-secondary-fixed" />
          <span className="font-data text-xs uppercase tracking-widest text-secondary-fixed">
            Season Live
          </span>
        </div>
      </div>

      {nextFixture && myTeamEntity && opponent && (
        <section className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-xl border border-outline-variant bg-card p-6 glow-effect md:flex-row md:p-10">
          <div className="relative z-10 text-center md:text-left">
            <span className="mb-2 flex items-center justify-center gap-1 font-data text-xs uppercase tracking-widest text-primary-fixed md:justify-start">
              <Calendar className="size-4" />
              Next Fixture
              {nextWeekend && ` — ${nextWeekend}`}
            </span>
            <h3 className="font-display text-4xl font-extrabold italic tracking-tighter text-surface-tint drop-shadow-md">
              Matchweek {(nextFixture.matchweek as { number?: number })?.number ?? "—"}
            </h3>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link href={`/matches/report?fixtureId=${nextFixture.id}`}>
                <Button>
                  {forfeitEligible ? "Report Match" : "Report Result"}
                </Button>
              </Link>
              <Link href="/matches/report">
                <Button variant="outline">Matchweek fixtures</Button>
              </Link>
              {forfeitEligible && (
                <Link href={`/matches/report?fixtureId=${nextFixture.id}`}>
                  <Button variant="outline" className="border-error/50 text-error">
                    Report No-Show
                  </Button>
                </Link>
              )}
            </div>
            {nextMatchweekEndsAt && isMatchweekEnded(nextMatchweekEndsAt) && !forfeitEligible && (
              <p className="mt-2 text-center text-xs text-on-surface-variant md:text-left">
                Matchweek ended — use the reporting hub if you need to dispute a result.
              </p>
            )}
          </div>
          <div className="relative z-10 flex items-center gap-6 md:gap-10">
            <div className="flex flex-col items-center gap-2">
              <TeamCrest
                name={myTeamEntity.name}
                seed={myTeamEntity.crest_seed}
                crestUrl={myTeamEntity.crest_url}
                size="lg"
                className="border-2 border-primary-container shadow-[0_0_15px_rgba(51,214,227,0.15)]"
              />
              <span className="font-display text-sm font-semibold uppercase">
                {myTeamEntity.name}
              </span>
            </div>
            <span className="font-display text-2xl italic text-outline-variant">VS</span>
            <div className="flex flex-col items-center gap-1">
              <TeamCrest
                name={opponent.name}
                seed={opponent.crest_seed}
                crestUrl={opponent.crest_url}
                size="lg"
              />
              <span className="font-display text-sm font-semibold uppercase text-on-surface-variant">
                {opponent.name}
              </span>
              {opponent.profile?.ea_id ? (
                <span className="font-data text-xs text-primary-fixed">
                  EA: {opponent.profile.ea_id}
                </span>
              ) : (
                <span className="font-data text-xs text-outline-variant">EA ID not set</span>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StandingsTableCard
            standings={standings.slice(0, 5)}
            highlightTeamId={teamId ?? undefined}
          />
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-outline-variant bg-surface-container p-4 glow-effect">
            <h4 className="mb-3 flex items-center gap-1 font-display font-semibold text-on-surface">
              <TrendingUp className="size-5 text-outline-variant" />
              Recent Form
            </h4>
            <div className="flex justify-between gap-1">
              {form.length ? (
                form.map((r, i) => <FormBadge key={i} result={r} />)
              ) : (
                <p className="text-sm text-on-surface-variant">No results yet</p>
              )}
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-outline-variant bg-card p-4 glow-effect">
            <h4 className="mb-4 font-display font-semibold text-on-surface">Team Stats</h4>
            <div className="space-y-4">
              <StatBar
                label="Goals Scored"
                value={stats.goalsFor}
                max={stats.maxGoals}
                color="bg-primary-container"
              />
              <StatBar
                label="Goals Conceded"
                value={stats.goalsAgainst}
                max={stats.maxGoals}
                color="bg-error"
              />
              <StatBar
                label="Clean Sheets"
                value={stats.cleanSheets}
                max={Math.max(stats.cleanSheets, 10)}
                color="bg-secondary-fixed"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
            <BarChart3 className="size-5" />
            Season Progress
          </h3>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-primary-container" />
            <span className="font-data text-xs uppercase text-on-surface-variant">Points</span>
          </div>
        </div>
        <div className="p-4">
          <SeasonProgressChart data={progress} />
        </div>
      </section>
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-data text-primary-fixed">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-container-high">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
