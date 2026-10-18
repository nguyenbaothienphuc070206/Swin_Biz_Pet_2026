import {describe,expect,it} from "vitest";
import {evaluateOperationalMetrics,percentile} from "./metrics";

describe("operational metrics",()=>{
  it("computes nearest-rank p95",()=>expect(percentile(Array.from({length:20},(_,index)=>index+1),.95)).toBe(19));
  it("alerts when SOS time to first ping p95 exceeds 30 seconds",()=>{
    const sos=Array.from({length:20},(_,index)=>({createdAt:"2026-01-01T00:00:00.000Z",firstPingAt:new Date(Date.parse("2026-01-01T00:00:00.000Z")+(index>=18?31_000:10_000)).toISOString(),status:"searching"}));
    expect(evaluateOperationalMetrics({sos,aiOutcomes:[],now:Date.parse("2026-01-01T00:02:00Z")}).alerts.firstPingP95).toBe("alert");
  });
  it("requires enough samples and alerts on dispatch and AI failure rates",()=>{
    const sos=Array.from({length:20},(_,index)=>({createdAt:"2026-01-01T00:00:00.000Z",firstPingAt:index<4?null:"2026-01-01T00:00:01.000Z",status:index<4?"unmatched":"searching"}));
    const result=evaluateOperationalMetrics({sos,aiOutcomes:[...Array(2).fill("fallback"),...Array(18).fill("success")],now:Date.parse("2026-01-01T00:02:00Z")});
    expect(result.alerts.dispatchFailures).toBe("alert");expect(result.alerts.aiErrors).toBe("alert");
    expect(evaluateOperationalMetrics({sos:sos.slice(0,3),aiOutcomes:["fallback"]}).alerts.firstPingP95).toBe("insufficient_data");
  });
});
