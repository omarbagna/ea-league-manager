import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary-container hover:brightness-110 shadow-[0_0_10px_rgba(51,214,227,0.2)]",
        destructive:
          "bg-error-container/20 border-2 border-error text-error hover:bg-error/20",
        outline:
          "border-2 border-primary-container bg-transparent text-primary hover:bg-primary-container/10",
        secondary:
          "bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim shadow-[0_0_15px_rgba(183,225,46,0.15)]",
        ghost:
          "text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
        link: "text-primary-fixed underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
