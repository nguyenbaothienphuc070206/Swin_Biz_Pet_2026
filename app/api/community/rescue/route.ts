import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {isRiskyFeatureEnabled} from "@/modules/feature-flags";

const schema = z.object({ title: z.string().trim().min(5).max(160), summary: z.string().trim().min(20).max(4000), species: z.enum(["dog", "cat", "other"]), petId: z.string().uuid().nullable().optional(), clinicId: z.string().uuid().nullable().optional(), rescuePartnerId: z.string().uuid().nullable().optional(), imagePath: z.string().max(500).nullable().optional() }).refine((v) => Boolean(v.clinicId || v.rescuePartnerId), { message: "verified_partner_required" });
export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ cases: [] });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_rescue_cases", { p_limit: 50 });
  return error ? Response.json({ error: "rescue_cases_unavailable" }, { status: 503 }) : Response.json({ cases: data ?? [] }, { headers: { "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
}
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_rescue_case", details: input.error.flatten() }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  if(!await isRiskyFeatureEnabled(supabase,"community.fundraising.enabled"))return Response.json({error:"feature_unavailable"},{status:503});
  const value = input.data;
  const { data, error } = await supabase.rpc("submit_rescue_case", { p_title: value.title, p_summary: value.summary, p_species: value.species, p_pet: value.petId ?? null, p_clinic: value.clinicId ?? null, p_partner: value.rescuePartnerId ?? null, p_image_path: value.imagePath ?? null });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ rescueCaseId: data, status: "pending_verification", paymentMode: "direct_to_partner_only" }, { status: 201 });
}
