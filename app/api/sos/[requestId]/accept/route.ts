import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import {hasFeatureAccess} from "@/modules/billing/access";
import {requestIdFrom,responseWithRequestId,sosTraceId,traceSos,writeLog} from "@/modules/observability/logger";

const schema = z.object({ clinicId: z.string().uuid(), dispatchId: z.string().uuid() });
export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const httpRequestId=requestIdFrom(request),startedAt=Date.now();
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return responseWithRequestId(Response.json({ error: "invalid_request_id" }, { status: 400 }),httpRequestId);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseWithRequestId(Response.json({ error: "invalid_acceptance" }, { status: 400 }),httpRequestId);
  const { supabase,userId } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  if(!await hasFeatureAccess(userId,"clinicDispatch"))return responseWithRequestId(Response.json({error:"feature_unavailable"},{status:403}),httpRequestId);
  const { data, error } = await supabase.rpc("accept_sos", { p_request: requestId, p_clinic: parsed.data.clinicId, p_dispatch: parsed.data.dispatchId });
  const traceId=sosTraceId(requestId);
  if (error) {writeLog("error","sos.dispatch.accept_failed",{request_id:httpRequestId,trace_id:traceId,error_code:error.message.includes("clinic_access")?"clinic_access_denied":"accept_failed"});traceSos(request,"dispatch.failed",{trace_id:traceId,duration_ms:Date.now()-startedAt});return responseWithRequestId(Response.json({ error: error.message.includes("clinic_access")?"clinic_access_denied":"accept_failed" }, { status: error.message.includes("clinic_access") ? 403 : 409 }),httpRequestId,traceId);}
  if(data===true)traceSos(request,"dispatch.accepted",{trace_id:traceId,duration_ms:Date.now()-startedAt});
  else {writeLog("warn","sos.dispatch.accept_conflict",{request_id:httpRequestId,trace_id:traceId,error_code:"accept_conflict"});traceSos(request,"dispatch.failed",{trace_id:traceId,duration_ms:Date.now()-startedAt,error_code:"accept_conflict"});}
  return responseWithRequestId(Response.json({ accepted: data === true,traceId }, { status: data === true ? 200 : 409 }),httpRequestId,traceId);
}
