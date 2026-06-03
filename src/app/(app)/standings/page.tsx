import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import { getStandings } from "@/lib/standings";
import { createClient } from "@/lib/supabase/server";
import { StandingsTable } from "@/components/league/standings-table";

export default async function StandingsPage() {
  const season = await getActiveSeason();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!season) {
    return (
      <div className="py-12 text-center text-on-surface-variant">No active season.</div>
    );
  }

  const standings = await getStandings(season.id);
  const teamId = user ? await getCurrentUserTeamId(user.id, season.id) : null;

  return (
    <div className="mx-auto max-w-[1280px]">
      <h2 className="mb-6 font-display text-3xl font-bold italic text-primary uppercase">
        League Standings
      </h2>
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-[#0f1115] glow-effect">
        <StandingsTable standings={standings} highlightTeamId={teamId ?? undefined} />
      </section>
    </div>
  );
}
