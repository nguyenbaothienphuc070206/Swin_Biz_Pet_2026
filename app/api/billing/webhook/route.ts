import {z} from "zod";
import {createServiceClient} from "@/lib/supabase/service";
import {SandboxPaymentAdapter,PaymentEventSchema} from "@/modules/billing/payment-adapter";

async function readLimitedBody(request:Request,maxBytes:number){
  const reader=request.body?.getReader();if(!reader)return "";const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
export async function POST(request:Request){
  try{
    const contentLength=Number(request.headers.get("content-length")??0);if(contentLength>16_384)return Response.json({error:"event_too_large"},{status:413});
    const raw=await readLimitedBody(request,16_384);if(raw===null)return Response.json({error:"event_too_large"},{status:413});const event= new SandboxPaymentAdapter().verifyWebhook(raw,request.headers.get("x-pawcare-signature"));const parsed=PaymentEventSchema.parse(event);const db=createServiceClient();
    const {data:payment,error}=await db.from("billing_payments").select("id,amount_vnd").eq("external_reference",parsed.reference).eq("provider","local-sandbox").single();
    if(error||!payment||payment.amount_vnd!==parsed.amountVnd)return Response.json({error:"payment_not_found"},{status:404});
    const {data:outcome,error:applyError}=await db.rpc("apply_sandbox_payment_event",{p_event_id:parsed.eventId,p_reference:parsed.reference,p_amount_vnd:parsed.amountVnd,p_status:parsed.status,p_occurred_at:parsed.occurredAt,p_payload:{eventId:parsed.eventId,reference:parsed.reference,amountVnd:parsed.amountVnd,status:parsed.status,occurredAt:parsed.occurredAt},p_signature_verified:true});
    if(applyError)throw applyError;return Response.json({ok:true,outcome});
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:"invalid_event"},{status:400});return Response.json({error:"webhook_rejected"},{status:400});}
}
