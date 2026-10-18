import { describe, expect, it } from "vitest";
import { isAllowedMutationOrigin } from "./request-policy";

describe("same-origin mutation policy", () => {
  it("accepts exact-origin app mutations", () => {
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/sos", origin:"https://pawcare.test", requestOrigin:"https://pawcare.test", fetchSite:"same-origin" })).toBe(true);
  });
  it("rejects cross-origin and missing-origin cookie mutations", () => {
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/sos", origin:"https://evil.test", requestOrigin:"https://pawcare.test", fetchSite:"cross-site" })).toBe(false);
    expect(isAllowedMutationOrigin({ method:"DELETE", pathname:"/api/pets/1", origin:null, requestOrigin:"https://pawcare.test", fetchSite:null })).toBe(false);
  });
  it("only exempts signed or bearer authenticated callbacks", () => {
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/billing/webhook", origin:null, requestOrigin:"https://pawcare.test", fetchSite:null })).toBe(true);
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/internal/notifications/process", origin:null, requestOrigin:"https://pawcare.test", fetchSite:null })).toBe(true);
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/notifications/unsubscribe", origin:"https://evil.test", requestOrigin:"https://pawcare.test", fetchSite:"cross-site" })).toBe(true);
    expect(isAllowedMutationOrigin({ method:"POST", pathname:"/api/sos", origin:"https://evil.test", requestOrigin:"https://pawcare.test", fetchSite:"cross-site" })).toBe(false);
  });
});
