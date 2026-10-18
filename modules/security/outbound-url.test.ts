import { describe, expect, it } from "vitest";
import { isSafeAffiliateDestination } from "./outbound-url";

describe("affiliate destination validation", () => {
  it("allows public HTTPS destinations", () => expect(isSafeAffiliateDestination("https://shop.example.vn/item")).toBe(true));
  it("rejects non-HTTPS, credentials, local and IP destinations", () => {
    for(const url of ["http://shop.example.vn", "javascript:alert(1)", "https://user:pass@shop.example.vn", "https://localhost/path", "https://127.0.0.1/path", "https://192.168.1.5/path", "https://service.local/path"])
      expect(isSafeAffiliateDestination(url)).toBe(false);
  });
});
