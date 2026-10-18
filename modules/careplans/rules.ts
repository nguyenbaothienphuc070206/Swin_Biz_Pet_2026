export type PlanCategory = "vaccination" | "deworming" | "weight_check" | "dental" | "diet_category";
export type CareRule = {
  id: string; species: string; breed?: string | null; category: PlanCategory; taskKey: string;
  ageMinMonths?: number | null; ageMaxMonths?: number | null; conditionTags: string[];
  horizonMonths: number[]; offsetDays: number; dueWindowDays: number; vetVisitRequired: boolean;
  reviewed: boolean; enabled: boolean; isDemo: boolean;
};
export type CareProfile = { species: string; breed?: string | null; ageMonths?: number | null; conditions: string[] };

export function generateCareBaseline(profile: CareProfile, rules: CareRule[], horizonMonths: 1 | 3 | 6 | 12, production = false) {
  const active = rules.filter((rule) => rule.enabled && rule.reviewed && (!production || !rule.isDemo)
    && rule.species === profile.species
    && (!rule.breed || rule.breed.toLowerCase() === profile.breed?.toLowerCase())
    && (!profile.ageMonths || (rule.ageMinMonths == null || profile.ageMonths >= rule.ageMinMonths) && (rule.ageMaxMonths == null || profile.ageMonths <= rule.ageMaxMonths))
    && rule.horizonMonths.includes(horizonMonths)
    && (!rule.conditionTags.length || rule.conditionTags.some((tag) => profile.conditions.includes(tag))));
  if (production && active.length === 0) return { ready: false as const, tasks: [], reason: "no_reviewed_rules" as const };
  const now = new Date();
  const tasks = active.map((rule) => {
    const start = new Date(now); start.setUTCDate(start.getUTCDate() + rule.offsetDays);
    const due = new Date(start); due.setUTCDate(due.getUTCDate() + rule.dueWindowDays);
    return { id: rule.id, category: rule.category, taskKey: rule.taskKey, dueFrom: start.toISOString().slice(0, 10), dueTo: due.toISOString().slice(0, 10), vetVisitRequired: rule.vetVisitRequired, sourceRuleId: rule.id, sortOrder: rule.offsetDays };
  });
  tasks.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return { ready: true as const, tasks, reason: null };
}

export function shouldReplanForWeight(previousKg: number, nextKg: number, thresholdPercent?: number | null) {
  if (thresholdPercent == null || previousKg <= 0 || nextKg <= 0) return false;
  return Math.abs((nextKg - previousKg) / previousKg) * 100 >= thresholdPercent;
}
