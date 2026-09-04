import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/standings";
import type { StandingRow } from "@/types/database";

export type ArchivedSeasonSummary = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  teamCount: number;
  champion: StandingRow | null;
  runnerUp: StandingRow | null;
};

/** Completed seasons, newest first, each with its champion + runner-up. */
export async function getCompletedSeasons(): Promise<ArchivedSeasonSummary[]> {
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, starts_at, ends_at, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (!seasons?.length) return [];

  return Promise.all(
    seasons.map(async (s) => {
      const table = await getStandings(s.id);
      return {
        id: s.id,
        name: s.name,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        teamCount: table.length,
        champion: table[0] ?? null,
        runnerUp: table[1] ?? null,
      };
    })
  );
}

export type SeasonArchiveDetail = {
  season: { id: string; name: string; startsAt: string | null; endsAt: string | null };
  table: StandingRow[];
  topScorer: StandingRow | null;
  bestDefense: StandingRow | null;
  mostWins: StandingRow | null;
};

export async function getSeasonArchive(
  seasonId: string
): Promise<SeasonArchiveDetail | null> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, status, starts_at, ends_at")
    .eq("id", seasonId)
    .maybeSingle();

  if (!season || season.status !== "completed") return null;

  const table = await getStandings(seasonId);
  if (!table.length) {
    return {
      season: {
        id: season.id,
        name: season.name,
        startsAt: season.starts_at,
        endsAt: season.ends_at,
      },
      table: [],
      topScorer: null,
      bestDefense: null,
      mostWins: null,
    };
  }

  const played = table.filter((r) => r.played > 0);
  const topScorer =
    [...played].sort((a, b) => b.goals_for - a.goals_for)[0] ?? null;
  const bestDefense =
    [...played].sort(
      (a, b) => a.goals_against / a.played - b.goals_against / b.played
    )[0] ?? null;
  const mostWins = [...played].sort((a, b) => b.won - a.won)[0] ?? null;

  return {
    season: {
      id: season.id,
      name: season.name,
      startsAt: season.starts_at,
      endsAt: season.ends_at,
    },
    table,
    topScorer,
    bestDefense,
    mostWins,
  };
}
