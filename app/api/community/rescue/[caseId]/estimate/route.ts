import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ clinicId:z.string().uuid(),amountVnd: z.number().int().positive().max(10_000_000_000), notes: z.string().trim().min(10).max(3000), documentPath: z.string().min(5).max(500) });
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return Response.json({ error: "invalid_case_id" }, { status: 400 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_estimate" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("submit_rescue_estimate", { p_case: caseId, p_clinic:input.data.clinicId,p_amount: input.data.amountVnd, p_notes: input.data.notes, p_document_path: input.data.documentPath });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("clinic_vet") ? 403 : 400 });
  return Response.json({ estimateId: data, status: "submitted" }, { status: 201 });
}
