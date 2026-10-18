import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ kind: z.enum(["lost", "found"]), species: z.enum(["dog", "cat", "other"]), breed: z.string().trim().max(100).nullable().optional(), colors: z.array(z.string().trim().min(1).max(40)).max(8), description: z.string().trim().min(1).max(2000), reportedAt: z.iso.datetime().optional(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), petId: z.string().uuid().nullable().optional(), imagePath: z.string().max(500).nullable().optional() });
export async function GET() {
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.from("lost_found_reports").select("id,kind,species,color_tags,description,status,created_at").order("created_at", { ascending: false }).limit(30);
  return error ? Response.json({ error: "reports_unavailable" }, { status: 503 }) : Response.json({ reports: data ?? [] });
}
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_lost_found_report", details: input.error.flatten() }, { status: 400 });
  if (input.data.kind === "lost" && !input.data.petId) return Response.json({ error: "pet_required_for_lost_report" }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const v = input.data;
  const { data, error } = await supabase.rpc("submit_lost_found_report", { p_kind: v.kind, p_pet: v.petId ?? null, p_species: v.species, p_breed: v.breed ?? null, p_colors: v.colors, p_description: v.description, p_reported_at: v.reportedAt ?? new Date().toISOString(), p_lat: v.latitude, p_lng: v.longitude, p_image_path: v.imagePath ?? null });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ reportId: data, status: "pending", locationPrivacy: "street_level_fuzzy" }, { status: 201 });
}
