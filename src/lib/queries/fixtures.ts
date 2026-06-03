import { createClient } from "@/lib/supabase/server";
import type { Fixture, FixtureWithTeams, Team } from "@/types/database";

async function enrichFixtures(
  fixtures: Fixture[],
  matchweekMap?: Map<string, { number: number; starts_at: string | null; ends_at: string | null }>
): Promise<FixtureWithTeams[]> {
  if (!fixtures.length) return [];

  const supabase = await createClient();
  const teamIds = [
    ...new Set(fixtures.flatMap((f) => [f.home_team_id, f.away_team_id])),
  ];

  const { data: teams } = await supabase.from("teams").select("*").in("id", teamIds);

  const profileIds = (teams ?? [])
    .map((t) => t.profile_id)
    .filter((id): id is string => !!id);

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, ea_id, team_name").in("id", profileIds)
    : { data: [] };

  const teamMap = new Map(
    (teams ?? []).map((t) => {
      const profile = (profiles ?? []).find((p) => p.id === t.profile_id);
      return [
        t.id,
        {
          ...(t as Team),
          profile_id: t.profile_id,
          profile: profile
            ? { ea_id: profile.ea_id, team_name: profile.team_name }
            : undefined,
        },
      ];
    })
  );

  return fixtures.map((f) => {
    const mw = matchweekMap?.get(f.matchweek_id);
    return {
      ...f,
      home_team: teamMap.get(f.home_team_id)!,
      away_team: teamMap.get(f.away_team_id)!,
      matchweek: mw
        ? { number: mw.number, starts_at: mw.starts_at, ends_at: mw.ends_at }
        : undefined,
    };
  });
}

function sortFixturesByTeamName(fixtures: FixtureWithTeams[]): FixtureWithTeams[] {
  return [...fixtures].sort((a, b) => {
    const nameA = a.home_team?.name ?? "";
    const nameB = b.home_team?.name ?? "";
    return nameA.localeCompare(nameB);
  });
}

export async function getFixturesForSeason(
  seasonId: string,
  filter: "all" | "upcoming" | "completed" = "all"
) {
  const supabase = await createClient();

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("*")
    .eq("season_id", seasonId)
    .order("number");

  if (!matchweeks?.length) return [];

  const matchweekMap = new Map(
    matchweeks.map((mw) => [
      mw.id,
      { number: mw.number, starts_at: mw.starts_at, ends_at: mw.ends_at },
    ])
  );

  const result: {
    matchweek: (typeof matchweeks)[0];
    fixtures: FixtureWithTeams[];
  }[] = [];

  for (const mw of matchweeks) {
    let query = supabase.from("fixtures").select("*").eq("matchweek_id", mw.id);

    if (filter === "upcoming") {
      query = query.neq("status", "completed");
    } else if (filter === "completed") {
      query = query.eq("status", "completed");
    }

    const { data: fixtures } = await query;
    if (filter !== "all" && !fixtures?.length) continue;

    const enriched = await enrichFixtures(
      (fixtures ?? []) as Fixture[],
      matchweekMap
    );

    result.push({
      matchweek: mw,
      fixtures: sortFixturesByTeamName(enriched),
    });
  }

  return result;
}

export async function getNextFixture(
  seasonId: string,
  teamId: string
): Promise<FixtureWithTeams | null> {
  const supabase = await createClient();

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("id, number, starts_at, ends_at")
    .eq("season_id", seasonId)
    .order("number");

  if (!matchweeks?.length) return null;

  const matchweekMap = new Map(
    matchweeks.map((mw) => [mw.id, mw])
  );

  for (const mw of matchweeks) {
    const { data } = await supabase
      .from("fixtures")
      .select("*")
      .eq("matchweek_id", mw.id)
      .neq("status", "completed")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .limit(1)
      .maybeSingle();

    if (data) {
      const [enriched] = await enrichFixtures([data as Fixture], matchweekMap);
      if (enriched) {
        return {
          ...enriched,
          matchweek: {
            number: mw.number,
            starts_at: mw.starts_at,
            ends_at: mw.ends_at,
          },
        };
      }
    }
  }

  return null;
}

export async function getFixtureById(
  fixtureId: string
): Promise<FixtureWithTeams | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fixtures")
    .select("*, matchweek:matchweeks(number, season_id, starts_at, ends_at)")
    .eq("id", fixtureId)
    .single();

  if (!data) return null;
  const { matchweek, ...fixture } = data as Fixture & {
    matchweek?: {
      number: number;
      season_id: string;
      starts_at: string | null;
      ends_at: string | null;
    };
  };
  const [enriched] = await enrichFixtures([fixture as Fixture]);
  if (!enriched) return null;
  return { ...enriched, matchweek };
}
