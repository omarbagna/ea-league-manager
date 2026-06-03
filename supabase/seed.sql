-- Dev seed: run after migrations with service role or SQL editor
-- Promote your user to admin after first signup:
-- UPDATE profiles SET role = 'admin', onboarding_complete = true WHERE email = 'you@example.com';

-- Example active season (uncomment to seed)
/*
INSERT INTO seasons (name, status, starts_at, ends_at)
VALUES ('Season 24', 'active', '2024-09-01', '2025-05-31')
ON CONFLICT DO NOTHING;
*/
