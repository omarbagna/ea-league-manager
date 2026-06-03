-- Storage files must be deleted via the Storage API, not storage.objects.
-- App calls purgeSubmissionScreenshot() after finalize; DB only tracks purged paths.

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
  SET status = 'approved', updated_at = NOW()
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

DROP FUNCTION IF EXISTS purge_submission_screenshot(UUID);
