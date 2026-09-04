-- Matchweek deadline reminders.
-- Notifies both participants of any unreported fixture when its matchweek
-- window closes tomorrow ("deadline_soon") and again on the closing day
-- ("deadline_today"). Requires pg_cron (Database → Extensions).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Durable dedupe: survives the hourly notification purge so a reminder is
-- only ever enqueued once per (fixture, player, bucket).
CREATE TABLE IF NOT EXISTS reminder_log (
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fixture_id, user_id, kind)
);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the SECURITY DEFINER job below writes here.

CREATE OR REPLACE FUNCTION enqueue_deadline_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  sent_count INTEGER := 0;
  rec        RECORD;
  v_kind     TEXT;
  v_title    TEXT;
  v_body     TEXT;
  v_profile  UUID;
BEGIN
  FOR rec IN
    SELECT
      f.id                         AS fixture_id,
      mw.number                    AS mw_number,
      (mw.ends_at - CURRENT_DATE)  AS days_left,
      ht.profile_id                AS home_profile,
      at.profile_id                AS away_profile,
      ht.name                      AS home_name,
      at.name                      AS away_name
    FROM fixtures f
    JOIN matchweeks mw ON mw.id = f.matchweek_id
    JOIN seasons   s  ON s.id = mw.season_id AND s.status = 'active'
    JOIN teams     ht ON ht.id = f.home_team_id
    JOIN teams     at ON at.id = f.away_team_id
    WHERE f.status <> 'completed'
      AND mw.ends_at IS NOT NULL
      AND mw.ends_at BETWEEN CURRENT_DATE AND CURRENT_DATE + 1
  LOOP
    IF rec.days_left <= 0 THEN
      v_kind  := 'deadline_today';
      v_title := 'Report today — Matchweek ' || rec.mw_number;
      v_body  := rec.home_name || ' vs ' || rec.away_name ||
                 ' closes tonight. Submit your score before the window ends.';
    ELSE
      v_kind  := 'deadline_soon';
      v_title := 'Matchweek ' || rec.mw_number || ' closes tomorrow';
      v_body  := 'Report ' || rec.home_name || ' vs ' || rec.away_name ||
                 ' before tomorrow night.';
    END IF;

    FOREACH v_profile IN ARRAY ARRAY[rec.home_profile, rec.away_profile] LOOP
      CONTINUE WHEN v_profile IS NULL;

      -- Skip anyone who has already put a score in for this fixture.
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM match_submissions ms
        WHERE ms.fixture_id = rec.fixture_id
          AND ms.submitted_by = v_profile
          AND ms.status IN ('pending_approval', 'approved', 'disputed')
      );

      INSERT INTO reminder_log (fixture_id, user_id, kind)
      VALUES (rec.fixture_id, v_profile, v_kind)
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        INSERT INTO notifications (user_id, type, title, body, payload)
        VALUES (
          v_profile,
          'deadline_reminder',
          v_title,
          v_body,
          jsonb_build_object('fixture_id', rec.fixture_id, 'kind', v_kind)
        );
        sent_count := sent_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN sent_count;
END;
$$;

-- Run every four hours so the closing-day reminder reaches people whenever
-- they next open the app; reminder_log keeps it to one per bucket.
DO $cron$
BEGIN
  PERFORM cron.unschedule('deadline-reminders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$cron$;

SELECT cron.schedule(
  'deadline-reminders',
  '0 */4 * * *',
  $$SELECT enqueue_deadline_reminders();$$
);

COMMENT ON FUNCTION enqueue_deadline_reminders IS
  'Enqueues matchweek deadline reminder notifications for unreported fixtures (buckets: deadline_soon, deadline_today).';
