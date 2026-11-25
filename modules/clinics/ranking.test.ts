import { describe, expect, it } from "vitest";
import { bayesianRating, rankClinics, rankByRating } from "./ranking";

const clinic = (id: string, fields: Partial<Parameters<typeof rankClinics>[0][number]> = {}) => ({
  id, distanceKm: 1, ratingSum: 24, reviewCount: 6, medianResponseMinutes: 20, soonestSlotHours: 2, ...fields,
});

describe("clinic directory ranking", () => {
  it("shrinks low sample ratings toward the prior", () => {
    expect(bayesianRating(5, 1)).toBe(4.111111111111111);
    expect(bayesianRating(0, 0)).toBe(4);
  });
  it("ranks by weighted signals and breaks ties by stable id", () => {
    const ranked = rankClinics([clinic("z"), clinic("a")], 5);
    expect(ranked.map(({ id }) => id)).toEqual(["a", "z"]);
    expect(ranked[0].score).toBeGreaterThan(0);
  });
  it("renormalizes around missing signals and clamps out-of-range inputs", () => {
    const [only] = rankClinics([clinic("x", { distanceKm: 99, ratingSum: 999, reviewCount: 1, medianResponseMinutes: -1, soonestSlotHours: null })], 5);
    expect(only.parts.distance).toBe(0);
    expect(only.parts.response).toBe(1);
    expect(only.parts.availability).toBe(0);
    expect(only.score).toBeLessThanOrEqual(100);
  });
  it("ranks facilities by star rating descending and breaks ties by review count, distance and id", () => {
    const facilities = [
      { id: "clinic-b", rating: 4.8, reviewCount: 50, distanceKm: 2 },
      { id: "spa-a", rating: 5.0, reviewCount: 180, distanceKm: 5 },
      { id: "shop-c", rating: 4.8, reviewCount: 100, distanceKm: 3 },
      { id: "clinic-d", rating: 4.8, reviewCount: 100, distanceKm: 1 },
      { id: "shop-e", rating: 4.8, reviewCount: 100, distanceKm: 1 },
      { id: "shop-f", rating: 4.8, reviewCount: 100, distanceKm: null },
    ];
    const ranked = rankByRating(facilities);
    expect(ranked.map((f) => f.id)).toEqual(["spa-a", "clinic-d", "shop-e", "shop-c", "shop-f", "clinic-b"]);
  });
});
