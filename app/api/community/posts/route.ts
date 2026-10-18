import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { privateSignedUrlExpiry } from "@/modules/security/signed-url";

const schema = z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(1).max(4000), imagePath: z.string().max(500).nullable().optional() });
export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ posts: [] });
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_posts").select("id,title,body,image_path,created_at,author_id,community_comments(id,body,created_at)").eq("status", "approved").order("created_at", { ascending: false }).limit(40);
  if(error)return Response.json({error:"posts_unavailable"},{status:503});
  const posts=await Promise.all((data??[]).map(async post=>{let imageUrl:string|null=null;if(post.image_path){const {data: signed}=await supabase.storage.from("community-private").createSignedUrl(post.image_path,privateSignedUrlExpiry(300));imageUrl=signed?.signedUrl??null}return {...post,imageUrl}}));
  return Response.json({ posts },{headers:{"cache-control":"private, max-age=20"}});
}
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_post", details: input.error.flatten() }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.rpc("submit_community_post", { p_title: input.data.title, p_body: input.data.body, p_image_path: input.data.imagePath ?? null });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ postId: data, status: "pending" }, { status: 201 });
}
