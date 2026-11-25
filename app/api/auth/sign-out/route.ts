import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("pawcare_dev_session");
  cookieStore.delete("pawcare_clinic_onboarding");
  cookieStore.delete("pawcare_clinic_registered");

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "vi";

  const response = NextResponse.json({ ok: true, redirectUrl: `/${locale}/sign-in` });
  response.cookies.delete("pawcare_dev_session");
  response.cookies.delete("pawcare_clinic_onboarding");
  response.cookies.delete("pawcare_clinic_registered");
  response.cookies.set("pawcare_dev_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  response.cookies.set("pawcare_dev_session", "", {
    path: `/${locale}`,
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
