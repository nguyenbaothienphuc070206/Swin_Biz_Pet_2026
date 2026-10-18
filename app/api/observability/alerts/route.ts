import {timingSafeEqual} from "node:crypto";
import {createServiceClient} from "@/lib/supabase/service";
import {evaluateOperationalMetrics} from "@/modules/observability/metrics";
import {requestIdFrom,responseWithRequestId,writeLog} from "@/modules/observability/logger";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const requestId=requestIdFrom(request),expected=process.env.OBSERVABILITY_JOB_TOKEN??"",provided=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(!expected||provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return responseWithRequestId(Response.json({error:"unauthorized"},{status:401}),requestId);
  try{
    const supabase=createServiceClient(),since=new Date(Date.now()-30*86_400_000).toISOString();
    const [sosResult,aiResult]=await Promise.all([
      supabase.from("sos_requests").select("id,created_at,status").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
      supabase.from("ai_runs").select("outcome").eq("is_demo",false).gte("created_at",since).limit(5000),
    ]);
    if(sosResult.error||aiResult.error)throw new Error("metrics_query_failed");
    const requests=sosResult.data??[],ids=requests.map(row=>row.id);
    const dispatchResult=ids.length?await supabase.from("sos_dispatches").select("request_id,pinged_at").in("request_id",ids):{data:[],error:null};
    if(dispatchResult.error)throw new Error("dispatch_query_failed");
    const firstPing=new Map<string,string>();for(const dispatch of dispatchResult.data??[]){const prior=firstPing.get(dispatch.request_id);if(!prior||dispatch.pinged_at<prior)firstPing.set(dispatch.request_id,dispatch.pinged_at);}
    const metrics=evaluateOperationalMetrics({sos:requests.map(row=>({createdAt:row.created_at,firstPingAt:firstPing.get(row.id)??null,status:row.status})),aiOutcomes:(aiResult.data??[]).map(row=>row.outcome)});
    const fired=Object.entries(metrics.alerts).filter(([,state])=>state==="alert").map(([rule])=>rule);
    for(const rule of fired)writeLog("error","alert.rule_triggered",{request_id:requestId,rule,window_days:30});
    return responseWithRequestId(Response.json({status:fired.length?"alert":"ok",fired,rules:metrics.alerts,samples:metrics.samples},{status:fired.length?503:200}),requestId);
  }catch{
    writeLog("error","observability.alert_check_failed",{request_id:requestId,error_code:"metrics_query_failed"});
    return responseWithRequestId(Response.json({error:"metrics_query_failed"},{status:503}),requestId);
  }
}
