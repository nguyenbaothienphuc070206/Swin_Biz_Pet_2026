import {getTranslations} from "next-intl/server";
import {Card} from "@/components/ui";
import {requireRole} from "@/lib/auth/server";
import Link from "next/link";

export const dynamic="force-dynamic";

export default async function AdminPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;const {supabase,userId}=await requireRole(["platform_admin"],locale as "vi"|"en");const t=await getTranslations("admin");
  const since=new Date(Date.now()-30*86400_000).toISOString();
  const [owners,clinics,verified,appointments,recentAppointments,sos,ai,flags,pending,evaluations]=await Promise.all([
    supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","owner"),
    supabase.from("clinics").select("id",{count:"exact",head:true}),
    supabase.from("clinics").select("id",{count:"exact",head:true}).eq("verified",true),
    supabase.from("appointments").select("id",{count:"exact",head:true}).gte("created_at",since),
    supabase.from("appointments").select("owner_id").gte("created_at",since).neq("status","canceled").limit(5000),
    supabase.from("sos_requests").select("created_at,accepted_at,status").gte("created_at",since).not("accepted_at","is",null).limit(500),
    supabase.from("ai_runs").select("cost_microusd,latency_ms,outcome").gte("created_at",since).limit(1000),
    supabase.from("feature_flags").select("flag_key,enabled"),
    supabase.from("clinic_verification_requests").select("id",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("ai_eval_runs").select("suite,passed_cases,total_cases,thresholds_passed,created_at").order("created_at",{ascending:false}).limit(1),
  ]);
  await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:"platform_metrics",metadata:{window_days:30}});
  const accepted=(sos.data??[]).map(row=>new Date(row.accepted_at!).getTime()-new Date(row.created_at).getTime()).filter(n=>Number.isFinite(n)&&n>=0);
  const ownerVisits=new Map<string,number>();for(const row of recentAppointments.data??[])ownerVisits.set(row.owner_id,(ownerVisits.get(row.owner_id)??0)+1);const returning=[...ownerVisits.values()].filter(count=>count>1).length;const retention=ownerVisits.size?Math.round(returning/ownerVisits.size*100):null;
  const avgResponse=accepted.length?Math.round(accepted.reduce((a,b)=>a+b,0)/accepted.length/1000/60):null;
  const aiRuns=ai.data??[];const cost=(aiRuns.reduce((sum,row)=>sum+Number(row.cost_microusd??0),0)/1_000_000).toFixed(3);const latency=aiRuns.length?Math.round(aiRuns.reduce((sum,row)=>sum+row.latency_ms,0)/aiRuns.length):null;const blocked=aiRuns.filter(row=>row.outcome==="blocked").length;
  const latestEval=evaluations.data?.[0];const evalValue=latestEval?`${latestEval.passed_cases}/${latestEval.total_cases} · ${latestEval.thresholds_passed?t("enabled"):t("disabled")}`:t("notAvailable");
  const metrics=[[t("owners"),owners.count??0],[t("clinics"),clinics.count??0],[t("verifiedClinics"),verified.count??0],[t("bookings30d"),appointments.count??0],[t("retention30d"),retention===null?t("notAvailable"):t("percent",{value:retention})],[t("pendingVerification"),pending.count??0],[t("sosResponse"),avgResponse===null?t("notAvailable"):t("minutes",{value:avgResponse})],[t("aiCost"),t("usd",{value:cost})],[t("aiLatency"),latency===null?t("notAvailable"):t("milliseconds",{value:latency})],[t("blockedOutputs"),blocked],[t("evaluationResults"),evalValue]] as const;
  const links=[["verification",t("verification")],["community",t("communityQueue")],["reviews",t("reviews")],["users",t("users")],["clinics",t("clinics")],["flags",t("featureFlags")],["audit",t("auditLog")],["observability",t("observability")]];
  return <div><p className="text-sm font-semibold text-primary">PawCare</p><h1 className="mt-2 font-display text-3xl font-bold">{t("console")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("metricsWindow")}</p><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label,value])=><Card key={label} className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div><Card className="mt-5 p-5"><h2 className="font-semibold">{t("featureFlagStatus")}</h2><ul className="mt-3 grid gap-2 sm:grid-cols-2">{(flags.data??[]).map(flag=><li key={flag.flag_key} className="flex justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm"><span>{flag.flag_key}</span><strong>{flag.enabled?t("enabled"):t("disabled")}</strong></li>)}</ul></Card><nav aria-label={t("adminNavigation")} className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{links.map(([href,label])=><Link key={href} href={`/${locale}/admin/${href}`} className="min-h-12 rounded-xl border border-border bg-card px-4 py-3 font-semibold hover:bg-secondary">{label}</Link>)}</nav></div>;
}
