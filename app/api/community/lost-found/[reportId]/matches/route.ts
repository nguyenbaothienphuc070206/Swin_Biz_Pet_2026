import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
export async function GET(_request: Request, context: {params:Promise<{reportId:string}>}) {
  const {reportId}=await context.params;if(!z.string().uuid().safeParse(reportId).success)return Response.json({error:"invalid_report_id"},{status:400});
  const {supabase}=await requireRole(["owner"],"vi");const {data,error}=await supabase.rpc("public_lost_found_matches",{p_report:reportId,p_limit:20});
  return error?Response.json({error:"matches_unavailable"},{status:400}):Response.json({matches:data??[]});
}
