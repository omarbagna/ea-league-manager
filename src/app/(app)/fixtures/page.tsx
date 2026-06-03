import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import { getFixturesForSeason } from "@/lib/queries/fixtures";
import { FixturesClient } from "@/components/league/fixtures-client";

export default async function FixturesPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <div className="mx-auto max-w-[1024px] py-12 text-center text-on-surface-variant">
        No active season configured.
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userTeamId =
    user != null ? await getCurrentUserTeamId(user.id, season.id) : null;

  const grouped = await getFixturesForSeason(season.id, "all");

  return (
    <div className="mx-auto max-w-[1024px]">
      <FixturesClient
        grouped={grouped}
        seasonName={season.name}
        userTeamId={userTeamId}
        userProfileId={user?.id}
      />
    </div>
  );
}
