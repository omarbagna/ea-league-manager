import { createTournamentForm } from "@/actions/tournaments";
import { getTournaments } from "@/lib/queries/tournaments";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { TournamentsList } from "@/components/league/tournaments-list";
import { TournamentSizeSelect } from "@/components/admin/tournament-size-select";

export default async function AdminTournamentsPage() {
  const tournaments = await getTournaments();

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Tournaments
        </h1>
        <p className="mt-1 text-on-surface-variant">
          A standalone knockout bracket, independent of the league season.
          Players opt in, you close signups and generate the bracket, then
          report each round as it&apos;s played.
        </p>
      </div>

      <Card variant="raised" className="max-w-md">
        <form action={createTournamentForm} className="space-y-4 p-5">
          <h2 className="font-display font-semibold text-primary">
            New tournament
          </h2>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Summer Cup"
              required
            />
          </div>
          <div>
            <Label htmlFor="teamCount">Bracket size</Label>
            <TournamentSizeSelect id="teamCount" name="teamCount" defaultValue={8} />
            <p className="mt-1 text-xs text-on-surface-variant">
              Always resolves to a single final. If fewer teams opt in, the
              bracket shrinks to fit them with byes rather than forcing this
              exact number.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="signupOpensAt">Signups open</Label>
              <DatePicker
                id="signupOpensAt"
                name="signupOpensAt"
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="signupClosesAt">Signups close</Label>
              <DatePicker
                id="signupClosesAt"
                name="signupClosesAt"
                placeholder="Optional"
              />
            </div>
          </div>
          <SubmitButton pendingText="Creating…">
            Create tournament
          </SubmitButton>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
          All tournaments
        </h2>
        <TournamentsList
          tournaments={tournaments}
          hrefBase="/admin/tournaments"
          emptyDescription="Create one above to run a knockout bracket alongside the league."
        />
      </div>
    </div>
  );
}
