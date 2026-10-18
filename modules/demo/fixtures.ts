import type { ClinicCandidate } from "@/modules/clinics/ranking";
import type { ProductCandidate } from "@/modules/commerce/recommendations";

export const demoPet = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Miso (DEMO)", species: "cat", breed: "Domestic shorthair", birthDate: "2023-04-12",
  weightKg: 4.2, allergies: ["chicken"], conditions: ["diabetes"], isDemo: true,
};

export const demoClinics: (ClinicCandidate & { name: string; district: string; verified: boolean; isDemo: true; services: string[]; priceRange: string; languages: string[]; lat: number; lng: number })[] = [
  { id: "demo-clinic-1", name: "Clinic Demo · District 1", district: "District 1", distanceKm: 1.2, ratingSum: 42, reviewCount: 11, medianResponseMinutes: 18, soonestSlotHours: 3, verified: true, isDemo: true, services: ["General checkup", "Vaccination"], priceRange: "Demo pricing", languages: ["vi", "en"], lat: 10.7769, lng: 106.7009 },
  { id: "demo-clinic-2", name: "Clinic Demo · District 3", district: "District 3", distanceKm: 2.7, ratingSum: 81, reviewCount: 22, medianResponseMinutes: 12, soonestSlotHours: 10, verified: true, isDemo: true, services: ["Dental", "General checkup"], priceRange: "Demo pricing", languages: ["vi"], lat: 10.7821, lng: 106.6866 },
  { id: "demo-clinic-3", name: "Clinic Demo · Binh Thanh", district: "Binh Thanh", distanceKm: 4.5, ratingSum: 16, reviewCount: 4, medianResponseMinutes: 45, soonestSlotHours: 1, verified: false, isDemo: true, services: ["Vaccination"], priceRange: "Demo pricing", languages: ["vi", "en"], lat: 10.8034, lng: 106.7102 },
];

export const demoProducts: ProductCandidate[] = [
  { id: "demo-product-1", species: ["cat"], lifeStages: ["adult"], ingredients: ["salmon"], allergens: [], dietaryTags: [], conditionExclusions: [], safetyReviewed: true, sponsored: false, relevance: 10 },
  { id: "demo-product-2", species: ["cat"], lifeStages: ["adult"], ingredients: ["chicken"], allergens: ["chicken"], dietaryTags: [], conditionExclusions: [], safetyReviewed: true, sponsored: true, relevance: 50 },
  { id: "demo-product-3", species: ["cat"], lifeStages: ["adult"], ingredients: ["fish"], allergens: [], dietaryTags: ["diabetes"], conditionExclusions: ["diabetes"], safetyReviewed: true, sponsored: true, relevance: 60 },
  { id: "demo-product-4", species: ["cat"], lifeStages: ["adult"], ingredients: ["rabbit"], allergens: [], dietaryTags: [], conditionExclusions: [], safetyReviewed: false, sponsored: true, relevance: 100 },
];

export const demoTimeline = [
  { id: "vax-demo-1", type: "Vaccination", date: "2026-03-18", detail: "DEMO-VAX-CAT-01 · Lot DEMO-LOT-01", isDemo: true },
  { id: "weight-demo-1", type: "Weight", date: "2026-09-28", detail: "4.2 kg · owner reported", isDemo: true },
  { id: "visit-demo-1", type: "Visit", date: "2026-07-03", detail: "Routine visit · fictional demo record", isDemo: true },
];

export const demoPlanTasks = [
  { id: "task-demo-1", category: "weight_check", title: "Weight check (DEMO)", due: "2026-11-01", status: "pending", vetVisit: false, isDemo: true },
  { id: "task-demo-2", category: "dental", title: "Discuss dental care with a vet (DEMO)", due: "2026-11-15", status: "pending", vetVisit: true, isDemo: true },
];
