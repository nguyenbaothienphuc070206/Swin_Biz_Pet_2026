import { z } from "zod";
import { requireSensitiveAdmin } from "@/lib/auth/admin";
const schema = z.object({ falseAlarm: z.boolean() });
export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_false_alarm_flag" }, { status: 400 });
  const { supabase, elevated } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "step_up_required" }, { status: 428 });
  const { data, error } = await supabase.rpc("set_sos_false_alarm", { p_request: requestId, p_value: parsed.data.falseAlarm });
  if (error) return Response.json({ error: "false_alarm_update_failed" }, { status: 403 });
  return Response.json({ updated: data === true });
}
