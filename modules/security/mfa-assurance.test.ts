import { describe, expect, it } from "vitest";
import { roleRequiresMfa } from "./mfa-assurance";

describe("administrator MFA policy", () => {
  it("requires AAL2 for clinic admins and platform admins", () => {
    expect(roleRequiresMfa("clinic_admin")).toBe(true);
    expect(roleRequiresMfa("platform_admin")).toBe(true);
    expect(roleRequiresMfa("clinic_staff")).toBe(false);
    expect(roleRequiresMfa("owner")).toBe(false);
  });
});
