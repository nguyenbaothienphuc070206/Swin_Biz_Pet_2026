import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ body: z.string().trim().min(1).max(3000) });
export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  if (!z.string().uuid().safeParse(postId).success) return Response.json({ error: "invalid_post_id" }, { status: 400 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_comment" }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.rpc("submit_community_comment", { p_post: postId, p_body: input.data.body });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ commentId: data, status: "pending" }, { status: 201 });
}
