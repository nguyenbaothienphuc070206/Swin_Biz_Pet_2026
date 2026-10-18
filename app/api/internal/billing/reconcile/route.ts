import {timingSafeEqual} from "node:crypto";
import {createServiceClient} from "@/lib/supabase/service";

function authorized(header:string|null){const secret=process.env.BILLING_JOB_TOKEN;if(!secret||!header?.startsWith("Bearer "))return false;const supplied=Buffer.from(header.slice(7)),expected=Buffer.from(secret);return supplied.length===expected.length&&timingSafeEqual(supplied,expected);}
export async function POST(request:Request){
  if(!authorized(request.headers.get("authorization")))return Response.json({error:"unauthorized"},{status:401});
  try{
    const db=createServiceClient();const now=new Date();const {data:jobs,error}=await db.from("billing_reconciliation_jobs").select("id,payment_id,attempts").eq("status","queued").lte("next_attempt_at",now.toISOString()).limit(100);if(error)throw error;
    let completed=0,retried=0,expired=0,plansExpired=0;
    for(const job of jobs??[]){
      const {data:payment,error:paymentError}=await db.from("billing_payments").select("status,subscription_id,created_at").eq("id",job.payment_id).single();if(paymentError||!payment)continue;
      if(payment.status!=="pending"){await db.from("billing_reconciliation_jobs").update({status:"done",attempts:job.attempts+1}).eq("id",job.id);completed++;continue;}
      if(now.getTime()-new Date(payment.created_at).getTime()>=24*60*60_000){
        await db.from("billing_payments").update({status:"failed"}).eq("id",job.payment_id).eq("status","pending");
        await db.from("billing_subscriptions").update({status:"past_due",grace_ends_at:new Date(now.getTime()+3*86400_000).toISOString()}).eq("id",payment.subscription_id).in("status",["pending","active"]);
        await db.from("billing_reconciliation_jobs").update({status:"done",attempts:job.attempts+1,last_error_code:"sandbox_payment_expired"}).eq("id",job.id);expired++;continue;
      }
      const delays=[5,15,60,240,720],attempt=job.attempts+1,delay=delays[Math.min(job.attempts,delays.length-1)];
      await db.from("billing_reconciliation_jobs").update({attempts:attempt,next_attempt_at:new Date(now.getTime()+delay*60_000).toISOString(),last_error_code:"awaiting_sandbox_event"}).eq("id",job.id);retried++;
    }
    const [periodDue,graceDue]=await Promise.all([
      db.from("billing_subscriptions").select("id").in("status",["active","cancelled"]).lte("period_ends_at",now.toISOString()).limit(100),
      db.from("billing_subscriptions").select("id").eq("status","past_due").not("grace_ends_at","is",null).lte("grace_ends_at",now.toISOString()).limit(100),
    ]);
    if(periodDue.error||graceDue.error)throw periodDue.error??graceDue.error;
    for(const row of periodDue.data??[]){const {error:updateError}=await db.from("billing_subscriptions").update({status:"expired",plan_code:"free",pending_plan_code:null,cancel_at_period_end:false,grace_ends_at:null}).eq("id",row.id).in("status",["active","cancelled"]).lte("period_ends_at",now.toISOString());if(!updateError)plansExpired++;}
    for(const row of graceDue.data??[]){const {error:updateError}=await db.from("billing_subscriptions").update({status:"expired",plan_code:"free",pending_plan_code:null,cancel_at_period_end:false,grace_ends_at:null}).eq("id",row.id).eq("status","past_due").lte("grace_ends_at",now.toISOString());if(!updateError)plansExpired++;}
    return Response.json({completed,retried,expired,plansExpired});
  }catch{return Response.json({error:"reconciliation_unavailable"},{status:503});}
}
