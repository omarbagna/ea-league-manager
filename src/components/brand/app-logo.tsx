import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { image: 40, className: "h-10 w-10" },
  md: { image: 56, className: "h-14 w-14" },
  lg: { image: 96, className: "h-24 w-24" },
} as const;

export function AppLogo({
  size = "md",
  showTitle = false,
  href,
  className,
  priority = false,
}: {
  size?: keyof typeof sizes;
  showTitle?: boolean;
  href?: string;
  className?: string;
  priority?: boolean;
}) {
  const { image, className: sizeClass } = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Dark Elite League"
        width={image}
        height={image}
        priority={priority}
        className={cn("shrink-0 rounded-xl object-contain", sizeClass)}
      />
      {showTitle && (
        <div className="min-w-0 leading-tight">
          <p className="font-display text-sm font-extrabold uppercase tracking-tight text-primary-container">
            Dark Elite
          </p>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            League
          </p>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container">
        {content}
      </Link>
    );
  }

  return content;
}
