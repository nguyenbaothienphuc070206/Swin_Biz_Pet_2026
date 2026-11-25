/**
 * Pet Health Profile Validation Rules
 * Enforces mandatory fields:
 * 1. Name & Breed
 * 2. Weight (> 0 kg)
 * 3. Medical condition / history (including required details for food & drug allergies)
 * 4. Vaccination status (at least 1 administered vaccine required)
 */

export interface PetHealthProfileInput {
  name: string;
  breed: string;
  weight: string | number;
  selectedTags: string[];
  medicalHistory: string;
  foodAllergyDetails?: string;
  drugAllergyDetails?: string;
  isVaccinated: boolean;
  selectedVaxes: string[];
  customVaxes: { id: string; name: string; date?: string }[];
}

export type ValidationErrorKey =
  | "errorNameRequired"
  | "errorBreedRequired"
  | "errorWeightRequired"
  | "errorMedicalRequired"
  | "errorFoodAllergyRequired"
  | "errorDrugAllergyRequired"
  | "errorVaccineRequired";

export function isFoodAllergyTag(tag: string): boolean {
  if (!tag) return false;
  const lower = tag.toLowerCase();
  return lower === "food_allergy" || lower.includes("thức ăn") || lower.includes("food");
}

export function isDrugAllergyTag(tag: string): boolean {
  if (!tag) return false;
  const lower = tag.toLowerCase();
  return lower === "drug_allergy" || lower.includes("thuốc") || lower.includes("drug");
}

export function validatePetHealthProfile(
  input: PetHealthProfileInput
): { isValid: boolean; errorKey: ValidationErrorKey | null } {
  // 1. Name (Required)
  if (!input.name || !input.name.trim()) {
    return { isValid: false, errorKey: "errorNameRequired" };
  }

  // 2. Breed (Required)
  if (!input.breed || !input.breed.trim()) {
    return { isValid: false, errorKey: "errorBreedRequired" };
  }

  // 3. Weight (Required, positive number > 0)
  const weightStr = typeof input.weight === "string" ? input.weight.trim() : String(input.weight);
  if (!weightStr) {
    return { isValid: false, errorKey: "errorWeightRequired" };
  }
  const weightNum = parseFloat(weightStr);
  if (isNaN(weightNum) || weightNum <= 0) {
    return { isValid: false, errorKey: "errorWeightRequired" };
  }

  // 4. Medical history / conditions (At least 1 tag or non-empty written description)
  const hasConditions = input.selectedTags && input.selectedTags.length > 0;
  const hasHistoryText = !!(input.medicalHistory && input.medicalHistory.trim());
  if (!hasConditions && !hasHistoryText) {
    return { isValid: false, errorKey: "errorMedicalRequired" };
  }

  // 4a. Food allergy detail is required when food allergy is selected
  const hasFoodAllergy = (input.selectedTags || []).some(isFoodAllergyTag);
  if (hasFoodAllergy && (!input.foodAllergyDetails || !input.foodAllergyDetails.trim())) {
    return { isValid: false, errorKey: "errorFoodAllergyRequired" };
  }

  // 4b. Drug allergy detail is required when drug allergy is selected
  const hasDrugAllergy = (input.selectedTags || []).some(isDrugAllergyTag);
  if (hasDrugAllergy && (!input.drugAllergyDetails || !input.drugAllergyDetails.trim())) {
    return { isValid: false, errorKey: "errorDrugAllergyRequired" };
  }

  // 5. Vaccination (At least 1 vaccine is required)
  const selectedCount = input.selectedVaxes ? input.selectedVaxes.length : 0;
  const customCount = input.customVaxes ? input.customVaxes.length : 0;
  const totalVaccines = (input.isVaccinated ? selectedCount : 0) + customCount;
  if (!input.isVaccinated || totalVaccines < 1) {
    return { isValid: false, errorKey: "errorVaccineRequired" };
  }

  return { isValid: true, errorKey: null };
}
