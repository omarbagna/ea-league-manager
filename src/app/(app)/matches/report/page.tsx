import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import { getFixtureById } from "@/lib/queries/fixtures";
import {
  getFixturePendingSubmissions,
  getMyPendingSubmissionForUser,
  getPendingApprovalForUser,
} from "@/lib/queries/submissions";
import { getSubmissionScreenshotUrl } from "@/lib/queries/submission-screenshot";
import { ReportMatchForm } from "@/components/matches/report-match-form";
import { PendingApprovalPanel } from "@/components/matches/pending-approval-panel";
import { AwaitingApprovalPanel } from "@/components/matches/awaiting-approval-panel";
import { DisputedMatchPanel } from "@/components/matches/disputed-match-panel";
import { getActiveDisputeForUser } from "@/lib/queries/disputes";

export default async function ReportMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ fixtureId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const season = await getActiveSeason();
  if (!season || !user) {
    return (
      <div className="mx-auto max-w-[1280px] py-12 text-center text-on-surface-variant">
        Unable to load reporting hub.
      </div>
    );
  }

  const teamId = await getCurrentUserTeamId(user.id, season.id);

  const pendingToApprove = await getPendingApprovalForUser(user.id);
  const myPendingSubmission = await getMyPendingSubmissionForUser(user.id);
  const activeDispute = await getActiveDisputeForUser(user.id);

  const fixture = params.fixtureId
    ? await getFixtureById(params.fixtureId)
    : null;

  const fixtureSubmissions = fixture
    ? await getFixturePendingSubmissions(fixture.id)
    : [];

  const hasDisputedFixture =
    fixture &&
    (await supabase
      .from("match_submissions")
      .select("id")
      .eq("fixture_id", fixture.id)
      .eq("status", "disputed")
      .maybeSingle()).data != null;

  const mySubmissionForFixture = fixtureSubmissions.find(
    (s) => s.submitted_by === user.id
  );
  const opponentSubmissionForFixture = fixtureSubmissions.find(
    (s) => s.submitted_by !== user.id
  );

  const activePendingApproval =
    pendingToApprove &&
    (!fixture || pendingToApprove.fixture.id === fixture.id)
      ? pendingToApprove
      : null;

  const activeMySubmission = mySubmissionForFixture
    ? fixture
      ? { submission: mySubmissionForFixture, fixture }
      : null
    : myPendingSubmission &&
        (!fixture || myPendingSubmission.fixture.id === fixture.id)
      ? myPendingSubmission
      : null;

  const showDisputePanel =
    activeDispute &&
    (!fixture || activeDispute.fixture.id === fixture.id);

  const showApprovalPanel = !!activePendingApproval && !showDisputePanel;
  const showAwaitingPanel =
    !!activeMySubmission && !showApprovalPanel && !showDisputePanel;

  const opponentScreenshotUrl = activePendingApproval
    ? await getSubmissionScreenshotUrl(
        activePendingApproval.submission.screenshot_path
      )
    : null;

  const myScreenshotUrl = activeMySubmission
    ? await getSubmissionScreenshotUrl(
        activeMySubmission.submission.screenshot_path
      )
    : null;

  const disputeSubmitterScreenshotUrl =
    showDisputePanel && activeDispute
      ? await getSubmissionScreenshotUrl(activeDispute.submission.screenshot_path)
      : null;
  const disputeCounterScreenshotUrl =
    showDisputePanel && activeDispute
      ? await getSubmissionScreenshotUrl(activeDispute.dispute.counter_screenshot_path)
      : null;

  const showSubmit =
    fixture &&
    teamId &&
    (fixture.home_team_id === teamId || fixture.away_team_id === teamId) &&
    fixture.status !== "completed" &&
    !mySubmissionForFixture &&
    !opponentSubmissionForFixture &&
    !showApprovalPanel &&
    !showAwaitingPanel &&
    !showDisputePanel &&
    !hasDisputedFixture;

  const hasReportingContent =
    showSubmit || showApprovalPanel || showAwaitingPanel || showDisputePanel;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-12">
      <div className="mb-6 border-b border-outline-variant/50 pb-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-secondary-fixed shadow-[0_0_8px_#c3f400]" />
          <span className="font-data text-xs uppercase tracking-widest text-secondary-fixed">
            Action Required
          </span>
        </div>
        <h2 className="font-display text-2xl font-extrabold uppercase italic tracking-tighter text-primary md:text-3xl">
          Match Reporting Hub
        </h2>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Ensure scores are entered correctly. Falsifying match results will result in an
          immediate league ban.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
        {showSubmit && teamId && (
          <ReportMatchForm fixture={fixture} userTeamId={teamId} />
        )}

        {showAwaitingPanel && activeMySubmission && (
          <AwaitingApprovalPanel
            homeScore={activeMySubmission.submission.home_score}
            awayScore={activeMySubmission.submission.away_score}
            homeTeamName={activeMySubmission.fixture.home_team.name}
            awayTeamName={activeMySubmission.fixture.away_team.name}
            screenshotUrl={myScreenshotUrl}
          />
        )}

        {showDisputePanel && activeDispute && teamId && (
          <DisputedMatchPanel
            context={activeDispute}
            userId={user.id}
            submitterScreenshotUrl={disputeSubmitterScreenshotUrl}
            counterScreenshotUrl={disputeCounterScreenshotUrl}
          />
        )}

        {showApprovalPanel && activePendingApproval && teamId && (
          <PendingApprovalPanel
            submissionId={activePendingApproval.submission.id}
            homeScore={activePendingApproval.submission.home_score}
            awayScore={activePendingApproval.submission.away_score}
            homeTeamName={activePendingApproval.fixture.home_team.name}
            awayTeamName={activePendingApproval.fixture.away_team.name}
            fixture={activePendingApproval.fixture}
            userTeamId={teamId}
            screenshotUrl={opponentScreenshotUrl}
          />
        )}

        {!hasReportingContent && (
          <section className="rounded-xl border border-outline-variant bg-[#0f1115] p-8 text-center">
            <p className="text-on-surface-variant">
              Select an upcoming fixture from{" "}
              <a href="/fixtures" className="text-primary hover:underline">
                Fixtures
              </a>{" "}
              to report a score, or wait for an opponent submission.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
