import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type UploadMatchEvidenceResult =
  | { path: string; error?: undefined }
  | { path?: undefined; error: string };

export function validateMatchEvidenceFile(file: File): string | null {
  if (!file.type.startsWith("image/") || !ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_SIZE) {
    return "File must be under 5MB.";
  }
  return null;
}

export async function uploadMatchEvidence(
  file: File,
  onProgress: (pct: number | null) => void
): Promise<UploadMatchEvidenceResult> {
  const validationError = validateMatchEvidenceFile(file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return { error: "Not authenticated" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${session.user.id}/${Date.now()}.${ext}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { error: "Storage configuration is missing." };
  }

  const url = `${supabaseUrl}/storage/v1/object/match-evidence/${path}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      } else {
        onProgress(null);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ path });
        return;
      }

      let message = "Upload failed.";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        // keep default message
      }
      resolve({ error: message });
    });

    xhr.addEventListener("error", () => {
      resolve({ error: "Upload failed. Check your connection and try again." });
    });

    xhr.addEventListener("abort", () => {
      resolve({ error: "Upload cancelled." });
    });

    onProgress(0);
    xhr.send(file);
  });
}
