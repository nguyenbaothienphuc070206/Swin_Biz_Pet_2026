import {z} from "zod";
import {requireRole} from "@/lib/auth/server";
import {requestIdFrom,responseWithRequestId,sosTraceId,traceSos,writeLog} from "@/modules/observability/logger";

const uuid=z.string().uuid();
export async function POST(request:Request,context:{params:Promise<{requestId:string}>}){
  const httpRequestId=requestIdFrom(request),startedAt=Date.now();
  const {requestId}=await context.params;
  if(!uuid.safeParse(requestId).success)return responseWithRequestId(Response.json({error:"invalid_request_id"},{status:400}),httpRequestId);
  const {supabase}=await requireRole(["clinic_staff","clinic_admin"],"vi");
  const {data,error}=await supabase.rpc("create_triage_session",{p_request:requestId});
  const traceId=sosTraceId(requestId);
  if(error){
    const accessDenied=error.message.includes("clinic_access");
    writeLog("error","sos.session.start_failed",{request_id:httpRequestId,trace_id:traceId,error_code:accessDenied?"clinic_access_denied":"session_start_failed"});
    traceSos(request,"session.failed",{trace_id:traceId,duration_ms:Date.now()-startedAt});
    return responseWithRequestId(Response.json({error:accessDenied?"clinic_access_denied":"session_not_available"},{status:accessDenied?403:409}),httpRequestId,traceId);
  }
  traceSos(request,"session.started",{trace_id:traceId,duration_ms:Date.now()-startedAt});
  return responseWithRequestId(Response.json({sessionId:data,expiresInMinutes:30,traceId}),httpRequestId,traceId);
}
