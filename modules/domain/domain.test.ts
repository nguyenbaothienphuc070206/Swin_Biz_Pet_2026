import { describe, expect, it } from "vitest";
import { vaccineEntrySchema, canClinicReadRecord, buildAmendment } from "@/modules/passport/domain";
import { rankClinics, bayesianRating } from "@/modules/clinics/ranking";
import { isWithinOpeningHours, isVetAvailable, reserveCapacity } from "@/modules/booking/availability";
import { evaluateUrgency, nextSosRadius, firstAcceptTransition } from "@/modules/sos/domain";
import { carePlanDraftSchema, validateCarePlanDraft, hasForbiddenMedicalInstruction } from "@/modules/ai/safety";
import { recommendProducts, whyThis } from "@/modules/commerce/recommendations";
import { calculateInvoiceTotal } from "@/modules/billing/invoice";
import { findContraindicationWarnings } from "@/modules/passport/contraindications";

describe("Passport", () => {
  it("requires exact vaccine details and rejects an earlier due date", () => {
    const base = { petId: "00000000-0000-4000-8000-000000000001", vaccineName: "Vaccine X", code: "VX", dose: "1 dose", lot: "L1", administeredAt: "2026-10-10" };
    expect(vaccineEntrySchema.safeParse(base).success).toBe(true);
    expect(vaccineEntrySchema.safeParse({ ...base, lot: "", nextDueAt: "2026-10-01" }).success).toBe(false);
  });
  it("enforces grant clinic, scope, expiry and revocation", () => {
    const g = { clinicId: "c1", scopes: ["vaccinations"], expiresAt: new Date("2027-01-01") };
    expect(canClinicReadRecord(g, "c1", "vaccinations", new Date("2026-10-01"))).toBe(true);
    expect(canClinicReadRecord(g, "c2", "vaccinations", new Date("2026-10-01"))).toBe(false);
    expect(canClinicReadRecord({ ...g, revokedAt: new Date() }, "c1", "vaccinations")).toBe(false);
  });
  it("keeps immutable amendment history and rejects stale versions", () => {
    expect(buildAmendment({ dose: "A" }, { dose: "B" }, 1, 1)).toMatchObject({ ok: true, nextVersion: 2 });
    expect(buildAmendment({ dose: "A" }, { dose: "B" }, 1, 2)).toMatchObject({ ok: false, reason: "version_conflict" });
  });
  it("shows reviewed demo contraindication warnings only in demo mode", () => {
    const rules = [{ id: "r1", medicationCode: "MED-1", conditionCode: "diabetes", warningVi: "demo", warningEn: "demo", active: true, reviewed: true, isDemo: true }];
    const input = { medicationCode: "MED-1", conditions: ["diabetes"], allergies: [] };
    expect(findContraindicationWarnings(input, rules)).toHaveLength(1);
    expect(findContraindicationWarnings(input, rules, true)).toHaveLength(0);
    expect(findContraindicationWarnings({ ...input, conditions: [] }, rules)).toHaveLength(0);
  });
});

describe("clinic ranking", () => {
  it("uses Bayesian confidence and deterministic ranking", () => {
    expect(bayesianRating(5, 1)).toBeLessThan(5);
    const ranked = rankClinics([
      { id: "b", distanceKm: 1, ratingSum: 5, reviewCount: 1, medianResponseMinutes: 30, soonestSlotHours: 8 },
      { id: "a", distanceKm: 1, ratingSum: 25, reviewCount: 5, medianResponseMinutes: 30, soonestSlotHours: 8 },
    ], 10);
    expect(ranked[0].id).toBe("a");
    expect(rankClinics([{ id: "a", distanceKm: null, ratingSum: 0, reviewCount: 0, medianResponseMinutes: null, soonestSlotHours: null }], 5)[0].score).toBeGreaterThan(0);
  });
});

describe("booking", () => {
  it("respects opening hours, holidays, shifts, buffers and capacity", () => {
    const slot = { start: 1_000_000, end: 2_000_000 };
    expect(isWithinOpeningHours(slot, { start: 0, end: 3_000_000 })).toBe(true);
    expect(isWithinOpeningHours(slot, { start: 0, end: 3_000_000 }, [{ start: 1_500_000, end: 2_500_000 }])).toBe(false);
    expect(isVetAvailable(slot, [{ start: 0, end: 3_000_000 }], [], 0)).toBe(true);
    expect(isVetAvailable(slot, [{ start: 0, end: 3_000_000 }], [{ start: 1_900_000, end: 2_200_000 }], 5)).toBe(false);
    expect(reserveCapacity({ capacity: 1, reserved: 1 })).toBeNull();
  });
  it("only reserves a final capacity once under concurrent calls", async () => {
    let state = { capacity: 1, reserved: 0 };
    let lock = Promise.resolve();
    const attempt = async () => {
      const prior = lock;
      let release!: () => void;
      lock = new Promise<void>((resolve) => { release = resolve; });
      await prior;
      const next = reserveCapacity(state);
      const won = next !== null;
      if (next) state = next;
      release();
      return won;
    };
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("SOS", () => {
  const rules = [
    { id: "r1", symptom: "breathing", urgency: "urgent" as const, enabled: true, isDemo: false, reviewed: true },
    { id: "r2", symptom: "breathing", urgency: "emergency" as const, enabled: true, isDemo: false, reviewed: true },
    { id: "demo", symptom: "bleeding", urgency: "emergency" as const, enabled: true, isDemo: true, reviewed: true },
  ];
  it("selects highest reviewed rule and excludes demo in production", () => {
    expect(evaluateUrgency({ symptoms: ["breathing"], answers: {} }, rules, true).urgency).toBe("emergency");
    expect(evaluateUrgency({ symptoms: ["bleeding"], answers: {} }, rules, true).needsFallback).toBe(true);
  });
  it("expands radius and grants first acceptance only", () => {
    expect(nextSosRadius(0)).toBe(10);
    const state = { status: "searching" };
    expect(firstAcceptTransition(state, "c1").accepted).toBe(true);
    expect(firstAcceptTransition({ status: "accepted", acceptedClinicId: "c1" }, "c2").accepted).toBe(false);
  });
});

describe("AI output guards", () => {
  it("rejects diagnosis/dosage claims and task mutations", () => {
    expect(hasForbiddenMedicalInstruction("This is a diagnosis")).toBe(true);
    expect(hasForbiddenMedicalInstruction("liều thuốc mỗi ngày")).toBe(true);
    const task = "00000000-0000-4000-8000-000000000001";
    const draft = carePlanDraftSchema.parse({ introduction: "Plan draft", items: [{ taskId: task, explanation: "Reminder", order: 0 }] });
    expect(validateCarePlanDraft(draft, [{ id: task, order: 0 }])).toBe(true);
    expect(validateCarePlanDraft({ ...draft, items: [{ ...draft.items[0], taskId: "00000000-0000-4000-8000-000000000002" }] }, [{ id: task, order: 0 }])).toBe(false);
  });
});

describe("recommendation safety", () => {
  const pet = { species: "cat", lifeStage: "adult", conditions: ["diabetes"], allergies: ["chicken"] };
  const product = (id: string, overrides: Record<string, unknown> = {}) => ({ id, species: ["cat"], lifeStages: ["adult"], ingredients: [], allergens: [], dietaryTags: [], conditionExclusions: [], safetyReviewed: true, ...overrides });
  it("filters allergens, condition conflicts and unknown metadata before ranking", () => {
    const result = recommendProducts(pet, [
      product("allergen", { ingredients: ["chicken"], sponsored: true }),
      product("condition", { conditionExclusions: ["diabetes"], sponsored: true }),
      product("unknown", { safetyReviewed: false, sponsored: true }),
      product("safe"),
    ]);
    expect(result.eligible.map((item) => item.id)).toEqual(["safe"]);
    expect(result.excluded).toHaveLength(3);
  });
  it("explains only structured matches", () => {
    expect(whyThis(product("x"), pet, "en").join(" ")).toContain("Matches cat");
    expect(whyThis(product("x"), pet, "en").join(" ")).not.toMatch(/treat|cure|diagnos/i);
  });
});

describe("invoices", () => {
  it("computes exact integer minor-unit totals", () => {
    expect(calculateInvoiceTotal([{ description: "Booking commission", quantity: 2, unitAmountMinor: 1250 }])).toEqual({ subtotalMinor: 2500, totalMinor: 2500 });
    expect(() => calculateInvoiceTotal([{ description: "bad", quantity: -1, unitAmountMinor: 5 }])).toThrow();
  });
});
