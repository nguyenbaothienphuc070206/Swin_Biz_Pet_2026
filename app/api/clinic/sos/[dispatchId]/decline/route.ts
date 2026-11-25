import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

const schema = z.object({ reason: z.string().trim().max(240).optional() });
export async function POST(request: Request, context: { params: Promise<{ dispatchId: string }> }) {
  const { dispatchId } = await context.params;
  if (!z.string().uuid().safeParse(dispatchId).success) return Response.json({ error: "invalid_dispatch_id" }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_decline" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("decline_sos_v2", { p_dispatch: dispatchId, p_reason: parsed.data.reason ?? null });
  if (error) return Response.json({ error: error.message.includes("clinic_access") ? "clinic_access_denied" : "decline_failed" }, { status: error.message.includes("clinic_access") ? 403 : 409 });
  return Response.json({ declined: data === true, dispatchId }, { status: data === true ? 200 : 409 });
}
