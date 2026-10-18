import "server-only";
import { createHmac } from "node:crypto";
import webpush from "web-push";
import type { PushSubscription } from "web-push";
import type { NotificationChannel } from "./policy";
import type { RenderedTemplate } from "./templates";

export interface DeliveryTarget { email?: string; userId?: string; subscription?: PushSubscription }
export interface DeliveryResult { status: "delivered" | "mocked"; provider: string; providerMessageId?: string }
export interface NotificationAdapter { readonly channel: NotificationChannel; send(target: DeliveryTarget, message: RenderedTemplate, idempotencyKey: string): Promise<DeliveryResult> }

export class InAppAdapter implements NotificationAdapter {
  readonly channel = "in_app" as const;
  async send(): Promise<DeliveryResult> { return { status: "delivered", provider: "pawcare-in-app" }; }
}

export class WebPushAdapter implements NotificationAdapter {
  readonly channel = "web_push" as const;
  async send(target: DeliveryTarget, message: RenderedTemplate): Promise<DeliveryResult> {
    const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
    if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !target.subscription) return { status: "mocked", provider: "web-push-mock" };
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const result = await webpush.sendNotification(target.subscription, JSON.stringify({ title: message.title, body: message.body, href: message.href }), { TTL: 60 * 60 });
    return { status: "delivered", provider: "web-push", providerMessageId: String(result.statusCode) };
  }
}

export class EmailAdapter implements NotificationAdapter {
  readonly channel = "email" as const;
  async send(target: DeliveryTarget, message: RenderedTemplate, idempotencyKey: string): Promise<DeliveryResult> {
    const { RESEND_API_KEY, RESEND_FROM } = process.env;
    if (!RESEND_API_KEY || !RESEND_FROM || !target.email) return { status: "mocked", provider: "email-mock" };
    const unsubscribeSecret=process.env.NOTIFICATION_UNSUBSCRIBE_SECRET;
    if(!unsubscribeSecret)throw new Error("notification_unsubscribe_secret_missing");
    if(!target.userId)throw new Error("notification_recipient_missing");
    const expiry=Date.now()+90*86400_000,tokenData=`${target.userId}|${expiry}`;
    const token=`${Buffer.from(tokenData).toString("base64url")}.${createHmac("sha256",unsubscribeSecret).update(tokenData).digest("base64url")}`;
    const origin=(process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000").replace(/\/$/,"");
    const unsubscribeUrl=`${origin}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: RESEND_FROM, to: [target.email], subject: message.subject, html: `<p>${escapeHtml(message.body)}</p><p><a href="${escapeHtml(origin)}${message.href}">PawCare</a></p><p><a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(message.unsubscribe)}</a></p>`, headers:{"List-Unsubscribe":`<${unsubscribeUrl}>`,"List-Unsubscribe-Post":"List-Unsubscribe=One-Click"} }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`email_provider_${response.status}`);
    const result = await response.json() as { id?: string };
    return { status: "delivered", provider: "resend", providerMessageId: result.id };
  }
}

export class SmsZaloStubAdapter implements NotificationAdapter {
  readonly channel = "sms_zalo" as const;
  async send(): Promise<DeliveryResult> { return { status: "mocked", provider: "sms-zalo-stub" }; }
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
