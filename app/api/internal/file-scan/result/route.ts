import {timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {createServiceClient} from "@/lib/supabase/service";

const inputSchema=z.object({bucket:z.enum(["pet-documents","clinic-verification","community-private","rescue-private"]),object:z.string().min(3).max(1024),status:z.enum(["clean","infected","error"]),scanner:z.string().trim().min(1).max(100),sha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),errorCode:z.string().max(100).optional()}).strict().refine(v=>v.status!=="clean"||Boolean(v.sha256));
function authorized(header:string|null){const secret=process.env.FILE_SCAN_HOOK_TOKEN;if(!secret||!header?.startsWith("Bearer "))return false;const actual=Buffer.from(header.slice(7)),expected=Buffer.from(secret);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
async function readBoundedJson(request:Request){const reader=request.body?.getReader();if(!reader)return null;const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return null}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}}
export async function POST(request:Request){
  if(!authorized(request.headers.get("authorization")))return Response.json({error:"unauthorized"},{status:401});
  const contentLength=Number(request.headers.get("content-length")??0);if(contentLength>4096)return Response.json({error:"payload_too_large"},{status:413});
  const parsed=inputSchema.safeParse(await readBoundedJson(request));if(!parsed.success)return Response.json({error:"invalid_scan_result"},{status:400});
  try{const db=createServiceClient();const {data,error}=await db.rpc("record_private_file_scan_result",{p_bucket:parsed.data.bucket,p_object:parsed.data.object,p_status:parsed.data.status,p_scanner:parsed.data.scanner,p_sha256:parsed.data.sha256??null,p_error_code:parsed.data.errorCode??null});if(error)throw error;return data?Response.json({recorded:true}):Response.json({error:"scan_job_not_found"},{status:404})}catch{return Response.json({error:"scan_result_unavailable"},{status:503})}
}
