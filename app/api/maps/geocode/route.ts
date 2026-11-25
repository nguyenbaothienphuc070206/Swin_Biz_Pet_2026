import { z } from "zod";
import { geocodeAddress } from "@/modules/clinics/geocoding-adapter.server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashSosValue } from "@/modules/sos/security";

const schema = z.object({ address: z.string().trim().min(5).max(240), locale: z.enum(["vi", "en"]).default("vi") });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_address" }, { status: 400 });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded?.at(-1) || "unknown";
  try {
    const db = createServiceClient();
    const { data: allowed, error } = await db.rpc("sos_check_rate_limit", { p_kind: "geocode_ip", p_hash: hashSosValue(ip), p_limit: 10 });
    if (error || allowed !== true) return Response.json({ error: "rate_limited" }, { status: 429 });
  } catch { return Response.json({ error: "geocoder_unavailable" }, { status: 503 }); }
  try {
    const result = await geocodeAddress(parsed.data.address, parsed.data.locale);
    if (!result) return Response.json({ error: "address_not_found" }, { status: 422 });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "geocoder_unavailable" ? "geocoder_unavailable" : "geocoding_failed";
    return Response.json({ error: code }, { status: code === "geocoder_unavailable" ? 503 : 502 });
  }
}
