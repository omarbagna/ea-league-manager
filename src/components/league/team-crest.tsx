import { cn } from "@/lib/utils";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const GRADIENTS = [
  "from-primary-container/40 to-surface-container-highest",
  "from-secondary-fixed/30 to-surface-container-highest",
  "from-tertiary-container/40 to-surface-container-highest",
];

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
  const sizeClass =
    size === "sm" ? "size-12" : size === "lg" ? "size-24" : "size-16";
  const initials = (seed ?? name).slice(0, 2).toUpperCase();
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];

  if (crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crestUrl}
        alt={`${name} crest`}
        className={cn(sizeClass, "rounded-full border border-outline object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full border border-outline bg-gradient-to-br font-display text-sm font-bold text-on-surface",
        gradient,
        className
      )}
    >
      {initials}
    </div>
  );
}
