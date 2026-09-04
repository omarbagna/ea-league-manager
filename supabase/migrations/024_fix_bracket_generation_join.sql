-- 022's generate_tournament_bracket failed every time it ran (confirmed
-- live: "invalid reference to FROM-clause entry for table \"src\"") — its
-- feeds_into_match_id backfill UPDATE tried to reference the UPDATE
-- target's alias (`src`) inside a nested JOIN...ON clause within the FROM
-- list, which Postgres does not allow; `src` is only visible in the
-- top-level WHERE/SET. Fixed by moving every src-correlated condition
-- out of the JOINs and into WHERE (implicit cross join in FROM instead).
CREATE OR REPLACE FUNCTION generate_tournament_bracket(
  p_tournament_id UUID,
  p_admin_id UUID,
  p_rounds JSONB
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

  -- Link every match to the one its winner advances into. Every
  -- src-correlated condition lives in WHERE, not in a JOIN...ON, so `src`
  -- (the UPDATE target) stays visible throughout.
  UPDATE tournament_matches src
  SET feeds_into_match_id = dst.id,
      feeds_into_slot = CASE WHEN src.slot_index % 2 = 0 THEN 'a' ELSE 'b' END
  FROM tournament_rounds src_r,
       tournament_rounds dst_r,
       tournament_matches dst
  WHERE src.round_id = src_r.id
    AND src_r.tournament_id = p_tournament_id
    AND dst_r.tournament_id = src_r.tournament_id
    AND dst_r.round_number = src_r.round_number + 1
    AND dst.round_id = dst_r.id
    AND dst.slot_index = src.slot_index / 2;

  -- A round-1 bye is already decided; carry its winner into round 2 now
  -- that the link exists.
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
