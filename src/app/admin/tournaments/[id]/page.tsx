import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTournamentDetail } from "@/lib/queries/tournaments";
import { StatusPill } from "@/components/ui/status-pill";
import { TournamentEntrantsPanel } from "@/components/admin/tournament-entrants-panel";
import { ForceDeleteTournamentDialog } from "@/components/admin/force-delete-tournament-dialog";
import { TournamentBracket } from "@/components/league/tournament-bracket";

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

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  const supabase = await createClient();
  const enteredProfileIds = new Set(tournament.entrants.map((e) => e.profileId));

  const { data: candidateProfiles } =
    tournament.status === "draft"
      ? await supabase
          .from("profiles")
          .select("id, team_name, ea_id")
          .not("team_name", "is", null)
      : { data: [] };

  const eligibleProfiles = (candidateProfiles ?? [])
    .filter((p) => p.team_name?.trim() && !enteredProfileIds.has(p.id))
    .map((p) => ({ id: p.id, teamName: p.team_name as string, eaId: p.ea_id }));

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Link
        href="/admin/tournaments"
        className="inline-flex items-center gap-1.5 font-data text-xs uppercase tracking-wide text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft className="size-3.5" />
        Tournaments
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            {tournament.name}
          </h1>
          <StatusPill tone={STATUS_TONE[tournament.status]}>
            {STATUS_LABEL[tournament.status]}
          </StatusPill>
        </div>
        {tournament.status !== "draft" && (
          <ForceDeleteTournamentDialog
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            status={tournament.status}
          />
        )}
      </div>
      <p className="text-sm text-on-surface-variant">
        {tournament.entrants.length} / {tournament.teamCount} teams entered
      </p>

      {tournament.status === "draft" ? (
        <TournamentEntrantsPanel
          tournamentId={tournament.id}
          entrants={tournament.entrants}
          eligibleProfiles={eligibleProfiles}
        />
      ) : (
        <TournamentBracket tournament={tournament} canReport />
      )}
    </div>
  );
}
