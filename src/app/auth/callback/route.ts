import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPostAuthRedirectPath } from "@/lib/post-auth-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery" || next === "/auth/reset-password") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureProfile(user);
        const path = await getPostAuthRedirectPath(supabase, user.id, { next });
        return NextResponse.redirect(`${origin}${path}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
