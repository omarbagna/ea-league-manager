export type NotificationCategory =
  | "deadlines"
  | "results"
  | "disputes"
  | "tournaments"
  | "admin";

export const NOTIFICATION_CATEGORIES: {
  key: NotificationCategory;
  label: string;
  description: string;
}[] = [
  {
    key: "deadlines",
    label: "Matchweek deadlines",
    description: "Reminders when a matchweek is about to close and you haven't reported.",
  },
  {
    key: "results",
    label: "Your results",
    description: "When an opponent's score needs your approval, or one of your results is finalised or reverted.",
  },
  {
    key: "disputes",
    label: "Disputes",
    description: "When a result you're involved in is disputed or resolved.",
  },
  {
    key: "tournaments",
    label: "Tournaments",
    description: "Bracket updates for knockout tournaments you've opted into — matchups, results, and eliminations.",
  },
  {
    key: "admin",
    label: "Admin queue",
    description: "For admins — disputes and no-show reports that need a decision.",
  },
];

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  deadline_reminder: "deadlines",
  approval_required: "results",
  result_approved: "results",
  result_reverted: "results",
  forfeit_filed: "results",
  forfeit_approved: "results",
  forfeit_rejected: "results",
  season_disqualified_forfeit: "results",
  result_disputed: "disputes",
  dispute_resolved: "disputes",
  forfeit_review_required: "admin",
  forfeit_admin: "admin",
  dispute_review_required: "admin",
  tournament_bracket_ready: "tournaments",
  tournament_advanced: "tournaments",
  tournament_eliminated: "tournaments",
  tournament_champion: "tournaments",
};

export function categoryForType(type: string): NotificationCategory {
  return TYPE_TO_CATEGORY[type] ?? "results";
}

type Prefs = Record<string, unknown> | null | undefined;

/** Opt-out: a category is enabled unless explicitly set to false. */
export function isCategoryEnabled(
  prefs: Prefs,
  category: NotificationCategory
): boolean {
  return prefs?.[category] !== false;
}

export function isTypeEnabled(prefs: Prefs, type: string): boolean {
  return isCategoryEnabled(prefs, categoryForType(type));
}
