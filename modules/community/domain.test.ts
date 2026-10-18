import { describe, expect, it } from "vitest";
import { fuzzLocation, matchLostFoundReports, verifyDonationReceipt, moderateContent } from "./domain";

describe("community and rescue safeguards", () => {
  it("fuzzes exact coordinates to a stable street-level cell", () => {
    const exact = { lat: 10.77691, lng: 106.70092 };
    const fuzzy = fuzzLocation(exact);
    expect(fuzzy).not.toEqual(exact);
    expect(fuzzLocation(exact)).toEqual(fuzzy);
    expect(Math.abs(fuzzy.lat - exact.lat)).toBeLessThanOrEqual(0.0005);
    expect(Math.abs(fuzzy.lng - exact.lng)).toBeLessThanOrEqual(0.0005);
  });

  it("suggests lost/found matches by species, color and nearby area without resolving automatically", () => {
    const lost = { id: "lost", kind: "lost" as const, species: "cat", colors: ["white", "orange"], lat: 10.776, lng: 106.700, status: "open" as const };
    const suggestions = matchLostFoundReports(lost, [
      { ...lost, id: "far", kind: "found", lat: 10.9, lng: 106.9 },
      { ...lost, id: "match", kind: "found", colors: ["orange"], lat: 10.777, lng: 106.701 },
    ]);
    expect(suggestions[0]?.report.id).toBe("match");
    expect(suggestions[0]?.score).toBeGreaterThan(70);
  });

  it("only credits a direct-to-partner donation after receipt verification", () => {
    const entry = { amountVnd: 500_000, recipientType: "clinic" as const, paidDirectly: true, receiptVerified: false, receiptHash: null as string | null };
    const receiptHash = "ab".repeat(32);
    expect(verifyDonationReceipt(entry, receiptHash, true)).toMatchObject({ ok: true, publicAmountVnd: 500_000 });
    expect(verifyDonationReceipt({ ...entry, paidDirectly: false }, receiptHash, true).ok).toBe(false);
    expect(verifyDonationReceipt(entry, receiptHash, false).ok).toBe(false);
    expect(verifyDonationReceipt({ ...entry, amountVnd: 0 }, receiptHash, true).ok).toBe(false);
    expect(verifyDonationReceipt(entry, "", true).ok).toBe(false);
  });

  it("restricts moderation decisions to admins and supports appeal resubmission", () => {
    expect(moderateContent({ status: "pending", role: "owner" }, "approve").ok).toBe(false);
    expect(moderateContent({ status: "pending", role: "platform_admin" }, "reject").status).toBe("rejected");
    expect(moderateContent({ status: "rejected", role: "owner", appealSubmitted: true }, "appeal").status).toBe("pending");
    expect(moderateContent({ status: "hidden", role: "owner", appealSubmitted: true }, "appeal").status).toBe("pending");
  });

  it("rejects invalid coordinates before deriving a public point", () => {
    expect(() => fuzzLocation({ lat: 91, lng: 106 })).toThrow("invalid_location");
    expect(() => fuzzLocation({ lat: 10, lng: 106 }, 0)).toThrow("invalid_fuzz_cell");
  });
});
