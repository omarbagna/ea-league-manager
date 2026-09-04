"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes the standings page when the season's rows change in the database.
 * The refresh runs inside a View Transition so rows glide to their new
 * positions where the browser supports it.
 */
export function StandingsLiveRefresh({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`standings:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings",
          filter: `season_id=eq.${seasonId}`,
        },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const doc = document as Document & {
              startViewTransition?: (cb: () => void) => void;
            };
            const reduce = window.matchMedia?.(
              "(prefers-reduced-motion: reduce)"
            ).matches;
            if (doc.startViewTransition && !reduce) {
              doc.startViewTransition(() => router.refresh());
            } else {
              router.refresh();
            }
          }, 400);
        }
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [seasonId, router]);

  return null;
}
