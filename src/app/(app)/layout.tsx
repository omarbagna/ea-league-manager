import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/season";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("email, role").eq("id", user.id).single()
    : { data: null };

  const season = await getActiveSeason();

  return (
    <AppShell
      seasonName={season?.name}
      userEmail={profile?.email}
      isAdmin={profile?.role === "admin"}
    >
      {children}
    </AppShell>
  );
}
