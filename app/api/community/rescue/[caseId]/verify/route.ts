import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
export async function POST(_request:Request,context:{params:Promise<{caseId:string}>}){const {caseId}=await context.params;if(!z.string().uuid().safeParse(caseId).success)return Response.json({error:"invalid_case_id"},{status:400});const {supabase}=await requireRole(["clinic_admin","owner"],"vi");const {data,error}=await supabase.rpc("verify_rescue_case",{p_case:caseId});return error?Response.json({error:error.message},{status:400}):Response.json({verified:data===true})}
