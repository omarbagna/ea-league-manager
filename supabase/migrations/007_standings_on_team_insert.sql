-- Standings rows are created automatically when a team joins a season.
-- Player onboarding and admin enrollment only INSERT into teams; this trigger
-- runs as SECURITY DEFINER so it is not blocked by standings RLS (select-only).

CREATE OR REPLACE FUNCTION create_standings_for_team()
RETURNS TRIGGER AS $$
BEGIN
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
  VALUES (NEW.season_id, NEW.id, 0, 0, 0, 0, 0, 0, 0, 0)
  ON CONFLICT (season_id, team_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS teams_create_standings ON teams;

CREATE TRIGGER teams_create_standings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_standings_for_team();

-- Backfill any teams missing a standings row (e.g. failed onboarding before this fix)
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
SELECT t.season_id, t.id, 0, 0, 0, 0, 0, 0, 0, 0
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM standings s
  WHERE s.season_id = t.season_id AND s.team_id = t.id
);
