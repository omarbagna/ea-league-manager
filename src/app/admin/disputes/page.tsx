import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import { teamNameForProfile } from "@/lib/queries/disputes";
import { getSubmissionScreenshotUrl } from "@/lib/queries/submission-screenshot";
import { DisputeResolver } from "@/components/admin/dispute-resolver";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  const { data: disputes } = await supabase
    .from("match_disputes")
    .select("*, submission:match_submissions(*)")
    .eq("resolution", "pending")
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (disputes ?? []).map(async (d) => {
      const sub = d.submission as {
        id: string;
        fixture_id: string;
        submitted_by: string;
        screenshot_path: string;
        home_score: number;
        away_score: number;
      } | null;

      if (!sub) return null;

      const fixture = await getFixtureById(sub.fixture_id);
      if (!fixture) return null;

      const submitterScreenshotUrl = await getSubmissionScreenshotUrl(
        sub.screenshot_path
      );
      const counterScreenshotUrl = await getSubmissionScreenshotUrl(
        d.counter_screenshot_path
      );

      const submitterName = teamNameForProfile(fixture, sub.submitted_by);
      const disputerName = teamNameForProfile(fixture, d.raised_by);

      return {
        dispute: d,
        homeName: fixture.home_team.name,
        awayName: fixture.away_team.name,
        homeEaId: fixture.home_team.profile?.ea_id,
        awayEaId: fixture.away_team.profile?.ea_id,
        matchweekNumber: (fixture.matchweek as { number?: number })?.number,
        submitterName,
        disputerName,
        submitterScore: {
          homeScore: sub.home_score,
          awayScore: sub.away_score,
        },
        counterScore:
          d.counter_home_score != null && d.counter_away_score != null
            ? {
                homeScore: d.counter_home_score,
                awayScore: d.counter_away_score,
              }
            : null,
        submitterScreenshotUrl,
        counterScreenshotUrl,
      };
    })
  );

  const items = enriched.filter((item): item is NonNullable<typeof item> => item != null);

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Disputes
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Compare both reported scores before approving, rejecting, or
          overriding the final result.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No open disputes"
          description="When a player disagrees with a submitted score, it lands here for you to settle."
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <DisputeResolver key={item.dispute.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
