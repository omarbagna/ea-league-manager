-- Fix "Database error saving new user" on auth signup.
-- Cause: handle_new_user trigger could not insert into profiles (search_path / permissions).

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

-- Auth service role must reach public.profiles (Supabase auth triggers)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO supabase_auth_admin;

-- "FOR ALL" admin policy can block trigger-side inserts in some setups; use explicit UPDATE only
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
