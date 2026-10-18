export const DEMO_SCENARIO_IDS = [
  "passport-transfer",
  "late-night-sos",
  "clinic-vaccine",
  "care-plan-approval",
  "rescue-ledger",
] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

export const demoScenarioFixtures = {
  passportTransfer: {
    clinicName: "Clinic Demo · District 1",
    allergies: ["chicken"],
    activeMedications: [{ name: "Demo medication A", code: "DEMO-MED-001", ingredient: "DEMO-ACTIVE-A", isDemo: true }],
    isDemo: true,
  },
  lateNightSos: {
    time: "23:00",
    radiusKm: 5,
    ownerLocation: { label: "Quận 1, TP. Hồ Chí Minh (demo)", lat: 10.7769, lng: 106.7009 },
    clinic: { name: "Clinic Demo · District 3", distanceKm: 4.2, etaMinutes: 12, isDemo: true },
    isDemo: true,
  },
  vaccine: { code: "DEMO-VAX-CAT-01", name: "Demo feline vaccine A", dose: "1 demo dose", lot: "DEMO-LOT-01", date: "2026-10-18", isDemo: true },
  carePlan: { status: "draft" as const, model: "pawcare-deterministic-mock", isDemo: true },
  rescue: {
    caseName: "Milo · demo rescue case",
    clinic: "Clinic Demo · District 3",
    estimateVnd: 2_400_000,
    verifiedReceiptVnd: 1_800_000,
    outstandingVnd: 600_000,
    moneyHeldByPawCare: false,
    isDemo: true,
  },
} as const;

/** Local-only adapters used by the guided demo; none performs network or device I/O. */
export const mockDemoAdapters = {
  maps: {
    ownerLocation: () => demoScenarioFixtures.lateNightSos.ownerLocation,
    visibleClinicPins: <T,>(clinics: T[]) => clinics.slice(0, 3),
  },
  sos: {
    pingNearbyClinics: () => ({ state: "searching" as const, radiusKm: demoScenarioFixtures.lateNightSos.radiusKm, mode: "mock" as const }),
    acceptFirstClinic: () => ({ state: "accepted" as const, clinic: demoScenarioFixtures.lateNightSos.clinic, mode: "mock" as const }),
  },
  video: {
    startTriage: () => ({ sessionId: "demo-triage-session", mode: "mock" as const }),
  },
  ai: {
    draftCarePlan: () => ({ model: demoScenarioFixtures.carePlan.model, status: demoScenarioFixtures.carePlan.status, explanationKey: "aiDraftExplanation" as const }),
  },
  payments: {
    rescueLedger: () => demoScenarioFixtures.rescue,
  },
  notifications: {
    queueCampaignPreview: () => ({ status: "queued" as const, mode: "mock" as const }),
  },
} as const;
