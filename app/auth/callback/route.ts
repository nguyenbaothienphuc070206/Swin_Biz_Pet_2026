import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const locale = url.searchParams.get("locale") === "en" ? "en" : "vi";
  const context = url.searchParams.get("context");
  const next = url.searchParams.get("next");
  const oauthError = url.searchParams.get("error");
  const oauthErrorDesc = url.searchParams.get("error_description");

  if (oauthError) {
    console.error("Auth callback OAuth error:", oauthError, oauthErrorDesc);
    return NextResponse.redirect(new URL(`/${locale}/sign-in?error=oauth_error`, request.url));
  }

  if (code) {
    try {
      const supabase = await createClient();
      const {data, error} = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        const user = data.user;
        const meta = user.user_metadata || {};
        const fullName = (meta.full_name || meta.name || meta.user_name || user.email?.split("@")[0] || "").trim();
        const intent = context === "clinic" || meta.onboarding_intent === "clinic" ? "clinic" : "owner";

        try {
          // Ensure a profile exists for the newly authenticated user (e.g. from Google OAuth)
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              full_name: fullName,
              role: "owner",
              preferred_locale: locale,
            },
            {onConflict: "id", ignoreDuplicates: true}
          );
        } catch (profileError) {
          console.error("Error creating profile in auth callback:", profileError);
        }

        const defaultTarget = intent === "clinic" ? "/clinic" : "/owner";

        // Custom redirect path
        if (next && next.startsWith("/") && !next.startsWith("//") && next !== "/settings") {
          let target = next;
          if (target.startsWith(`/${locale}/`)) {
            target = target.slice(locale.length + 1);
          } else if (target === `/${locale}`) {
            target = "/";
          }
          if (!target.startsWith("/")) {
            target = `/${target}`;
          }
          const finalRedirect = target === "/" ? `/${locale}` : `/${locale}${target}`;
          return NextResponse.redirect(new URL(finalRedirect, request.url));
        }

        return NextResponse.redirect(new URL(`/${locale}${defaultTarget}`, request.url));
      }
    } catch (e) {
      console.error("Unexpected error in auth callback:", e);
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/sign-in?error=invalid`, request.url));
}
