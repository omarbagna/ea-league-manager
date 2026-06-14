export type UserRole = "player" | "admin";
export type SeasonStatus = "draft" | "active" | "completed";
export type FixtureStatus = "scheduled" | "in_progress" | "completed" | "void";
export type SubmissionStatus =
  | "pending_approval"
  | "approved"
  | "disputed"
  | "rejected";
export type DisputeResolution = "pending" | "approved" | "rejected" | "override";
export type ForfeitReportStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  team_name: string | null;
  ea_id: string | null;
  role: UserRole;
  onboarding_complete: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  status: SeasonStatus;
  starts_at: string | null;
  ends_at: string | null;
}

export interface Division {
  id: string;
  season_id: string;
  name: string;
  sort_order: number;
}

export interface Team {
  id: string;
  season_id: string;
  division_id: string | null;
  name: string;
  crest_url: string | null;
  crest_seed: string | null;
  profile_id: string | null;
  disqualified_at: string | null;
}

export interface Matchweek {
  id: string;
  season_id: string;
  number: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface Fixture {
  id: string;
  matchweek_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string | null;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
  forfeited_team_id: string | null;
}

export interface ForfeitReport {
  id: string;
  fixture_id: string;
  reported_by: string;
  absent_team_id: string;
  notes: string | null;
  screenshot_path: string | null;
  status: ForfeitReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchSubmission {
  id: string;
  fixture_id: string;
  submitted_by: string;
  home_score: number;
  away_score: number;
  screenshot_path: string;
  status: SubmissionStatus;
  created_at: string;
}

export interface StandingRow {
  season_id: string;
  team_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  team?: Team & { profile?: Pick<Profile, "ea_id"> };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface FixtureWithTeams extends Fixture {
  home_team: Team & { profile?: Pick<Profile, "ea_id" | "team_name"> };
  away_team: Team & { profile?: Pick<Profile, "ea_id" | "team_name"> };
  matchweek?: Partial<Matchweek> & { number: number; season_id?: string };
}
