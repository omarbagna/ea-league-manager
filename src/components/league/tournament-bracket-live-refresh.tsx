"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes a tournament's bracket page when its matches change, inside a
 * View Transition where the browser supports one — mirrors
 * standings-live-refresh.tsx's debounced-refresh shape.
 */
export function TournamentBracketLiveRefresh({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`bracket:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${tournamentId}`,
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
  }, [tournamentId, router]);

  return null;
}
