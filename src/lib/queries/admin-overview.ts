import { createClient } from "@/lib/supabase/server";
import { todayUtcDateString } from "@/lib/forfeit-eligibility";

export type AdminActionQueue = {
  openDisputes: number;
  pendingNoShows: number;
  unreportedPastDeadline: number;
  awaitingApproval: number;
};

/**
 * The things that actually need an admin's attention, most-urgent first.
 * Disputes and no-show reports are not season-scoped in the schema, but in
 * practice only the active season has open ones.
 */
export async function getAdminActionQueue(
  seasonId: string
): Promise<AdminActionQueue> {
  const supabase = await createClient();
  const today = todayUtcDateString();

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("id, ends_at")
    .eq("season_id", seasonId);

  const endedMwIds = (matchweeks ?? [])
    .filter((m) => m.ends_at && m.ends_at < today)
    .map((m) => m.id);
  const allMwIds = (matchweeks ?? []).map((m) => m.id);

  const [disputes, noShows, unreported, approvals] = await Promise.all([
    supabase
      .from("match_disputes")
      .select("id", { count: "exact", head: true })
      .eq("resolution", "pending"),
    supabase
      .from("forfeit_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    endedMwIds.length
      ? supabase
          .from("fixtures")
          .select("id", { count: "exact", head: true })
          .in("matchweek_id", endedMwIds)
          .neq("status", "completed")
      : Promise.resolve({ count: 0 }),
    allMwIds.length
      ? supabase
          .from("match_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_approval")
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    openDisputes: disputes.count ?? 0,
    pendingNoShows: noShows.count ?? 0,
    unreportedPastDeadline: unreported.count ?? 0,
    awaitingApproval: approvals.count ?? 0,
  };
}

export type ActivityItem = {
  kind: "result" | "forfeit" | "disqualification";
  at: string;
  text: string;
};

/** Cheap recent-activity feed built from completed fixtures + disqualifications. */
export async function getRecentAdminActivity(
  seasonId: string,
  limit = 8
): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, disqualified_at")
    .eq("season_id", seasonId);

  const nameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("id")
    .eq("season_id", seasonId);
  const mwIds = (matchweeks ?? []).map((m) => m.id);

  const { data: fixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "home_team_id, away_team_id, home_score, away_score, forfeited_team_id, updated_at, status"
        )
        .in("matchweek_id", mwIds)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(limit)
    : { data: [] };

  const items: ActivityItem[] = [];

  for (const f of fixtures ?? []) {
    const home = nameById.get(f.home_team_id) ?? "—";
    const away = nameById.get(f.away_team_id) ?? "—";
    items.push({
      kind: f.forfeited_team_id ? "forfeit" : "result",
      at: f.updated_at,
      text: f.forfeited_team_id
        ? `Forfeit recorded — ${home} ${f.home_score}–${f.away_score} ${away}`
        : `Result confirmed — ${home} ${f.home_score}–${f.away_score} ${away}`,
    });
  }

  for (const t of teams ?? []) {
    if (t.disqualified_at) {
      items.push({
        kind: "disqualification",
        at: t.disqualified_at,
        text: `Team disqualified — ${t.name}`,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
