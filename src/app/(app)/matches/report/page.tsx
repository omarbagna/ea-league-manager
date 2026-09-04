import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import {
  getFixtureById,
  getReportableFixturesForActiveMatchweek,
} from "@/lib/queries/fixtures";
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
import {
  getForfeitEligibility,
  getMyPendingForfeitForUser,
} from "@/lib/queries/forfeits";
import { ReportForfeitForm } from "@/components/matches/report-forfeit-form";
import { ForfeitAwaitingPanel } from "@/components/matches/forfeit-awaiting-panel";
import {
  FixtureReportPicker,
} from "@/components/matches/fixture-report-picker";
import { fixtureToReportOption } from "@/lib/fixture-report-options";

async function getFixtureStatusHints(
  fixtureIds: string[],
  userId: string
): Promise<Map<string, string>> {
  if (!fixtureIds.length) return new Map();

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("match_submissions")
    .select("fixture_id, submitted_by, status")
    .in("fixture_id", fixtureIds)
    .in("status", ["pending_approval", "disputed"]);

  const hints = new Map<string, string>();

  for (const sub of submissions ?? []) {
    if (sub.status === "disputed") {
      hints.set(sub.fixture_id, "Under dispute");
    } else if (sub.submitted_by === userId) {
      hints.set(sub.fixture_id, "Awaiting opponent");
    } else {
      hints.set(sub.fixture_id, "Pending your approval");
    }
  }

  for (const id of fixtureIds) {
    if (!hints.has(id)) {
      hints.set(id, "Ready to report");
    }
  }

  return hints;
}

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
  const myPendingForfeitGlobal = await getMyPendingForfeitForUser(user.id);

  const { matchweek: activeMatchweek, fixtures: activeWeekFixtures } = teamId
    ? await getReportableFixturesForActiveMatchweek(season.id, teamId)
    : { matchweek: null, fixtures: [] };

  const hasGlobalPendingWork =
    !!pendingToApprove ||
    !!myPendingSubmission ||
    !!activeDispute ||
    !!myPendingForfeitGlobal;

  if (
    !params.fixtureId &&
    activeWeekFixtures.length === 1 &&
    !hasGlobalPendingWork
  ) {
    redirect(`/matches/report?fixtureId=${activeWeekFixtures[0].id}`);
  }

  const myPendingForfeit = await getMyPendingForfeitForUser(
    user.id,
    params.fixtureId
  );

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

  const showForfeitAwaiting =
    !!myPendingForfeit &&
    (!fixture || myPendingForfeit.fixture.id === fixture.id) &&
    !showDisputePanel;

  const showApprovalPanel =
    !!activePendingApproval && !showDisputePanel && !showForfeitAwaiting;
  const showAwaitingPanel =
    !!activeMySubmission &&
    !showApprovalPanel &&
    !showDisputePanel &&
    !showForfeitAwaiting;

  const forfeitEligibility =
    fixture && teamId
      ? await getForfeitEligibility(fixture.id, user.id)
      : null;

  const forfeitScreenshotUrl = myPendingForfeit
    ? await getSubmissionScreenshotUrl(myPendingForfeit.report.screenshot_path)
    : null;

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

  const showForfeitSubmit =
    fixture &&
    teamId &&
    forfeitEligibility?.eligible &&
    !showApprovalPanel &&
    !showAwaitingPanel &&
    !showDisputePanel &&
    !showForfeitAwaiting &&
    !hasDisputedFixture;

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
    !showForfeitAwaiting &&
    !hasDisputedFixture;

  const hasReportingContent =
    showSubmit ||
    showForfeitSubmit ||
    showForfeitAwaiting ||
    showApprovalPanel ||
    showAwaitingPanel ||
    showDisputePanel;

  const statusHints = activeWeekFixtures.length
    ? await getFixtureStatusHints(
        activeWeekFixtures.map((f) => f.id),
        user.id
      )
    : new Map<string, string>();

  const pickerFixtures = activeWeekFixtures.map((f) =>
    fixtureToReportOption(f, statusHints.get(f.id))
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-12">
      <div className="mb-6 border-b border-outline-variant/50 pb-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-secondary-fixed shadow-[0_0_8px_#b7e12e]" />
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

      {activeMatchweek && pickerFixtures.length > 0 && (
        <FixtureReportPicker
          fixtures={pickerFixtures}
          selectedFixtureId={params.fixtureId}
          matchweek={activeMatchweek}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
        {showForfeitSubmit && forfeitEligibility?.fixture && (
          <ReportForfeitForm
            fixture={forfeitEligibility.fixture}
            absentTeamName={
              teamId === forfeitEligibility.fixture.home_team_id
                ? forfeitEligibility.fixture.away_team.name
                : forfeitEligibility.fixture.home_team.name
            }
          />
        )}

        {showForfeitAwaiting && myPendingForfeit && (
          <ForfeitAwaitingPanel
            homeTeamName={myPendingForfeit.fixture.home_team.name}
            awayTeamName={myPendingForfeit.fixture.away_team.name}
            homeScore={myPendingForfeit.previewScore.homeScore}
            awayScore={myPendingForfeit.previewScore.awayScore}
            absentTeamName={myPendingForfeit.absentTeamName}
            screenshotUrl={forfeitScreenshotUrl}
          />
        )}

        {showSubmit && teamId && (
          <ReportMatchForm fixture={fixture} userTeamId={teamId} />
        )}

        {showForfeitSubmit && showSubmit && (
          <section className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 text-sm text-on-surface-variant xl:col-span-2">
            Played the match anyway? Submit a normal score in the other panel. The no-show
            report is only if your opponent did not show after the weekend ended.
          </section>
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
          <section className="rounded-xl border border-outline-variant bg-card p-8 text-center">
            <p className="text-on-surface-variant">
              {activeMatchweek && pickerFixtures.length > 0
                ? "Choose a matchweek fixture above to report a score, or wait for an opponent submission."
                : "No fixtures in the current matchweek to report."}
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              Report an older fixture from{" "}
              <Link href="/fixtures" className="text-primary hover:underline">
                Fixtures
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
