"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notify";
import {
  buildSingleEliminationBracket,
  type Bracket,
} from "@/lib/scheduling/single-elimination";

export type TournamentActionState = { error?: string; success?: string };

const BRACKET_SIZES = [2, 4, 8, 16, 32, 64] as const;

async function requireAdminUser(): Promise<
  { user: { id: string } } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  return { user };
}

function revalidateTournamentPaths(tournamentId?: string) {
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  if (tournamentId) {
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}`);
  }
}

const tournamentSchema = z.object({
  name: z.string().min(2).max(80),
  teamCount: z.coerce
    .number()
    .int()
    .refine(
      (n) => BRACKET_SIZES.includes(n as (typeof BRACKET_SIZES)[number]),
      "Team count must be 2, 4, 8, 16, 32 or 64"
    ),
  signupOpensAt: z.string().optional(),
  signupClosesAt: z.string().optional(),
});

export async function createTournamentForm(formData: FormData) {
  await createTournament({}, formData);
}

export async function createTournament(
  _prev: TournamentActionState,
  formData: FormData
): Promise<TournamentActionState> {
  const admin = await requireAdminUser();
  if ("error" in admin) return { error: admin.error };

  const parsed = tournamentSchema.safeParse({
    name: formData.get("name"),
    teamCount: formData.get("teamCount"),
    signupOpensAt: formData.get("signupOpensAt") || undefined,
    signupClosesAt: formData.get("signupClosesAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid tournament data" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").insert({
    name: parsed.data.name,
    team_count: parsed.data.teamCount,
    status: "draft",
    signup_opens_at: parsed.data.signupOpensAt ?? null,
    signup_closes_at: parsed.data.signupClosesAt ?? null,
  });

  if (error) return { error: error.message };
  revalidateTournamentPaths();
  return { success: "Tournament created." };
}

/** Admin adds an already-registered player directly — for someone who
 *  missed the signup window, or before self opt-in exists at all. */
export async function addEntrantManually(
  tournamentId: string,
  profileId: string
): Promise<TournamentActionState> {
  const admin = await requireAdminUser();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, team_name, ea_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Player not found." };
  if (!profile.team_name?.trim()) {
    return { error: "This player hasn't set a team name yet." };
  }

  const { error } = await supabase.from("tournament_entrants").insert({
    tournament_id: tournamentId,
    profile_id: profile.id,
    team_name: profile.team_name,
    ea_id: profile.ea_id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That player is already entered." };
    }
    return { error: error.message };
  }

  revalidateTournamentPaths(tournamentId);
  return { success: "Entrant added." };
}

export async function removeEntrant(
  entrantId: string,
  tournamentId: string
): Promise<TournamentActionState> {
  const admin = await requireAdminUser();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_entrants")
    .delete()
    .eq("id", entrantId);

  if (error) return { error: error.message };
  revalidateTournamentPaths(tournamentId);
  return { success: "Entrant removed." };
}

/** Bracket JSON shape the `generate_tournament_bracket` RPC expects. */
function bracketToRpcPayload(bracket: Bracket) {
  return bracket.rounds.map((round) => ({
    round_number: round.roundNumber,
    name: round.name,
    matches: round.matches.map((m) => {
      // Only round 1 carries real slots (later rounds start as empty
      // placeholders); a bye is a round-1 match with exactly one entrant.
      const isBye =
        round.roundNumber === 1 &&
        (m.a.entrantId === null) !== (m.b.entrantId === null);
      return {
        slot_index: m.slotIndex,
        entrant_a_id: m.a.entrantId,
        entrant_b_id: m.b.entrantId,
        is_bye: isBye,
        winner_entrant_id: isBye ? (m.a.entrantId ?? m.b.entrantId) : null,
      };
    }),
  }));
}

export async function lockAndGenerateBracket(
  tournamentId: string
): Promise<TournamentActionState> {
  const admin = await requireAdminUser();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, team_count, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { error: "Tournament not found." };
  if (tournament.status !== "draft") {
    return { error: "This tournament's bracket has already been generated." };
  }

  const { data: entrants } = await supabase
    .from("tournament_entrants")
    .select("id, profile_id")
    .eq("tournament_id", tournamentId);

  if (!entrants || entrants.length < 2) {
    return { error: "At least 2 entrants are needed to generate a bracket." };
  }

  let bracket: Bracket;
  try {
    bracket = buildSingleEliminationBracket(
      entrants.map((e) => e.id),
      tournament.team_count
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not build the bracket." };
  }

  const service = await createServiceClient();
  const { error } = await service.rpc("generate_tournament_bracket", {
    p_tournament_id: tournamentId,
    p_admin_id: admin.user.id,
    p_rounds: bracketToRpcPayload(bracket),
  });

  if (error) return { error: error.message };

  const byProfile = new Map(entrants.map((e) => [e.id, e.profile_id]));
  const round1 = bracket.rounds[0];
  await Promise.all(
    round1.matches.flatMap((m) => {
      const notifs: Promise<void>[] = [];
      const aProfile = m.a.entrantId ? byProfile.get(m.a.entrantId) : null;
      const bProfile = m.b.entrantId ? byProfile.get(m.b.entrantId) : null;
      if (aProfile) {
        notifs.push(
          notifyUser(
            aProfile,
            "tournament_bracket_ready",
            `${tournament.name} bracket is set`,
            m.b.entrantId
              ? "Check the bracket for your first-round matchup."
              : "You drew a bye into round two.",
            { tournamentId }
          )
        );
      }
      if (bProfile) {
        notifs.push(
          notifyUser(
            bProfile,
            "tournament_bracket_ready",
            `${tournament.name} bracket is set`,
            "Check the bracket for your first-round matchup.",
            { tournamentId }
          )
        );
      }
      return notifs;
    })
  );

  revalidateTournamentPaths(tournamentId);
  return { success: "Bracket generated. The tournament is now active." };
}

const reportSchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.coerce.number().int().min(0),
  scoreB: z.coerce.number().int().min(0),
});

export async function reportKnockoutResult(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<TournamentActionState> {
  const admin = await requireAdminUser();
  if ("error" in admin) return { error: admin.error };

  const parsed = reportSchema.safeParse({ matchId, scoreA, scoreB });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid score" };
  }
  if (parsed.data.scoreA === parsed.data.scoreB) {
    return { error: "A knockout match can't end in a draw." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("tournament_matches")
    .select("entrant_a_id, entrant_b_id")
    .eq("id", matchId)
    .single();
  if (!match) return { error: "Match not found." };

  const { data: entrants } = await supabase
    .from("tournament_entrants")
    .select("id, profile_id, team_name")
    .in("id", [match.entrant_a_id, match.entrant_b_id].filter(Boolean));

  const service = await createServiceClient();
  const { data: result, error } = await service.rpc("report_tournament_match", {
    p_match_id: parsed.data.matchId,
    p_admin_id: admin.user.id,
    p_score_a: parsed.data.scoreA,
    p_score_b: parsed.data.scoreB,
  });

  if (error) return { error: error.message };

  const winnerId =
    result && typeof result === "object" && "winner_entrant_id" in result
      ? (result as { winner_entrant_id: string }).winner_entrant_id
      : null;
  const completed =
    result && typeof result === "object" && "tournament_completed" in result
      ? (result as { tournament_completed: boolean }).tournament_completed
      : false;

  await Promise.all(
    (entrants ?? []).map((e) => {
      if (!e.profile_id) return Promise.resolve();
      const won = e.id === winnerId;
      if (completed && won) {
        return notifyUser(
          e.profile_id,
          "tournament_champion",
          "You won the tournament!",
          `${e.team_name} is the champion.`,
          { tournamentId }
        );
      }
      return notifyUser(
        e.profile_id,
        won ? "tournament_advanced" : "tournament_eliminated",
        won ? "You're through to the next round" : "Tournament result",
        won
          ? "Your knockout match is over — you advance."
          : "You've been eliminated from the tournament.",
        { tournamentId }
      );
    })
  );

  revalidateTournamentPaths(tournamentId);
  return { success: "Result recorded." };
}
