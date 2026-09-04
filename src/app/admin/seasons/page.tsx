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

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-primary">Seasons</h1>

      <form
        action={createSeasonForm}
        className="max-w-md space-y-4 rounded-xl border border-outline-variant p-4"
      >
        <h2 className="font-display font-semibold">Create Season</h2>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Season 25" required />
        </div>
        <div>
          <Label htmlFor="startsAt">Start date</Label>
          <DatePicker id="startsAt" name="startsAt" placeholder="Pick start date" />
          <p className="mt-1 text-xs text-on-surface-variant">
            End date is set automatically when you generate fixtures (day after the last
            matchweek).
          </p>
        </div>
        <SubmitButton pendingText="Creating…">Create</SubmitButton>
      </form>

      <SeasonsList
        seasons={seasons ?? []}
        seasonMeta={seasonMeta}
        activateSeason={activateSeason}
        updateSeason={updateSeason}
        generateSeasonSchedule={generateSeasonSchedule}
      />
    </div>
  );
}
