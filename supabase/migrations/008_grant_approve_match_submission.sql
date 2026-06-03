-- Allow authenticated clients to call approval RPC (server actions may also use service role).
GRANT EXECUTE ON FUNCTION public.approve_match_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_standings(UUID) TO authenticated;
