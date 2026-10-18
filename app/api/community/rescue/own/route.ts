import { requireRole } from "@/lib/auth/server";
type CaseRow={id:string;title:string;status:string;verification_status:string;created_at:string;canVerify:boolean};
export async function GET(){
  const {supabase,userId}=await requireRole(["owner"],"vi");
  const {data:partners}=await supabase.from("rescue_partners").select("id").eq("user_id",userId).eq("verification_status","verified");
  const partnerIds=(partners??[]).map(partner=>partner.id);
  const [owned,partnerCases]=await Promise.all([
    supabase.from("rescue_cases").select("id,title,status,verification_status,created_at").eq("created_by",userId).order("created_at",{ascending:false}).limit(50),
    partnerIds.length?supabase.from("rescue_cases").select("id,title,status,verification_status,created_at").in("rescue_partner_id",partnerIds).order("created_at",{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),
  ]);
  if(owned.error||partnerCases.error)return Response.json({error:"rescue_cases_unavailable"},{status:503});
  const cases=new Map<string,CaseRow>();
  for(const row of owned.data??[])cases.set(row.id,{...row,canVerify:false});
  for(const row of partnerCases.data??[])cases.set(row.id,{...row,canVerify:true});
  return Response.json({cases:[...cases.values()]});
}
