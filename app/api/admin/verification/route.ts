import { z } from "zod";
import { requireSensitiveAdmin } from "@/lib/auth/admin";
const schema = z.object({ requestId: z.string().uuid(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().min(5).max(1000), checklist: z.record(z.string(), z.boolean()) }).refine(value=>value.decision!=="approved"||["license","address","contact","documents"].every(key=>value.checklist[key]===true));
export async function PATCH(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_review" }, { status: 400 });
  const { supabase, elevated, userId } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "step_up_required" }, { status: 428 });
  const { data, error } = await supabase.rpc("admin_review_clinic_verification", { p_request: input.data.requestId, p_decision: input.data.decision, p_reason: input.data.reason, p_checklist: input.data.checklist });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if(data===true) await supabase.from("audit_logs").insert({ actor_id: userId, action: `clinic_verification_${input.data.decision}`, entity_type: "clinic_verification_request", entity_id: input.data.requestId, metadata: { reason:input.data.reason, checklist:input.data.checklist } });
  return Response.json({ updated: data === true });
}
