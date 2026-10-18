import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {canAccessRole, homeForRole, parseRole, roleFromClaims, type AppRole} from "./roles";
import {isSupabaseConfigured} from "@/lib/supabase/server";
import {roleRequiresMfa} from "@/modules/security/mfa-assurance";

export async function requireRole(allowed: readonly AppRole[], locale: "vi" | "en" = "vi", options: {allowMfaEnrollment?:boolean} = {}) {
  if (!isSupabaseConfigured()) redirect(`/${locale}/sign-in?error=unavailable`);
  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(`/${locale}/sign-in`);
  const {data:profile}=await supabase.from("profiles").select("role,suspended_at").eq("id",String(data.claims.sub)).maybeSingle();
  if(profile?.suspended_at) redirect(`/${locale}/sign-in?error=suspended`);
  const role = parseRole(profile?.role) ?? roleFromClaims(data.claims);
  if (!role || !canAccessRole(role, allowed)) redirect(`/${locale}${role ? homeForRole(role) : "/access-denied"}`);
  if(roleRequiresMfa(role)&&!options.allowMfaEnrollment){
    const {data:assurance,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(error||assurance?.currentLevel!=="aal2")redirect(`/${locale}/settings/security?required=1`);
  }
  return {supabase, userId: String(data.claims.sub), role};
}
