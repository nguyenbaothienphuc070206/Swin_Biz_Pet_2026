import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { isValidVietnamClinicPin } from "@/modules/clinics/location";
const schema = z.object({ clinicId: z.string().uuid(), address: z.string().trim().min(5).max(240).optional(), supports24h: z.boolean(), longitude: z.number().min(-180).max(180).nullable(), latitude: z.number().min(-90).max(90).nullable() });
export async function GET() {
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("clinic_sos_settings");
  if (error) return Response.json({ error: "sos_settings_unavailable" }, { status: 503 });
  return Response.json({ clinics: data ?? [] }, { headers: { "cache-control": "private, no-store" } });
}
export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_sos_settings" }, { status: 400 });
  if (parsed.data.latitude !== null && parsed.data.longitude !== null && !isValidVietnamClinicPin(parsed.data.latitude, parsed.data.longitude)) return Response.json({ error: "clinic_location_outside_vietnam" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_admin"], "vi");
  let address = parsed.data.address;
  if (!address) {
    const { data: rows, error: settingsError } = await supabase.rpc("clinic_sos_settings");
    if (settingsError) return Response.json({ error: "sos_settings_unavailable" }, { status: 503 });
    address = (rows ?? []).find((row: any) => row.clinic_id === parsed.data.clinicId)?.address;
  }
  if (!address) return Response.json({ error: "clinic_address_required" }, { status: 400 });
  const { data, error } = await supabase.rpc("update_clinic_sos_profile", { p_clinic: parsed.data.clinicId, p_address: address, p_supports_24h: parsed.data.supports24h, p_lng: parsed.data.longitude, p_lat: parsed.data.latitude });
  if (error) return Response.json({ error: error.message.includes("clinic_location_required") ? "clinic_location_required" : "settings_save_failed" }, { status: error.message.includes("clinic_admin_required") ? 403 : 400 });
  return Response.json({ saved: data === true });
}
