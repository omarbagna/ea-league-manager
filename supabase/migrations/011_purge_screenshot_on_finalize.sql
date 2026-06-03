-- Delete match evidence from storage when a result is finalized (not only after 24h cron).

CREATE OR REPLACE FUNCTION purge_submission_screenshot(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_path TEXT;
BEGIN
  SELECT screenshot_path INTO v_path
  FROM match_submissions
  WHERE id = p_submission_id;

  IF v_path IS NULL OR v_path = 'purged' OR v_path LIKE 'purged/%' THEN
    RETURN;
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'match-evidence'
    AND name = v_path;

  UPDATE match_submissions
  SET screenshot_path = 'purged',
      updated_at = NOW()
  WHERE id = p_submission_id;
END;
$$;

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
  PERFORM purge_submission_screenshot(p_submission_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_submission_screenshot(UUID) TO authenticated;
