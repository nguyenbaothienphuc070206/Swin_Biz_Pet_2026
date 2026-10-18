export type ContraindicationRule = {
  id: string;
  medicationCode?: string | null;
  activeIngredient?: string | null;
  conditionCode?: string | null;
  allergyName?: string | null;
  warningVi: string;
  warningEn: string;
  active: boolean;
  reviewed: boolean;
  isDemo: boolean;
};

export function findContraindicationWarnings(input: {
  medicationCode: string;
  activeIngredient?: string | null;
  conditions: string[];
  allergies: string[];
}, rules: ContraindicationRule[], production = false) {
  const conditions = new Set(input.conditions.map((value) => value.trim().toLowerCase()));
  const allergies = new Set(input.allergies.map((value) => value.trim().toLowerCase()));
  return rules.filter((rule) => rule.active && rule.reviewed && (!production || !rule.isDemo)
    && (rule.medicationCode == null || rule.medicationCode === input.medicationCode)
    && (rule.activeIngredient == null || rule.activeIngredient.toLowerCase() === input.activeIngredient?.toLowerCase())
    && (!rule.conditionCode || conditions.has(rule.conditionCode.toLowerCase()))
    && (!rule.allergyName || allergies.has(rule.allergyName.toLowerCase())));
}
