import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ type: z.enum(["post", "comment", "lost_found", "stray", "rescue_case"]), id: z.string().uuid(), reason: z.string().trim().min(10).max(1500) });
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_appeal" }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.rpc("submit_community_appeal", { p_type: input.data.type, p_target: input.data.id, p_reason: input.data.reason });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ appealId: data }, { status: 201 });
}
