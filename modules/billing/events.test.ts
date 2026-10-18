import {describe,expect,it} from "vitest";
import {reducePaymentEvent,subscriptionStatusAfterPayment} from "./events";
const paid={eventId:"evt-1",reference:"pay-1",amountVnd:49000,status:"paid" as const,occurredAt:"2026-10-16T00:00:00.000Z"};
describe("payment event idempotency",()=>{
  it("does not apply a webhook replay twice",()=>{expect(reducePaymentEvent("paid",paid,true)).toEqual({paymentStatus:"paid",disposition:"duplicate"});});
  it("does not duplicate an already completed payment under a new event id",()=>{expect(reducePaymentEvent("paid",{...paid,eventId:"evt-2"},false).disposition).toBe("duplicate");});
  it("moves failed payments into a grace-period state without granting an unpaid plan",()=>{expect(reducePaymentEvent("pending",{...paid,status:"failed"},false).paymentStatus).toBe("failed");expect(subscriptionStatusAfterPayment("pending","failed")).toBe("past_due");});
});
