import { z } from "zod";
import { reverseGeocodeCoordinates } from "@/modules/clinics/geocoding-adapter.server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashSosValue } from "@/modules/sos/security";
import { isValidVietnamClinicPin } from "@/modules/clinics/location";

const schema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), locale: z.enum(["vi", "en"]).default("vi") });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidVietnamClinicPin(parsed.data.latitude, parsed.data.longitude)) return Response.json({ error: "clinic_location_outside_vietnam" }, { status: 400 });
  const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("sos_check_rate_limit", { p_kind: "geocode_ip", p_hash: hashSosValue(ip), p_limit: 10 });
    if (error || data !== true) return Response.json({ error: "rate_limited" }, { status: 429 });
    const address = await reverseGeocodeCoordinates(parsed.data.latitude, parsed.data.longitude, parsed.data.locale);
    if (!address) return Response.json({ error: "location_not_in_vietnam" }, { status: 422 });
    return Response.json({ address }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const unavailable = error instanceof Error && error.message === "geocoder_unavailable";
    return Response.json({ error: unavailable ? "geocoder_unavailable" : "reverse_geocoding_failed" }, { status: unavailable ? 503 : 502 });
  }
}
