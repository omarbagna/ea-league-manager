/** UTC calendar date YYYY-MM-DD for comparisons with matchweek ends_at. */
export function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isMatchweekEnded(endsAt: string | null | undefined): boolean {
  if (!endsAt) return false;
  return todayUtcDateString() > endsAt;
}

/** Active = today (UTC) falls within [starts_at, ends_at] inclusive. */
export function isMatchweekActive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): boolean {
  if (!startsAt || !endsAt) return false;
  const today = todayUtcDateString();
  return today >= startsAt && today <= endsAt;
}

export function forfeitScoresForReporter(
  homeTeamId: string,
  awayTeamId: string,
  reporterTeamId: string
): { homeScore: number; awayScore: number } {
  if (homeTeamId === reporterTeamId) {
    return { homeScore: 3, awayScore: 0 };
  }
  if (awayTeamId === reporterTeamId) {
    return { homeScore: 0, awayScore: 3 };
  }
  return { homeScore: 0, awayScore: 0 };
}

export function forfeitScoresForAbsentTeam(
  homeTeamId: string,
  awayTeamId: string,
  absentTeamId: string
): { homeScore: number; awayScore: number } {
  const winnerTeamId =
    absentTeamId === homeTeamId ? awayTeamId : homeTeamId;
  return forfeitScoresForReporter(homeTeamId, awayTeamId, winnerTeamId);
}

export type ForfeitEligibilityReason =
  | "eligible"
  | "fixture_completed"
  | "matchweek_not_ended"
  | "not_participant"
  | "pending_submission"
  | "pending_forfeit"
  | "no_matchweek";

export type ForfeitEligibility = {
  eligible: boolean;
  reason: ForfeitEligibilityReason;
};

export function evaluateForfeitEligibility(input: {
  fixtureStatus: string;
  matchweekEndsAt: string | null | undefined;
  userProfileId: string | null;
  homeProfileId: string | null | undefined;
  awayProfileId: string | null | undefined;
  hasBlockingSubmission: boolean;
  hasPendingForfeit: boolean;
}): ForfeitEligibility {
  if (input.fixtureStatus === "completed") {
    return { eligible: false, reason: "fixture_completed" };
  }
  if (!input.matchweekEndsAt) {
    return { eligible: false, reason: "no_matchweek" };
  }
  if (!isMatchweekEnded(input.matchweekEndsAt)) {
    return { eligible: false, reason: "matchweek_not_ended" };
  }
  if (
    input.userProfileId !== input.homeProfileId &&
    input.userProfileId !== input.awayProfileId
  ) {
    return { eligible: false, reason: "not_participant" };
  }
  if (input.hasBlockingSubmission) {
    return { eligible: false, reason: "pending_submission" };
  }
  if (input.hasPendingForfeit) {
    return { eligible: false, reason: "pending_forfeit" };
  }
  return { eligible: true, reason: "eligible" };
}
