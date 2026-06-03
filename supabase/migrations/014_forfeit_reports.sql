CREATE TYPE forfeit_report_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE forfeit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  absent_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  notes TEXT,
  screenshot_path TEXT NOT NULL,
  status forfeit_report_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX forfeit_reports_one_pending_per_fixture
  ON forfeit_reports (fixture_id)
  WHERE status = 'pending';

ALTER TABLE fixtures
  ADD COLUMN forfeited_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION approve_forfeit_report(p_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_report forfeit_reports%ROWTYPE;
  v_fixture fixtures%ROWTYPE;
  v_reporter_team_id UUID;
  v_home_score INT;
  v_away_score INT;
  v_season_id UUID;
BEGIN
  SELECT * INTO v_report FROM forfeit_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forfeit report not found';
  END IF;
  IF v_report.status <> 'pending' THEN
    RAISE EXCEPTION 'Forfeit report is not pending';
  END IF;

  SELECT * INTO v_fixture FROM fixtures WHERE id = v_report.fixture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF v_fixture.home_team_id = v_report.absent_team_id THEN
    v_reporter_team_id := v_fixture.away_team_id;
  ELSIF v_fixture.away_team_id = v_report.absent_team_id THEN
    v_reporter_team_id := v_fixture.home_team_id;
  ELSE
    RAISE EXCEPTION 'Absent team is not part of this fixture';
  END IF;

  IF v_fixture.home_team_id = v_reporter_team_id THEN
    v_home_score := 3;
    v_away_score := 0;
  ELSE
    v_home_score := 0;
    v_away_score := 3;
  END IF;

  UPDATE forfeit_reports SET
    status = 'approved',
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id;

  UPDATE fixtures SET
    home_score = v_home_score,
    away_score = v_away_score,
    status = 'completed',
    forfeited_team_id = v_report.absent_team_id,
    updated_at = NOW()
  WHERE id = v_report.fixture_id;

  SELECT mw.season_id INTO v_season_id
  FROM matchweeks mw
  WHERE mw.id = v_fixture.matchweek_id;

  IF v_season_id IS NOT NULL THEN
    PERFORM recalculate_standings(v_season_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.approve_forfeit_report(UUID) TO authenticated;

ALTER TABLE forfeit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY forfeit_reports_select ON forfeit_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY forfeit_reports_insert ON forfeit_reports
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY forfeit_reports_update ON forfeit_reports
  FOR UPDATE TO authenticated
  USING (
    reported_by = auth.uid()
    OR is_admin(auth.uid())
  );

CREATE POLICY forfeit_reports_admin ON forfeit_reports
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));
