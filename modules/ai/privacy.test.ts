import { describe, expect, it } from "vitest";
import { safeRedactedInput } from "./privacy";

describe("AI audit input minimization", () => {
  it("logs only input shape and size, never values or deterministic hashes", () => {
    const result = safeRedactedInput({ email:"owner@example.test", phone:"0900000000", notes:"private clinical note" });
    expect(result).toEqual({ keys:["email","phone","notes"], byteLength:expect.any(Number) });
    expect(JSON.stringify(result)).not.toContain("owner@example.test");
    expect(JSON.stringify(result)).not.toContain("0900000000");
    expect(result).not.toHaveProperty("sha256");
  });
});
