import { UserX } from "lucide-react";
import { getPendingForfeitReportsForAdmin } from "@/lib/queries/forfeits";
import { ForfeitResolver } from "@/components/admin/forfeit-resolver";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminForfeitsPage() {
  const items = await getPendingForfeitReportsForAdmin();

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          No-shows
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Evidence from a player whose opponent didn&apos;t show after the
          matchweek closed. Approving records a 3–0 forfeit win.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={UserX}
          title="No no-show reports"
          description="These arrive when a player reports an absent opponent once a matchweek has ended."
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <ForfeitResolver
              key={item.report.id}
              report={item.report}
              homeName={item.fixture.home_team.name}
              awayName={item.fixture.away_team.name}
              matchweekNumber={(item.fixture.matchweek as { number?: number })?.number}
              reporterTeamName={item.reporterTeamName}
              absentTeamName={item.absentTeamName}
              previewScore={item.previewScore}
              screenshotUrl={item.screenshotUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
