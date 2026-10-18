import { describe, expect, it } from "vitest";
import { recommendProducts, whyThis, type ProductCandidate } from "./recommendations";

const pet = { species: "cat", lifeStage: "adult", conditions: ["diabetes"], allergies: ["chicken"] };
const item = (id: string, extra: Partial<ProductCandidate> = {}): ProductCandidate => ({ id, species: ["cat"], lifeStages: ["adult"], ingredients: [], allergens: [], dietaryTags: [], conditionExclusions: [], safetyReviewed: true, relevance: 1, ...extra });
describe("safe product recommendations", () => {
  it("removes allergy, condition, species and unknown-safety conflicts before ranking", () => {
    const result = recommendProducts(pet, [item("allergen", { ingredients: ["CHICKEN"], sponsored: true }), item("condition", { conditionExclusions: ["Diabetes"] }), item("unknown", { safetyReviewed: false }), item("species", { species: ["dog"] }), item("safe")]);
    expect(result.eligible.map((p) => p.id)).toEqual(["safe"]);
    expect(result.excluded.map((p) => p.reason)).toEqual(["allergy_conflict", "condition_conflict", "unknown_safety_metadata", "species_mismatch"]);
  });
  it("does not let sponsored relevance bypass safety and explains only matching attributes", () => {
    const safeSponsored = item("sponsored", { sponsored: true, relevance: 1000, dietaryTags: ["diabetes"] });
    const unsafeSponsored = item("unsafe", { sponsored: true, allergens: ["chicken"], relevance: 10000 });
    const result = recommendProducts(pet, [item("regular", { relevance: 2 }), safeSponsored, unsafeSponsored]);
    expect(result.eligible[0].id).toBe("sponsored");
    expect(result.excluded).toContainEqual({ id: "unsafe", reason: "allergy_conflict" });
    expect(whyThis(safeSponsored, pet, "en").join(" ")).toMatch(/cat|life stage|tag/i);
    expect(whyThis(safeSponsored, pet, "en").join(" ")).not.toMatch(/treat|cure|diagnos/i);
  });
  it("covers pets with no safety metadata and products with no species or life-stage targeting", () => {
    const unrestricted = { species: "rabbit", conditions: [], allergies: [] };
    const generic = item("generic", { species: [], lifeStages: [], safetyReviewed: false, relevance: undefined });
    expect(recommendProducts(unrestricted, [generic]).eligible[0].relevance).toBe(0);
    expect(whyThis(generic, unrestricted, "en")).toEqual(["Shown for the species and category you are browsing"]);
  });
  it("explains Vietnamese species, life stage and dietary tags and guards unknown condition metadata", () => {
    const dog = { species: "dog", lifeStage: "puppy", conditions: ["sensitive"], allergies: [] };
    const matching = item("matching", { species: ["dog"], lifeStages: ["puppy"], dietaryTags: ["sensitive"] });
    expect(whyThis(matching, dog, "vi")).toHaveLength(3);
    expect(whyThis(item("other-species", { species: ["other"], lifeStages: [] }), { ...dog, species: "other" }, "vi")).toHaveLength(1);
    const incomplete = { ...matching, conditionExclusions: undefined } as unknown as ProductCandidate;
    expect(recommendProducts(dog, [incomplete]).excluded).toContainEqual({ id: "matching", reason: "unknown_safety_metadata" });
  });
});
