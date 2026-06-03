"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const MAX_SIZE = 5 * 1024 * 1024;

export function ScreenshotUpload({
  onFileSelect,
  disabled,
  uploading = false,
}: {
  onFileSelect: (file: File | null) => void | Promise<void>;
  disabled?: boolean;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDisabled = disabled || uploading;

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = async (file: File | null) => {
    setError(null);
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    if (!file) {
      setPreview(null);
      await onFileSelect(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPEG or PNG image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be under 5MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    await onFileSelect(file);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="space-y-2">
          <EvidenceImagePreview
            src={preview}
            alt="Upload preview"
            label="Your screenshot"
          />
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => {
              void handleFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            Choose a different image
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isDisabled && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !isDisabled && inputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant/50 bg-surface-container-lowest/50 p-6 text-center transition-colors hover:border-primary-container group",
            isDisabled && "pointer-events-none opacity-50"
          )}
          aria-busy={uploading}
        >
          {uploading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-lowest/90">
              <Spinner size="md" />
              <p className="text-sm text-on-surface-variant">Uploading…</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={isDisabled}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Camera className="mb-2 size-8 text-outline-variant group-hover:text-primary-container" />
          <p className="text-sm text-on-surface-variant group-hover:text-on-surface">
            Upload Match Result Screenshot
          </p>
          <p className="font-data mt-1 text-[10px] text-outline">JPEG, PNG up to 5MB</p>
        </div>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
