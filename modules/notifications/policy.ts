export type NotificationChannel = "in_app" | "web_push" | "email" | "sms_zalo";
export type NotificationCategory = "appointment" | "vaccine" | "care_plan" | "review" | "sos";

export interface NotificationPreferences {
  enabled: boolean;
  channels: Record<NotificationChannel, boolean>;
  categories: Record<NotificationCategory, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  unsubscribedChannels: NotificationChannel[];
}

export interface NotificationIntent {
  category: NotificationCategory;
  priority: "normal" | "high";
  channel: NotificationChannel;
  scheduledAt: Date;
}

function localMinute(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
}

function parseClock(value: string | null): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function isQuietHours(date: Date, preferences: NotificationPreferences): boolean {
  const start = parseClock(preferences.quietHoursStart);
  const end = parseClock(preferences.quietHoursEnd);
  if (start === null || end === null || start === end) return false;
  const now = localMinute(date, preferences.timezone);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export function nextQuietHoursEnd(date: Date, preferences: NotificationPreferences): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  for (let minute = 0; minute < 26 * 60; minute++) {
    next.setTime(next.getTime() + 60_000);
    if (!isQuietHours(next, preferences)) return next;
  }
  return date;
}

export function shouldDeliver(intent: NotificationIntent, preferences: NotificationPreferences): boolean {
  if (!preferences.enabled || !preferences.categories[intent.category]) return false;
  if (!preferences.channels[intent.channel] || preferences.unsubscribedChannels.includes(intent.channel)) return false;
  if (intent.priority === "high" && intent.category === "sos") return true;
  return !isQuietHours(intent.scheduledAt, preferences);
}

export function retryDelaySeconds(attempt: number): number | null {
  const delays = [30, 120, 600, 1800, 7200];
  return delays[attempt] ?? null;
}
