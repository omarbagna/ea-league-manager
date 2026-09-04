import { getStandings } from "@/lib/standings";
import { createClient } from "@/lib/supabase/server";
import { StandingsTable } from "@/components/league/standings-table";
import { AdminStandingsSeasonSelect } from "@/components/admin/standings-season-select";

export default async function AdminStandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  if (!seasons?.length) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Standings</h1>
        <p className="mt-4 text-on-surface-variant">Create a season first.</p>
      </div>
    );
  }

  const activeSeason = seasons.find((s) => s.status === "active");
  const lastCompleted = seasons
    .filter((s) => s.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.ends_at ?? b.created_at).getTime() -
        new Date(a.ends_at ?? a.created_at).getTime()
    )[0];
  const selectedSeason =
    seasons.find((s) => s.id === seasonParam) ??
    activeSeason ??
    lastCompleted ??
    seasons[0];

  const standings = await getStandings(selectedSeason.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Standings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          League table for {selectedSeason.name}
        </p>
      </div>

      <AdminStandingsSeasonSelect
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        }))}
        selectedSeasonId={selectedSeason.id}
      />

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
        {standings.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant">
            No results recorded for this season yet.
          </p>
        ) : (
          <StandingsTable standings={standings} />
        )}
      </section>
    </div>
  );
}
