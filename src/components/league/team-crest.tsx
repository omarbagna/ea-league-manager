import { cn } from "@/lib/utils";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Controlled palette — muted pairs that hold up on a dark ground. */
const PALETTES: { bg: string; bgTo: string; accent: string; ink: string }[] = [
  { bg: "#0c3b42", bgTo: "#0a2a30", accent: "#33d6e3", ink: "#d6fbff" },
  { bg: "#2f3a12", bgTo: "#1e260b", accent: "#b7e12e", ink: "#f2ffd6" },
  { bg: "#37244f", bgTo: "#241636", accent: "#a986e6", ink: "#efe6ff" },
  { bg: "#4a2f10", bgTo: "#32200a", accent: "#e2a942", ink: "#ffe8c4" },
  { bg: "#43162a", bgTo: "#2e0f1d", accent: "#e56b9b", ink: "#ffd9e6" },
  { bg: "#152a4a", bgTo: "#0e1c32", accent: "#5b9be6", ink: "#d9e8ff" },
  { bg: "#0f3a2a", bgTo: "#0a281d", accent: "#3ad69b", ink: "#d6ffee" },
  { bg: "#40202a", bgTo: "#2b161d", accent: "#f5877f", ink: "#ffdad6" },
];

const SHAPE = {
  sm: "size-12",
  md: "size-16",
  lg: "size-24",
} as const;

export function TeamCrest({
  name,
  seed,
  crestUrl,
  className,
  size = "md",
}: {
  name: string;
  seed?: string | null;
  crestUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = SHAPE[size];

  if (crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crestUrl}
        alt={`${name} crest`}
        className={cn(
          sizeClass,
          "rounded-full border border-outline object-cover",
          className
        )}
      />
    );
  }

  const key = seed ?? name;
  const h = hashString(key);
  const pal = PALETTES[h % PALETTES.length];
  const initials = key.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
  const gid = `crest-${h.toString(36)}`;
  const variant = h % 3; // 0 chevron · 1 bend · 2 bar

  return (
    <span
      className={cn(
        sizeClass,
        "inline-block shrink-0 overflow-hidden rounded-full border border-outline",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" focusable="false">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.bg} />
            <stop offset="100%" stopColor={pal.bgTo} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gid})`} />
        {variant === 0 && (
          <path
            d="M50 8 L92 34 L50 60 L8 34 Z"
            fill={pal.accent}
            opacity="0.22"
          />
        )}
        {variant === 1 && (
          <path d="M-4 68 L104 12 L104 36 L-4 92 Z" fill={pal.accent} opacity="0.2" />
        )}
        {variant === 2 && (
          <rect x="0" y="60" width="100" height="16" fill={pal.accent} opacity="0.22" />
        )}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={pal.accent}
          strokeOpacity="0.35"
          strokeWidth="2"
        />
        <text
          x="50"
          y="50"
          dominantBaseline="central"
          textAnchor="middle"
          fontFamily="var(--font-anybody), sans-serif"
          fontSize="38"
          fontWeight="800"
          fill={pal.ink}
          letterSpacing="-1"
        >
          {initials}
        </text>
      </svg>
    </span>
  );
}
