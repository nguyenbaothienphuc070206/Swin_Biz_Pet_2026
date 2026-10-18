import {createClient} from "@/lib/supabase/server";
import {canAccess,type Feature,type Plan,type SubscriptionState} from "./entitlements";

export async function hasFeatureAccess(userId:string,feature:Feature,now=Date.now()):Promise<boolean>{
  const supabase=await createClient();const {data,error}=await supabase.from("billing_subscriptions").select("plan_code,pending_plan_code,status,period_ends_at,grace_ends_at").eq("owner_id",userId).in("status",["active","past_due","cancelled"]).maybeSingle();
  if(error||!data)return canAccess(null,feature,now);
  const allowedPlans:Plan[]=["free","plus","premium"];
  if(!allowedPlans.includes(data.plan_code as Plan)||!["active","past_due","cancelled"].includes(data.status))return canAccess(null,feature,now);
  const state:SubscriptionState={plan:data.plan_code as Plan,pendingPlan:allowedPlans.includes(data.pending_plan_code as Plan)?data.pending_plan_code as Plan:null,status:data.status as SubscriptionState["status"],periodEndsAt:new Date(data.period_ends_at).getTime(),graceEndsAt:data.grace_ends_at?new Date(data.grace_ends_at).getTime():null};
  return canAccess(state,feature,now);
}
