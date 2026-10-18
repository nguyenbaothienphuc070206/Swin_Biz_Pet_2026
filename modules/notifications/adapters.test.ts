import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));
import { EmailAdapter, InAppAdapter, SmsZaloStubAdapter, WebPushAdapter } from "./adapters";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const message = { subject: "Reminder", title: "Reminder", body: "Body", href: "/owner", unsubscribe: "Unsubscribe" };
describe("notification adapter contracts", () => {
  it("returns stable local/mock results without provider configuration", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("RESEND_FROM", ""); vi.stubEnv("VAPID_SUBJECT", ""); vi.stubEnv("VAPID_PUBLIC_KEY", ""); vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(await new InAppAdapter().send()).toMatchObject({ status: "delivered", provider: "pawcare-in-app" });
    expect(await new SmsZaloStubAdapter().send()).toMatchObject({ status: "mocked", provider: "sms-zalo-stub" });
    expect(await new WebPushAdapter().send({}, message)).toMatchObject({ status: "mocked", provider: "web-push-mock" });
    expect(await new EmailAdapter().send({ email: "demo@example.test" }, message, "dedupe")).toMatchObject({ status: "mocked", provider: "email-mock" });
  });
  it("sends escaped email content with the idempotency key and fails on provider errors", async () => {
    vi.stubEnv("RESEND_API_KEY", "key"); vi.stubEnv("RESEND_FROM", "PawCare <demo@example.test>"); vi.stubEnv("NOTIFICATION_UNSUBSCRIBE_SECRET", "test-secret");
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("dedupe-1");
      expect(String(init?.body)).toContain("&lt;script&gt;");
      return Response.json({ id: "msg-1" });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await new EmailAdapter().send({ email: "owner@example.test", userId: "user-1" }, { ...message, body: "<script>" }, "dedupe-1")).toMatchObject({ status: "delivered", provider: "resend", providerMessageId: "msg-1" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("failed", { status: 500 })));
    await expect(new EmailAdapter().send({ email: "owner@example.test", userId: "user-1" }, message, "dedupe-2")).rejects.toThrow("email_provider_500");
  });
});
