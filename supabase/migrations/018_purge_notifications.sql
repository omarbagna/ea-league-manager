-- Purge notifications after 24 hours.
-- Requires pg_cron (enable in Supabase Dashboard → Database → Extensions).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION purge_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  purged_count INTEGER := 0;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;

DO $cron$
BEGIN
  PERFORM cron.unschedule('purge-notifications');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$cron$;

SELECT cron.schedule(
  'purge-notifications',
  '0 * * * *',
  $$SELECT purge_old_notifications();$$
);

COMMENT ON FUNCTION purge_old_notifications IS
  'Deletes notification rows older than 24 hours.';
