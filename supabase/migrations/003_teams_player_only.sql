-- Teams are created by players during onboarding only (not by admins)

-- One team per player per season
CREATE UNIQUE INDEX IF NOT EXISTS teams_one_per_player_per_season
  ON teams (season_id, profile_id)
  WHERE profile_id IS NOT NULL;

-- Replace broad admin ALL policy with update/delete only (no admin insert)
DROP POLICY IF EXISTS teams_admin ON teams;

CREATE POLICY teams_admin_update ON teams
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY teams_admin_delete ON teams
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Players register their own team at onboarding
CREATE POLICY teams_insert_own ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM teams existing
      WHERE existing.profile_id = auth.uid()
        AND existing.season_id = teams.season_id
    )
  );
