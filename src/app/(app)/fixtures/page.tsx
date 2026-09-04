import { CalendarOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDisplaySeason, getCurrentUserTeamId } from "@/lib/season";
import { getFixturesForSeason } from "@/lib/queries/fixtures";
import { getActiveMatchweek } from "@/lib/matchweek";
import { FixturesClient } from "@/components/league/fixtures-client";
import { EmptyState } from "@/components/ui/empty-state";

export default async function FixturesPage() {
  const display = await getDisplaySeason();

  if (!display) {
    return (
      <div className="mx-auto max-w-[1024px]">
        <EmptyState
          icon={CalendarOff}
          title="No season is running"
          description="Fixtures show up here once your admin activates a season and generates the schedule."
        />
      </div>
    );
  }

  const { season, isArchived } = display;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userTeamId =
    user != null ? await getCurrentUserTeamId(user.id, season.id) : null;

  const [grouped, activeMatchweek] = await Promise.all([
    getFixturesForSeason(season.id, "all"),
    isArchived
      ? Promise.resolve(null)
      : getActiveMatchweek(season.id, userTeamId),
  ]);

  return (
    <div className="mx-auto max-w-[1024px]">
      <FixturesClient
        grouped={grouped}
        seasonName={season.name}
        userTeamId={userTeamId}
        userProfileId={user?.id}
        defaultExpandedMatchweekId={activeMatchweek?.id}
        isArchived={isArchived}
      />
    </div>
  );
}
