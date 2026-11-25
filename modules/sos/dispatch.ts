export const SOS_RADIUS_METERS = [5000, 10000, 15000] as const;
export const SOS_ROUND_TIMEOUT_SECONDS = 60;
export const SOS_MAX_CLINICS_PER_ROUND = 10;
export type EmergencyStatus = "online" | "offline" | "busy";
export interface DispatchCandidate {
  id: string;
  distanceM: number;
  supports24h: boolean;
  emergencyStatus: EmergencyStatus;
  heartbeatFresh: boolean;
}

export function eligibleClinicsForRing<T extends DispatchCandidate>(
  clinics: T[], radiusM: number, dispatchedClinicIds: string[], maxClinics: number,
): T[] {
  const alreadySent = new Set(dispatchedClinicIds);
  return clinics
    .filter((clinic) => clinic.distanceM <= radiusM && clinic.supports24h && clinic.emergencyStatus === "online" && clinic.heartbeatFresh && !alreadySent.has(clinic.id))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, Math.max(0, maxClinics));
}

export function chooseNextSosRing(input: { roundIndex: number; deadlinePassed: boolean; dispatchedCount: number }): number | null {
  if (input.roundIndex < 0 || input.roundIndex >= SOS_RADIUS_METERS.length - 1) return null;
  if (!input.deadlinePassed && input.dispatchedCount > 0) return null;
  return SOS_RADIUS_METERS[input.roundIndex + 1];
}

export function distanceBand(distanceM: number): "within_2_km" | "within_5_km" | "within_10_km" | "within_15_km" {
  if (distanceM <= 2000) return "within_2_km";
  if (distanceM <= 5000) return "within_5_km";
  if (distanceM <= 10000) return "within_10_km";
  return "within_15_km";
}

export function sosRateLimitAllows(attemptsInWindow: number, maximum: number): boolean {
  return Number.isInteger(attemptsInWindow) && attemptsInWindow >= 0 && attemptsInWindow < maximum;
}

export function clinicPayloadBeforeAcceptance(input: { species: string; symptoms: string[]; urgency: string | null; distanceM: number }) {
  return { species: input.species, symptomChips: input.symptoms, urgency: input.urgency, distanceBand: distanceBand(input.distanceM) };
}
