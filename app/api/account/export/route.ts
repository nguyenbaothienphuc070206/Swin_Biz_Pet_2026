import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({error:"unauthorized"},{status:401});
  const userId=String(claims.claims.sub);
  const [authUser,profile,petsOwned,petOwners,consents,grants,privacyRequests,preferences,notifications,appointments,reviews,sos,aiRuns,posts,comments,lostFound,strays,rescueCases,audit,subscriptions,payments,billingDocuments,documents,scans]=await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id,full_name,phone,role,preferred_locale,email_notifications,appointment_reminders,created_at,updated_at").eq("id",userId).maybeSingle(),
    supabase.from("pets").select("id,name,species,breed,birth_date,microchip,photo_path,created_at,updated_at,deleted_at").eq("owner_id",userId).limit(1000),
    supabase.from("pet_owners").select("pet_id,owner_id,is_primary,invited_at,accepted_at,revoked_at").eq("owner_id",userId),
    supabase.from("consents").select("id,consent_type,granted_at,revoked_at,created_at").eq("user_id",userId).limit(1000),
    supabase.from("record_access_grants").select("id,pet_id,clinic_id,consent,scopes,expires_at,revoked_at,created_at").eq("owner_id",userId).limit(1000),
    supabase.from("privacy_requests").select("id,request_type,status,created_at").eq("user_id",userId).limit(1000),
    supabase.from("notification_preferences").select("enabled,in_app_enabled,web_push_enabled,email_enabled,sms_zalo_enabled,appointments_enabled,vaccines_enabled,care_plans_enabled,reviews_enabled,sos_enabled,quiet_hours_start,quiet_hours_end,timezone,updated_at").eq("user_id",userId).maybeSingle(),
    supabase.from("notifications").select("id,type,category,priority,locale,template_key,payload,scheduled_at,sent_at,status,created_at").eq("user_id",userId).limit(5000),
    supabase.from("appointments").select("*").eq("owner_id",userId).limit(5000),
    supabase.from("reviews").select("id,appointment_id,clinic_id,rating,body,status,created_at,updated_at").eq("owner_id",userId).limit(5000),
    supabase.from("sos_requests").select("id,pet_id,symptom_chips,urgency,status,location_consent_at,created_at,updated_at").eq("owner_id",userId).limit(1000),
    supabase.from("ai_runs").select("id,feature,provider,model,prompt_version,redacted_input,output_hash,latency_ms,input_tokens,output_tokens,cost_microusd,outcome,error_code,created_at").eq("user_id",userId).limit(5000),
    supabase.from("community_posts").select("id,title,body,status,created_at,updated_at").eq("author_id",userId).limit(5000),
    supabase.from("community_comments").select("id,post_id,body,status,created_at").eq("author_id",userId).limit(5000),
    supabase.from("lost_found_reports").select("*").eq("owner_id",userId).limit(1000),
    supabase.from("stray_reports").select("*").eq("reporter_id",userId).limit(1000),
    supabase.from("rescue_cases").select("id,pet_id,title,summary,species,status,verification_status,created_at,updated_at").eq("created_by",userId).limit(1000),
    supabase.from("audit_logs").select("id,action,entity_type,entity_id,outcome,metadata,created_at").eq("actor_id",userId).limit(5000),
    supabase.from("billing_subscriptions").select("id,plan_code,status,period_starts_at,period_ends_at,grace_ends_at,cancel_at_period_end,pending_plan_code,is_sandbox,created_at,updated_at").eq("owner_id",userId).limit(1000),
    supabase.from("billing_payments").select("id,provider,external_reference,amount_vnd,currency,status,created_at,updated_at").eq("owner_id",userId).limit(5000),
    supabase.from("billing_documents").select("id,subscription_id,payment_id,document_number,document_type,amount_vnd,status,issued_at,is_sandbox").eq("owner_id",userId).limit(1000),
    supabase.from("pet_documents").select("id,pet_id,title,mime_type,size_bytes,created_at,deleted_at").eq("owner_id",userId).limit(5000),
    supabase.from("private_file_scans").select("bucket_id,object_name,status,scanner,sha256,scan_error_code,created_at,scanned_at").eq("owner_id",userId).limit(5000),
  ]);
  const petIds=[...new Set([...(petsOwned.data??[]).map(row=>row.id),...(petOwners.data??[]).filter(row=>row.accepted_at&&!row.revoked_at).map(row=>row.pet_id)])];
  const queryPets=<T,>(run:()=>PromiseLike<{data:T[]|null;error:unknown}>)=>petIds.length?run():Promise.resolve({data:[] as T[],error:null});
  const [pets,allergies,conditions,weights,medicalRecords,vaccinations,prescriptions,carePlans]=await Promise.all([
    queryPets(()=>supabase.from("pets").select("id,name,species,breed,birth_date,microchip,photo_path,created_at,updated_at,deleted_at").in("id",petIds).limit(1000)),
    queryPets(()=>supabase.from("pet_allergies").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("pet_conditions").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("weight_entries").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("medical_records").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("vaccinations").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("prescriptions").select("*").in("pet_id",petIds).limit(5000)),
    queryPets(()=>supabase.from("care_plans").select("*").in("pet_id",petIds).limit(1000)),
  ]);
  const [triageSessions]=await Promise.all([supabase.from("triage_sessions").select("id,request_id,owner_id,clinic_id,status,video_provider,passport_grant_id,recommendation,vet_note,vet_id,started_at,expires_at,ended_at").eq("owner_id",userId).limit(1000)]);
  const recordIds=(medicalRecords.data??[]).map(row=>row.id),planIds=(carePlans.data??[]).map(row=>row.id),sessionIds=(triageSessions.data??[]).map(row=>row.id);
  const [amendments,planItems,planEvents,messages,dispatches]=await Promise.all([
    recordIds.length?supabase.from("medical_record_amendments").select("*").in("record_id",recordIds).limit(5000):Promise.resolve({data:[],error:null}),
    planIds.length?supabase.from("care_plan_items").select("*").in("plan_id",planIds).limit(5000):Promise.resolve({data:[],error:null}),
    planIds.length?supabase.from("care_plan_events").select("*").in("plan_id",planIds).limit(5000):Promise.resolve({data:[],error:null}),
    sessionIds.length?supabase.from("messages").select("id,session_id,sender_id,body,created_at").in("session_id",sessionIds).limit(5000):Promise.resolve({data:[],error:null}),
    sos.data?.length?supabase.from("sos_dispatches").select("id,request_id,clinic_id,distance_m,status,created_at,responded_at").in("request_id",sos.data.map(row=>row.id)).limit(5000):Promise.resolve({data:[],error:null}),
  ]);
  const allResults=[profile,petsOwned,petOwners,consents,grants,privacyRequests,preferences,notifications,appointments,reviews,sos,aiRuns,posts,comments,lostFound,strays,rescueCases,audit,subscriptions,payments,billingDocuments,documents,scans,pets,allergies,conditions,weights,medicalRecords,vaccinations,prescriptions,carePlans,triageSessions,amendments,planItems,planEvents,messages,dispatches];
  if(allResults.some(result=>result.error))return NextResponse.json({error:"export_unavailable"},{status:503});
  await supabase.from("privacy_requests").insert({user_id:userId,request_type:"export",status:"completed"});
  const payload={account:{email:authUser.data.user?.email??null,profile:profile.data},pets:pets.data,pet_ownership:petOwners.data,passport:{allergies:allergies.data,conditions:conditions.data,weights:weights.data,medical_records:medicalRecords.data,vaccinations:vaccinations.data,prescriptions:prescriptions.data,amendments:amendments.data,documents:documents.data,access_grants:grants.data},care_plans:{plans:carePlans.data,items:planItems.data,events:planEvents.data},appointments:appointments.data,reviews:reviews.data,sos:{requests:sos.data,dispatches:dispatches.data,triage_sessions:triageSessions.data,messages:messages.data},community:{posts:posts.data,comments:comments.data,lost_found:lostFound.data,stray_reports:strays.data,rescue_cases:rescueCases.data},billing:{subscriptions:subscriptions.data,payments:payments.data,documents:billingDocuments.data},notifications:{preferences:preferences.data,items:notifications.data},consents:consents.data,ai_runs:aiRuns.data,audit_logs:audit.data,file_scan_status:scans.data,privacy_requests:privacyRequests.data,generated_at:new Date().toISOString()};
  return new NextResponse(JSON.stringify(payload,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":"attachment; filename=pawcare-data-export.json","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}
