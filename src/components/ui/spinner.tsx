import { cn } from "@/lib/utils";

function Spinner({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" && "size-4",
        size === "md" && "size-6",
        className
      )}
    />
  );
}

export { Spinner };
