import {randomUUID} from "node:crypto";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";
import {createServiceClient} from "@/lib/supabase/service";
import {SandboxPaymentAdapter} from "@/modules/billing/payment-adapter";

const Input=z.object({reference:z.string().min(1).max(160),result:z.enum(["paid","failed"])});
export async function POST(request:Request){
  const {userId}=await requireRole(["owner"]);
  try{
    const input=Input.parse(await request.json());const db=createServiceClient();
    const {data:payment,error}=await db.from("billing_payments").select("id,external_reference,amount_vnd").eq("owner_id",userId).eq("external_reference",input.reference).eq("status","pending").single();
    if(error||!payment)return Response.json({error:"payment_not_found"},{status:404});
    const body=JSON.stringify({eventId:`sandbox_${randomUUID()}`,reference:payment.external_reference,amountVnd:payment.amount_vnd,status:input.result,occurredAt:new Date().toISOString()});const adapter=new SandboxPaymentAdapter();
    const response=await fetch(new URL("/api/billing/webhook",request.url),{method:"POST",headers:{"content-type":"application/json","x-pawcare-signature":adapter.sign(body)},body});
    return Response.json(await response.json(),{status:response.status});
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:"invalid_request"},{status:400});return Response.json({error:"sandbox_unavailable"},{status:503});}
}
