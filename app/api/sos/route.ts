import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import {hasFeatureAccess} from "@/modules/billing/access";
import {requestIdFrom,responseWithRequestId,sosTraceId,traceSos,writeLog} from "@/modules/observability/logger";
import {isRiskyFeatureEnabled} from "@/modules/feature-flags";

const inputSchema = z.object({
  petId: z.string().uuid(), symptoms: z.array(z.enum(["poisoning", "breathing", "bleeding", "seizure", "trauma", "heatstroke", "other"])).min(1).max(7),
  urgency: z.enum(["emergency", "urgent", "monitor"]), longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId=requestIdFrom(request),startedAt=Date.now();
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseWithRequestId(Response.json({ error: "invalid_sos_request", details: parsed.error.flatten() }, { status: 400 }),requestId);
  const { supabase,userId } = await requireRole(["owner"], "vi");
  if(!await isRiskyFeatureEnabled(supabase,"sos.enabled"))return responseWithRequestId(Response.json({error:"feature_unavailable"},{status:503}),requestId);
  if(!await hasFeatureAccess(userId,"basicSos"))return responseWithRequestId(Response.json({error:"feature_unavailable"},{status:403}),requestId);
  const value = parsed.data;
  const { data, error } = await supabase.rpc("start_sos_request", {
    p_pet: value.petId, p_symptoms: value.symptoms, p_urgency: value.urgency,
    p_lng: value.longitude, p_lat: value.latitude, p_key: value.idempotencyKey,
  });
  if (error) {writeLog("error","sos.request.failed",{request_id:requestId,error_code:"request_create_failed"});return responseWithRequestId(Response.json({ error: "sos_request_failed" }, { status: error.message.includes("pet_access") ? 403 : 409 }),requestId);}
  const traceId=sosTraceId(String(data));
  const {count}=await supabase.from("sos_dispatches").select("id",{count:"exact",head:true}).eq("request_id",String(data)).eq("status","pinged");
  traceSos(request,"request.created",{trace_id:traceId,duration_ms:Date.now()-startedAt});
  traceSos(request,(count??0)>0?"dispatch.pinged":"dispatch.failed",{trace_id:traceId,clinic_count:count??0,duration_ms:Date.now()-startedAt});
  return responseWithRequestId(Response.json({ requestId: data, status: "searching", radiusKm: 5,traceId }, { status: 201 }),requestId,traceId);
}
