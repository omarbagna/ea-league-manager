import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded font-data text-xs font-bold min-w-10 h-10",
  {
    variants: {
      variant: {
        win: "bg-[#161e00] border border-secondary-container text-secondary-fixed",
        draw: "bg-surface-container-highest border border-outline-variant text-on-surface-variant",
        loss: "bg-[#310002] border border-error text-error",
        default: "bg-surface-container border border-outline-variant text-on-surface",
        live: "bg-primary-container/10 border border-primary-container/30 text-primary animate-pulse",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
