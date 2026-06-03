import { createClient } from "@/lib/supabase/server";
import { promoteUserAction } from "@/actions/users";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-primary">Users</h1>
      <ul className="space-y-2">
        {(profiles ?? []).map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-3 rounded-lg border border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{p.email}</p>
              <p className="text-sm text-on-surface-variant">
                {p.team_name ?? "—"} · {p.ea_id ?? "—"} · {p.role}
              </p>
            </div>
            {p.role !== "admin" && (
              <form action={promoteUserAction}>
                <input type="hidden" name="profileId" value={p.id} />
                <SubmitButton type="submit" size="sm" variant="outline" pendingText="Promoting…">
                  Make Admin
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
