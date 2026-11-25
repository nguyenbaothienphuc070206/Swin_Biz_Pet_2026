import { z } from "zod";
import { requireSensitiveAdmin } from "@/lib/auth/admin";

const reviewSchema = z.object({ clinicId: z.string().uuid(), approve: z.boolean(), reason: z.string().trim().min(3).max(500) });

export async function GET() {
  const { supabase, elevated } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "admin_step_up_required" }, { status: 403 });
  const { data, error } = await supabase.rpc("admin_sos_clinics_for_review");
  if (error) return Response.json({ error: "sos_clinic_review_unavailable" }, { status: 503 });
  const rows = (data ?? []).map((clinic: any) => ({
    id: clinic.clinic_id, name: clinic.clinic_name, address: clinic.address, phone: clinic.phone,
    pin: clinic.latitude == null || clinic.longitude == null ? null : { latitude: clinic.latitude, longitude: clinic.longitude },
  }));
  return Response.json({ clinics: rows }, { headers: { "cache-control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_sos_clinic_review" }, { status: 400 });
  const { supabase, elevated } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "admin_step_up_required" }, { status: 403 });
  const { data, error } = await supabase.rpc("admin_review_sos_clinic", {
    p_clinic: parsed.data.clinicId, p_approve: parsed.data.approve, p_reason: parsed.data.reason,
  });
  if (error) return Response.json({ error: "sos_clinic_review_failed" }, { status: 400 });
  return Response.json({ saved: data === true });
}
