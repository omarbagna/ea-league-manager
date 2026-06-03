import { getPendingForfeitReportsForAdmin } from "@/lib/queries/forfeits";
import { ForfeitResolver } from "@/components/admin/forfeit-resolver";

export default async function AdminForfeitsPage() {
  const items = await getPendingForfeitReportsForAdmin();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-primary">No-Show Forfeits</h1>
      <p className="max-w-2xl text-sm text-on-surface-variant">
        Review evidence when a player reports their opponent did not show after the matchweek
        ended. Approving records a 3–0 forfeit win and updates standings.
      </p>
      {items.length === 0 ? (
        <p className="text-on-surface-variant">No pending no-show reports.</p>
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
