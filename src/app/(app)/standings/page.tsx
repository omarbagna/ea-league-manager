import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
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

export default async function StandingsPage() {
  const season = await getActiveSeason();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!season) {
    return (
      <div className="mx-auto max-w-[1280px] py-16 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-primary">
          League Standings
        </h2>
        <p className="mt-3 text-on-surface-variant">
          No season is active right now. The table appears here once your league
          admin starts one.
        </p>
      </div>
    );
  }

  const [standings, prevPositions, formByTeam] = await Promise.all([
    getStandings(season.id),
    getPreviousPositions(season.id),
    getFormByTeam(season.id),
  ]);

  const teamId = user ? await getCurrentUserTeamId(user.id, season.id) : null;

  const movement = new Map<string, number>();
  standings.forEach((row, i) => {
    const prev = prevPositions.get(row.team_id);
    if (prev !== undefined) movement.set(row.team_id, prev - (i + 1));
  });

  const anyPlayed = standings.some((r) => r.played > 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          League Standings
        </h2>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          {season.name}
          {anyPlayed && prevPositions.size > 0
            ? " · movement shown vs. last matchweek"
            : ""}
        </p>
      </div>

      {standings.length === 0 ? (
        <section className="rounded-xl border border-outline-variant bg-card p-10 text-center glow-effect">
          <p className="text-on-surface-variant">
            No teams are enrolled in {season.name} yet.
          </p>
          <p className="mt-2 text-sm text-outline">
            Once fixtures are played, the table fills in automatically.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
            <StandingsTable
              standings={standings}
              highlightTeamId={teamId ?? undefined}
              movement={movement}
              formByTeam={formByTeam}
            />
          </section>
          <LeagueSpotlight standings={standings} formByTeam={formByTeam} />
        </div>
      )}
    </div>
  );
}
