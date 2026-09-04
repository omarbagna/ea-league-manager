-- Knockout tournament mode: standalone from the league season/team model.
-- Entrant identity is a snapshot taken from the player's profile at
-- opt-in time, not a live join to `teams`, so a tournament runs whether
-- or not a player currently has a league team.

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_count INT NOT NULL CHECK (team_count >= 2 AND (team_count & (team_count - 1)) = 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'active', 'completed')),
  signup_opens_at DATE,
  signup_closes_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_entrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  ea_id TEXT,
  crest_seed TEXT,
  seed INT,
  eliminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, profile_id)
);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, round_number)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  slot_index INT NOT NULL,
  entrant_a_id UUID REFERENCES tournament_entrants(id) ON DELETE SET NULL,
  entrant_b_id UUID REFERENCES tournament_entrants(id) ON DELETE SET NULL,
  score_a INT,
  score_b INT,
  winner_entrant_id UUID REFERENCES tournament_entrants(id) ON DELETE SET NULL,
  is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed')),
  feeds_into_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  feeds_into_slot TEXT CHECK (feeds_into_slot IN ('a', 'b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, slot_index)
);

CREATE INDEX IF NOT EXISTS tournament_entrants_tournament_idx ON tournament_entrants(tournament_id);
CREATE INDEX IF NOT EXISTS tournament_rounds_tournament_idx ON tournament_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS tournament_matches_tournament_idx ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS tournament_matches_round_idx ON tournament_matches(round_id);

-- Guards signups: only while the tournament is in `draft`, inside its
-- signup window (when one is set), and not yet full. Runs as SECURITY
-- DEFINER so it can read `tournaments` regardless of the caller's RLS,
-- even though that table is public-read anyway.
CREATE OR REPLACE FUNCTION tournament_entrants_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament tournaments%ROWTYPE;
  v_entrant_count INT;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = NEW.tournament_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_tournament.status <> 'draft' THEN
    RAISE EXCEPTION 'Signups are closed for this tournament';
  END IF;
  IF v_tournament.signup_opens_at IS NOT NULL AND CURRENT_DATE < v_tournament.signup_opens_at THEN
    RAISE EXCEPTION 'Signups have not opened yet';
  END IF;
  IF v_tournament.signup_closes_at IS NOT NULL AND CURRENT_DATE > v_tournament.signup_closes_at THEN
    RAISE EXCEPTION 'Signups have closed';
  END IF;

  SELECT COUNT(*) INTO v_entrant_count
  FROM tournament_entrants WHERE tournament_id = NEW.tournament_id;
  IF v_entrant_count >= v_tournament.team_count THEN
    RAISE EXCEPTION 'This tournament is full';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tournament_entrants_guard_trigger ON tournament_entrants;
CREATE TRIGGER tournament_entrants_guard_trigger
  BEFORE INSERT ON tournament_entrants
  FOR EACH ROW EXECUTE FUNCTION tournament_entrants_guard();

-- Generates the bracket for a tournament in `draft`: reads its current
-- entrants, delegates the seeding itself to application code (which
-- passes in the already-shuffled pairing plan as JSONB — the shuffle
-- and bye math live in src/lib/scheduling/single-elimination.ts, kept
-- out of SQL so it stays unit-testable), and writes rounds + matches
-- atomically. Round-1 byes are pre-resolved by the caller (is_bye=true,
-- a winner already set) so this function also carries their winner
-- forward into round 2 before returning.
CREATE OR REPLACE FUNCTION generate_tournament_bracket(
  p_tournament_id UUID,
  p_admin_id UUID,
  p_rounds JSONB -- [{round_number, name, matches: [{slot_index, entrant_a_id, entrant_b_id, is_bye, winner_entrant_id}]}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament tournaments%ROWTYPE;
  v_round JSONB;
  v_match JSONB;
  v_round_id UUID;
  v_round_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_tournament.status <> 'draft' THEN
    RAISE EXCEPTION 'This tournament''s bracket has already been generated';
  END IF;

  -- Pass 1: insert every round and match, feeds_into left NULL — round
  -- r+1's rows don't exist yet while round r is being inserted, so the
  -- forward link can't be known until every round is on disk.
  FOR v_round IN SELECT * FROM jsonb_array_elements(p_rounds) ORDER BY (value->>'round_number')::INT
  LOOP
    INSERT INTO tournament_rounds (tournament_id, round_number, name)
    VALUES (p_tournament_id, (v_round->>'round_number')::INT, v_round->>'name')
    RETURNING id INTO v_round_id;
    v_round_ids := array_append(v_round_ids, v_round_id);

    FOR v_match IN SELECT * FROM jsonb_array_elements(v_round->'matches')
    LOOP
      INSERT INTO tournament_matches (
        tournament_id, round_id, slot_index,
        entrant_a_id, entrant_b_id, is_bye, winner_entrant_id, status
      )
      VALUES (
        p_tournament_id, v_round_id, (v_match->>'slot_index')::INT,
        NULLIF(v_match->>'entrant_a_id', '')::UUID,
        NULLIF(v_match->>'entrant_b_id', '')::UUID,
        COALESCE((v_match->>'is_bye')::BOOLEAN, FALSE),
        NULLIF(v_match->>'winner_entrant_id', '')::UUID,
        CASE
          WHEN COALESCE((v_match->>'is_bye')::BOOLEAN, FALSE) THEN 'completed'
          WHEN v_match->>'entrant_a_id' IS NOT NULL AND v_match->>'entrant_b_id' IS NOT NULL THEN 'ready'
          ELSE 'pending'
        END
      );
    END LOOP;
  END LOOP;

  -- Pass 2: link every match to the one its winner advances into — the
  -- match in the next round whose slot_index is this one's slot_index / 2,
  -- filling slot 'a' for an even slot_index and 'b' for an odd one. The
  -- final round has no successor, so its matches keep feeds_into_match_id
  -- NULL.
  UPDATE tournament_matches src
  SET feeds_into_match_id = dst.id,
      feeds_into_slot = CASE WHEN src.slot_index % 2 = 0 THEN 'a' ELSE 'b' END
  FROM tournament_rounds src_r
  JOIN tournament_rounds dst_r
    ON dst_r.tournament_id = src_r.tournament_id
   AND dst_r.round_number = src_r.round_number + 1
  JOIN tournament_matches dst
    ON dst.round_id = dst_r.id
   AND dst.slot_index = src.slot_index / 2
  WHERE src.round_id = src_r.id
    AND src_r.tournament_id = p_tournament_id;

  -- A round-1 bye is already decided; carry its winner into round 2 now
  -- that the link exists (mirrors what report_tournament_match does for
  -- a normally-played match).
  UPDATE tournament_matches dst
  SET entrant_a_id = CASE WHEN src.feeds_into_slot = 'a' THEN src.winner_entrant_id ELSE dst.entrant_a_id END,
      entrant_b_id = CASE WHEN src.feeds_into_slot = 'b' THEN src.winner_entrant_id ELSE dst.entrant_b_id END
  FROM tournament_matches src
  WHERE src.tournament_id = p_tournament_id
    AND src.is_bye = TRUE
    AND src.feeds_into_match_id = dst.id;

  UPDATE tournament_matches
  SET status = 'ready', updated_at = NOW()
  WHERE tournament_id = p_tournament_id
    AND status = 'pending'
    AND entrant_a_id IS NOT NULL
    AND entrant_b_id IS NOT NULL;

  UPDATE tournaments SET status = 'active', updated_at = NOW() WHERE id = p_tournament_id;

  RETURN jsonb_build_object('tournament_id', p_tournament_id, 'round_ids', to_jsonb(v_round_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_tournament_bracket(UUID, UUID, JSONB) TO authenticated;

-- Records a knockout result (admin-entered — no dual-submission/dispute
-- pipeline for this mode) and, once both matches feeding a later round
-- are decided, carries their winners into it.
CREATE OR REPLACE FUNCTION report_tournament_match(
  p_match_id UUID,
  p_admin_id UUID,
  p_score_a INT,
  p_score_b INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match tournament_matches%ROWTYPE;
  v_winner_id UUID;
  v_next tournament_matches%ROWTYPE;
  v_next_ready BOOLEAN;
  v_tournament_completed BOOLEAN := FALSE;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_score_a = p_score_b THEN
    RAISE EXCEPTION 'A knockout match cannot end in a draw';
  END IF;

  SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.entrant_a_id IS NULL OR v_match.entrant_b_id IS NULL THEN
    RAISE EXCEPTION 'Both entrants must be known before reporting a result';
  END IF;

  v_winner_id := CASE WHEN p_score_a > p_score_b THEN v_match.entrant_a_id ELSE v_match.entrant_b_id END;

  UPDATE tournament_matches SET
    score_a = p_score_a,
    score_b = p_score_b,
    winner_entrant_id = v_winner_id,
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_match_id;

  UPDATE tournament_entrants SET eliminated_at = NOW()
  WHERE id = (CASE WHEN v_winner_id = v_match.entrant_a_id THEN v_match.entrant_b_id ELSE v_match.entrant_a_id END);

  IF v_match.feeds_into_match_id IS NOT NULL THEN
    IF v_match.feeds_into_slot = 'a' THEN
      UPDATE tournament_matches SET entrant_a_id = v_winner_id, updated_at = NOW()
      WHERE id = v_match.feeds_into_match_id;
    ELSE
      UPDATE tournament_matches SET entrant_b_id = v_winner_id, updated_at = NOW()
      WHERE id = v_match.feeds_into_match_id;
    END IF;

    SELECT * INTO v_next FROM tournament_matches WHERE id = v_match.feeds_into_match_id;
    v_next_ready := v_next.entrant_a_id IS NOT NULL AND v_next.entrant_b_id IS NOT NULL;
    IF v_next_ready THEN
      UPDATE tournament_matches SET status = 'ready', updated_at = NOW() WHERE id = v_next.id;
    END IF;
  ELSE
    -- No next match: this was the final.
    UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = v_match.tournament_id;
    v_tournament_completed := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'tournament_id', v_match.tournament_id,
    'winner_entrant_id', v_winner_id,
    'tournament_completed', v_tournament_completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_tournament_match(UUID, UUID, INT, INT) TO authenticated;

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournaments_select ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY tournaments_admin ON tournaments FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY tournament_entrants_select ON tournament_entrants FOR SELECT TO authenticated USING (true);
CREATE POLICY tournament_entrants_insert_own ON tournament_entrants FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY tournament_entrants_delete_admin ON tournament_entrants FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY tournament_rounds_select ON tournament_rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY tournament_rounds_admin ON tournament_rounds FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY tournament_matches_select ON tournament_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY tournament_matches_admin ON tournament_matches FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Realtime, for the bracket screen (Phase 4) to watch matches advance live.
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;
