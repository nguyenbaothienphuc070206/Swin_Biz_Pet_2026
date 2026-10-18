import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

const schema = z.object({ species: z.enum(["dog", "cat", "other"]), colors: z.array(z.string().trim().min(1).max(40)).max(8), description: z.string().trim().max(2000).nullable().optional(), sightedAt: z.iso.datetime().optional(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), imagePath: z.string().max(500).nullable().optional() });
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_stray_report", details: input.error.flatten() }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const value = input.data;
  const { data, error } = await supabase.rpc("submit_stray_report", { p_species: value.species, p_colors: value.colors, p_description: value.description ?? null, p_sighted_at: value.sightedAt ?? new Date().toISOString(), p_lat: value.latitude, p_lng: value.longitude, p_image_path: value.imagePath ?? null });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ reportId: data, status: "pending", publicLocation: "fuzzed_after_moderation" }, { status: 201 });
}
