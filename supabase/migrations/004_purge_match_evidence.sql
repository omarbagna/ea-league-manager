-- Purge match evidence screenshots after 24 hours to save storage space.
-- Requires pg_cron (enable in Supabase Dashboard → Database → Extensions).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Deletes storage files and marks submission paths as purged
CREATE OR REPLACE FUNCTION purge_match_evidence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, extensions
AS $$
DECLARE
  purged_count INTEGER := 0;
  paths_to_purge TEXT[];
BEGIN
  -- Submissions older than 24h still pointing at real storage paths
  SELECT ARRAY_AGG(screenshot_path)
  INTO paths_to_purge
  FROM match_submissions
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND screenshot_path IS NOT NULL
    AND screenshot_path <> 'purged'
    AND screenshot_path NOT LIKE 'purged/%';

  IF paths_to_purge IS NOT NULL AND array_length(paths_to_purge, 1) > 0 THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'match-evidence'
      AND name = ANY(paths_to_purge);

    GET DIAGNOSTICS purged_count = ROW_COUNT;

    UPDATE match_submissions
    SET screenshot_path = 'purged',
        updated_at = NOW()
    WHERE screenshot_path = ANY(paths_to_purge);
  END IF;

  -- Safety net: remove any orphaned objects in bucket older than 24h
  DELETE FROM storage.objects
  WHERE bucket_id = 'match-evidence'
    AND created_at < NOW() - INTERVAL '24 hours';

  RETURN purged_count;
END;
$$;

-- Run every hour at minute 0 (idempotent: reschedule if migration re-run)
DO $cron$
BEGIN
  PERFORM cron.unschedule('purge-match-evidence');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$cron$;

SELECT cron.schedule(
  'purge-match-evidence',
  '0 * * * *',
  $$SELECT purge_match_evidence();$$
);

COMMENT ON FUNCTION purge_match_evidence IS
  'Removes match-evidence storage objects and submission screenshot paths older than 24 hours.';
