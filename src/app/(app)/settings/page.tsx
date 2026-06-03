import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name, ea_id")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-[1024px]">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold uppercase italic tracking-tight text-secondary-fixed">
          Settings
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Update your team name and EA ID shown across fixtures and standings.
        </p>
      </header>

      <ProfileSettingsForm
        defaultTeamName={profile?.team_name ?? ""}
        defaultEaId={profile?.ea_id ?? ""}
      />
    </div>
  );
}
