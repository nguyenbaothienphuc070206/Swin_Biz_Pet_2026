import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ clinicId: z.string().uuid(), status: z.enum(["online", "offline", "busy"]) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_emergency_status" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("update_clinic_emergency_status", { p_clinic: parsed.data.clinicId, p_status: parsed.data.status });
  if (error) return Response.json({ error: error.message.includes("clinic_access") ? "clinic_access_denied" : "clinic_not_configured" }, { status: error.message.includes("clinic_access") ? 403 : 409 });
  return Response.json({ updated: data === true });
}
