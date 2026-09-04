import { createClient } from "@/lib/supabase/server";
import {
  activateSeason,
  createSeasonForm,
  generateSeasonSchedule,
  updateSeason,
} from "@/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SeasonsList } from "@/components/admin/seasons-list";
import { getFixturesForSeason } from "@/lib/queries/fixtures";

export default async function AdminSeasonsPage() {
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  const seasonMeta: Record<
    string,
    {
      teamCount: number;
      matchweekCount: number;
      fixtureCount: number;
      reportedFixtureCount: number;
      grouped: Awaited<ReturnType<typeof getFixturesForSeason>>;
    }
  > = {};

  if (seasons?.length) {
    await Promise.all(
      seasons.map(async (s) => {
        const [{ count: teamCount }, { count: matchweekCount }, grouped] =
          await Promise.all([
            supabase
              .from("teams")
              .select("*", { count: "exact", head: true })
              .eq("season_id", s.id),
            supabase
              .from("matchweeks")
              .select("*", { count: "exact", head: true })
              .eq("season_id", s.id),
            getFixturesForSeason(s.id, "all"),
          ]);

        const allFixtures = grouped.flatMap((g) => g.fixtures);
        const fixtureCount = allFixtures.length;
        const reportedFixtureCount = allFixtures.filter(
          (f) => f.status === "completed"
        ).length;

        seasonMeta[s.id] = {
          teamCount: teamCount ?? 0,
          matchweekCount: matchweekCount ?? 0,
          fixtureCount,
          reportedFixtureCount,
          grouped,
        };
      })
    );
  }

  const seasonList = seasons ?? [];
  const hasActive = seasonList.some((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Seasons
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Create a season, generate its schedule, set it live, and end it when
          the last matchweek is done.
          {!hasActive && seasonList.length > 0 && (
            <span className="text-warn"> No season is active right now.</span>
          )}
        </p>
      </div>

      <Card variant="raised" className="max-w-md">
        <form action={createSeasonForm} className="space-y-4 p-5">
          <h2 className="font-display font-semibold text-primary">New season</h2>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Season 25" required />
          </div>
          <div>
            <Label htmlFor="startsAt">Start date</Label>
            <DatePicker
              id="startsAt"
              name="startsAt"
              placeholder="Pick start date"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              The end date is set automatically when you generate fixtures — the
              day after the last matchweek.
            </p>
          </div>
          <SubmitButton pendingText="Creating…">Create season</SubmitButton>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
          All seasons
        </h2>
        <SeasonsList
          seasons={seasonList}
          seasonMeta={seasonMeta}
          activateSeason={activateSeason}
          updateSeason={updateSeason}
          generateSeasonSchedule={generateSeasonSchedule}
        />
      </div>
    </div>
  );
}
