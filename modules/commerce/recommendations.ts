export type PetSafetyProfile = { species: string; lifeStage?: string; conditions: string[]; allergies: string[] };
export type ProductCandidate = { id: string; species: string[]; lifeStages: string[]; ingredients: string[]; allergens: string[]; dietaryTags: string[]; conditionExclusions: string[]; safetyReviewed: boolean; sponsored?: boolean; relevance?: number };
export type RecommendationResult = { eligible: ProductCandidate[]; excluded: { id: string; reason: string }[] };

export function recommendProducts(pet: PetSafetyProfile, products: ProductCandidate[]): RecommendationResult {
  const eligible: ProductCandidate[] = [];
  const excluded: RecommendationResult["excluded"] = [];
  for (const product of products) {
    const allergies = new Set(pet.allergies.map((item) => item.toLowerCase()));
    const allergens = product.allergens.map((item) => item.toLowerCase());
    const ingredients = product.ingredients.map((item) => item.toLowerCase());
    if (allergens.some((item) => allergies.has(item)) || ingredients.some((item) => allergies.has(item))) { excluded.push({ id: product.id, reason: "allergy_conflict" }); continue; }
    if (pet.allergies.length && !product.safetyReviewed) { excluded.push({ id: product.id, reason: "unknown_safety_metadata" }); continue; }
    if (pet.conditions.length && (!product.safetyReviewed || product.conditionExclusions === undefined)) { excluded.push({ id: product.id, reason: "unknown_safety_metadata" }); continue; }
    if (product.conditionExclusions.some((condition) => pet.conditions.map((item) => item.toLowerCase()).includes(condition.toLowerCase()))) { excluded.push({ id: product.id, reason: "condition_conflict" }); continue; }
    if (product.species.length && !product.species.includes(pet.species)) { excluded.push({ id: product.id, reason: "species_mismatch" }); continue; }
    const relevance = (product.relevance ?? 0)
      + (product.species.includes(pet.species) ? 30 : 0)
      + (Boolean(pet.lifeStage && product.lifeStages.includes(pet.lifeStage)) ? 20 : 0)
      + product.dietaryTags.filter((tag) => pet.conditions.includes(tag)).length * 5;
    eligible.push({ ...product, relevance });
  }
  eligible.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || a.id.localeCompare(b.id));
  return { eligible, excluded };
}

export function whyThis(product: ProductCandidate, pet: PetSafetyProfile, locale: "vi" | "en") {
  const reasons: string[] = [];
  if (product.species.includes(pet.species)) reasons.push(locale === "vi" ? `Phù hợp với ${pet.species === "dog" ? "chó" : pet.species === "cat" ? "mèo" : "loài thú cưng"}` : `Matches ${pet.species}`);
  if (pet.lifeStage && product.lifeStages.includes(pet.lifeStage)) reasons.push(locale === "vi" ? "Phù hợp giai đoạn phát triển đã chọn" : "Matches the selected life stage");
  const matched = product.dietaryTags.filter((tag) => pet.conditions.includes(tag));
  for (const tag of matched) reasons.push(locale === "vi" ? `Có nhãn phù hợp: ${tag}` : `Matching tag: ${tag}`);
  return reasons.length ? reasons : [locale === "vi" ? "Được hiển thị theo loài và danh mục bạn đang xem" : "Shown for the species and category you are browsing"];
}
