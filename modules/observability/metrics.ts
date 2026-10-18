export type SosMetricSample={createdAt:string;firstPingAt:string|null;status:string};
export type AlertState="ok"|"alert"|"insufficient_data";
export function percentile(values:number[],percentile:number){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(percentile*sorted.length)-1)]??null;}
export function evaluateOperationalMetrics(input:{sos:SosMetricSample[];aiOutcomes:string[];now?:number}){
  const now=input.now??Date.now();
  const pingLatencies=input.sos.flatMap(item=>{if(!item.firstPingAt)return[];const value=new Date(item.firstPingAt).getTime()-new Date(item.createdAt).getTime();return Number.isFinite(value)&&value>=0?[value]:[];});
  const failedDispatches=input.sos.filter(item=>item.status==="unmatched"||item.status==="expired"||(!item.firstPingAt&&now-new Date(item.createdAt).getTime()>=90_000)).length;
  const dispatchFailureRate=input.sos.length?failedDispatches/input.sos.length:null;
  const aiErrors=input.aiOutcomes.filter(outcome=>outcome==="fallback"||outcome==="error").length;
  const aiErrorRate=input.aiOutcomes.length?aiErrors/input.aiOutcomes.length:null;
  const firstPingP95Ms=percentile(pingLatencies,.95);
  return {
    samples:{sos:input.sos.length,pinged:pingLatencies.length,ai:input.aiOutcomes.length},
    firstPingP95Ms,dispatchFailureRate,dispatchFailures:failedDispatches,aiErrorRate,aiErrors,
    alerts:{
      firstPingP95:firstPingP95Ms===null||pingLatencies.length<20?"insufficient_data":firstPingP95Ms>30_000?"alert":"ok",
      dispatchFailures:input.sos.length<20?"insufficient_data":dispatchFailureRate!>=.1?"alert":"ok",
      aiErrors:input.aiOutcomes.length<20?"insufficient_data":aiErrorRate!>=.05?"alert":"ok",
    } satisfies Record<string,AlertState>,
  };
}
