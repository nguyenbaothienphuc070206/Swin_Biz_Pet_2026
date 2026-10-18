import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema=z.object({matchedReportId:z.string().uuid()});
export async function POST(request:Request,context:{params:Promise<{reportId:string}>}) {
  const {reportId}=await context.params;if(!z.string().uuid().safeParse(reportId).success)return Response.json({error:"invalid_report_id"},{status:400});
  const input=schema.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({error:"invalid_match"},{status:400});
  const {supabase}=await requireRole(["owner"],"vi");const {data,error}=await supabase.rpc("resolve_lost_found_match",{p_mine:reportId,p_other:input.data.matchedReportId});
  return error?Response.json({error:error.message},{status:400}):Response.json({resolved:data===true});
}
