-- Track when a submission was finalized so admins can revert within 24 hours.

ALTER TABLE match_submissions
  ADD COLUMN approved_at TIMESTAMPTZ;

UPDATE match_submissions
SET approved_at = updated_at
WHERE status = 'approved' AND approved_at IS NULL;

CREATE OR REPLACE FUNCTION approve_match_submission(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub match_submissions%ROWTYPE;
  v_season_id UUID;
BEGIN
  SELECT * INTO v_sub FROM match_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  UPDATE match_submissions
  SET status = 'approved', approved_at = NOW(), updated_at = NOW()
  WHERE id = p_submission_id;

  UPDATE fixtures SET
    home_score = v_sub.home_score,
    away_score = v_sub.away_score,
    status = 'completed',
    updated_at = NOW()
  WHERE id = v_sub.fixture_id;

  SELECT mw.season_id INTO v_season_id
  FROM fixtures f
  JOIN matchweeks mw ON mw.id = f.matchweek_id
  WHERE f.id = v_sub.fixture_id;

  PERFORM recalculate_standings(v_season_id);
END;
$$;

CREATE OR REPLACE FUNCTION revert_match_submission(
  p_submission_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub match_submissions%ROWTYPE;
  v_fixture fixtures%ROWTYPE;
  v_season_id UUID;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_sub FROM match_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF v_sub.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved submissions can be reverted';
  END IF;

  IF v_sub.approved_at IS NULL OR v_sub.approved_at < NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Revert window has expired';
  END IF;

  SELECT * INTO v_fixture FROM fixtures WHERE id = v_sub.fixture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF v_fixture.status <> 'completed' THEN
    RAISE EXCEPTION 'Fixture is not completed';
  END IF;

  IF v_fixture.forfeited_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Forfeit results cannot be reverted';
  END IF;

  IF v_fixture.home_score IS DISTINCT FROM v_sub.home_score
     OR v_fixture.away_score IS DISTINCT FROM v_sub.away_score THEN
    RAISE EXCEPTION 'Fixture scores no longer match submission';
  END IF;

  UPDATE match_submissions
  SET status = 'rejected', updated_at = NOW()
  WHERE id = p_submission_id;

  UPDATE fixtures SET
    status = 'scheduled',
    home_score = NULL,
    away_score = NULL,
    forfeited_team_id = NULL,
    updated_at = NOW()
  WHERE id = v_sub.fixture_id;

  SELECT mw.season_id INTO v_season_id
  FROM matchweeks mw
  WHERE mw.id = v_fixture.matchweek_id;

  IF v_season_id IS NOT NULL THEN
    PERFORM recalculate_standings(v_season_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_match_submission(UUID, UUID) TO authenticated;
