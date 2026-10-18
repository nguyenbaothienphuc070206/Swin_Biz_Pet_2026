export type Plan="free"|"plus"|"premium";
export type SubscriptionStatus="active"|"past_due"|"cancelled"|"expired";
export type Feature="basicSos"|"clinicDispatch"|"carePlans"|"extendedPassport"|"priorityVideoTriage";
export type SubscriptionState={plan:Plan;pendingPlan?:Plan|null;status:SubscriptionStatus;periodEndsAt:number;graceEndsAt?:number|null};

export const entitlementMatrix:Record<Plan,Record<Feature,boolean>>={
  free:{basicSos:true,clinicDispatch:true,carePlans:false,extendedPassport:false,priorityVideoTriage:false},
  plus:{basicSos:true,clinicDispatch:true,carePlans:true,extendedPassport:true,priorityVideoTriage:false},
  premium:{basicSos:true,clinicDispatch:true,carePlans:true,extendedPassport:true,priorityVideoTriage:true},
};

export function effectivePlan(subscription:SubscriptionState|null,now=Date.now()):Plan{
  if(!subscription)return "free";
  if(subscription.status==="active")return now<subscription.periodEndsAt?subscription.plan:(subscription.pendingPlan??"free");
  if(subscription.status==="past_due")return subscription.graceEndsAt!=null&&now<subscription.graceEndsAt?subscription.plan:"free";
  if(subscription.status==="cancelled")return now<subscription.periodEndsAt?subscription.plan:(subscription.pendingPlan??"free");
  return "free";
}
export function canAccess(subscription:SubscriptionState|null,feature:Feature,now=Date.now()):boolean{return entitlementMatrix[effectivePlan(subscription,now)][feature];}
export function proratedCharge(input:{oldMonthlyVnd:number;newMonthlyVnd:number;periodDays:number;remainingDays:number}):number{
  const {oldMonthlyVnd,newMonthlyVnd,periodDays,remainingDays}=input;
  if(![oldMonthlyVnd,newMonthlyVnd,periodDays,remainingDays].every(Number.isSafeInteger)||oldMonthlyVnd<0||newMonthlyVnd<0||periodDays<=0||remainingDays<0||remainingDays>periodDays)throw new Error("invalid_proration_input");
  return Math.max(0,Math.round((newMonthlyVnd-oldMonthlyVnd)*remainingDays/periodDays));
}
export function cancelAtPeriodEnd<T extends SubscriptionState>(subscription:T,_now=Date.now()):T{return {...subscription,status:"cancelled"};}
