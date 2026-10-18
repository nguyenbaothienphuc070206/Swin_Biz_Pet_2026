import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

describe("Content Security Policy", () => {
  it("uses a per-request script nonce and denies unsafe execution primitives", () => {
    const policy=buildContentSecurityPolicy("fresh-nonce","https://db.example.test",false);
    expect(policy).toContain("'nonce-fresh-nonce'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
