"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ticks from 0 up to `value` once on mount — the scoreboard settling when a
 * result lands. SSR renders the final value; reduced-motion keeps it static.
 */
export function CountUpScore({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce || value <= 0) {
      setDisplay(value);
      return;
    }

    const duration = Math.min(500, 200 + value * 55);
    const start = performance.now();
    let raf = 0;
    setDisplay(0);

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{display}</span>;
}
