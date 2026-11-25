import { describe, expect, it } from "vitest";
import { vaccineEntrySchema, canClinicReadRecord, buildAmendment } from "@/modules/passport/domain";
import { rankClinics, bayesianRating } from "@/modules/clinics/ranking";
import { isWithinOpeningHours, isVetAvailable, reserveCapacity } from "@/modules/booking/availability";
import { evaluateUrgency, nextSosRadius, firstAcceptTransition } from "@/modules/sos/domain";
import { carePlanDraftSchema, validateCarePlanDraft, hasForbiddenMedicalInstruction } from "@/modules/ai/safety";
import { recommendProducts, whyThis } from "@/modules/commerce/recommendations";
import { calculateInvoiceTotal } from "@/modules/billing/invoice";
import { findContraindicationWarnings } from "@/modules/passport/contraindications";
import {
  getBreedsForSpecies,
  filterBreeds,
} from "@/modules/domain/pet-breeds";
import {
  validatePetHealthProfile,
  isFoodAllergyTag,
  isDrugAllergyTag,
  PetHealthProfileInput,
} from "@/modules/domain/pet-health-validation";

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

describe("Companion Pet Breeds & Legal Species Catalog", () => {
  it("provides comprehensive dog breeds", () => {
    const dogs = getBreedsForSpecies("dog");
    expect(dogs.length).toBeGreaterThanOrEqual(20);
    expect(dogs.some((d) => d.id === "dog-corgi")).toBe(true);
    expect(dogs.some((d) => d.id === "dog-phuquoc")).toBe(true);
  });

  it("provides comprehensive cat breeds", () => {
    const cats = getBreedsForSpecies("cat");
    expect(cats.length).toBeGreaterThanOrEqual(15);
    expect(cats.some((c) => c.id === "cat-aln")).toBe(true);
    expect(cats.some((c) => c.id === "cat-ta")).toBe(true);
  });

  it("provides only legal companion pets for 'other' in Vietnam", () => {
    const others = getBreedsForSpecies("other");
    expect(others.length).toBeGreaterThanOrEqual(20);
    // Verified legal companion animals in VN
    expect(others.some((o) => o.id === "rabbit-minilop")).toBe(true);
    expect(others.some((o) => o.id === "hamster-bear")).toBe(true);
    expect(others.some((o) => o.id === "bird-budgie")).toBe(true);
    expect(others.some((o) => o.id === "fish-betta")).toBe(true);
    // Ensures no illegal endangered wildlife are listed
    expect(others.some((o) => o.nameVi.toLowerCase().includes("khỉ"))).toBe(false);
    expect(others.some((o) => o.nameVi.toLowerCase().includes("cầy hương"))).toBe(false);
  });

  it("filters breeds accent-insensitively and bi-lingually", () => {
    const dogs = getBreedsForSpecies("dog");
    const corgiSearch = filterBreeds(dogs, "corgi", false);
    expect(corgiSearch.length).toBeGreaterThan(0);
    expect(corgiSearch[0].id).toBe("dog-corgi");

    const unaccentedPhuQuoc = filterBreeds(dogs, "phu quoc", false);
    expect(unaccentedPhuQuoc.length).toBeGreaterThan(0);
    expect(unaccentedPhuQuoc[0].id).toBe("dog-phuquoc");

    const others = getBreedsForSpecies("other");
    const hamsterSearch = filterBreeds(others, "hamster", true);
    expect(hamsterSearch.length).toBeGreaterThan(0);
  });
});

describe("Pet Health Profile Validation", () => {
  const baseValidInput: PetHealthProfileInput = {
    name: "Milo",
    breed: "Corgi",
    weight: "8.5",
    selectedTags: ["healthy"],
    medicalHistory: "Khỏe mạnh, sinh hoạt bình thường",
    isVaccinated: true,
    selectedVaxes: ["Rabies vaccine"],
    customVaxes: [],
  };

  it("validates a completely filled valid profile", () => {
    const res = validatePetHealthProfile(baseValidInput);
    expect(res.isValid).toBe(true);
    expect(res.errorKey).toBeNull();
  });

  it("requires pet name and breed", () => {
    expect(
      validatePetHealthProfile({ ...baseValidInput, name: "   " }).errorKey
    ).toBe("errorNameRequired");

    expect(
      validatePetHealthProfile({ ...baseValidInput, breed: "" }).errorKey
    ).toBe("errorBreedRequired");
  });

  it("strictly requires valid weight (> 0 kg)", () => {
    expect(
      validatePetHealthProfile({ ...baseValidInput, weight: "" }).errorKey
    ).toBe("errorWeightRequired");

    expect(
      validatePetHealthProfile({ ...baseValidInput, weight: "0" }).errorKey
    ).toBe("errorWeightRequired");

    expect(
      validatePetHealthProfile({ ...baseValidInput, weight: "-3.5" }).errorKey
    ).toBe("errorWeightRequired");

    expect(
      validatePetHealthProfile({ ...baseValidInput, weight: "abc" }).errorKey
    ).toBe("errorWeightRequired");

    expect(
      validatePetHealthProfile({ ...baseValidInput, weight: 4.5 }).isValid
    ).toBe(true);
  });

  it("requires medical condition information or history notes", () => {
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: [],
        medicalHistory: "   ",
      }).errorKey
    ).toBe("errorMedicalRequired");

    // Valid when either tags or written history is provided
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: ["Khỏe mạnh"],
        medicalHistory: "",
      }).isValid
    ).toBe(true);

    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: [],
        medicalHistory: "Từng bị viêm da năm ngoái",
      }).isValid
    ).toBe(true);
  });

  it("strictly requires details when food allergy or drug allergy is selected", () => {
    // Food allergy without detail
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: ["Dị ứng thức ăn"],
        foodAllergyDetails: "  ",
      }).errorKey
    ).toBe("errorFoodAllergyRequired");

    // Food allergy with detail passes
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: ["Dị ứng thức ăn"],
        foodAllergyDetails: "Thịt gà, hải sản",
      }).isValid
    ).toBe(true);

    // Drug allergy without detail
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: ["Dị ứng thuốc"],
        drugAllergyDetails: "",
      }).errorKey
    ).toBe("errorDrugAllergyRequired");

    // Drug allergy with detail passes
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        selectedTags: ["Dị ứng thuốc"],
        drugAllergyDetails: "Penicillin",
      }).isValid
    ).toBe(true);
  });

  it("strictly requires at least 1 vaccination record", () => {
    // isVaccinated = false
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        isVaccinated: false,
        selectedVaxes: [],
      }).errorKey
    ).toBe("errorVaccineRequired");

    // isVaccinated = true but no vaccines selected
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        isVaccinated: true,
        selectedVaxes: [],
        customVaxes: [],
      }).errorKey
    ).toBe("errorVaccineRequired");

    // Custom vaccine alone fulfills the requirement
    expect(
      validatePetHealthProfile({
        ...baseValidInput,
        isVaccinated: true,
        selectedVaxes: [],
        customVaxes: [{ id: "cv1", name: "Vắc-xin 7 bệnh" }],
      }).isValid
    ).toBe(true);
  });

  it("identifies food and drug allergy tags correctly across locales", () => {
    expect(isFoodAllergyTag("food_allergy")).toBe(true);
    expect(isFoodAllergyTag("Dị ứng thức ăn")).toBe(true);
    expect(isFoodAllergyTag("Food allergies")).toBe(true);
    expect(isFoodAllergyTag("healthy")).toBe(false);

    expect(isDrugAllergyTag("drug_allergy")).toBe(true);
    expect(isDrugAllergyTag("Dị ứng thuốc")).toBe(true);
    expect(isDrugAllergyTag("Drug/vaccine allergies")).toBe(true);
    expect(isDrugAllergyTag("surgery")).toBe(false);
  });
});
