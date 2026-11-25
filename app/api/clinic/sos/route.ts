import { requireRole } from "@/lib/auth/server";

export async function GET() {
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("clinic_sos_inbox");
  if (error) return Response.json({ error: "sos_inbox_unavailable" }, { status: 503 });
  return Response.json({ dispatches: data ?? [] }, { headers: { "cache-control": "private, no-store" } });
}
