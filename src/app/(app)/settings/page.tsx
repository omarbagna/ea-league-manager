import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/season";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import type { NotificationCategory } from "@/lib/notification-prefs";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-outline-variant/50 py-2.5 last:border-0">
      <span className="font-data text-xs uppercase tracking-wide text-outline">
        {label}
      </span>
      <span className="text-sm text-on-surface">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, season] = await Promise.all([
    supabase
      .from("profiles")
      .select("team_name, ea_id, role, created_at")
      .eq("id", user.id)
      .single(),
    getActiveSeason(),
  ]);

  // Tolerate migration 021 not being applied yet.
  const { data: prefRow } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();
  const notificationPrefs = ((prefRow as { notification_prefs?: unknown })
    ?.notification_prefs ?? {}) as Partial<Record<NotificationCategory, boolean>>;

  const joined = profile?.created_at
    ? format(new Date(profile.created_at), "d MMM yyyy")
    : "—";

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Settings
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Your team identity, account, and password.
        </p>
      </div>

      <Card variant="raised">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary-fixed" />
            Team identity
          </CardTitle>
          <p className="text-sm text-on-surface-variant">
            Shown across fixtures, standings and reporting
            {season ? ` — including ${season.name}` : ""}.
          </p>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            defaultTeamName={profile?.team_name ?? ""}
            defaultEaId={profile?.ea_id ?? ""}
          />
        </CardContent>
      </Card>

      <Card variant="raised">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <Row label="Email" value={user.email} />
          <Row
            label="Role"
            value={
              <StatusPill
                tone={profile?.role === "admin" ? "info" : "neutral"}
                icon={profile?.role === "admin" ? ShieldCheck : null}
              >
                {profile?.role ?? "player"}
              </StatusPill>
            }
          />
          <Row label="Joined" value={joined} />
        </CardContent>
      </Card>

      <Card variant="raised">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <p className="text-sm text-on-surface-variant">
            Choose what you&apos;re notified about, and turn on push for this
            device.
          </p>
        </CardHeader>
        <CardContent>
          <NotificationSettings initialPrefs={notificationPrefs} />
        </CardContent>
      </Card>

      <Card variant="raised">
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
