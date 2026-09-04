import { getTournaments } from "@/lib/queries/tournaments";
import { TournamentsList } from "@/components/league/tournaments-list";

export default async function TournamentsPage() {
  const tournaments = await getTournaments();

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          Tournaments
        </h2>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          Knockout brackets running alongside the league — opt in while
          signups are open.
        </p>
      </div>
      <TournamentsList tournaments={tournaments} />
    </div>
  );
}
