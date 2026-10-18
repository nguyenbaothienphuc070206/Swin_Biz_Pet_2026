export type Urgency = "emergency" | "urgent" | "monitor";
export type SosRule = { id: string; symptom: string; urgency: Urgency; match?: Record<string, string | boolean>; enabled: boolean; isDemo: boolean; reviewed: boolean };
const priority: Record<Urgency, number> = { monitor: 1, urgent: 2, emergency: 3 };

export function evaluateUrgency(input: { symptoms: string[]; answers: Record<string, string | boolean> }, rules: SosRule[], production = false) {
  const matches = rules.filter((rule) => rule.enabled && rule.reviewed && (!production || !rule.isDemo) && input.symptoms.includes(rule.symptom)
    && Object.entries(rule.match ?? {}).every(([key, value]) => input.answers[key] === value));
  if (!matches.length) return { urgency: null, ruleIds: [] as string[], needsFallback: true };
  const urgency = matches.sort((a, b) => priority[b.urgency] - priority[a.urgency])[0].urgency;
  return { urgency, ruleIds: matches.filter((rule) => rule.urgency === urgency).map((rule) => rule.id), needsFallback: false };
}

export function nextSosRadius(currentStep: number, configured: number[] = [5, 10, 20]) {
  return configured[Math.min(currentStep + 1, configured.length - 1)] ?? configured.at(-1) ?? 5;
}

export function firstAcceptTransition(state: { status: string; acceptedClinicId?: string | null }, clinicId: string) {
  if (state.status !== "searching" || state.acceptedClinicId) return { accepted: false as const, state };
  return { accepted: true as const, state: { status: "accepted", acceptedClinicId: clinicId } };
}
