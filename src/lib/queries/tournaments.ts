import { createClient } from "@/lib/supabase/server";

export type TournamentStatus = "draft" | "locked" | "active" | "completed";

export type TournamentSummary = {
  id: string;
  name: string;
  teamCount: number;
  status: TournamentStatus;
  signupOpensAt: string | null;
  signupClosesAt: string | null;
  entrantCount: number;
  createdAt: string;
};

export async function getTournaments(): Promise<TournamentSummary[]> {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (!tournaments?.length) return [];

  const { data: entrants } = await supabase
    .from("tournament_entrants")
    .select("tournament_id")
    .in(
      "tournament_id",
      tournaments.map((t) => t.id)
    );

  const counts = new Map<string, number>();
  for (const e of entrants ?? []) {
    counts.set(e.tournament_id, (counts.get(e.tournament_id) ?? 0) + 1);
  }

  return tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    teamCount: t.team_count,
    status: t.status,
    signupOpensAt: t.signup_opens_at,
    signupClosesAt: t.signup_closes_at,
    entrantCount: counts.get(t.id) ?? 0,
    createdAt: t.created_at,
  }));
}

export type TournamentEntrant = {
  id: string;
  profileId: string;
  teamName: string;
  eaId: string | null;
  crestSeed: string | null;
  eliminatedAt: string | null;
};

export type TournamentMatch = {
  id: string;
  slotIndex: number;
  entrantA: TournamentEntrant | null;
  entrantB: TournamentEntrant | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerEntrantId: string | null;
  isBye: boolean;
  status: "pending" | "ready" | "completed";
};

export type TournamentRoundVM = {
  id: string;
  roundNumber: number;
  name: string;
  matches: TournamentMatch[];
};

export type TournamentDetail = {
  id: string;
  name: string;
  teamCount: number;
  status: TournamentStatus;
  signupOpensAt: string | null;
  signupClosesAt: string | null;
  entrants: TournamentEntrant[];
  rounds: TournamentRoundVM[];
  champion: TournamentEntrant | null;
};

export async function getTournamentDetail(
  tournamentId: string
): Promise<TournamentDetail | null> {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) return null;

  const [{ data: rawEntrants }, { data: rawRounds }, { data: rawMatches }] =
    await Promise.all([
      supabase
        .from("tournament_entrants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at"),
      supabase
        .from("tournament_rounds")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_number"),
      supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("slot_index"),
    ]);

  const entrantById = new Map(
    (rawEntrants ?? []).map((e) => [
      e.id,
      {
        id: e.id,
        profileId: e.profile_id,
        teamName: e.team_name,
        eaId: e.ea_id,
        crestSeed: e.crest_seed,
        eliminatedAt: e.eliminated_at,
      } satisfies TournamentEntrant,
    ])
  );

  const matchesByRound = new Map<string, TournamentMatch[]>();
  for (const m of rawMatches ?? []) {
    const list = matchesByRound.get(m.round_id) ?? [];
    list.push({
      id: m.id,
      slotIndex: m.slot_index,
      entrantA: m.entrant_a_id ? (entrantById.get(m.entrant_a_id) ?? null) : null,
      entrantB: m.entrant_b_id ? (entrantById.get(m.entrant_b_id) ?? null) : null,
      scoreA: m.score_a,
      scoreB: m.score_b,
      winnerEntrantId: m.winner_entrant_id,
      isBye: m.is_bye,
      status: m.status,
    });
    matchesByRound.set(m.round_id, list);
  }

  const rounds: TournamentRoundVM[] = (rawRounds ?? []).map((r) => ({
    id: r.id,
    roundNumber: r.round_number,
    name: r.name,
    matches: (matchesByRound.get(r.id) ?? []).sort(
      (a, b) => a.slotIndex - b.slotIndex
    ),
  }));

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const champion =
    tournament.status === "completed" && finalMatch?.winnerEntrantId
      ? (entrantById.get(finalMatch.winnerEntrantId) ?? null)
      : null;

  return {
    id: tournament.id,
    name: tournament.name,
    teamCount: tournament.team_count,
    status: tournament.status,
    signupOpensAt: tournament.signup_opens_at,
    signupClosesAt: tournament.signup_closes_at,
    entrants: [...entrantById.values()],
    rounds,
    champion,
  };
}
