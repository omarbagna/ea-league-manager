-- Per-user notification preferences + Web Push subscriptions.

-- Opt-out preferences keyed by category ("deadlines", "results", "disputes",
-- "admin"). A missing key means the category is on.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- One row per browser/device push endpoint.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_own ON push_subscriptions;
CREATE POLICY push_subscriptions_own ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Deadline reminders skip anyone who turned the "deadlines" category off.
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

      -- Preference opt-out.
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = v_profile
          AND p.notification_prefs ->> 'deadlines' = 'false'
      );

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
