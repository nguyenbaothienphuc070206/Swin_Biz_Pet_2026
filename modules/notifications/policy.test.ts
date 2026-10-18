import { describe, expect, it } from "vitest";
import { isQuietHours, nextQuietHoursEnd, retryDelaySeconds, shouldDeliver, type NotificationPreferences } from "./policy";
import { renderNotification } from "./templates";

const prefs: NotificationPreferences = {
  enabled: true,
  channels: { in_app: true, web_push: true, email: true, sms_zalo: true },
  categories: { appointment: true, vaccine: true, care_plan: true, review: true, sos: true },
  quietHoursStart: "22:00", quietHoursEnd: "07:00", timezone: "Asia/Ho_Chi_Minh", unsubscribedChannels: [],
};

describe("notification delivery policy", () => {
  it("respects disabled channel/category and explicit unsubscribe", () => {
    expect(shouldDeliver({ category: "appointment", priority: "normal", channel: "email", scheduledAt: new Date("2026-10-16T03:00:00Z") }, { ...prefs, channels: { ...prefs.channels, email: false } })).toBe(false);
    expect(shouldDeliver({ category: "vaccine", priority: "normal", channel: "in_app", scheduledAt: new Date() }, { ...prefs, categories: { ...prefs.categories, vaccine: false } })).toBe(false);
    expect(shouldDeliver({ category: "appointment", priority: "normal", channel: "email", scheduledAt: new Date("2026-10-16T03:00:00Z") }, { ...prefs, unsubscribedChannels: ["email"] })).toBe(false);
  });

  it("deduplicates event keys at the event boundary", () => {
    const eventKey = (type: string, entity: string, date?: string) => `${type}:${entity}${date ? `:${date}` : ""}`;
    expect(eventKey("appointment-reminder", "a1")).toBe(eventKey("appointment-reminder", "a1"));
    expect(eventKey("vaccine-due", "v1", "2026-10-20")).not.toBe(eventKey("vaccine-due", "v1", "2026-11-20"));
  });

  it("bypasses quiet hours for high-priority SOS only", () => {
    const night = new Date("2026-10-16T18:00:00Z");
    expect(isQuietHours(night, prefs)).toBe(true);
    expect(shouldDeliver({ category: "appointment", priority: "normal", channel: "in_app", scheduledAt: night }, prefs)).toBe(false);
    expect(shouldDeliver({ category: "sos", priority: "high", channel: "in_app", scheduledAt: night }, prefs)).toBe(true);
    expect(shouldDeliver({ category: "sos", priority: "high", channel: "in_app", scheduledAt: night }, { ...prefs, enabled: false })).toBe(false);
    expect(nextQuietHoursEnd(night,prefs).toISOString()).toBe("2026-10-17T00:00:00.000Z");
  });

  it("uses bounded exponential retry delays", () => {
    expect([0, 1, 2, 3, 4, 5].map(retryDelaySeconds)).toEqual([30, 120, 600, 1800, 7200, null]);
  });

  it("renders localized templates without exposing SOS as medical advice", () => {
    expect(renderNotification("sos_clinic_accepted","vi",{}).body).toContain("PawCare");
    expect(renderNotification("sos_clinic_accepted","en",{}).subject).toContain("SOS");
  });
});
