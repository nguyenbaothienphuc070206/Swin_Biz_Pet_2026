import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

function decode(token:string){
  const secret=process.env.NOTIFICATION_UNSUBSCRIBE_SECRET;if(!secret)return null;
  const [encoded,signature,...rest]=token.split(".");if(!encoded||!signature||rest.length)return null;
  try{const data=Buffer.from(encoded,"base64url").toString("utf8");const expected=createHmac("sha256",secret).update(data).digest();const supplied=Buffer.from(signature,"base64url");if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;const [userId,expiryText]=data.split("|");const parsed=z.object({userId:z.string().uuid(),expiry:z.number().int().positive()}).safeParse({userId,expiry:Number(expiryText)});if(!parsed.success||parsed.data.expiry<Date.now())return null;return parsed.data;}catch{return null;}
}
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);

export async function GET(request:Request){
  const token=new URL(request.url).searchParams.get("token")??"";const claims=decode(token);if(!claims)return new Response("Invalid or expired link",{status:400});
  const db=createServiceClient();const {data:user}=await db.from("profiles").select("preferred_locale").eq("id",claims.userId).maybeSingle();const vi=user?.preferred_locale!=="en";
  const title=vi?"Hủy nhận thông báo email":"Unsubscribe from email notifications";const body=vi?"Xác nhận để ngừng nhận thông báo qua email PawCare.":"Confirm to stop receiving PawCare email notifications.";const button=vi?"Hủy đăng ký":"Unsubscribe";
  const html=`<!doctype html><html lang="${vi?"vi":"en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><main style="font:16px system-ui;max-width:32rem;margin:10vh auto;padding:2rem"><h1>${title}</h1><p>${body}</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button style="min-height:44px;padding:0 1.5rem">${button}</button></form></main></html>`;
  return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'none'; form-action 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
}

export async function POST(request:Request){
  const urlToken=new URL(request.url).searchParams.get("token");const form=await request.formData().catch(()=>null);const body=await request.json().catch(()=>null);const token=String(urlToken??form?.get("token")??(body as {token?:string}|null)?.token??"");const claims=decode(token);if(!claims)return Response.json({error:"invalid_or_expired_unsubscribe"},{status:400});
  const db=createServiceClient();const {error}=await db.rpc("suppress_notification_email",{p_user_id:claims.userId});if(error)return Response.json({error:"unsubscribe_unavailable"},{status:503});
  return new Response(null,{status:204,headers:{"cache-control":"no-store"}});
}
