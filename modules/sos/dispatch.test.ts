import { describe, expect, it } from "vitest";
import { SOS_RADIUS_METERS, SOS_ROUND_TIMEOUT_SECONDS, SOS_MAX_CLINICS_PER_ROUND, chooseNextSosRing, distanceBand, eligibleClinicsForRing, sosRateLimitAllows, clinicPayloadBeforeAcceptance } from "./dispatch";

describe("SOS dispatch rings", () => {
  const clinics = [
    { id: "near", distanceM: 1200, supports24h: true, emergencyStatus: "online" as const, heartbeatFresh: true },
    { id: "middle", distanceM: 7200, supports24h: true, emergencyStatus: "online" as const, heartbeatFresh: true },
    { id: "far", distanceM: 12000, supports24h: true, emergencyStatus: "online" as const, heartbeatFresh: true },
    { id: "busy", distanceM: 300, supports24h: true, emergencyStatus: "busy" as const, heartbeatFresh: true },
    { id: "stale", distanceM: 400, supports24h: true, emergencyStatus: "online" as const, heartbeatFresh: false },
  ];

  it("uses the configured meter radii", () => {
    expect(SOS_RADIUS_METERS).toEqual([5000, 10000, 15000]);
    expect(SOS_ROUND_TIMEOUT_SECONDS).toBe(60);
    expect(SOS_MAX_CLINICS_PER_ROUND).toBe(10);
  });

  it("selects nearest newly eligible clinics and never repeats a clinic in later rings", () => {
    expect(eligibleClinicsForRing(clinics, 5000, [], 10).map((c) => c.id)).toEqual(["near"]);
    expect(eligibleClinicsForRing(clinics, 10000, ["near"], 10).map((c) => c.id)).toEqual(["middle"]);
    expect(eligibleClinicsForRing(clinics, 15000, ["near", "middle"], 10).map((c) => c.id)).toEqual(["far"]);
  });

  it("returns the next radius only after the round deadline unless no clinics were added", () => {
    expect(chooseNextSosRing({ roundIndex: 0, deadlinePassed: false, dispatchedCount: 2 })).toBe(null);
    expect(chooseNextSosRing({ roundIndex: 0, deadlinePassed: true, dispatchedCount: 2 })).toBe(10000);
    expect(chooseNextSosRing({ roundIndex: 0, deadlinePassed: false, dispatchedCount: 0 })).toBe(10000);
    expect(chooseNextSosRing({ roundIndex: 2, deadlinePassed: true, dispatchedCount: 1 })).toBe(null);
  });

  it("exposes only a coarse distance band before acceptance", () => {
    expect(distanceBand(1200)).toBe("within_2_km");
    expect(distanceBand(4900)).toBe("within_5_km");
    expect(distanceBand(9000)).toBe("within_10_km");
    expect(distanceBand(14000)).toBe("within_15_km");
  });

  it("applies a strict rate limit at the configured attempt threshold", () => {
    expect(sosRateLimitAllows(0, 3)).toBe(true);
    expect(sosRateLimitAllows(2, 3)).toBe(true);
    expect(sosRateLimitAllows(3, 3)).toBe(false);
  });

  it("creates a pre-acceptance payload with no coordinates or contact fields", () => {
    expect(clinicPayloadBeforeAcceptance({ species: "cat", symptoms: ["breathing"], urgency: "emergency", distanceM: 1200 }))
      .toEqual({ species: "cat", symptomChips: ["breathing"], urgency: "emergency", distanceBand: "within_2_km" });
  });
});
