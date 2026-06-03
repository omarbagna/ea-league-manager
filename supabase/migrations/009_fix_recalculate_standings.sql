-- Supabase rejects UPDATE without WHERE; compute derived columns in INSERT instead.
CREATE OR REPLACE FUNCTION recalculate_standings(p_season_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM standings WHERE season_id = p_season_id;

  INSERT INTO standings (
    season_id,
    team_id,
    played,
    won,
    drawn,
    lost,
    goals_for,
    goals_against,
    goal_difference,
    points
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
