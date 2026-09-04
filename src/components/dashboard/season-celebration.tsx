import Link from "next/link";
import type { SeasonArchiveDetail } from "@/lib/queries/season-archive";
import type { SeasonLeaderboards } from "@/lib/queries/leaderboards";
import { TeamCrest } from "@/components/league/team-crest";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { SeasonConfetti } from "@/components/dashboard/season-confetti";

type LeaderCard = {
  label: string;
  teamId: string;
  teamName: string;
  crestSeed: string | null;
  crestUrl: string | null;
  value: string;
};

function buildLeaders(
  archive: SeasonArchiveDetail,
  leaderboards: SeasonLeaderboards | null
): LeaderCard[] {
  const cards: LeaderCard[] = [];

  if (archive.topScorer) {
    cards.push({
      label: "Top scorer",
      teamId: archive.topScorer.team_id,
      teamName: archive.topScorer.team?.name ?? "—",
      crestSeed: archive.topScorer.team?.crest_seed ?? null,
      crestUrl: archive.topScorer.team?.crest_url ?? null,
      value: `${archive.topScorer.goals_for} goals`,
    });
  }
  if (archive.bestDefense) {
    cards.push({
      label: "Meanest defence",
      teamId: archive.bestDefense.team_id,
      teamName: archive.bestDefense.team?.name ?? "—",
      crestSeed: archive.bestDefense.team?.crest_seed ?? null,
      crestUrl: archive.bestDefense.team?.crest_url ?? null,
      value: `${archive.bestDefense.goals_against} conceded`,
    });
  }
  if (archive.mostWins) {
    cards.push({
      label: "Most wins",
      teamId: archive.mostWins.team_id,
      teamName: archive.mostWins.team?.name ?? "—",
      crestSeed: archive.mostWins.team?.crest_seed ?? null,
      crestUrl: archive.mostWins.team?.crest_url ?? null,
      value: `${archive.mostWins.won} wins`,
    });
  }

  const ppg = leaderboards?.boards.find((b) => b.id === "ppg")?.rows[0];
  if (ppg) {
    cards.push({
      label: "Points per game",
      teamId: ppg.teamId,
      teamName: ppg.teamName,
      crestSeed: ppg.crestSeed,
      crestUrl: ppg.crestUrl,
      value: `${ppg.value} pts/game`,
    });
  }
  const streak = leaderboards?.boards.find((b) => b.id === "win-streak")?.rows[0];
  if (streak) {
    cards.push({
      label: "Longest win streak",
      teamId: streak.teamId,
      teamName: streak.teamName,
      crestSeed: streak.crestSeed,
      crestUrl: streak.crestUrl,
      value: `${streak.value} in a row`,
    });
  }

  return cards;
}

export function SeasonCelebration({
  seasonId,
  seasonName,
  archive,
  leaderboards,
}: {
  seasonId: string;
  seasonName: string;
  archive: SeasonArchiveDetail;
  leaderboards: SeasonLeaderboards | null;
}) {
  const champion = archive.table[0] ?? null;
  const runnerUp = archive.table[1] ?? null;
  const leaders = buildLeaders(archive, leaderboards);

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <SeasonConfetti seasonId={seasonId} />

      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">
          Overview
        </h2>
        <p className="mt-1 text-on-surface-variant">{seasonName} has finished.</p>
      </div>

      {champion && (
        <Card variant="accent" className="overflow-hidden">
          <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <TeamCrest
              name={champion.team?.name ?? "—"}
              seed={champion.team?.crest_seed}
              crestUrl={champion.team?.crest_url}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusPill tone="positive">Season complete</StatusPill>
                {runnerUp && (
                  <span className="font-data text-xs text-on-surface-variant">
                    Runner-up: {runnerUp.team?.name ?? "—"}
                  </span>
                )}
              </div>
              <p className="mt-3 font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
                {seasonName} champions
              </p>
              <h3 className="font-display text-3xl font-bold text-primary sm:text-4xl">
                {champion.team?.name ?? "—"}
              </h3>
              <p className="mt-1.5 font-data text-sm text-on-surface-variant">
                {champion.team?.profile?.ea_id ? `${champion.team.profile.ea_id} · ` : ""}
                {champion.points} pts · {champion.won}W {champion.drawn}D {champion.lost}L
              </p>
            </div>
            <Link
              href={`/history/${seasonId}`}
              className="shrink-0 font-data text-xs uppercase tracking-widest text-primary-fixed hover:underline"
            >
              Full archive →
            </Link>
          </div>
        </Card>
      )}

      {leaders.length > 0 && (
        <section>
          <h3 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
            Season leaders
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {leaders.map((l) => (
              <Link key={l.label} href={`/teams/${l.teamId}`} className="block">
                <Card
                  variant="outline"
                  className="flex h-full flex-col gap-2 p-3.5 transition-colors hover:border-primary-container/40"
                >
                  <span className="font-data text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {l.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <TeamCrest
                      name={l.teamName}
                      seed={l.crestSeed}
                      crestUrl={l.crestUrl}
                      size="sm"
                      className="size-7 shrink-0"
                    />
                    <span className="min-w-0 truncate font-medium text-on-surface">
                      {l.teamName}
                    </span>
                  </span>
                  <span className="font-data text-sm font-bold text-primary-fixed">
                    {l.value}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
