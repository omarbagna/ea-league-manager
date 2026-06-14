import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planRegeneratedFixtures,
  type ExistingFixture,
} from "@/lib/scheduling/partial-regeneration";

export type DisqualifyPrepareResult = {
  season_id: string;
  cutoff_matchweek_number: number;
  disqualified_team_id: string;
  disqualified_team_name: string;
  active_team_ids: string[];
  forfeit_count: number;
};

export async function regenerateFixturesAfterDisqualification(
  supabase: SupabaseClient,
  prepare: DisqualifyPrepareResult
): Promise<{ fixturesCreated: number; matchweeksCreated: number }> {
  const { season_id, cutoff_matchweek_number, active_team_ids } = prepare;

  if (active_team_ids.length < 2) {
    return { fixturesCreated: 0, matchweeksCreated: 0 };
  }

  const { data: matchweeks, error: mwError } = await supabase
    .from("matchweeks")
    .select("id, number, starts_at, ends_at")
    .eq("season_id", season_id)
    .order("number");

  if (mwError || !matchweeks) {
    throw new Error(mwError?.message ?? "Failed to load matchweeks");
  }

  const matchweekIds = matchweeks.map((mw) => mw.id);
  const { data: fixtures, error: fixtureError } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, status, matchweek_id")
    .in("matchweek_id", matchweekIds);

  if (fixtureError) {
    throw new Error(fixtureError.message);
  }

  const matchweekNumberById = new Map(
    matchweeks.map((mw) => [mw.id, mw.number])
  );
  const activeSet = new Set(active_team_ids);

  const existingFixtures: ExistingFixture[] = (fixtures ?? [])
    .filter(
      (fixture) =>
        activeSet.has(fixture.home_team_id) &&
        activeSet.has(fixture.away_team_id)
    )
    .map((fixture) => ({
      home_team_id: fixture.home_team_id,
      away_team_id: fixture.away_team_id,
      status: fixture.status as ExistingFixture["status"],
      matchweek_number: matchweekNumberById.get(fixture.matchweek_id) ?? 0,
    }));

  const plan = planRegeneratedFixtures(
    season_id,
    active_team_ids,
    cutoff_matchweek_number,
    existingFixtures,
    matchweeks
  );

  const weekIdByNumber = new Map(matchweeks.map((mw) => [mw.number, mw.id]));

  if (plan.newMatchweeks.length > 0) {
    const { data: insertedWeeks, error: insertWeekError } = await supabase
      .from("matchweeks")
      .insert(plan.newMatchweeks)
      .select("id, number");

    if (insertWeekError || !insertedWeeks) {
      throw new Error(insertWeekError?.message ?? "Failed to create matchweeks");
    }

    for (const week of insertedWeeks) {
      weekIdByNumber.set(week.number, week.id);
    }
  }

  if (plan.plannedFixtures.length > 0) {
    const fixtureRows = plan.plannedFixtures.map((fixture) => {
      const matchweekId = weekIdByNumber.get(fixture.matchweek_number);
      if (!matchweekId) {
        throw new Error(`Missing matchweek id for week ${fixture.matchweek_number}`);
      }

      return {
        matchweek_id: matchweekId,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        status: "scheduled" as const,
        kickoff_at: null,
      };
    });

    const { error: insertFixtureError } = await supabase
      .from("fixtures")
      .insert(fixtureRows);

    if (insertFixtureError) {
      throw new Error(insertFixtureError.message);
    }
  }

  if (plan.seasonEndsAt) {
    const { error: seasonUpdateError } = await supabase
      .from("seasons")
      .update({ ends_at: plan.seasonEndsAt })
      .eq("id", season_id);

    if (seasonUpdateError) {
      throw new Error(seasonUpdateError.message);
    }
  }

  return {
    fixturesCreated: plan.plannedFixtures.length,
    matchweeksCreated: plan.newMatchweeks.length,
  };
}
