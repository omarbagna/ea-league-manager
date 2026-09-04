import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Elevation roles. Depth comes from the surface ramp + a tinted shadow;
 * the cyan halo is reserved for `accent` (one per screen).
 *  - raised  : interactive cards (a fixture you can report, a dispute)
 *  - flat    : page-level sections — structure comes from spacing
 *  - outline : data tables / instrument panels
 *  - accent  : the single primary or live thing on a screen
 */
const cardVariants = cva("rounded-xl text-card-foreground", {
  variants: {
    variant: {
      raised: "border border-outline-variant bg-card glow-effect",
      flat: "bg-surface-container-low",
      outline: "border border-outline-variant bg-transparent",
      accent:
        "border border-primary-container/40 bg-card accent-glow",
    },
  },
  defaultVariants: { variant: "raised" },
});

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-outline-variant p-4",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "font-display text-lg font-semibold text-primary",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent, cardVariants };
