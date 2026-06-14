ALTER TABLE teams
  ADD COLUMN disqualified_at TIMESTAMPTZ NULL;

CREATE OR REPLACE FUNCTION disqualify_team_prepare(
  p_team_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_season_id UUID;
  v_dq_at TIMESTAMPTZ;
  v_cutoff_mw_id UUID;
  v_cutoff_mw_number INT;
  v_fixture RECORD;
  v_winner_team_id UUID;
  v_home_score INT;
  v_away_score INT;
  v_forfeit_count INT := 0;
  v_active_team_ids UUID[];
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF v_team.disqualified_at IS NOT NULL THEN
    RAISE EXCEPTION 'Team is already disqualified';
  END IF;

  v_season_id := v_team.season_id;

  IF NOT EXISTS (SELECT 1 FROM matchweeks WHERE season_id = v_season_id) THEN
    RAISE EXCEPTION 'Season has no schedule';
  END IF;

  v_dq_at := NOW();

  UPDATE teams SET
    disqualified_at = v_dq_at,
    updated_at = v_dq_at
  WHERE id = p_team_id;

  SELECT mw.id, mw.number
  INTO v_cutoff_mw_id, v_cutoff_mw_number
  FROM matchweeks mw
  WHERE mw.season_id = v_season_id
    AND (
      (mw.starts_at IS NOT NULL AND mw.ends_at IS NOT NULL
        AND mw.starts_at <= v_dq_at::date AND mw.ends_at >= v_dq_at::date)
      OR (mw.starts_at IS NOT NULL AND mw.starts_at >= v_dq_at::date)
    )
  ORDER BY
    CASE
      WHEN mw.starts_at IS NOT NULL AND mw.ends_at IS NOT NULL
        AND mw.starts_at <= v_dq_at::date AND mw.ends_at >= v_dq_at::date
      THEN 0
      ELSE 1
    END,
    mw.number
  LIMIT 1;

  IF v_cutoff_mw_id IS NULL THEN
    RAISE EXCEPTION 'No matchweek found for disqualification cutoff';
  END IF;

  FOR v_fixture IN
    SELECT f.*
    FROM fixtures f
    JOIN matchweeks mw ON mw.id = f.matchweek_id
    WHERE mw.season_id = v_season_id
      AND mw.number >= v_cutoff_mw_number
      AND f.status <> 'completed'
      AND (f.home_team_id = p_team_id OR f.away_team_id = p_team_id)
  LOOP
    IF v_fixture.home_team_id = p_team_id THEN
      v_winner_team_id := v_fixture.away_team_id;
    ELSE
      v_winner_team_id := v_fixture.home_team_id;
    END IF;

    IF v_fixture.home_team_id = v_winner_team_id THEN
      v_home_score := 3;
      v_away_score := 0;
    ELSE
      v_home_score := 0;
      v_away_score := 3;
    END IF;

    UPDATE match_disputes md SET
      resolution = 'override',
      resolved_by = p_admin_id,
      resolved_at = NOW(),
      admin_notes = p_admin_notes
    FROM match_submissions ms
    WHERE md.submission_id = ms.id
      AND ms.fixture_id = v_fixture.id
      AND ms.status IN ('pending_approval', 'disputed')
      AND md.resolution = 'pending';

    UPDATE match_submissions SET
      status = 'rejected',
      updated_at = NOW()
    WHERE fixture_id = v_fixture.id
      AND status IN ('pending_approval', 'disputed');

    UPDATE forfeit_reports SET
      status = 'rejected',
      resolved_by = p_admin_id,
      resolved_at = NOW(),
      admin_notes = COALESCE(p_admin_notes, 'Superseded by season disqualification'),
      updated_at = NOW()
    WHERE fixture_id = v_fixture.id
      AND status = 'pending';

    UPDATE fixtures SET
      home_score = v_home_score,
      away_score = v_away_score,
      status = 'completed',
      forfeited_team_id = p_team_id,
      updated_at = NOW()
    WHERE id = v_fixture.id;

    v_forfeit_count := v_forfeit_count + 1;
  END LOOP;

  DELETE FROM fixtures f
  USING matchweeks mw
  WHERE f.matchweek_id = mw.id
    AND mw.season_id = v_season_id
    AND mw.number >= v_cutoff_mw_number
    AND f.status = 'scheduled';

  SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::UUID[])
  INTO v_active_team_ids
  FROM teams
  WHERE season_id = v_season_id
    AND disqualified_at IS NULL;

  RETURN jsonb_build_object(
    'season_id', v_season_id,
    'cutoff_matchweek_number', v_cutoff_mw_number,
    'disqualified_team_id', p_team_id,
    'disqualified_team_name', v_team.name,
    'active_team_ids', to_jsonb(v_active_team_ids),
    'forfeit_count', v_forfeit_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.disqualify_team_prepare(UUID, UUID, TEXT) TO authenticated;
