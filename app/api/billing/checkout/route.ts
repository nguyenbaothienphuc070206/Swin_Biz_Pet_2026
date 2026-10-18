import {randomUUID} from "node:crypto";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";
import {createServiceClient} from "@/lib/supabase/service";
import {SandboxPaymentAdapter} from "@/modules/billing/payment-adapter";
import {proratedCharge} from "@/modules/billing/entitlements";
import {createClient} from "@/lib/supabase/server";
import {isRiskyFeatureEnabled} from "@/modules/feature-flags";

const Input=z.object({plan:z.enum(["plus","premium","free"]),locale:z.enum(["vi","en"])});
export async function POST(request:Request){
  const {userId}=await requireRole(["owner"]);
  try{
    const sessionClient=await createClient();
    if(!await isRiskyFeatureEnabled(sessionClient,"billing.enabled"))return Response.json({error:"feature_unavailable"},{status:503});
    const input=Input.parse(await request.json());const db=createServiceClient();
    const {data:plan,error:planError}=await db.from("billing_plans").select("amount_vnd,is_sandbox,active").eq("code",input.plan).single();
    if(planError||!plan?.active||!plan.is_sandbox)return Response.json({error:"plan_unavailable"},{status:400});
    const {data:current}=await db.from("billing_subscriptions").select("id,plan_code,status,period_starts_at,period_ends_at").eq("owner_id",userId).in("status",["pending","active","past_due","cancelled"]).maybeSingle();
    const {count:recentAttempts,error:attemptError}=await db.from("billing_payments").select("id",{count:"exact",head:true}).eq("owner_id",userId).gte("created_at",new Date(Date.now()-60*60_000).toISOString());if(attemptError)throw attemptError;if((recentAttempts??0)>=5)return Response.json({error:"rate_limited"},{status:429});
    if(input.plan==="free"){
      if(!current)return Response.json({ok:true,cancelled:false});
      await db.from("billing_payments").update({status:"failed"}).eq("owner_id",userId).eq("subscription_id",current.id).eq("status","pending");
      const {error}=await db.from("billing_subscriptions").update({cancel_at_period_end:true,pending_plan_code:"free",status:"cancelled"}).eq("id",current.id).eq("owner_id",userId);
      if(error)throw error;return Response.json({ok:true,cancelled:true});
    }
    if(current?.plan_code===input.plan&&current.status==="active"&&new Date(current.period_ends_at).getTime()>Date.now())return Response.json({error:"plan_already_active"},{status:409});
    const now=new Date();let amount=Number(plan.amount_vnd);if(!Number.isSafeInteger(amount)||amount<=0)return Response.json({error:"plan_price_unavailable"},{status:409});
    if(current&&current.plan_code!=="free"&&current.status==="active"&&new Date(current.period_ends_at).getTime()>now.getTime()){
      const periodStart=new Date(current.period_starts_at).getTime(),periodEnd=new Date(current.period_ends_at).getTime(),periodDays=Math.max(1,Math.ceil((periodEnd-periodStart)/86400000)),remainingDays=Math.max(0,Math.min(periodDays,Math.ceil((periodEnd-now.getTime())/86400000)));
      const {data:oldPlan}=await db.from("billing_plans").select("amount_vnd").eq("code",current.plan_code).single();
      amount=proratedCharge({oldMonthlyVnd:Number(oldPlan?.amount_vnd??0),newMonthlyVnd:Number(plan.amount_vnd),periodDays,remainingDays});
      if(amount===0){const {error}=await db.from("billing_subscriptions").update({pending_plan_code:input.plan,cancel_at_period_end:false}).eq("id",current.id);if(error)throw error;return Response.json({ok:true,scheduled:true});}
    }
    const reference=`pc_${randomUUID()}`,idempotencyKey=randomUUID();const adapter=new SandboxPaymentAdapter();
    const {checkoutUrl}=await adapter.createCheckout({reference,amountVnd:amount,description:`PawCare ${input.plan} sandbox subscription`,locale:input.locale});
    const {error:createError}=await db.rpc("create_sandbox_subscription_checkout",{p_owner_id:userId,p_plan_code:input.plan,p_amount_vnd:amount,p_reference:reference,p_idempotency_key:idempotencyKey,p_checkout_url:checkoutUrl});
    if(createError){if(createError.message.includes("billing_checkout_pending"))return Response.json({error:"checkout_pending"},{status:409});throw createError;}
    return Response.json({checkoutUrl,amountVnd:amount,currency:"VND",sandbox:true});
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:"invalid_request"},{status:400});return Response.json({error:"billing_unavailable"},{status:503});}
}
