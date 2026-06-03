import type { SupabaseClient } from "@supabase/supabase-js";

export async function enrollPlayerInSeason(
  supabase: SupabaseClient,
  params: { profileId: string; teamName: string; seasonId: string }
): Promise<{ error?: string }> {
  const { profileId, teamName, seasonId } = params;

  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("profile_id", profileId)
    .eq("season_id", seasonId)
    .maybeSingle();

  if (existingTeam) {
    return {};
  }

  const crestSeed = teamName.slice(0, 2).toUpperCase();
  const { error: teamError } = await supabase.from("teams").insert({
    season_id: seasonId,
    name: teamName,
    crest_seed: crestSeed,
    profile_id: profileId,
  });

  if (teamError) {
    if (teamError.code === "23505") {
      return { error: "Team name already taken in this season." };
    }
    return { error: teamError.message };
  }

  // Standings row is created by DB trigger (teams_create_standings).
  return {};
}
