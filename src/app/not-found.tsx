import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-8 text-center">
      <p className="font-data text-sm uppercase tracking-[0.2em] text-primary-fixed">
        Error 404
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
        Page not found
      </h1>
      <p className="max-w-sm text-on-surface-variant">
        That link is broken or the page has moved. Head back to your dashboard.
      </p>
      <Link href="/dashboard" className="mt-2">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
