"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { submitForfeitReport } from "@/actions/matches";
import { ScreenshotUpload } from "@/components/matches/screenshot-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

export function ReportForfeitForm({
  fixture,
  absentTeamName,
}: {
  fixture: FixtureWithTeams;
  absentTeamName: string;
}) {
  const [notes, setNotes] = useState("");
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("fixtureId", fixture.id);
      if (screenshotPath) fd.set("screenshotPath", screenshotPath);
      if (notes.trim()) fd.set("notes", notes.trim());
      const result = await submitForfeitReport({}, fd);
      setMessage(result);
      if (result.success) {
        window.location.reload();
      }
    });
  };

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-card p-4 shadow-lg",
        pending && "pointer-events-none opacity-60"
      )}
      aria-busy={pending}
    >
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-error to-transparent opacity-50" />
      <div className="mb-4 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" />
        <div>
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Report Opponent No-Show
          </h3>
          <p className="font-data text-xs text-outline">
            Matchweek {(fixture.matchweek as { number?: number })?.number ?? "—"} —{" "}
            {absentTeamName} did not show
          </p>
        </div>
      </div>

      <p className="mb-4 text-sm text-on-surface-variant">
        Tell an admin that you were ready to play and your opponent did not appear. If
        approved, the match is recorded as a{" "}
        <strong className="text-secondary-fixed">3–0 forfeit win</strong> for you. A
        screenshot is optional; add notes if you have no image.
      </p>

      <label className="mb-4 block">
        <span className="mb-1 block font-data text-xs uppercase tracking-widest text-outline">
          Notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={pending}
          placeholder="When you waited, how you tried to contact them, etc."
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
        />
      </label>

      <ScreenshotUpload
        disabled={pending}
        optional
        onUploaded={(path) => {
          setScreenshotPath(path);
          setMessage({});
        }}
        onUploadError={(msg) => setMessage({ error: msg })}
        onCleared={() => setScreenshotPath(null)}
      />

      {message.error && <p className="mt-2 text-sm text-error">{message.error}</p>}
      {message.success && (
        <p className="mt-2 text-sm text-secondary-fixed">{message.success}</p>
      )}

      <div className="mt-6 border-t border-outline-variant/30 pt-4">
        <Button
          variant="secondary"
          className="w-full"
          loading={pending}
          disabled={pending}
          onClick={handleSubmit}
        >
          <Send className="size-4" />
          {pending ? "Submitting…" : "Submit No-Show Report"}
        </Button>
      </div>
    </section>
  );
}
