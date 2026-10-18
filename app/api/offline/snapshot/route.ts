import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth/server";

export async function GET(){
  const {supabase,userId}=await requireRole(["owner"],"vi");
  const {data:pets,error:petsError}=await supabase.from("pets").select("id,name,species,birth_date").eq("owner_id",userId).is("deleted_at",null).order("created_at").limit(30);
  if(petsError)return NextResponse.json({error:"offline_snapshot_unavailable"},{status:503});
  const petIds=(pets??[]).map(pet=>pet.id);
  const [allergies,conditions,vaccinations,records,prescriptions,plans]=petIds.length?await Promise.all([
    supabase.from("pet_allergies").select("pet_id,name,severity").in("pet_id",petIds).limit(300),
    supabase.from("pet_conditions").select("pet_id,name,status").in("pet_id",petIds).eq("status","active").limit(300),
    supabase.from("vaccinations").select("pet_id,vaccine_name,administered_at,next_due_at").in("pet_id",petIds).order("administered_at",{ascending:false}).limit(300),
    supabase.from("medical_records").select("pet_id,record_type,occurred_at,summary,payload").in("pet_id",petIds).order("occurred_at",{ascending:false}).limit(300),
    supabase.from("prescriptions").select("pet_id,medication_name,code,dose,started_at,ended_at").in("pet_id",petIds).is("ended_at",null).order("started_at",{ascending:false}).limit(200),
    supabase.from("care_plans").select("id,pet_id,status,approved_at,version").in("pet_id",petIds).eq("status","approved").eq("shared_with_owner",true).limit(100),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if([allergies,conditions,vaccinations,records,prescriptions,plans].some(result=>result.error))return NextResponse.json({error:"offline_snapshot_unavailable"},{status:503});
  const [allergiesData,conditionsData,vaccinationsData,recordsData,prescriptionsData,plansData]=[allergies,conditions,vaccinations,records,prescriptions,plans];
  const planIds=(plansData.data??[]).map(plan=>plan.id);
  const tasks=planIds.length?await supabase.from("care_plan_items").select("id,plan_id,task_key,category,due_from,due_to,status,vet_visit_required").in("plan_id",planIds).in("status",["pending","completed"]).order("due_from").limit(500):{data:[],error:null};
  if(tasks.error)return NextResponse.json({error:"offline_snapshot_unavailable"},{status:503});
  const petNames=new Map((pets??[]).map(pet=>[pet.id,pet.name]));
  if(petIds.length){const audit=await supabase.from("audit_logs").insert(petIds.map(petId=>({actor_id:userId,pet_id:petId,action:"offline_snapshot_read",entity_type:"pet_offline_snapshot",entity_id:petId})));if(audit.error)return NextResponse.json({error:"offline_snapshot_unavailable"},{status:503});}
  return NextResponse.json({userId,savedAt:new Date().toISOString(),pets:(pets??[]).map(pet=>({...pet,allergies:(allergiesData.data??[]).filter(row=>row.pet_id===pet.id),conditions:(conditionsData.data??[]).filter(row=>row.pet_id===pet.id),vaccinations:(vaccinationsData.data??[]).filter(row=>row.pet_id===pet.id),records:(recordsData.data??[]).filter(row=>row.pet_id===pet.id),prescriptions:(prescriptionsData.data??[]).filter(row=>row.pet_id===pet.id)})),careTasks:(tasks.data??[]).map(task=>({...task,pet_name:petNames.get((plansData.data??[]).find(plan=>plan.id===task.plan_id)?.pet_id??"")??""}))},{headers:{"cache-control":"private, no-store","vary":"cookie"}});
}
