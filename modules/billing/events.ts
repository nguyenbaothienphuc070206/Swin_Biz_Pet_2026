import type {PaymentEvent} from "./payment-adapter";
export type PaymentState="pending"|"paid"|"failed"|"refunded";
export function reducePaymentEvent(current:PaymentState,event:PaymentEvent,alreadyHandled:boolean){
  if(alreadyHandled||current!=="pending")return {paymentStatus:current,disposition:"duplicate" as const};
  return {paymentStatus:event.status,disposition:"applied" as const};
}
export function subscriptionStatusAfterPayment(status:"pending"|"active"|"past_due"|"cancelled"|"expired",payment:PaymentState){
  if(payment==="paid")return "active" as const;
  if(payment==="failed"&&(status==="pending"||status==="active"))return "past_due" as const;
  return status;
}
