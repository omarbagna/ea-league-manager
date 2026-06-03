import { createServiceClient } from "@/lib/supabase/server";
import { enrollPlayerInActiveSeasonForm } from "@/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("status", "active")
    .maybeSingle();

  const { data: teams } = season
    ? await supabase
        .from("teams")
        .select("id, name, crest_seed, profile_id, created_at")
        .eq("season_id", season.id)
        .order("name")
    : { data: [] };

  const enrolledProfileIds = new Set(
    (teams ?? []).map((t) => t.profile_id).filter((id): id is string => !!id)
  );

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, email, ea_id, team_name, onboarding_complete, role, is_banned, created_at")
    .eq("is_banned", false)
    .order("created_at", { ascending: false });

  /** Identity saved at onboarding (profile row) — not the same as a season `teams` row */
  const profileRegistrations = (memberProfiles ?? []).filter(
    (p) => Boolean(p.team_name?.trim()) || p.onboarding_complete
  );

  const pendingEnrollment = profileRegistrations.filter(
    (p) => p.team_name?.trim() && !enrolledProfileIds.has(p.id)
  );

  const incompleteOnboarding = (memberProfiles ?? []).filter(
    (p) => !p.onboarding_complete && !p.team_name?.trim()
  );

  const profileIds = (teams ?? [])
    .map((t) => t.profile_id)
    .filter((id): id is string => !!id);

  const { data: enrolledProfiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, ea_id, team_name")
        .in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((enrolledProfiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Registered Teams</h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Onboarding saves a team name on a user&apos;s <strong>profile</strong> (players and
          admins). Before the active season&apos;s start date, onboarding adds them to the season
          automatically. After the season has started, use <strong>Awaiting enrollment</strong>{" "}
          below to add them manually.
        </p>
      </div>

      {params.error && (
        <p className="rounded-lg border border-error bg-error-container/20 px-4 py-3 text-sm text-error">
          {params.error}
        </p>
      )}
      {params.success && (
        <p className="rounded-lg border border-primary-container/30 bg-primary-container/10 px-4 py-3 text-sm text-primary-fixed">
          {params.success}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-on-surface">
          Registrations ({profileRegistrations.length})
        </h2>
        <p className="max-w-xl text-sm text-on-surface-variant">
          Everyone who completed onboarding (or has a team name on their profile), including admins.
          This list does not depend on the season being active.
        </p>
        {profileRegistrations.length === 0 ? (
          <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
            No registrations yet. Users must finish onboarding at{" "}
            <span className="text-on-surface">/onboarding</span> after signing in.
          </p>
        ) : (
          <ul className="space-y-2">
            {profileRegistrations.map((p) => {
              const inActiveSeason = enrolledProfileIds.has(p.id);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 rounded-lg border border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-semibold text-on-surface">
                      {p.team_name?.trim() || "(no team name)"}
                    </span>
                    {p.ea_id && (
                      <span className="ml-2 font-data text-xs text-primary">EA: {p.ea_id}</span>
                    )}
                    <p className="text-sm text-on-surface-variant">
                      {p.email}
                      {p.role === "admin" && (
                        <span className="ml-2 rounded bg-secondary-fixed/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary-fixed">
                          Admin
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={
                      inActiveSeason
                        ? "text-xs font-medium text-primary"
                        : "text-xs text-on-surface-variant"
                    }
                  >
                    {inActiveSeason
                      ? season
                        ? `Enrolled in ${season.name}`
                        : "Enrolled in active season"
                      : season
                        ? "Not in active season yet"
                        : "No active season — enroll after activation"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!season ? (
        <p className="rounded-lg border border-outline-variant/80 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          Activate a season on the Seasons page. Then use <strong>Awaiting enrollment</strong> below
          to add registered members into that season.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-on-surface">
              Awaiting enrollment ({pendingEnrollment.length})
            </h2>
            <p className="max-w-xl text-sm text-on-surface-variant">
              Registered members not yet in {season.name}. Use Add to season to create their team
              for fixtures and standings.
            </p>

            {pendingEnrollment.length === 0 ? (
              <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                No one waiting. If someone registered before the season went live, check{" "}
                <strong>Registrations</strong> above — they need a team name on their
                profile. If onboarding failed earlier, ask them to complete onboarding again or set
                their team name in Supabase.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingEnrollment.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 rounded-lg border border-primary-container/30 bg-primary-container/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-semibold text-on-surface">{p.team_name}</span>
                      {p.ea_id && (
                        <span className="ml-2 font-data text-xs text-primary">
                          EA: {p.ea_id}
                        </span>
                      )}
                      <p className="text-sm text-on-surface-variant">
                        {p.email}
                        {p.role === "admin" && (
                          <span className="ml-2 rounded bg-secondary-fixed/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary-fixed">
                            Admin
                          </span>
                        )}
                      </p>
                    </div>
                    <form action={enrollPlayerInActiveSeasonForm}>
                      <input type="hidden" name="profileId" value={p.id} />
                      <SubmitButton type="submit" size="sm" pendingText="Adding…">
                        Add to season
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-on-surface">
              Enrolled in {season.name} ({(teams ?? []).length})
            </h2>
            <p className="max-w-xl text-sm text-on-surface-variant">
              Rows in the season teams table (used for fixtures). Pre-season onboarding alone does
              not create these until you enroll.
            </p>

            {(teams ?? []).length === 0 ? (
              <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-on-surface-variant">
                No season teams yet. Add members from Awaiting enrollment above.
              </p>
            ) : (
              <ul className="space-y-2">
                {(teams ?? []).map((t) => {
                  const profile = t.profile_id ? profileMap.get(t.profile_id) : null;
                  return (
                    <li
                      key={t.id}
                      className="flex flex-col gap-1 rounded-lg border border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="font-semibold text-on-surface">{t.name}</span>
                        {profile?.ea_id && (
                          <span className="ml-2 font-data text-xs text-primary">
                            EA: {profile.ea_id}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        {profile?.email ?? "No manager linked"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {incompleteOnboarding.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-on-surface-variant">
            Accounts without registration ({incompleteOnboarding.length})
          </h2>
          <p className="text-xs text-on-surface-variant">
            Signed in but never finished onboarding (no team name saved).
          </p>
          <ul className="space-y-1 text-sm text-on-surface-variant">
            {incompleteOnboarding.slice(0, 5).map((p) => (
              <li key={p.id}>{p.email}</li>
            ))}
            {incompleteOnboarding.length > 5 && (
              <li>…and {incompleteOnboarding.length - 5} more</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
