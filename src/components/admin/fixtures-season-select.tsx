"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type SeasonOption = {
  id: string;
  name: string;
  status: string;
};

export function AdminFixturesSeasonSelect({
  seasons,
  selectedSeasonId,
}: {
  seasons: SeasonOption[];
  selectedSeasonId: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-sm">
      <Label htmlFor="season-select">Season</Label>
      <Select
        value={selectedSeasonId}
        onValueChange={(id) => router.push(`/admin/fixtures?season=${id}`)}
      >
        <SelectTrigger id="season-select">
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.status})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
