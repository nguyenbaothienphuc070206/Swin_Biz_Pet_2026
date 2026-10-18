export type ClinicCandidate = {
  id: string;
  distanceKm: number | null;
  ratingSum: number;
  reviewCount: number;
  medianResponseMinutes: number | null;
  soonestSlotHours: number | null;
};

const WEIGHTS = { distance: 0.3, rating: 0.25, response: 0.2, availability: 0.25 } as const;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function bayesianRating(sum: number, count: number, priorMean = 4, priorWeight = 8) {
  if (count <= 0) return priorMean;
  return (priorMean * priorWeight + sum) / (priorWeight + count);
}

export function rankClinics<T extends ClinicCandidate>(clinics: T[], radiusKm: number) {
  return clinics.map((clinic) => {
    const parts: Record<string, number | null> = {
      distance: clinic.distanceKm == null ? null : clamp01(1 - clinic.distanceKm / Math.max(0.1, radiusKm)),
      rating: clinic.reviewCount < 0 ? null : clamp01((bayesianRating(clinic.ratingSum, clinic.reviewCount) - 1) / 4),
      response: clinic.medianResponseMinutes == null ? null : clamp01(1 - clinic.medianResponseMinutes / 120),
      availability: clinic.soonestSlotHours == null ? 0 : clamp01(1 - clinic.soonestSlotHours / (24 * 14)),
    };
    const available = Object.entries(parts).filter((entry): entry is [string, number] => entry[1] !== null);
    const weightSum = available.reduce((sum, [key]) => sum + WEIGHTS[key as keyof typeof WEIGHTS], 0);
    const score = weightSum === 0 ? 0 : available.reduce((sum, [key, value]) => sum + value * WEIGHTS[key as keyof typeof WEIGHTS], 0) / weightSum * 100;
    return { ...clinic, score: Math.round(score * 100) / 100, parts };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
