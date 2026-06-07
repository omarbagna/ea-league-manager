import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/standings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTableCard } from "@/components/league/standings-table";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: teams },
    { count: fixtures },
    { count: disputes },
    { count: pendingReports },
    { count: forfeits },
    { data: season },
  ] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
    supabase
      .from("match_disputes")
      .select("*", { count: "exact", head: true })
      .eq("resolution", "pending"),
    supabase
      .from("match_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("forfeit_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("seasons").select("*").eq("status", "active").maybeSingle(),
  ]);

  const standings = season ? await getStandings(season.id) : [];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-primary">League Admin</h1>
      <p className="text-on-surface-variant">
        Active season: {season?.name ?? "None — activate a season to go live"}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Registered Teams</CardTitle>
          </CardHeader>
          <CardContent className="font-data text-3xl">{teams ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fixtures</CardTitle>
          </CardHeader>
          <CardContent className="font-data text-3xl">{fixtures ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open Disputes</CardTitle>
          </CardHeader>
          <CardContent className="font-data text-3xl text-error">{disputes ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Reports</CardTitle>
          </CardHeader>
          <CardContent className="font-data text-3xl text-error">
            {pendingReports ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending No-Shows</CardTitle>
          </CardHeader>
          <CardContent className="font-data text-3xl text-error">{forfeits ?? 0}</CardContent>
        </Card>
      </div>

      {season && standings.length > 0 && (
        <StandingsTableCard
          standings={standings.slice(0, 5)}
          title={`${season.name} Standings`}
          viewAllHref="/admin/standings"
        />
      )}

      <div className="flex flex-wrap gap-4">
        <Link href="/admin/seasons" className="text-primary hover:underline">
          Manage seasons →
        </Link>
        <Link href="/admin/teams" className="text-primary hover:underline">
          View registered teams →
        </Link>
        <Link href="/admin/fixtures" className="text-primary hover:underline">
          Schedule fixtures →
        </Link>
        <Link href="/admin/standings" className="text-primary hover:underline">
          View league table →
        </Link>
        <Link href="/admin/reports" className="text-primary hover:underline">
          Review pending reports →
        </Link>
        <Link href="/admin/disputes" className="text-primary hover:underline">
          Resolve disputes →
        </Link>
        <Link href="/admin/forfeits" className="text-primary hover:underline">
          Review no-shows →
        </Link>
      </div>
    </div>
  );
}
