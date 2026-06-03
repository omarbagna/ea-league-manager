-- Admins enroll onboarded players into the active season
CREATE POLICY teams_admin_insert ON teams
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
