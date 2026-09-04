import { ClipboardCheck } from "lucide-react";
import { getPendingSubmissionsForAdmin } from "@/lib/queries/submissions";
import { SubmissionResolver } from "@/components/admin/submission-resolver";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminReportsPage() {
  const items = await getPendingSubmissionsForAdmin();

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Pending reports
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Scores an opponent hasn&apos;t approved. Approving finalises the match
          and updates standings.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing waiting for review"
          description="Reports show up here when an opponent doesn't approve a submitted score."
        />
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
