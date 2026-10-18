import { describe, expect, it, vi } from "vitest";
import { isRiskyFeatureEnabled } from "./index";

describe("risky feature flag gate", () => {
  it("returns true only when the allowlisted flag is explicitly enabled", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };
    await expect(isRiskyFeatureEnabled(client, "sos.enabled")).resolves.toBe(true);
    expect(client.rpc).toHaveBeenCalledWith("is_feature_enabled", { p_flag: "sos.enabled" });
  });

  it("fails closed for disabled, unknown and unavailable flags", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) };
    await expect(isRiskyFeatureEnabled(client, "billing.enabled")).resolves.toBe(false);
    await expect(isRiskyFeatureEnabled(client, "not.allowlisted")).resolves.toBe(false);
    client.rpc.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(isRiskyFeatureEnabled(client, "sos.enabled")).resolves.toBe(false);
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });
});
