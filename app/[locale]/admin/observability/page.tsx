import {getTranslations} from "next-intl/server";
import {Card} from "@/components/ui";
import {requireRole} from "@/lib/auth/server";
import {evaluateOperationalMetrics} from "@/modules/observability/metrics";
import {writeLog} from "@/modules/observability/logger";

export const dynamic="force-dynamic";
export default async function ObservabilityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;const {supabase}=await requireRole(["platform_admin"],locale as "vi"|"en");const t=await getTranslations("admin");
  const now=Date.now(),since=new Date(now-30*86_400_000).toISOString(),cohortSince=new Date(now-60*86_400_000).toISOString(),cohortBefore=new Date(now-30*86_400_000).toISOString();
  const [sosResult,aiResult,ownerCohortResult,appointmentsResult,clinicCohortResult,clinicAppointmentsResult,clinicSosResult]=await Promise.all([
    supabase.from("sos_requests").select("id,owner_id,accepted_clinic_id,created_at,status").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
    supabase.from("ai_runs").select("outcome").eq("is_demo",false).gte("created_at",since).limit(5000),
    supabase.from("profiles").select("id,created_at").eq("role","owner").eq("is_demo",false).gte("created_at",cohortSince).lt("created_at",new Date(now+1).toISOString()).limit(5000),
    supabase.from("appointments").select("owner_id,clinic_id,status,created_at").eq("is_demo",false).gte("created_at",since).limit(5000),
    supabase.from("clinics").select("id,created_at,verified").eq("is_demo",false).gte("created_at",cohortSince).lt("created_at",cohortBefore).limit(5000),
    supabase.from("appointments").select("clinic_id,status,created_at").eq("is_demo",false).gte("created_at",cohortSince).limit(10000),
    supabase.from("sos_requests").select("accepted_clinic_id,created_at,accepted_at,status").gte("created_at",cohortSince).not("accepted_clinic_id","is",null).limit(10000),
  ]);
  const requests=sosResult.data??[];const ids=requests.map(row=>row.id);
  const dispatchResult=ids.length?await supabase.from("sos_dispatches").select("request_id,pinged_at").in("request_id",ids):{data:[],error:null};
  const firstPing=new Map<string,string>();for(const dispatch of dispatchResult.data??[]){const prior=firstPing.get(dispatch.request_id);if(!prior||dispatch.pinged_at<prior)firstPing.set(dispatch.request_id,dispatch.pinged_at);}
  const metrics=evaluateOperationalMetrics({sos:requests.map(row=>({createdAt:row.created_at,firstPingAt:firstPing.get(row.id)??null,status:row.status})),aiOutcomes:(aiResult.data??[]).map(row=>row.outcome)});
  const owners=ownerCohortResult.data??[],ownerIds=owners.map(row=>row.id);
  const petResult=ownerIds.length?await supabase.from("pets").select("id,owner_id,created_at").in("owner_id",ownerIds).is("deleted_at",null).eq("is_demo",false).limit(10000):{data:[],error:null};
  const pets=petResult.data??[],petIds=pets.map(row=>row.id);
  const [recordsResult,vaccinesResult,retentionBookingsResult]=await Promise.all([
    petIds.length?supabase.from("medical_records").select("pet_id,created_at").in("pet_id",petIds).eq("is_demo",false).gte("created_at",cohortSince).limit(10000):Promise.resolve({data:[],error:null}),
    petIds.length?supabase.from("vaccinations").select("pet_id,created_at").in("pet_id",petIds).eq("is_demo",false).gte("created_at",cohortSince).limit(10000):Promise.resolve({data:[],error:null}),
    (ownerCohortResult.data??[]).filter(row=>row.created_at<cohortBefore).length?supabase.from("appointments").select("owner_id").in("owner_id",(ownerCohortResult.data??[]).filter(row=>row.created_at<cohortBefore).map(row=>row.id)).eq("status","completed").gte("created_at",since).limit(10000):Promise.resolve({data:[],error:null}),
  ]);
  const activationOwners=owners.filter(row=>row.created_at>=new Date(now-30*86_400_000).toISOString());
  const petEligibleOwners=activationOwners.filter(row=>row.created_at<new Date(now-7*86_400_000).toISOString());
  const recordEligibleOwners=activationOwners.filter(row=>row.created_at<new Date(now-14*86_400_000).toISOString());
  const petEligibleSet=new Set(petEligibleOwners.map(row=>row.id)),recordEligibleSet=new Set(recordEligibleOwners.map(row=>row.id));
  const ownerCreatedAt=new Map(owners.map(row=>[row.id,new Date(row.created_at).getTime()]));
  const petOwners=new Set(pets.filter(row=>{const created=ownerCreatedAt.get(row.owner_id),petCreated=new Date(row.created_at).getTime();return created!==undefined&&petEligibleSet.has(row.owner_id)&&petCreated>=created&&petCreated-created<=7*86_400_000;}).map(row=>row.owner_id));
  const petToOwner=new Map(pets.map(row=>[row.id,row.owner_id]));
  const isFirstRecord=(petId:string,createdAt:string)=>{const ownerId=petToOwner.get(petId),created=ownerId?ownerCreatedAt.get(ownerId):undefined,recorded=new Date(createdAt).getTime();return Boolean(ownerId&&recordEligibleSet.has(ownerId)&&created!==undefined&&recorded>=created&&recorded-created<=14*86_400_000);};
  const recordPetIds=new Set([
    ...(recordsResult.data??[]).filter(row=>isFirstRecord(row.pet_id,row.created_at)).map(row=>row.pet_id),
    ...(vaccinesResult.data??[]).filter(row=>isFirstRecord(row.pet_id,row.created_at)).map(row=>row.pet_id),
  ]);
  const ownersWithRecord=new Set([...recordPetIds].map(petId=>petToOwner.get(petId)).filter((id):id is string=>Boolean(id)&&recordEligibleSet.has(id)));
  const appointments=appointmentsResult.data??[],bookingConfirmed=appointments.filter(row=>row.status==="confirmed"||row.status==="completed").length,bookingCompleted=appointments.filter(row=>row.status==="completed").length;
  const acceptedRequests=requests.filter(row=>row.status==="accepted"||row.status==="in_progress"||row.status==="completed");
  const sessionResult=acceptedRequests.length?await supabase.from("triage_sessions").select("request_id").in("request_id",acceptedRequests.map(row=>row.id)): {data:[],error:null};
  const sosActivationRequests=new Set((dispatchResult.data??[]).map(row=>row.request_id));
  const oldOwnerIds=owners.filter(row=>row.created_at<cohortBefore).map(row=>row.id);const oldOwnerSet=new Set(oldOwnerIds);const retainedOwners=new Set([...(retentionBookingsResult.data??[]).map(row=>row.owner_id),...requests.filter(row=>row.status==="accepted"||row.status==="in_progress"||row.status==="completed").map(row=>row.owner_id)].filter(ownerId=>oldOwnerSet.has(ownerId)));
  const eligibleClinics=(clinicCohortResult.data??[]).filter(row=>new Date(row.created_at).getTime()<=now-30*86_400_000),clinicById=new Map(eligibleClinics.map(row=>[row.id,row])),activeClinicIds=new Set<string>();
  for(const appointment of clinicAppointmentsResult.data??[]){const clinic=clinicById.get(appointment.clinic_id),created=clinic?new Date(clinic.created_at).getTime():undefined,activity=new Date(appointment.created_at).getTime();if(clinic?.verified&&appointment.status==="completed"&&created!==undefined&&activity>=created&&activity<=created+30*86_400_000)activeClinicIds.add(appointment.clinic_id);}
  for(const sos of clinicSosResult.data??[]){const clinicId=sos.accepted_clinic_id,clinic=clinicId?clinicById.get(clinicId):undefined,created=clinic?new Date(clinic.created_at).getTime():undefined,activity=sos.accepted_at?new Date(sos.accepted_at).getTime():NaN;if(clinic?.verified&&created!==undefined&&Number.isFinite(activity)&&activity>=created&&activity<=created+30*86_400_000)activeClinicIds.add(clinic.id);}
  const productMetrics={firstPetEligible:petEligibleOwners.length,firstRecordEligible:recordEligibleOwners.length,firstPet:petOwners.size,firstRecord:ownersWithRecord.size,bookingConfirmed,bookingCompleted,bookingTotal:appointments.length,sosSubmitted:requests.length,sosPinged:sosActivationRequests.size,sosAccepted:acceptedRequests.length,sosSessions:(sessionResult.data??[]).length,retentionEligible:oldOwnerIds.length,retained:retainedOwners.size,clinicEligible:eligibleClinics.length,clinicActivated:activeClinicIds.size};
  const firstPetValue=productMetrics.firstPetEligible>=10?`${productMetrics.firstPet}/${productMetrics.firstPetEligible}`:t("notAvailable");
  const firstRecordValue=productMetrics.firstRecordEligible>=10?`${productMetrics.firstRecord}/${productMetrics.firstRecordEligible}`:t("notAvailable");
  const retentionValue=productMetrics.retentionEligible>=10?`${productMetrics.retained}/${productMetrics.retentionEligible}`:t("notAvailable");
  for(const [rule,status]of Object.entries(metrics.alerts))if(status==="alert")writeLog("warn","alert.rule_triggered",{rule,window_days:30,sample_count:rule==="firstPingP95"?metrics.samples.pinged:rule==="aiErrors"?metrics.samples.ai:metrics.samples.sos});
  const alertRows=[
    [t("obsFirstPingP95"),metrics.firstPingP95Ms===null?t("notAvailable"):t("obsSeconds",{value:(metrics.firstPingP95Ms/1000).toFixed(1)}),metrics.samples.pinged,metrics.alerts.firstPingP95],
    [t("obsDispatchFailures"),metrics.dispatchFailureRate===null?t("notAvailable"):t("obsPercent",{value:(metrics.dispatchFailureRate*100).toFixed(1)}),metrics.samples.sos,metrics.alerts.dispatchFailures],
    [t("obsAiErrorRate"),metrics.aiErrorRate===null?t("notAvailable"):t("obsPercent",{value:(metrics.aiErrorRate*100).toFixed(1)}),metrics.samples.ai,metrics.alerts.aiErrors],
  ] as const;
  return <main className="space-y-5"><header><p className="text-sm font-semibold text-primary">{t("obsEyebrow")}</p><h1 className="mt-2 font-display text-3xl font-bold">{t("obsTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("obsDescription")}</p></header><div className="grid gap-4 lg:grid-cols-3">{alertRows.map(([label,value,samples,status])=><Card key={label} className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{label}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status==="alert"?"bg-destructive/10 text-destructive":"bg-secondary text-secondary-foreground"}`}>{t(`obs${status[0].toUpperCase()}${status.slice(1)}`)}</span></div><p className="text-3xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{t("obsSamples",{count:samples})}</p></Card>)}</div><Card className="p-5"><h2 className="font-semibold">{t("obsProductAnalytics")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("obsProductPrivacy")}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[[t("obsFirstPet"),firstPetValue],[t("obsFirstRecord"),firstRecordValue],[t("obsBookingFunnel"),`${productMetrics.bookingConfirmed}/${productMetrics.bookingTotal} · ${productMetrics.bookingCompleted} ${t("obsCompleted")}`],[t("obsSosFunnel"),`${productMetrics.sosPinged}/${productMetrics.sosSubmitted} · ${productMetrics.sosAccepted} · ${productMetrics.sosSessions}`],[t("obsRetention"),retentionValue],[t("obsClinicActivation"),`${productMetrics.clinicActivated}/${productMetrics.clinicEligible}`]].map(([label,value])=><div key={label as string} className="rounded-xl bg-secondary/60 p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-bold">{value}</dd></div>)}</dl></Card><Card className="space-y-2 p-5"><h2 className="font-semibold">{t("obsErrorTracking")}</h2><p className="text-sm text-muted-foreground">{t("obsErrorTrackingDescription")}</p><p className="text-xs text-muted-foreground">{t("obsPrivacy")}</p></Card><Card className="space-y-2 p-5"><h2 className="font-semibold">{t("obsUptime")}</h2><p className="text-sm text-muted-foreground">{t("obsUptimeDescription")}</p><code className="block rounded-lg bg-secondary p-3 text-sm">GET /api/health</code></Card><p className="text-xs text-muted-foreground">{t("obsWindow")}</p></main>;
}
