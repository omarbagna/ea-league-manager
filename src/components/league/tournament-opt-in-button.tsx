"use client";

import { useState, useTransition } from "react";
import { optIntoTournament } from "@/actions/tournaments";
import { Button } from "@/components/ui/button";
import { WarningNote } from "@/components/ui/warning-note";

export function TournamentOptInButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await optIntoTournament(tournamentId);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  };

  return (
    <div className="space-y-2">
      <Button loading={pending} onClick={handleClick}>
        Opt in
      </Button>
      {error && <WarningNote tone="critical">{error}</WarningNote>}
    </div>
  );
}
