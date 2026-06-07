import { getPendingSubmissionsForAdmin } from "@/lib/queries/submissions";
import { SubmissionResolver } from "@/components/admin/submission-resolver";

export default async function AdminReportsPage() {
  const items = await getPendingSubmissionsForAdmin();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-primary">Pending Match Reports</h1>
      <p className="max-w-2xl text-sm text-on-surface-variant">
        Review submitted scores when an opponent has not approved the result. Approving
        finalizes the match and updates standings.
      </p>
      {items.length === 0 ? (
        <p className="text-on-surface-variant">No pending match reports.</p>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <SubmissionResolver
              key={item.submission.id}
              submission={item.submission}
              homeName={item.homeName}
              awayName={item.awayName}
              matchweekNumber={item.matchweekNumber}
              submitterName={item.submitterName}
              opponentName={item.opponentName}
              screenshotUrl={item.screenshotUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
