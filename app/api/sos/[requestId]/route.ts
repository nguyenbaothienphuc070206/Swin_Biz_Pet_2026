import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

export async function PATCH(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.rpc("cancel_sos", { p_request: requestId });
  if (error) return Response.json({ error: "cancel_failed" }, { status: 409 });
  if (data !== true) return Response.json({ error: "request_not_cancelable" }, { status: 409 });
  return Response.json({ canceled: true });
}
