import { Users } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { enrollPlayerInActiveSeasonForm } from "@/actions/admin";
import { DisqualifyTeamDialog } from "@/components/admin/disqualify-team-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

function SectionCard({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {count !== undefined && (
            <span className="font-data text-xs text-on-surface-variant">
              {count}
            </span>
          )}
        </CardTitle>
        {hint && <p className="text-sm text-on-surface-variant">{hint}</p>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function MemberRow({
  name,
  eaId,
  email,
  pills,
  action,
}: {
  name: string;
  eaId?: string | null;
  email?: string | null;
  pills?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 border-b border-outline-variant/50 py-3 first:pt-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-on-surface">{name}</span>
          {eaId && (
            <span className="font-data text-xs text-primary-fixed">EA: {eaId}</span>
          )}
          {pills}
        </div>
        {email && (
          <p className="mt-0.5 font-data text-xs text-on-surface-variant">
            {email}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}

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
        .select("id, name, crest_seed, profile_id, created_at, disqualified_at")
        .eq("season_id", season.id)
        .order("name")
    : { data: [] };

  const { count: matchweekCount } = season
    ? await supabase
        .from("matchweeks")
        .select("*", { count: "exact", head: true })
        .eq("season_id", season.id)
    : { count: 0 };

  const hasSchedule = (matchweekCount ?? 0) > 0;

  const enrolledProfileIds = new Set(
    (teams ?? []).map((t) => t.profile_id).filter((id): id is string => !!id)
  );

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, email, ea_id, team_name, onboarding_complete, role, is_banned, created_at")
    .eq("is_banned", false)
    .order("created_at", { ascending: false });

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
    <div className="mx-auto max-w-[860px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Teams
        </h1>
        <p className="mt-1 max-w-2xl text-on-surface-variant">
          Onboarding saves a team name on a player&apos;s profile. Before the
          season&apos;s start date they join automatically; after it starts, add
          them from <strong>Awaiting enrollment</strong>.
        </p>
      </div>

      {params.error && (
        <p className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-error">
          {params.error}
        </p>
      )}
      {params.success && (
        <p className="rounded-lg border border-secondary-fixed/40 bg-secondary-fixed/10 px-4 py-3 text-sm text-secondary-fixed">
          {params.success}
        </p>
      )}

      <SectionCard
        title="Registrations"
        count={profileRegistrations.length}
        hint="Everyone with a team name on their profile, admins included. Independent of the active season."
      >
        {profileRegistrations.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="No registrations yet"
            description="Users complete onboarding at /onboarding after signing in."
          />
        ) : (
          <ul>
            {profileRegistrations.map((p) => {
              const inActiveSeason = enrolledProfileIds.has(p.id);
              return (
                <MemberRow
                  key={p.id}
                  name={p.team_name?.trim() || "(no team name)"}
                  eaId={p.ea_id}
                  email={p.email}
                  pills={
                    p.role === "admin" && (
                      <StatusPill tone="info">Admin</StatusPill>
                    )
                  }
                  action={
                    <StatusPill tone={inActiveSeason ? "positive" : "neutral"}>
                      {inActiveSeason
                        ? season
                          ? `In ${season.name}`
                          : "Enrolled"
                        : season
                          ? "Not in season"
                          : "Awaiting season"}
                    </StatusPill>
                  }
                />
              );
            })}
          </ul>
        )}
      </SectionCard>

      {!season ? (
        <Card variant="raised">
          <CardContent>
            <EmptyState
              compact
              icon={Users}
              title="No active season"
              description="Activate a season on the Seasons page, then enroll registered members into it here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionCard
            title="Awaiting enrollment"
            count={pendingEnrollment.length}
            hint={`Registered members not yet in ${season.name}. Add them to create their team for fixtures and standings.`}
          >
            {pendingEnrollment.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title="No one waiting"
                description="Registered members who need a team appear here once they've set a team name."
              />
            ) : (
              <ul>
                {pendingEnrollment.map((p) => (
                  <MemberRow
                    key={p.id}
                    name={p.team_name ?? "(no team name)"}
                    eaId={p.ea_id}
                    email={p.email}
                    pills={
                      p.role === "admin" && (
                        <StatusPill tone="info">Admin</StatusPill>
                      )
                    }
                    action={
                      <form action={enrollPlayerInActiveSeasonForm}>
                        <input type="hidden" name="profileId" value={p.id} />
                        <SubmitButton
                          type="submit"
                          size="sm"
                          pendingText="Adding…"
                        >
                          Add to season
                        </SubmitButton>
                      </form>
                    }
                  />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={`Enrolled in ${season.name}`}
            count={(teams ?? []).length}
            hint="Rows in the season teams table — these drive fixtures and standings."
          >
            {(teams ?? []).length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title="No season teams yet"
                description="Add members from Awaiting enrollment above."
              />
            ) : (
              <ul>
                {(teams ?? []).map((t) => {
                  const profile = t.profile_id
                    ? profileMap.get(t.profile_id)
                    : null;
                  const isDisqualified = Boolean(t.disqualified_at);
                  return (
                    <MemberRow
                      key={t.id}
                      name={t.name}
                      eaId={profile?.ea_id}
                      email={profile?.email ?? "No manager linked"}
                      pills={
                        isDisqualified && (
                          <StatusPill tone="critical">Disqualified</StatusPill>
                        )
                      }
                      action={
                        !isDisqualified && (
                          <DisqualifyTeamDialog
                            teamId={t.id}
                            teamName={t.name}
                            seasonName={season.name}
                            hasSchedule={hasSchedule}
                          />
                        )
                      }
                    />
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {incompleteOnboarding.length > 0 && (
        <SectionCard
          title="Accounts without registration"
          count={incompleteOnboarding.length}
          hint="Signed in but never finished onboarding — no team name saved."
        >
          <ul className="space-y-1 py-3 font-data text-xs text-on-surface-variant">
            {incompleteOnboarding.slice(0, 8).map((p) => (
              <li key={p.id}>{p.email}</li>
            ))}
            {incompleteOnboarding.length > 8 && (
              <li>…and {incompleteOnboarding.length - 8} more</li>
            )}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
