import { describe, expect, it } from "vitest";
import { canPerformSensitiveAdminAction, sanitizeAuditMetadata } from "./authorization";

describe("admin authorization and audit policy", () => {
  it("requires platform admin and fresh second-factor assurance for sensitive actions", () => {
    expect(canPerformSensitiveAdminAction("platform_admin", "aal2")).toBe(true);
    expect(canPerformSensitiveAdminAction("platform_admin", "aal1")).toBe(false);
    expect(canPerformSensitiveAdminAction("clinic_admin", "aal2")).toBe(false);
  });
  it("keeps personal and secret fields out of audit metadata", () => {
    expect(sanitizeAuditMetadata({ decision: "approved", email: "private@example.test", documentPath: "private/path", count: 2 })).toEqual({ decision: "approved", count: 2 });
  });
});
