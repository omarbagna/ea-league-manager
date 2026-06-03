-- Dark Elite League initial schema

CREATE TYPE user_role AS ENUM ('player', 'admin');
CREATE TYPE season_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE fixture_status AS ENUM ('scheduled', 'in_progress', 'completed', 'void');
CREATE TYPE submission_status AS ENUM ('pending_approval', 'approved', 'disputed', 'rejected');
CREATE TYPE dispute_resolution AS ENUM ('pending', 'approved', 'rejected', 'override');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  team_name TEXT,
  ea_id TEXT,
  role user_role NOT NULL DEFAULT 'player',
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status season_status NOT NULL DEFAULT 'draft',
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active season at a time
CREATE UNIQUE INDEX seasons_one_active_idx ON seasons (status) WHERE status = 'active';

CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  crest_url TEXT,
  crest_seed TEXT,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, name)
);

CREATE TABLE matchweeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  number INT NOT NULL,
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, number)
);

CREATE TABLE fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchweek_id UUID NOT NULL REFERENCES matchweeks(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  kickoff_at TIMESTAMPTZ,
  status fixture_status NOT NULL DEFAULT 'scheduled',
  home_score INT,
  away_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_team_id != away_team_id)
);

CREATE TABLE match_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_score INT NOT NULL CHECK (home_score >= 0),
  away_score INT NOT NULL CHECK (away_score >= 0),
  screenshot_path TEXT NOT NULL,
  status submission_status NOT NULL DEFAULT 'pending_approval',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES match_submissions(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  resolution dispute_resolution NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  override_home_score INT,
  override_away_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Standings cache per team per season
CREATE TABLE standings (
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played INT NOT NULL DEFAULT 0,
  won INT NOT NULL DEFAULT 0,
  drawn INT NOT NULL DEFAULT 0,
  lost INT NOT NULL DEFAULT 0,
  goals_for INT NOT NULL DEFAULT 0,
  goals_against INT NOT NULL DEFAULT 0,
  goal_difference INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, team_id)
);

-- Helper: get user's team for active season
CREATE OR REPLACE FUNCTION get_user_team_id(p_user_id UUID, p_season_id UUID)
RETURNS UUID AS $$
  SELECT t.id FROM teams t
  WHERE t.profile_id = p_user_id AND t.season_id = p_season_id
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Recalculate standings from completed fixtures (see 009_fix_recalculate_standings.sql for current body)
CREATE OR REPLACE FUNCTION recalculate_standings(p_season_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM standings WHERE season_id = p_season_id;

  INSERT INTO standings (
    season_id, team_id, played, won, drawn, lost,
    goals_for, goals_against, goal_difference, points
  )
  SELECT
    p_season_id,
    s.team_id,
    s.played,
    s.won,
    s.drawn,
    s.lost,
    s.goals_for,
    s.goals_against,
    s.goals_for - s.goals_against,
    s.won * 3 + s.drawn
  FROM (
    SELECT
      t.id AS team_id,
      COALESCE(SUM(CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END), 0)::INT AS played,
      COALESCE(SUM(CASE
        WHEN f.home_team_id = t.id AND f.home_score > f.away_score THEN 1
        WHEN f.away_team_id = t.id AND f.away_score > f.home_score THEN 1
        ELSE 0 END), 0)::INT AS won,
      COALESCE(SUM(CASE
        WHEN f.home_score = f.away_score
          AND (f.home_team_id = t.id OR f.away_team_id = t.id) THEN 1
        ELSE 0 END), 0)::INT AS drawn,
      COALESCE(SUM(CASE
        WHEN f.home_team_id = t.id AND f.home_score < f.away_score THEN 1
        WHEN f.away_team_id = t.id AND f.away_score < f.home_score THEN 1
        ELSE 0 END), 0)::INT AS lost,
      COALESCE(SUM(CASE
        WHEN f.home_team_id = t.id THEN f.home_score
        WHEN f.away_team_id = t.id THEN f.away_score
        ELSE 0 END), 0)::INT AS goals_for,
      COALESCE(SUM(CASE
        WHEN f.home_team_id = t.id THEN f.away_score
        WHEN f.away_team_id = t.id THEN f.home_score
        ELSE 0 END), 0)::INT AS goals_against
    FROM teams t
    LEFT JOIN fixtures f ON f.status = 'completed'
      AND (f.home_team_id = t.id OR f.away_team_id = t.id)
      AND f.matchweek_id IN (
        SELECT id FROM matchweeks WHERE season_id = p_season_id
      )
    WHERE t.season_id = p_season_id
    GROUP BY t.id
  ) AS s;
END;
$$;

-- Approve submission and finalize fixture
CREATE OR REPLACE FUNCTION approve_match_submission(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sub match_submissions%ROWTYPE;
  v_season_id UUID;
BEGIN
  SELECT * INTO v_sub FROM match_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  UPDATE match_submissions SET status = 'approved', updated_at = NOW() WHERE id = p_submission_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup (SECURITY DEFINER + search_path required for Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO supabase_auth_admin;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Seasons: read all authenticated, write admin
CREATE POLICY seasons_select ON seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY seasons_admin ON seasons FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY divisions_select ON divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY divisions_admin ON divisions FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY teams_select ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_admin ON teams FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY teams_update_own ON teams FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY matchweeks_select ON matchweeks FOR SELECT TO authenticated USING (true);
CREATE POLICY matchweeks_admin ON matchweeks FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY fixtures_select ON fixtures FOR SELECT TO authenticated USING (true);
CREATE POLICY fixtures_admin ON fixtures FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY standings_select ON standings FOR SELECT TO authenticated USING (true);

CREATE POLICY submissions_select ON match_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY submissions_insert ON match_submissions FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY submissions_update ON match_submissions FOR UPDATE TO authenticated
  USING (
    submitted_by = auth.uid()
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM fixtures f
      JOIN teams ht ON ht.id = f.home_team_id
      JOIN teams at ON at.id = f.away_team_id
      WHERE f.id = fixture_id
        AND (
          (ht.profile_id = auth.uid() OR at.profile_id = auth.uid())
          AND submitted_by != auth.uid()
        )
    )
  );

CREATE POLICY disputes_select ON match_disputes FOR SELECT TO authenticated USING (true);
CREATE POLICY disputes_insert ON match_disputes FOR INSERT TO authenticated
  WITH CHECK (raised_by = auth.uid());
CREATE POLICY disputes_admin ON match_disputes FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY notifications_select ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_update ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_insert ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

-- Storage bucket (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('match-evidence', 'match-evidence', false);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE standings;
ALTER PUBLICATION supabase_realtime ADD TABLE match_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
