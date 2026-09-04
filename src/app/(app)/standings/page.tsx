import Link from "next/link";
import { Trophy } from "lucide-react";
import { getDisplaySeason, getCurrentUserTeamId } from "@/lib/season";
import {
  getStandings,
  getPreviousPositions,
  getFormByTeam,
} from "@/lib/standings";
import { createClient } from "@/lib/supabase/server";
import {
  StandingsTable,
  LeagueSpotlight,
} from "@/components/league/standings-table";
import { StandingsLiveRefresh } from "@/components/league/standings-live-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

export default async function StandingsPage() {
  const display = await getDisplaySeason();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!display) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <h2 className="mb-2 font-display text-3xl font-bold tracking-tight text-primary">
          League Standings
        </h2>
        <EmptyState
          icon={Trophy}
          title="No season is running"
          description="The league table appears here once your admin activates a season."
        />
      </div>
    );
  }

  const { season, isArchived } = display;

  const [standings, prevPositions, formByTeam] = await Promise.all([
    getStandings(season.id),
    isArchived ? Promise.resolve(new Map<string, number>()) : getPreviousPositions(season.id),
    getFormByTeam(season.id),
  ]);

  const teamId = user ? await getCurrentUserTeamId(user.id, season.id) : null;

  const movement = new Map<string, number>();
  if (!isArchived) {
    standings.forEach((row, i) => {
      const prev = prevPositions.get(row.team_id);
      if (prev !== undefined) movement.set(row.team_id, prev - (i + 1));
    });
  }

  const anyPlayed = standings.some((r) => r.played > 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
              League Standings
            </h2>
            {isArchived && <StatusPill tone="neutral">Final</StatusPill>}
          </div>
          <p className="mt-1 font-data text-sm text-on-surface-variant">
            {season.name}
            {isArchived
              ? " · final standings — no season is active"
              : anyPlayed && prevPositions.size > 0
                ? " · movement shown vs. last matchweek"
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/power-rankings"
            className="font-data text-xs text-primary-fixed hover:underline"
          >
            Power rankings →
          </Link>
          <Link
            href="/leaderboards"
            className="font-data text-xs text-primary-fixed hover:underline"
          >
            Leaderboards →
          </Link>
          <Link
            href="/history"
            className="font-data text-xs text-primary-fixed hover:underline"
          >
            Past champions →
          </Link>
        </div>
      </div>

      {standings.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={`No teams in ${season.name} yet`}
          description="The table fills in automatically once teams are enrolled and fixtures are played."
        />
      ) : (
        <div className="space-y-6">
          {!isArchived && <StandingsLiveRefresh seasonId={season.id} />}
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
            <StandingsTable
              standings={standings}
              highlightTeamId={teamId ?? undefined}
              movement={movement}
              formByTeam={formByTeam}
              animateReorder={!isArchived}
            />
          </section>
          <LeagueSpotlight standings={standings} formByTeam={formByTeam} />
        </div>
      )}
    </div>
  );
}
