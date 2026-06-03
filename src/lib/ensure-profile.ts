import { createServiceClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Ensures a profiles row exists after auth (fallback if DB trigger failed). */
export async function ensureProfile(user: User): Promise<void> {
  const supabase = await createServiceClient();
  const email = user.email ?? user.user_metadata?.email ?? "";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
}
