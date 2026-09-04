import Link from "next/link";
import { Medal } from "lucide-react";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import { getSeasonLeaderboards } from "@/lib/queries/leaderboards";
import type { LeaderBoard, LeaderRow } from "@/lib/queries/leaderboards";
import { createClient } from "@/lib/supabase/server";
import { TeamCrest } from "@/components/league/team-crest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Row({ row }: { row: LeaderRow }) {
  return (
    <li
      className={cn(
        "relative flex items-center gap-3 rounded-md px-2.5 py-2",
        row.isViewer && "bg-primary-fixed/[0.07]"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 rounded-r-sm bg-primary-container/[0.11]"
        style={{ width: `${Math.round(row.fill * 100)}%` }}
      />
      <span className="relative z-10 w-4 shrink-0 text-center font-data text-xs text-outline">
        {row.rank}
      </span>
      <Link
        href={`/teams/${row.teamId}`}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5 hover:text-primary"
      >
        <TeamCrest
          name={row.teamName}
          seed={row.crestSeed}
          crestUrl={row.crestUrl}
          size="sm"
          className="size-6"
        />
        <span
          className={cn(
            "truncate font-medium",
            row.isViewer && "text-primary-fixed"
          )}
        >
          {row.teamName}
        </span>
      </Link>
      <span className="relative z-10 shrink-0 text-right">
        <span className="block font-data tabular text-sm font-bold text-on-surface">
          {row.value}
        </span>
        {row.sub && (
          <span className="block font-data text-[10px] text-on-surface-variant">
            {row.sub}
          </span>
        )}
      </span>
    </li>
  );
}

function BoardCard({ board }: { board: LeaderBoard }) {
  return (
    <Card variant="outline" className="flex flex-col">
      <CardHeader className="gap-0.5">
        <CardTitle className="text-base">{board.title}</CardTitle>
        <p className="text-[11px] leading-snug text-on-surface-variant">
          {board.blurb}
        </p>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ol className="flex flex-col gap-0.5">
          {board.rows.map((row) => (
            <Row key={`${board.id}-${row.teamId}`} row={row} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default async function LeaderboardsPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h2 className="mb-2 font-display text-3xl font-bold tracking-tight text-primary">
          Leaderboards
        </h2>
        <EmptyState
          icon={Medal}
          title="No season is running"
          description="Manager leaderboards appear here once a season is active and results start coming in."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerTeamId = user
    ? await getCurrentUserTeamId(user.id, season.id)
    : null;

  const data = await getSeasonLeaderboards(season.id, viewerTeamId);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          Leaderboards
        </h2>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          {season.name}
          {data && data.playedFixtures > 0
            ? ` · ${data.playedFixtures} ${
                data.playedFixtures === 1 ? "match" : "matches"
              } played`
            : ""}
        </p>
      </div>

      {!data || data.boards.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="No results yet"
          description="The boards fill in automatically as matchweek results are confirmed."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
