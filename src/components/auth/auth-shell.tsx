import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title = "Dark Elite League",
  subtitle,
  children,
}: {
  title?: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative z-10 w-full max-w-[420px]">
      <div className="glass-panel flex flex-col gap-6 rounded-xl border border-outline-variant p-6 shadow-[0_0_40px_rgba(0,219,233,0.05)] md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Sparkles className="size-12 text-primary-container" />
          <h1 className="font-display text-2xl font-extrabold italic tracking-tight text-primary-container uppercase md:text-3xl">
            {title}
          </h1>
          <p className="text-on-surface-variant">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
