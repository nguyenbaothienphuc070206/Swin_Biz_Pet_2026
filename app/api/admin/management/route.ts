import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/server";
import { requireSensitiveAdmin } from "@/lib/auth/admin";

const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("suspend_user"), userId: z.string().uuid(), suspended: z.boolean(), reason: z.string().trim().min(5).max(1000) }),
  z.object({ kind: z.literal("feature_flag"), flagKey: z.string().min(2).max(80), enabled: z.boolean() }),
  z.object({ kind: z.literal("clinic_verified"), clinicId: z.string().uuid(), verified: z.boolean(), reason: z.string().trim().min(5).max(1000) }),
  z.object({ kind: z.literal("review_status"), reviewId: z.string().uuid(), status: z.enum(["published", "hidden", "under_review"]), reason: z.string().trim().min(5).max(1000) }),
]);

export async function GET(request: Request) {
  const url = new URL(request.url), section = url.searchParams.get("section");
  if(section==="users"||section==="reviews") { const auth=await requireSensitiveAdmin("vi");if(!auth.elevated)return Response.json({error:"step_up_required"},{status:428});const {supabase,userId}=auth;return readSensitiveSection(supabase,userId,section); }
  const { supabase, userId } = await requireRole(["platform_admin"], "vi");
  if (section === "clinics") {
    const { data, error } = await supabase.from("clinics").select("id,name,address,verified,created_at").order("created_at", { ascending: false }).limit(200);
    if (error) return Response.json({ error: "clinics_unavailable" }, { status: 503 });
    await supabase.from("audit_logs").insert({ actor_id: userId, action: "admin_view", entity_type: "clinics", metadata: { row_count: data?.length ?? 0 } });
    return Response.json({ rows: data ?? [] });
  }
  if (section === "flags") {
    const { data, error } = await supabase.from("feature_flags").select("flag_key,enabled,description_vi,description_en,updated_at").order("flag_key");
    if (error) return Response.json({ error: "flags_unavailable" }, { status: 503 });
    await supabase.from("audit_logs").insert({ actor_id:userId, action:"admin_view", entity_type:"feature_flags", metadata:{row_count:data?.length??0} });
    return Response.json({ rows: data ?? [] });
  }
  return Response.json({ error: "invalid_section" }, { status: 400 });
}

async function readSensitiveSection(supabase: SupabaseClient, userId: string, section: "users"|"reviews") {
  if(section==="users") {const {data,error}=await supabase.from("profiles").select("id,full_name,role,suspended_at,created_at").order("created_at",{ascending:false}).limit(200);if(error)return Response.json({error:"users_unavailable"},{status:503});await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:"profiles",metadata:{row_count:data?.length??0}});return Response.json({rows:data??[]});}
  const {data,error}=await supabase.from("reviews").select("id,clinic_id,owner_id,rating,body,status,created_at").in("status",["under_review","published"]).order("created_at",{ascending:false}).limit(100);if(error)return Response.json({error:"reviews_unavailable"},{status:503});await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:"reviews",metadata:{row_count:data?.length??0}});return Response.json({rows:data??[]});
}

export async function PATCH(request: Request) {
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_action" }, { status: 400 });
  const { supabase, elevated, userId } = await requireSensitiveAdmin("vi");
  if (!elevated) return Response.json({ error: "step_up_required" }, { status: 428 });
  const action = parsed.data;
  if (action.kind === "suspend_user") {
    const { data, error } = await supabase.rpc("admin_set_user_suspension", { p_user: action.userId, p_suspended: action.suspended, p_reason: action.reason });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ updated: data === true });
  }
  if (action.kind === "feature_flag") {
    const { data, error } = await supabase.rpc("admin_set_feature_flag", { p_key: action.flagKey, p_enabled: action.enabled });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ updated: data === true });
  }
  if (action.kind === "clinic_verified") {
    const { data, error } = await supabase.from("clinics").update({ verified: action.verified }).eq("id", action.clinicId).select("id").maybeSingle();
    if (error) return Response.json({ error: "clinic_update_failed" }, { status: 400 });
    if (data) await supabase.from("audit_logs").insert({ actor_id: userId, action: action.verified ? "clinic_verified" : "clinic_unverified", entity_type: "clinics", entity_id: action.clinicId, metadata: { reason: action.reason } });
    return Response.json({ updated: Boolean(data) });
  }
  const { data, error } = await supabase.from("reviews").update({ status: action.status }).eq("id", action.reviewId).select("id").maybeSingle();
  if (error) return Response.json({ error: "review_update_failed" }, { status: 400 });
  if (data) await supabase.from("audit_logs").insert({ actor_id: userId, action: "review_moderation", entity_type: "reviews", entity_id: action.reviewId, metadata: { decision: action.status, reason: action.reason } });
  return Response.json({ updated: Boolean(data) });
}
