"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { cn } from "@/lib/utils";
import { uploadMatchEvidence } from "@/lib/upload-match-evidence";

function UploadProgressOverlay({
  progress,
  className,
}: {
  progress: number | null;
  className?: string;
}) {
  const indeterminate = progress === null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-surface-container-lowest/90 px-6",
        className
      )}
    >
      <div className="w-full max-w-xs">
        <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/40">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width] duration-150",
              indeterminate && "w-1/3 animate-pulse"
            )}
            style={indeterminate ? undefined : { width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-sm text-on-surface-variant">
        {indeterminate
          ? "Uploading screenshot…"
          : `Uploading screenshot… ${progress}%`}
      </p>
    </div>
  );
}

export function ScreenshotUpload({
  disabled,
  onUploaded,
  onUploadError,
  onCleared,
}: {
  disabled?: boolean;
  onUploaded: (path: string) => void;
  onUploadError?: (message: string) => void;
  onCleared?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const isDisabled = disabled || uploading;

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const clearPreview = () => {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setProgress(null);
    onCleared?.();
  };

  const handleFile = async (file: File | null) => {
    setError(null);
    if (!file) {
      clearPreview();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    setProgress(0);

    const result = await uploadMatchEvidence(file, setProgress);
    setUploading(false);

    if (result.error) {
      setError(result.error);
      onUploadError?.(result.error);
      clearPreview();
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!result.path) {
      setError("Upload failed.");
      onUploadError?.("Upload failed.");
      clearPreview();
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProgress(100);
    onUploaded(result.path);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="space-y-2">
          <div className="relative">
            <EvidenceImagePreview
              src={preview}
              alt="Upload preview"
              label="Your screenshot"
            />
            {uploading && <UploadProgressOverlay progress={progress} />}
          </div>
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
          {uploading && <UploadProgressOverlay progress={progress} />}
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
