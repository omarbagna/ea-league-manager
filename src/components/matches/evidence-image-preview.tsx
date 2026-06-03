"use client";

import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function EvidenceImagePreview({
  src,
  alt,
  label,
  emptyMessage = "Screenshot not available",
  className,
}: {
  src: string | null | undefined;
  alt: string;
  label?: string;
  emptyMessage?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn("text-sm text-on-surface-variant", className)}>
        {label && (
          <p className="mb-1 font-data text-[10px] uppercase tracking-widest text-outline">
            {label}
          </p>
        )}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {label && (
        <p className="font-data text-[10px] uppercase tracking-widest text-outline">{label}</p>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative w-full cursor-zoom-in overflow-hidden rounded-lg border border-outline-variant bg-black/40 p-2 text-left transition-colors hover:border-primary-container/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="mx-auto max-h-56 w-full object-contain sm:max-h-64"
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-surface-container-lowest/90 px-2 py-1 text-xs text-on-surface-variant opacity-90 transition-opacity group-hover:text-primary">
              <ZoomIn className="size-3.5" />
              View full size
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="w-[min(96vw,64rem)]">
          <DialogHeader>
            <DialogTitle>{label ?? alt}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-black/50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
