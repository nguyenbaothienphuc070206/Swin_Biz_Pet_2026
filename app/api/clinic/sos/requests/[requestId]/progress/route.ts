import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

const schema = z.object({ status: z.enum(["on_the_way", "arrived"]) });

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_arrival_status" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("update_sos_arrival_status", { p_request: requestId, p_status: input.data.status });
  if (error) return Response.json({ error: "arrival_status_update_failed" }, { status: 403 });
  return Response.json({ updated: data === true, status: input.data.status }, { status: data === true ? 200 : 409 });
}
