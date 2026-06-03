import { isBefore, parseISO, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/types/database";

/** True when onboarding may auto-create a season team (pre-season or before starts_at). */
export function canAutoEnrollInSeason(season: Pick<Season, "starts_at">): boolean {
  if (!season.starts_at) return true;
  const start = startOfDay(parseISO(season.starts_at));
  if (Number.isNaN(start.getTime())) return true;
  return isBefore(startOfDay(new Date()), start);
}

export async function shouldAutoEnrollInActiveSeason(): Promise<{
  season: Season | null;
  canEnroll: boolean;
}> {
  const season = await getActiveSeason();
  if (!season) return { season: null, canEnroll: false };
  return { season, canEnroll: canAutoEnrollInSeason(season) };
}

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function getCurrentUserTeamId(
  userId: string,
  seasonId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("profile_id", userId)
    .eq("season_id", seasonId)
    .maybeSingle();
  return data?.id ?? null;
}
