-- Disputer must attach evidence; purged with submission on finalize.
ALTER TABLE match_disputes
  ADD COLUMN IF NOT EXISTS counter_screenshot_path TEXT;

CREATE OR REPLACE FUNCTION purge_submission_screenshot(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_path TEXT;
  v_dispute_path TEXT;
  r RECORD;
BEGIN
  SELECT screenshot_path INTO v_path
  FROM match_submissions
  WHERE id = p_submission_id;

  IF v_path IS NOT NULL AND v_path <> 'purged' AND v_path NOT LIKE 'purged/%' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'match-evidence' AND name = v_path;

    UPDATE match_submissions
    SET screenshot_path = 'purged', updated_at = NOW()
    WHERE id = p_submission_id;
  END IF;

  FOR r IN
    SELECT id, counter_screenshot_path
    FROM match_disputes
    WHERE submission_id = p_submission_id
  LOOP
    v_dispute_path := r.counter_screenshot_path;
    IF v_dispute_path IS NULL OR v_dispute_path = 'purged' OR v_dispute_path LIKE 'purged/%' THEN
      CONTINUE;
    END IF;

    DELETE FROM storage.objects
    WHERE bucket_id = 'match-evidence' AND name = v_dispute_path;

    UPDATE match_disputes
    SET counter_screenshot_path = 'purged'
    WHERE id = r.id;
  END LOOP;
END;
$$;
