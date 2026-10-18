import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "vi";
  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {data:{user}}=await supabase.auth.getUser();
      const destination=user?.user_metadata?.onboarding_intent==="clinic"?"clinic-apply":"owner";
      return NextResponse.redirect(new URL(`/${locale}/${destination}`, request.url));
    }
  }
  return NextResponse.redirect(new URL(`/${locale}/sign-in?error=invalid`, request.url));
}
