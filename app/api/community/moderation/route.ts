import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { requireSensitiveAdmin } from "@/lib/auth/admin";
import { privateSignedUrlExpiry } from "@/modules/security/signed-url";

const schema = z.object({ type: z.enum(["post", "comment", "lost_found", "stray", "rescue_case"]), id: z.string().uuid(), action: z.enum(["approve", "reject", "hide"]), note: z.string().trim().max(1000).optional() }).refine(v => v.action === "approve" || Boolean(v.note && v.note.length >= 5), { path: ["note"], message: "reason_required" });
export async function GET() {
  const { supabase, elevated, userId } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "step_up_required" }, { status: 428 });
  const tables = [
    { table:"community_posts",type:"post",select:"id,status,created_at,title,body,image_path" },
    { table:"community_comments",type:"comment",select:"id,status,created_at,body" },
    { table:"lost_found_reports",type:"lost_found",select:"id,status,created_at,description,image_path" },
    { table:"stray_reports",type:"stray",select:"id,status,created_at,description,image_path" },
    { table:"rescue_cases",type:"rescue_case",select:"id,status,created_at,title,summary,image_path" },
  ] as const;
  const rows = await Promise.all(tables.map(async (table) => {
    const { data, error } = await supabase.from(table.table).select(table.select).eq("status", "pending").order("created_at", { ascending: true }).limit(100);
    if(error)return [];
    return Promise.all((data??[]).map(async row=>{const value=row as unknown as Record<string,unknown>;let imageUrl:string|null=null;const imagePath=value.image_path;if(typeof imagePath==="string"){const {data:signed}=await supabase.storage.from("community-private").createSignedUrl(imagePath,privateSignedUrlExpiry(300));imageUrl=signed?.signedUrl??null}return {...value,imageUrl,type:table.type}}));
  }));
  const [reports,appeals]=await Promise.all([
    supabase.from("community_moderation_reports").select("id,target_type,target_id,reason,status,created_at").eq("status","open").order("created_at",{ascending:true}).limit(100),
    supabase.from("community_appeals").select("id,target_type,target_id,reason,status,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(100),
  ]);
  await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:"community_moderation_queue",metadata:{content_items:rows.flat().length,reports:reports.data?.length??0,appeals:appeals.data?.length??0}});
  return Response.json({ queue: rows.flat(), reports: reports.data??[], appeals: appeals.data??[] });
}
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_moderation_action" }, { status: 400 });
  const { supabase, elevated, userId } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "step_up_required" }, { status: 428 });
  const { data, error } = await supabase.rpc("moderate_community_content", { p_type: input.data.type, p_id: input.data.id, p_action: input.data.action, p_note: input.data.note ?? null });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (data === true) await supabase.from("audit_logs").insert({ actor_id:userId, action:`admin_moderation_${input.data.action}`, entity_type:input.data.type, entity_id:input.data.id, metadata:{ reason:input.data.note ?? null } });
  return Response.json({ updated: data === true });
}
