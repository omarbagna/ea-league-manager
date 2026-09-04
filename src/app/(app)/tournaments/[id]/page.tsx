import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTournamentDetail } from "@/lib/queries/tournaments";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamCrest } from "@/components/league/team-crest";
import { TournamentBracketView } from "@/components/league/tournament-bracket-view";
import { TournamentBracketLiveRefresh } from "@/components/league/tournament-bracket-live-refresh";
import { TournamentOptInButton } from "@/components/league/tournament-opt-in-button";

const STATUS_TONE = {
  draft: "info",
  locked: "pending",
  active: "positive",
  completed: "neutral",
} as const;

const STATUS_LABEL = {
  draft: "Signups open",
  locked: "Signups closed",
  active: "In progress",
  completed: "Completed",
} as const;

function fmt(d: string | null): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), "d MMM");
  } catch {
    return null;
  }
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const alreadyIn =
    !!user && tournament.entrants.some((e) => e.profileId === user.id);
  const today = new Date().toISOString().slice(0, 10);
  const windowOpen =
    (!tournament.signupOpensAt || tournament.signupOpensAt <= today) &&
    (!tournament.signupClosesAt || tournament.signupClosesAt >= today);
  const full = tournament.entrants.length >= tournament.teamCount;
  const isDraft = tournament.status === "draft";
  const canOptIn = !!user && isDraft && windowOpen && !full && !alreadyIn;

  let optInBlockedReason: string | null = null;
  if (isDraft && !alreadyIn) {
    if (!user) optInBlockedReason = "Sign in to opt in.";
    else if (full) optInBlockedReason = "This tournament is full.";
    else if (!windowOpen) optInBlockedReason = "Signups aren't open right now.";
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1.5 font-data text-xs uppercase tracking-wide text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft className="size-3.5" />
        Tournaments
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            {tournament.name}
          </h1>
          <StatusPill tone={STATUS_TONE[tournament.status]}>
            {STATUS_LABEL[tournament.status]}
          </StatusPill>
        </div>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          {tournament.entrants.length} / {tournament.teamCount} teams entered
          {isDraft && tournament.signupClosesAt
            ? ` · signups close ${fmt(tournament.signupClosesAt)}`
            : ""}
        </p>
      </div>

      {isDraft ? (
        <Card variant="outline">
          <CardHeader>
            <CardTitle className="text-base">Entrants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {tournament.entrants.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No one&apos;s opted in yet.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/50">
                {tournament.entrants.map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5 py-2.5">
                    <TeamCrest
                      name={e.teamName}
                      seed={e.crestSeed}
                      size="sm"
                      className="size-7 shrink-0"
                    />
                    <span className="min-w-0 truncate font-medium">
                      {e.teamName}
                    </span>
                    {e.eaId && (
                      <span className="ml-auto shrink-0 font-data text-xs text-primary-fixed">
                        EA: {e.eaId}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-outline-variant/50 pt-4">
              {alreadyIn ? (
                <StatusPill tone="positive">You&apos;re in</StatusPill>
              ) : canOptIn ? (
                <TournamentOptInButton tournamentId={tournament.id} />
              ) : (
                optInBlockedReason && (
                  <p className="text-sm text-on-surface-variant">
                    {optInBlockedReason}
                  </p>
                )
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {tournament.status === "active" && (
            <TournamentBracketLiveRefresh tournamentId={tournament.id} />
          )}
          <TournamentBracketView tournament={tournament} />
        </>
      )}
    </div>
  );
}
