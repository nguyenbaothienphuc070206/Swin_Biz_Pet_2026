import {createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";

export const PaymentEventSchema=z.object({eventId:z.string().min(1).max(160),reference:z.string().min(1).max(160),amountVnd:z.number().int().positive(),status:z.enum(["paid","failed"]),occurredAt:z.string().datetime()});
export type PaymentEvent=z.infer<typeof PaymentEventSchema>;
export interface PaymentAdapter {
  readonly name:string;
  createCheckout(input:{reference:string;amountVnd:number;description:string;locale:"vi"|"en"}):Promise<{checkoutUrl:string}>;
  verifyWebhook(rawBody:string,signature:string| null):PaymentEvent;
}

export class SandboxPaymentAdapter implements PaymentAdapter{
  readonly name="local-sandbox";
  private readonly secret:string;
  constructor(secret?:string){if(process.env.NODE_ENV==="production")throw new Error("sandbox_payments_disabled_in_production");this.secret=secret??process.env.BILLING_SANDBOX_WEBHOOK_SECRET??"pawcare-local-sandbox-only";}
  async createCheckout(input:{reference:string;amountVnd:number;description:string;locale:"vi"|"en"}){
    if(!Number.isSafeInteger(input.amountVnd)||input.amountVnd<=0||input.amountVnd>100_000_000)throw new Error("invalid_sandbox_amount");
    const url=new URL(`/${input.locale}/billing-sandbox`,process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000");url.searchParams.set("reference",input.reference);url.searchParams.set("amount",String(input.amountVnd));
    return {checkoutUrl:url.toString()};
  }
  sign(rawBody:string){if(!this.secret)throw new Error("sandbox_webhook_disabled");return createHmac("sha256",this.secret).update(rawBody).digest("hex");}
  verifyWebhook(rawBody:string,signature:string|null){
    if(!this.secret||!signature||!/^[a-f0-9]{64}$/i.test(signature))throw new Error("invalid_webhook_signature");
    const expected=Buffer.from(this.sign(rawBody),"hex"),actual=Buffer.from(signature,"hex");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error("invalid_webhook_signature");
    return PaymentEventSchema.parse(JSON.parse(rawBody));
  }
}

export function getPaymentAdapter():PaymentAdapter{
  if(process.env.NODE_ENV==="production")throw new Error("live_payment_provider_not_configured");
  return new SandboxPaymentAdapter();
}
