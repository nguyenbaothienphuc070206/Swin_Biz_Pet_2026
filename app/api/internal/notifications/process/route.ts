import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailAdapter, InAppAdapter, SmsZaloStubAdapter, WebPushAdapter } from "@/modules/notifications/adapters";
import { isQuietHours, nextQuietHoursEnd, retryDelaySeconds, shouldDeliver, type NotificationPreferences } from "@/modules/notifications/policy";
import { renderNotification, type NotificationTemplateKey } from "@/modules/notifications/templates";

const keySchema = z.enum(["appointment_reminder", "vaccine_due", "care_plan_task", "review_request", "sos_clinic_dispatch", "sos_clinic_accepted"]);
function authorized(header: string | null) {
  const secret = process.env.NOTIFICATION_JOB_TOKEN;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7)), expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = createServiceClient();
  const { data: jobs, error } = await db.rpc("claim_notification_jobs", { p_limit: 25 });
  if (error) return Response.json({ error: "queue_unavailable" }, { status: 503 });
  let sent = 0, suppressed = 0, retried = 0, dead = 0;
  for (const job of jobs ?? []) {
    const { data: notification } = await db.from("notifications").select("id,user_id,category,priority,locale,template_key,payload,idempotency_key").eq("id", job.notification_id).maybeSingle();
    if (!notification) { await db.from("notification_jobs").update({ status: "dead", last_error_code: "notification_missing" }).eq("id", job.id); dead++; continue; }
    const parsedKey = keySchema.safeParse(notification.template_key);
    if (!parsedKey.success) { await db.from("notification_jobs").update({ status: "dead", last_error_code: "invalid_template" }).eq("id", job.id); dead++; continue; }
    const [{ data: prefRow }, { data: profile }, authUser, { data: pushes }, { data: previous }] = await Promise.all([
      db.from("notification_preferences").select("*").eq("user_id", notification.user_id).maybeSingle(),
      db.from("profiles").select("email_notifications,appointment_reminders,preferred_locale").eq("id", notification.user_id).maybeSingle(),
      db.auth.admin.getUserById(notification.user_id),
      db.from("web_push_subscriptions").select("endpoint,p256dh,auth_secret").eq("user_id", notification.user_id).is("revoked_at", null),
      db.from("notification_deliveries").select("channel,status").eq("notification_id", notification.id).in("status", ["delivered", "mocked", "suppressed", "unsubscribed"]),
    ]);
    const channels = {
      in_app: prefRow?.in_app_enabled ?? true,
      web_push: prefRow?.web_push_enabled ?? false,
      email: prefRow?.email_enabled ?? profile?.email_notifications ?? true,
      sms_zalo: prefRow?.sms_zalo_enabled ?? false,
    };
    const categories = {
      appointment: prefRow?.appointments_enabled ?? profile?.appointment_reminders ?? true,
      vaccine: prefRow?.vaccines_enabled ?? true,
      care_plan: prefRow?.care_plans_enabled ?? true,
      review: prefRow?.reviews_enabled ?? true,
      sos: prefRow?.sos_enabled ?? true,
    };
    const unsubscribedChannels = [
      ...(prefRow?.email_unsubscribed_at ? ["email" as const] : []),
      ...(prefRow?.sms_unsubscribed_at ? ["sms_zalo" as const] : []),
    ];
    const preferences: NotificationPreferences = {
      enabled: prefRow?.enabled ?? true, channels, categories,
      quietHoursStart: prefRow?.quiet_hours_start?.slice(0, 5) ?? null,
      quietHoursEnd: prefRow?.quiet_hours_end?.slice(0, 5) ?? null,
      timezone: prefRow?.timezone ?? "Asia/Ho_Chi_Minh", unsubscribedChannels,
    };
    const urgentSos = notification.category === "sos" && notification.priority === "high";
    if (!urgentSos && isQuietHours(new Date(), preferences)) {
      await db.from("notification_jobs").update({ status: "queued", available_at: nextQuietHoursEnd(new Date(), preferences).toISOString() }).eq("id", job.id);
      continue;
    }
    const locale = notification.locale === "en" ? "en" : "vi";
    const payload = notification.payload && typeof notification.payload === "object" ? notification.payload as Record<string, unknown> : {};
    const template = renderNotification(parsedKey.data as NotificationTemplateKey, locale, payload);
    const adapters = [new InAppAdapter(), new WebPushAdapter(), new EmailAdapter(), new SmsZaloStubAdapter()];
    let retryableFailure = false;
    for (const adapter of adapters) {
      if ((previous ?? []).some(row => row.channel === adapter.channel)) continue;
      const intent = { category: notification.category as keyof typeof categories, priority: notification.priority as "normal" | "high", channel: adapter.channel, scheduledAt: new Date() };
      const enabled = channels[adapter.channel];
      const optedOut = unsubscribedChannels.some(channel => channel === adapter.channel);
      if (!enabled || optedOut || !categories[intent.category] || !shouldDeliver(intent, preferences)) {
        await db.from("notification_deliveries").insert({ notification_id: notification.id, user_id: notification.user_id, channel: adapter.channel, provider: adapter.channel, status: optedOut ? "unsubscribed" : "suppressed", attempt: job.attempts });
        suppressed++;
        continue;
      }
      const subscriptions = adapter.channel === "web_push" ? pushes ?? [] : [];
      try {
        const targets = adapter.channel === "web_push" ? subscriptions.map(subscription => ({ subscription: { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret } } })) : [{}];
        if (adapter.channel === "web_push" && targets.length === 0) {
          await db.from("notification_deliveries").insert({ notification_id: notification.id, user_id: notification.user_id, channel: adapter.channel, provider: "web-push", status: "suppressed", attempt: job.attempts, error_code: "no_active_subscription" });
          suppressed++; continue;
        }
        for (const target of targets) {
          const result = await adapter.send({ email: authUser.data.user?.email ?? undefined, userId: notification.user_id, subscription: "subscription" in target ? target.subscription : undefined }, template, `${notification.id}:${adapter.channel}`);
          await db.from("notification_deliveries").insert({ notification_id: notification.id, user_id: notification.user_id, channel: adapter.channel, provider: result.provider, status: result.status, attempt: job.attempts, provider_message_id: result.providerMessageId ?? null });
          sent++;
        }
      } catch (failure) {
        retryableFailure = true;
        const code = failure instanceof Error ? failure.message.slice(0, 80) : "delivery_failed";
        await db.from("notification_deliveries").insert({ notification_id: notification.id, user_id: notification.user_id, channel: adapter.channel, provider: adapter.channel, status: "failed", attempt: job.attempts, error_code: code });
        const delay = retryDelaySeconds(job.attempts - 1);
        if (delay === null) {
          await db.from("notification_jobs").update({ status: "dead", last_error_code: code }).eq("id", job.id);
          await db.from("notifications").update({ status: "failed" }).eq("id", notification.id);
          dead++;
        } else {
          await db.from("notification_jobs").update({ status: "queued", available_at: new Date(Date.now() + delay * 1000).toISOString(), last_error_code: code }).eq("id", job.id);
          retried++;
        }
        break;
      }
    }
    if (!retryableFailure) {
      await db.from("notification_jobs").update({ status: "done", last_error_code: null }).eq("id", job.id);
      await db.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notification.id);
    }
  }
  return Response.json({ claimed: jobs?.length ?? 0, sent, suppressed, retried, dead });
}
