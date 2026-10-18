import {describe,expect,it} from "vitest";
import {SandboxPaymentAdapter} from "./payment-adapter";

describe("sandbox payment adapter",()=>{
  it("verifies a signed, schema-valid webhook payload",()=>{
    const adapter=new SandboxPaymentAdapter("unit-test-secret");const raw=JSON.stringify({eventId:"evt-demo",reference:"pay-demo",amountVnd:49000,status:"paid",occurredAt:"2026-10-16T00:00:00.000Z"});
    expect(adapter.verifyWebhook(raw,adapter.sign(raw)).status).toBe("paid");
  });
  it("rejects a forged signature and malformed event",()=>{
    const adapter=new SandboxPaymentAdapter("unit-test-secret");expect(()=>adapter.verifyWebhook("{}","0".repeat(64))).toThrow("invalid_webhook_signature");
    const raw="{}";expect(()=>adapter.verifyWebhook(raw,adapter.sign(raw))).toThrow();
  });
});
