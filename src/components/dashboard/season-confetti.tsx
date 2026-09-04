"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#33d6e3", "#b7e12e", "#e2a942", "#e8eaef"];
const DURATION_MS = 3200;
const PARTICLE_COUNT = 140;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
};

function makeParticles(width: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 2.2,
    vy: 2 + Math.random() * 3,
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.25,
    size: 5 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

/** Fires once per viewer per season — a canvas confetti burst on the
 *  season-end dashboard. Skips entirely under prefers-reduced-motion. */
export function SeasonConfetti({ seasonId }: { seasonId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;

    let seen = false;
    try {
      seen = localStorage.getItem(`season-confetti-${seasonId}`) === "1";
    } catch {
      // storage unavailable — fall through and play it anyway
    }
    if (seen) return;

    // Deferred rather than committed synchronously: React's Strict Mode
    // double-invokes effects in dev (mount → cleanup → mount), and without
    // this, the discarded first pass would win the race to write
    // localStorage and flip `active`, leaving the real, kept instance to
    // find "already seen" and never animate. Cleanup cancels the timer, so
    // only the surviving mount's write and activation actually land.
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`season-confetti-${seasonId}`, "1");
      } catch {
        // storage unavailable — still fine to play it
      }
      setActive(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [seasonId]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = makeParticles(canvas.width);
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fade = elapsed > DURATION_MS - 600 ? Math.max(0, 1 - (elapsed - (DURATION_MS - 600)) / 600) : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.rotation += p.vr;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        setActive(false);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
