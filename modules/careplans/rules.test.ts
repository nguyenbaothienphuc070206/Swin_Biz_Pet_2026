import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCareBaseline, shouldReplanForWeight, type CareRule } from "./rules";

const rule = (overrides: Partial<CareRule> = {}): CareRule => ({ id: "r1", species: "dog", breed: null, category: "weight_check", taskKey: "weight_check", ageMinMonths: null, ageMaxMonths: null, conditionTags: [], horizonMonths: [1, 3, 6, 12], offsetDays: 7, dueWindowDays: 2, vetVisitRequired: false, reviewed: true, enabled: true, isDemo: false, ...overrides });
describe("care-plan deterministic baseline", () => {
  afterEach(() => vi.useRealTimers());
  it("selects reviewed compatible rules and produces stable due dates", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const result = generateCareBaseline({ species: "dog", breed: "Mixed", ageMonths: 12, conditions: [] }, [rule(), rule({ id: "disabled", enabled: false }), rule({ id: "unreviewed", reviewed: false }), rule({ id: "other", species: "cat" })], 1);
    expect(result).toMatchObject({ ready: true, reason: null });
    expect(result.tasks).toMatchObject([{ id: "r1", dueFrom: "2026-01-08", dueTo: "2026-01-10" }]);
  });
  it("filters by age, breed, condition and production demo status", () => {
    const conditional = rule({ id: "condition", conditionTags: ["allergy"] });
    expect(generateCareBaseline({ species: "dog", ageMonths: 1, conditions: [] }, [rule({ ageMinMonths: 2 }), conditional], 1).tasks).toHaveLength(0);
    expect(generateCareBaseline({ species: "dog", breed: "Poodle", ageMonths: 12, conditions: ["allergy"] }, [rule({ breed: "Husky" }), conditional, rule({ id: "demo", isDemo: true })], 1, true).tasks.map((t) => t.id)).toEqual(["condition"]);
    expect(generateCareBaseline({ species: "dog", conditions: [] }, [rule({ isDemo: true })], 1, true)).toMatchObject({ ready: false, reason: "no_reviewed_rules" });
  });
  it("replans only for valid weights crossing the configured threshold", () => {
    expect(shouldReplanForWeight(10, 11, 10)).toBe(true);
    expect(shouldReplanForWeight(10, 10.5, 10)).toBe(false);
    expect(shouldReplanForWeight(0, 10, 5)).toBe(false);
    expect(shouldReplanForWeight(10, 11, null)).toBe(false);
  });
});
