# Dark Elite League

Competitive league management platform built with **Next.js 15**, **Tailwind CSS v4**, **shadcn/ui**, and **Supabase**.

## Features

- Email and password authentication (Supabase Auth)
- Player onboarding (team name + EA ID)
- Dashboard: next fixture, standings, form, stats, season progress chart
- Fixtures hub with All / Upcoming / Completed filters
- Evidence-based score reporting with opponent approve/dispute
- Full admin: seasons, matchweeks, round-robin fixture generator, dispute resolution (teams are player-registered at onboarding)
- In-app notifications with Realtime updates

## Prerequisites

- **Node.js** 18.18+ (20+ recommended)
- **npm** 9+
- A [Supabase](https://supabase.com) account

## Setup

### Step 1 — Clone and install dependencies

From the project root:

```bash
cd /path/to/tournament-mode
npm install
```

### Step 2 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait until the database is ready, then open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep secret; server-only)

### Step 3 — Run database migrations

**Option A — Supabase CLI (recommended)**

Install and link the CLI, then push migrations:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Replace `YOUR_PROJECT_REF` with the ID from your project URL (`https://YOUR_PROJECT_REF.supabase.co`).

**Option B — SQL Editor (no CLI)**

In your terminal, print each migration file and **copy the SQL output** into Supabase **SQL → New query** (do not paste the `cat` command itself):

```bash
cat supabase/migrations/001_initial.sql
# copy everything printed → paste into SQL Editor → Run

cat supabase/migrations/002_storage.sql
# copy → paste → Run

cat supabase/migrations/003_teams_player_only.sql
cat supabase/migrations/004_purge_match_evidence.sql
cat supabase/migrations/005_fix_handle_new_user.sql
cat supabase/migrations/006_teams_admin_insert.sql
```

Or open each file in your code editor, copy all contents, paste into the SQL Editor, and click **Run**.

Run migrations **in order**: `001` → `002` → `003` → `004` → `005` → `006`.

> **"Database error saving new user"?** Paste and run only the SQL from [`supabase/migrations/005_fix_handle_new_user.sql`](supabase/migrations/005_fix_handle_new_user.sql) (see [Troubleshooting](#troubleshooting) below for the full script).

**Verify the screenshot purge job (optional):**

```sql
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'purge-match-evidence';
```

### Step 4 — Enable Supabase extensions and auth

**pg_cron** (required for 24h screenshot cleanup):

1. Dashboard → **Database → Extensions**
2. Search for `pg_cron` and enable it
3. If you used Option B for migrations, run `004_purge_match_evidence.sql` again after enabling pg_cron

**Email / password auth:**

1. Dashboard → **Authentication → Providers → Email**
2. Enable Email provider with **password sign-in**
3. **Disable magic link** (and OTP sign-in if shown separately)
4. Dashboard → **Authentication → Settings** — turn **Confirm email** off for immediate access after sign-up; set minimum password length to **8** (matches app validation)
5. Dashboard → **Authentication → URL Configuration** — add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   - Production equivalents, e.g. `https://your-domain.com/auth/callback` and `https://your-domain.com/auth/reset-password`

**Realtime (if not already on):**

1. Dashboard → **Database → Publications**
2. Confirm `supabase_realtime` includes `standings`, `match_submissions`, and `notifications` (migration `001` adds these)

### Step 5 — Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 6 — Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should be redirected to `/login`.

**Other useful commands:**

```bash
npm run build   # production build
npm run start   # run production build locally
npm run lint    # ESLint
```

### Step 7 — Create your admin account

1. Sign up or sign in at [http://localhost:3000/login](http://localhost:3000/login) with email and password. Existing users from before password auth should use **Forgot password** once to set a password.
2. In Supabase **SQL → New query**, promote your user (use the email you signed in with):

```sql
UPDATE profiles
SET role = 'admin', onboarding_complete = true
WHERE email = 'your@email.com';
```

3. Sign out and sign in again, or go to [http://localhost:3000/admin](http://localhost:3000/admin).

### Step 8 — Start a season (admin)

In the browser (as admin):

1. [http://localhost:3000/admin/seasons](http://localhost:3000/admin/seasons) — create a season, then click **Set Active**
2. Share [http://localhost:3000/login](http://localhost:3000/login) with players — they complete **onboarding** (team name + EA ID) even before a season is active
3. [http://localhost:3000/admin/teams](http://localhost:3000/admin/teams) — **Add to season** for onboarded players not yet enrolled (or they auto-join if they onboard while a season is active)
4. When at least **2 teams** exist: [http://localhost:3000/admin/fixtures](http://localhost:3000/admin/fixtures) — add matchweeks, **Generate Round-Robin**, or add fixtures manually

### Screenshot retention

Match evidence in the `match-evidence` bucket is **deleted after 24 hours**. The `purge_match_evidence` job (pg_cron, hourly) removes files and sets `screenshot_path` to `purged`. Opponents should approve or dispute within that window.

**Manual purge (testing):**

```sql
SELECT purge_match_evidence();
```

## Deploy checklist

**Vercel (example):**

```bash
npm run build
npx vercel
# or link and deploy
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add NEXT_PUBLIC_SITE_URL
npx vercel --prod
```

- [ ] All env vars set in Vercel (same as `.env.local`, with production `NEXT_PUBLIC_SITE_URL`)
- [ ] Supabase redirect URLs include `https://your-domain.com/auth/callback` and `https://your-domain.com/auth/reset-password`
- [ ] Supabase Email provider: password on, magic link off
- [ ] Migrations applied on production database (`supabase db push` or SQL Editor)
- [ ] `match-evidence` bucket exists (migration `002`)
- [ ] pg_cron enabled; job `purge-match-evidence` scheduled
- [ ] Realtime enabled for `standings`, `match_submissions`, `notifications`

## Project structure

```
src/app/(app)/     Player routes (dashboard, fixtures, standings, report)
src/app/admin/     League admin
src/app/login/     Sign in
src/app/signup/    Sign up
src/app/forgot-password/
src/app/auth/      Callback + password reset
src/components/    UI + league + matches + admin
src/actions/       Server actions
src/lib/           Supabase clients, queries, validations
supabase/          SQL migrations
```

## Troubleshooting

### "Database error saving new user"

This means the `handle_new_user` trigger failed when Supabase created your auth account.

**In Supabase SQL Editor**, paste this entire block and click **Run** (this is SQL, not a terminal command):

```sql
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

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO supabase_auth_admin;

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
```

Then retry sign-up or sign-in.

If a user was partially created, delete them in **Authentication → Users** and sign up again, or run:

```sql
DELETE FROM auth.users WHERE email = 'your@email.com';
```

## Design reference

UI tokens and layout are based on `stitch_eafc_league_manager/` mocks and `eafc_pro_league_project_brief.md`.
