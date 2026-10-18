import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

const bodySchema = z.object({
  clinicId: z.string().uuid(), name: z.string().trim().min(1).max(160), code: z.string().trim().min(1).max(80),
  dose: z.string().trim().min(1).max(120), lot: z.string().trim().min(1).max(120),
  administeredAt: z.iso.date(), catalogId: z.string().uuid().nullable().optional(),
  actorId: z.string().uuid().optional(), idempotencyKey: z.string().uuid().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ petId: string }> }) {
  const { petId } = await context.params;
  if (!z.string().uuid().safeParse(petId).success) return Response.json({ error: "invalid_pet_id" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_vaccination", details: parsed.error.flatten() }, { status: 400 });
  const { supabase, userId } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  if(parsed.data.actorId&&parsed.data.actorId!==userId)return Response.json({error:"offline_actor_changed"},{status:409});
  const values = parsed.data;
  const { data, error } = await supabase.rpc("record_vaccination", {
    p_pet: petId, p_clinic: values.clinicId, p_name: values.name, p_code: values.code,
    p_dose: values.dose, p_lot: values.lot, p_date: values.administeredAt, p_catalog: values.catalogId ?? null,
    p_idempotency_key: values.idempotencyKey ?? crypto.randomUUID(),
  });
  if (error) {
    const status = error.message.includes("grant_required") || error.message.includes("clinic_access") ? 403 : 409;
    return Response.json({ error: error.message }, { status });
  }
  return Response.json({ recordId: data }, { status: 201 });
}
