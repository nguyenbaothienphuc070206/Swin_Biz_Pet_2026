import { requireRole } from "@/lib/auth/server";

export async function requireSensitiveAdmin(locale: "vi" | "en" = "vi") {
  const auth = await requireRole(["platform_admin"], locale);
  const { data, error } = await auth.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") {
    await auth.supabase.from("audit_logs").insert({actor_id:auth.userId,action:"admin_step_up_required",entity_type:"security",outcome:"denied",metadata:{required_assurance:"aal2"}});
    return { ...auth, elevated: false as const };
  }
  return { ...auth, elevated: true as const };
}
