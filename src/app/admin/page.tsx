import Link from "next/link";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  ListChecks,
  ShieldAlert,
  Trophy,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/standings";
import {
  getAdminActionQueue,
  getRecentAdminActivity,
} from "@/lib/queries/admin-overview";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StandingsTableCard } from "@/components/league/standings-table";

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "critical";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="font-data text-[11px] uppercase tracking-wide text-on-surface-variant">
          {label}
        </span>
        <Icon
          className={
            tone === "critical" && value !== 0
              ? "size-4 text-error"
              : "size-4 text-outline"
          }
        />
      </div>
      <p
        className={`mt-2 font-data text-3xl tabular ${
          tone === "critical" && value !== 0 ? "text-error" : "text-on-surface"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-data text-[11px] text-outline">{hint}</p>
      )}
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: "/admin/seasons", label: "Seasons", icon: CalendarRange },
  { href: "/admin/fixtures", label: "Fixtures", icon: ListChecks },
  { href: "/admin/reports", label: "Reports", icon: ClipboardCheck },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
  { href: "/admin/standings", label: "Standings", icon: Trophy },
  { href: "/admin/users", label: "Users", icon: UserCog },
];

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  if (!season) {
    return (
      <div>
        <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-primary">
          League Admin
        </h1>
        <EmptyState
          icon={CalendarRange}
          title="No active season"
          description="Create a season and set it active to bring the league online."
          action={
            <Link
              href="/admin/seasons"
              className="font-data text-sm text-primary hover:underline"
            >
              Go to seasons →
            </Link>
          }
        />
      </div>
    );
  }

  const [
    { count: teams },
    { count: fixtures },
    { count: completed },
    queue,
    standings,
    activity,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("season_id", season.id),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
    supabase
      .from("fixtures")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    getAdminActionQueue(season.id),
    getStandings(season.id),
    getRecentAdminActivity(season.id),
  ]);

  const queueItems = [
    {
      count: queue.openDisputes,
      singular: "dispute to resolve",
      plural: "disputes to resolve",
      icon: Gavel,
      href: "/admin/disputes",
    },
    {
      count: queue.pendingNoShows,
      singular: "no-show report to review",
      plural: "no-show reports to review",
      icon: UserX,
      href: "/admin/forfeits",
    },
    {
      count: queue.unreportedPastDeadline,
      singular: "fixture unreported past its deadline",
      plural: "fixtures unreported past their deadline",
      icon: ShieldAlert,
      href: "/admin/fixtures",
    },
  ].filter((i) => i.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          League Admin
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Active season:{" "}
          <span className="text-on-surface">{season.name}</span>
        </p>
      </div>

      {/* Action queue */}
      {queueItems.length > 0 ? (
        <Card variant="accent" className="overflow-hidden">
          <div className="border-b border-outline-variant/60 bg-surface-container-low px-5 py-3">
            <h2 className="font-data text-xs uppercase tracking-widest text-primary">
              Needs your attention
            </h2>
          </div>
          <ul className="divide-y divide-outline-variant/50">
            {queueItems.map(({ count, singular, plural, icon: Icon, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-container-high/50"
                >
                  <Icon className="size-4 shrink-0 text-error" />
                  <span className="flex-1 text-sm">
                    <span className="font-data font-bold text-on-surface">
                      {count}
                    </span>{" "}
                    {count === 1 ? singular : plural}
                  </span>
                  <span className="font-data text-xs text-primary-fixed">
                    Review →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-secondary-fixed" />
          <p className="text-sm text-on-surface-variant">
            Queue is clear — no disputes, no-shows, or overdue fixtures.
          </p>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Registered teams"
          value={teams ?? 0}
          icon={Users}
          hint="in this season"
        />
        <KpiTile
          label="Fixtures played"
          value={`${completed ?? 0} / ${fixtures ?? 0}`}
          icon={ListChecks}
          hint={
            fixtures
              ? `${Math.round(((completed ?? 0) / fixtures) * 100)}% complete`
              : undefined
          }
        />
        <KpiTile
          label="Awaiting approval"
          value={queue.awaitingApproval}
          icon={ClipboardCheck}
          hint="opponent unconfirmed"
        />
        <KpiTile
          label="Open disputes"
          value={queue.openDisputes}
          icon={Gavel}
          tone="critical"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg border border-outline-variant bg-card px-3 py-4 text-center transition-colors hover:border-primary-container hover:bg-surface-container-high/50"
          >
            <Icon className="size-5 text-primary-fixed" />
            <span className="font-data text-xs uppercase tracking-wide text-on-surface-variant">
              {label}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {standings.length > 0 ? (
            <StandingsTableCard
              standings={standings.slice(0, 6)}
              title={`${season.name} — top of the table`}
              viewAllHref="/admin/standings"
              totalTeams={standings.length}
            />
          ) : (
            <Card className="p-6">
              <EmptyState
                compact
                icon={Trophy}
                title="No results yet"
                description="The table fills in as fixtures are reported."
              />
            </Card>
          )}
        </div>

        <Card variant="raised" className="overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-lg font-semibold text-primary">
              Recent activity
            </h3>
          </div>
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">
              Nothing recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/50">
              {activity.map((item, i) => (
                <li key={i} className="flex gap-3 px-4 py-3 text-sm">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      item.kind === "disqualification"
                        ? "bg-error"
                        : item.kind === "forfeit"
                          ? "bg-warn"
                          : "bg-secondary-fixed"
                    }`}
                  />
                  <span className="text-on-surface-variant">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
