"use client";

import { useState, useTransition } from "react";
import { UserMinus, Users } from "lucide-react";
import {
  addEntrantManually,
  removeEntrant,
} from "@/actions/tournaments";
import type { TournamentEntrant } from "@/lib/queries/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WarningNote } from "@/components/ui/warning-note";
import { LockTournamentDialog } from "@/components/admin/lock-tournament-dialog";

export function TournamentEntrantsPanel({
  tournamentId,
  entrants,
  eligibleProfiles,
}: {
  tournamentId: string;
  entrants: TournamentEntrant[];
  eligibleProfiles: { id: string; teamName: string; eaId: string | null }[];
}) {
  const [selectedProfile, setSelectedProfile] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!selectedProfile) return;
    setError(null);
    startTransition(async () => {
      const result = await addEntrantManually(tournamentId, selectedProfile);
      if (result.error) setError(result.error);
      else setSelectedProfile("");
    });
  };

  const handleRemove = (entrantId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeEntrant(entrantId, tournamentId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-6">
      <Card variant="raised">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Entrants
          </CardTitle>
          <LockTournamentDialog
            tournamentId={tournamentId}
            entrantCount={entrants.length}
          />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {error && <WarningNote tone="critical">{error}</WarningNote>}

          {entrants.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="No one's opted in yet"
              description="Add a player below, or wait for signups."
            />
          ) : (
            <ul className="divide-y divide-outline-variant/50">
              {entrants.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-on-surface">
                      {e.teamName}
                    </span>
                    {e.eaId && (
                      <span className="ml-2 font-data text-xs text-primary-fixed">
                        EA: {e.eaId}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleRemove(e.id)}
                    aria-label={`Remove ${e.teamName}`}
                  >
                    <UserMinus className="size-4 text-error" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {eligibleProfiles.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-outline-variant/50 pt-4 sm:flex-row">
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="flex h-11 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none"
              >
                <option value="">Add a registered player…</option>
                {eligibleProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.teamName}
                    {p.eaId ? ` (${p.eaId})` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedProfile || pending}
                onClick={handleAdd}
              >
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
