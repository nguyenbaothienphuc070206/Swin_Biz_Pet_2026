import { requireRole } from "@/lib/auth/server";
export async function GET() {
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("clinic_sos_settings");
  if (error) return Response.json({ error: "clinic_settings_unavailable" }, { status: 503 });
  return Response.json({ clinics: data ?? [] }, { headers: { "cache-control": "private, no-store" } });
}
