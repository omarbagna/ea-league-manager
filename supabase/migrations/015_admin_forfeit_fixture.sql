CREATE OR REPLACE FUNCTION admin_forfeit_fixture(
  p_fixture_id UUID,
  p_absent_team_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_fixture fixtures%ROWTYPE;
  v_winner_team_id UUID;
  v_home_score INT;
  v_away_score INT;
  v_season_id UUID;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_fixture FROM fixtures WHERE id = p_fixture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;
  IF v_fixture.status = 'completed' THEN
    RAISE EXCEPTION 'Fixture is already completed';
  END IF;

  IF v_fixture.home_team_id = p_absent_team_id THEN
    v_winner_team_id := v_fixture.away_team_id;
  ELSIF v_fixture.away_team_id = p_absent_team_id THEN
    v_winner_team_id := v_fixture.home_team_id;
  ELSE
    RAISE EXCEPTION 'Absent team is not part of this fixture';
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
    AND ms.fixture_id = p_fixture_id
    AND ms.status IN ('pending_approval', 'disputed')
    AND md.resolution = 'pending';

  UPDATE match_submissions SET
    status = 'rejected',
    updated_at = NOW()
  WHERE fixture_id = p_fixture_id
    AND status IN ('pending_approval', 'disputed');

  UPDATE forfeit_reports SET
    status = 'rejected',
    resolved_by = p_admin_id,
    resolved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, 'Superseded by admin forfeit'),
    updated_at = NOW()
  WHERE fixture_id = p_fixture_id
    AND status = 'pending';

  UPDATE fixtures SET
    home_score = v_home_score,
    away_score = v_away_score,
    status = 'completed',
    forfeited_team_id = p_absent_team_id,
    updated_at = NOW()
  WHERE id = p_fixture_id;

  SELECT mw.season_id INTO v_season_id
  FROM matchweeks mw
  WHERE mw.id = v_fixture.matchweek_id;

  IF v_season_id IS NOT NULL THEN
    PERFORM recalculate_standings(v_season_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_forfeit_fixture(UUID, UUID, UUID, TEXT) TO authenticated;
