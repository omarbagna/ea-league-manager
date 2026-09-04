import { createClient } from "@/lib/supabase/server";
import { generateSeasonSchedule } from "@/actions/admin";
import { AdminFixturesPanel } from "@/components/admin/fixtures-panel";
import { AdminFixturesSeasonSelect } from "@/components/admin/fixtures-season-select";
import { getFixturesForSeason } from "@/lib/queries/fixtures";
import { getRevertableSubmissionsByFixtureIds } from "@/lib/queries/submissions";

export default async function AdminFixturesPage({
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
        <h1 className="font-display text-2xl font-bold text-primary">Fixtures</h1>
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

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("*")
    .eq("season_id", selectedSeason.id)
    .order("number");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", selectedSeason.id);

  const grouped = await getFixturesForSeason(selectedSeason.id, "all");

  const fixtureIds = grouped.flatMap((g) => g.fixtures.map((f) => f.id));
  const revertableByFixtureId =
    await getRevertableSubmissionsByFixtureIds(fixtureIds);

  return (
    <div className="space-y-6">
      <AdminFixturesSeasonSelect
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        }))}
        selectedSeasonId={selectedSeason.id}
      />
      <AdminFixturesPanel
        seasonId={selectedSeason.id}
        seasonName={selectedSeason.name}
        seasonStartsAt={selectedSeason.starts_at}
        seasonStatus={selectedSeason.status}
        matchweeks={matchweeks ?? []}
        teams={teams ?? []}
        grouped={grouped}
        revertableByFixtureId={revertableByFixtureId}
        generateSeasonSchedule={generateSeasonSchedule}
      />
    </div>
  );
}
