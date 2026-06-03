import { format, parseISO } from "date-fns";

export function formatWeekendRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): string | null {
  if (!startsAt) return null;

  try {
    const start = parseISO(startsAt);
    const end = endsAt ? parseISO(endsAt) : null;

    if (end && startsAt !== endsAt) {
      return `${format(start, "EEE d MMM")} – ${format(end, "EEE d MMM")}`;
    }
    return format(start, "EEE d MMM");
  } catch {
    return null;
  }
}
