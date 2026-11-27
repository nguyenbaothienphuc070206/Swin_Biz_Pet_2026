import { describe, expect, it, beforeEach } from "vitest";
import {
  resetPortalDatabase,
  getPortalDatabase,
  resolveOwnerAccount,
  resolveClinicAccount,
  getScopedPortalState,
  syncOwnerPetsToBackend,
  syncClinicPetsToBackend,
  syncAppointmentsToBackend,
  syncCarePlansToBackend,
  upsertOwnerAccountOnAuth,
} from "./server-store";

describe("Unified 2-Portal Backend Store & 4 Paired Premium Owner Accounts", () => {
  beforeEach(() => {
    resetPortalDatabase();
  });

  it("provisions 4 paired Premium owner accounts and 1 paired Clinic account", () => {
    const db = getPortalDatabase();
    const owners = Object.values(db.ownerAccounts);
    expect(owners).toHaveLength(4);

    for (const acc of owners) {
      expect(acc.plan).toBe("premium");
      expect(acc.onboardingCompleted).toBe(true);
      expect(acc.petIds.length).toBeGreaterThanOrEqual(1);
    }

    const owner1 = resolveOwnerAccount("yen.le@pawcare.vn");
    const owner2 = resolveOwnerAccount("khoa.tran@pawcare.vn");
    const owner3 = resolveOwnerAccount("duc.pham@pawcare.vn");
    const owner4 = resolveOwnerAccount("trang.nguyen@pawcare.vn");

    expect(owner1.profile.fullName).toBe("Lê Hoàng Yến");
    expect(owner2.profile.fullName).toBe("Trần Anh Khoa");
    expect(owner3.profile.fullName).toBe("Phạm Minh Đức");
    expect(owner4.profile.fullName).toBe("Nguyễn Thu Trang");

    // Verify each owner only receives their own scoped pets, appointments, and care plans
    const s1 = getScopedPortalState({ email: owner1.email, role: "owner" });
    const s2 = getScopedPortalState({ email: owner2.email, role: "owner" });
    const s3 = getScopedPortalState({ email: owner3.email, role: "owner" });
    const s4 = getScopedPortalState({ email: owner4.email, role: "owner" });

    expect(s1.userPets?.map((p) => p.name)).toEqual(["Bơ"]);
    expect(s1.appointments?.map((a) => a.petName)).toEqual(["Bơ"]);
    expect(s1.carePlans?.map((c) => c.petName)).toEqual(["Bơ"]);

    expect(s2.userPets?.map((p) => p.name)).toEqual(["Mochi"]);
    expect(s2.appointments?.map((a) => a.petName)).toEqual(["Mochi"]);
    expect(s2.carePlans?.map((c) => c.petName)).toEqual(["Mochi"]);

    expect(s3.userPets?.map((p) => p.name)).toEqual(["Lu"]);
    expect(s3.appointments?.map((a) => a.petName)).toEqual(["Lu"]);
    expect(s3.carePlans?.map((c) => c.petName)).toEqual(["Lu"]);

    expect(s4.userPets?.map((p) => p.name)).toEqual(["Miu Miu"]);
    expect(s4.appointments?.map((a) => a.petName)).toEqual(["Miu Miu"]);
    expect(s4.carePlans?.map((c) => c.petName)).toEqual(["Miu Miu"]);

    // While the paired Clinic account receives all 4 owners' pets, appointments, and care plans
    const clinicState = getScopedPortalState({
      email: "clinic@pawcare.vn",
      role: "clinic_admin",
    });
    expect(clinicState.clinicPetRecords).toHaveLength(4);
    expect(clinicState.appointments).toHaveLength(4);
    expect(clinicState.carePlans).toHaveLength(4);

    // Alias resolution
    expect(resolveOwnerAccount("owner1@pawcare.vn").id).toBe(owner1.id);
    expect(resolveOwnerAccount("owner2@pawcare.vn").id).toBe(owner2.id);
    expect(resolveOwnerAccount("owner3@pawcare.vn").id).toBe(owner3.id);
    expect(resolveOwnerAccount("owner4@pawcare.vn").id).toBe(owner4.id);

    const clinic = resolveClinicAccount("clinic@pawcare.vn");
    expect(clinic.role).toBe("clinic_admin");
    expect(clinic.profile.name).toContain("PetCare");
  });

  it("propagates Owner pet additions and edits directly into Clinic EMR records", () => {
    const owner1 = resolveOwnerAccount("yen.le@pawcare.vn");
    const initialState = getScopedPortalState({
      userId: owner1.id,
      email: owner1.email,
      role: "owner",
    });
    expect(initialState.userPets).toHaveLength(1);

    const updatedOwnerPets = [
      ...(initialState.userPets ?? []),
      {
        id: "pet-new-corgi",
        name: "Bánh Mì",
        species: "dog" as const,
        breed: "Corgi Pembroke",
        gender: "male" as const,
        age: "1 tuổi",
        birthDate: "2025-05-01",
        weightKg: 9.2,
        microchip: "981098199887766",
        medicalHistory: "Đã tiêm phòng đầy đủ",
        allergies: ["Thịt gà"],
        conditions: ["Khỏe mạnh"],
        isVaccinated: true,
        vaccinations: [
          {
            name: "Vắc-xin Dại (Rabisin)",
            date: "2026-10-01",
            nextDue: "2027-10-01",
            lot: "RB-NEW-01",
            clinic: "Phòng Khám Thú Y PetCare · Quận 1",
            status: "completed" as const,
          },
        ],
      },
    ];

    syncOwnerPetsToBackend(owner1.email, updatedOwnerPets);

    const clinicState = getScopedPortalState({
      email: "clinic@pawcare.vn",
      role: "clinic_admin",
    });
    const syncedInClinic = clinicState.clinicPetRecords?.find(
      (p) => p.id === "pet-new-corgi"
    );
    expect(syncedInClinic).toBeDefined();
    expect(syncedInClinic?.name).toBe("Bánh Mì");
    expect(syncedInClinic?.owner.name).toBe("Lê Hoàng Yến");
    expect(syncedInClinic?.vaccinations).toHaveLength(1);
    expect(syncedInClinic?.vaccinations[0].batchNo).toBe("RB-NEW-01");
  });

  it("propagates Clinic vaccine logging and weight updates back to Owner Pet Passport", () => {
    const db = getPortalDatabase();
    const mochiClinicRecord = db.clinicPetRecords["demo-mochi-dog"];
    expect(mochiClinicRecord).toBeDefined();

    const updatedMochi = {
      ...mochiClinicRecord,
      weightKg: 4.1,
      vaccinations: [
        {
          id: "vax-clinic-added-99",
          name: "Leptospirosis Booster 2026",
          brand: "Zoetis",
          batchNo: "LEP-2026-99",
          adminDate: "2026-11-27",
          nextDue: "2027-11-27",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid" as const,
        },
        ...mochiClinicRecord.vaccinations,
      ],
    };

    syncClinicPetsToBackend([
      ...Object.values(db.clinicPetRecords).filter((p) => p.id !== "demo-mochi-dog"),
      updatedMochi,
    ]);

    const owner2State = getScopedPortalState({
      email: "khoa.tran@pawcare.vn",
      role: "owner",
    });
    const mochiOwnerRecord = owner2State.userPets?.find(
      (p) => p.id === "demo-mochi-dog"
    );
    expect(mochiOwnerRecord?.weightKg).toBe(4.1);
    expect(
      mochiOwnerRecord?.vaccinations.some((v) => v.lot === "LEP-2026-99")
    ).toBe(true);
  });

  it("pairs appointments and care-plan task adherence between Owner and Clinic portals", () => {
    const db = getPortalDatabase();
    const pendingApt = db.appointments.find((a) => a.id === "apt-demo-pending-01")!;
    expect(pendingApt.status).toBe("pending");

    // Clinic confirms the appointment
    syncAppointmentsToBackend([
      {
        ...pendingApt,
        status: "confirmed",
        notes: "Phòng khám đã xác nhận khung giờ 14:30 cho bé Bơ.",
      },
    ]);

    const owner1State = getScopedPortalState({
      email: "yen.le@pawcare.vn",
      role: "owner",
    });
    const syncedApt = owner1State.appointments?.find(
      (a) => a.id === "apt-demo-pending-01"
    );
    expect(syncedApt?.status).toBe("confirmed");
    expect(syncedApt?.notes).toContain("đã xác nhận");

    // Owner completes all tasks in Care Plan 01 -> Clinic EMR adherence updates to 100%
    const plan1 = db.carePlans.find((p) => p.id === "plan-petcare-01")!;
    const completedPlan = {
      ...plan1,
      tasks: plan1.tasks.map((t) => ({ ...t, completed: true })),
    };
    syncCarePlansToBackend([completedPlan], false);

    const clinicState = getScopedPortalState({
      email: "clinic@pawcare.vn",
      role: "clinic_admin",
    });
    const boClinicRecord = clinicState.clinicPetRecords?.find(
      (p) => p.id === "demo-bo-cat"
    );
    expect(boClinicRecord?.carePlan?.adherencePct).toBe(100);
  });

  it("grants Premium plan and persists newly registered owner accounts", () => {
    const newOwner = upsertOwnerAccountOnAuth({
      email: "new.genz.owner@pawcare.vn",
      name: "Võ Hoàng Minh",
      isSignUp: true,
    });
    expect(newOwner.plan).toBe("premium");
    expect(newOwner.profile.fullName).toBe("Võ Hoàng Minh");
    expect(resolveOwnerAccount("new.genz.owner@pawcare.vn").id).toBe(newOwner.id);
  });
});
