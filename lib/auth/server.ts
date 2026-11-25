import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {createClient, isSupabaseConfigured} from "@/lib/supabase/server";
import {createDevMockSupabaseClient} from "@/lib/supabase/mock";
import {canAccessRole, homeForRole, parseRole, roleFromClaims, parseDevSessionCookie, type AppRole} from "./roles";
import {roleRequiresMfa} from "@/modules/security/mfa-assurance";

export async function requireRole(allowed: readonly AppRole[], locale: "vi" | "en" = "vi", options: {allowMfaEnrollment?:boolean} = {}) {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const devCookie = cookieStore.get("pawcare_dev_session");
    const parsed = parseDevSessionCookie(devCookie?.value);
    if (!parsed) {
      redirect(`/${locale}/sign-in`);
    }
    const role = parsed.role;
    if (canAccessRole(role, allowed)) {
      const mockSupabase = createDevMockSupabaseClient(parsed.sub || "dev-owner-id");
      return {supabase: mockSupabase as any, userId: parsed.sub || "dev-owner-id", role};
    }
    redirect(`/${locale}${role ? homeForRole(role) : "/access-denied"}`);
  }

  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(`/${locale}/sign-in`);
  const {data:profile} = await supabase.from("profiles").select("role,suspended_at").eq("id",String(data.claims.sub)).maybeSingle();
  if(profile?.suspended_at) redirect(`/${locale}/sign-in?error=suspended`);
  const role = parseRole(profile?.role) ?? roleFromClaims(data.claims);
  if (!role || !canAccessRole(role, allowed)) redirect(`/${locale}${role ? homeForRole(role) : "/access-denied"}`);
  if(roleRequiresMfa(role)&&!options.allowMfaEnrollment){
    const {data:assurance,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(error||assurance?.currentLevel!=="aal2")redirect(`/${locale}/settings/security?required=1`);
  }
  return {supabase, userId: String(data.claims.sub), role};
}

export async function getOptionalUser() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const devCookie = cookieStore.get("pawcare_dev_session");
    const parsed = parseDevSessionCookie(devCookie?.value);
    if (parsed?.sub) {
      return {
        id: parsed.sub,
        email: parsed.email,
        role: parsed.role,
        name: parsed.name,
      };
    }
    return null;
  }

  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getClaims();
    if (!data?.claims?.sub) return null;
    const {data:profile} = await supabase.from("profiles").select("role,full_name,suspended_at").eq("id",String(data.claims.sub)).maybeSingle();
    if (profile?.suspended_at) return null;
    const role = parseRole(profile?.role) ?? roleFromClaims(data.claims);
    return {
      id: String(data.claims.sub),
      email: data.claims.email as string | undefined,
      role: (role ?? "owner") as AppRole,
      name: (profile?.full_name || data.claims.user_metadata?.full_name) as string | undefined,
    };
  } catch {
    return null;
  }
}
