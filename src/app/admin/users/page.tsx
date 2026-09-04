import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersTable } from "@/components/admin/admin-users-table";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, team_name, ea_id, role, is_banned, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Users
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Everyone who has signed in. Promote admins, or ban an account to
          block access.
        </p>
      </div>

      <AdminUsersTable
        users={(profiles ?? []).map((p) => ({
          id: p.id,
          email: p.email,
          team_name: p.team_name,
          ea_id: p.ea_id,
          role: p.role,
          is_banned: p.is_banned,
        }))}
        currentUserId={user.id}
      />
    </div>
  );
}
