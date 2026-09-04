-- 022 only let a player insert their own tournament_entrants row
-- (profile_id = auth.uid()), so admin-added entrants (addEntrantManually)
-- were rejected by RLS even though the action itself checks the caller
-- is an admin. Postgres OR's multiple policies for the same command
-- together, so this adds the missing admin path alongside the existing
-- self-serve one rather than replacing it.
CREATE POLICY tournament_entrants_insert_admin ON tournament_entrants FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
