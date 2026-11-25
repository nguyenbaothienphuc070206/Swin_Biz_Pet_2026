import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { lookupBarcode, COMMON_POC_CATALOG } from "@/modules/passport/barcode";
import {
  generateShareToken,
  hashShareToken,
  evaluateRabiesStatus,
  projectSharedRecord,
} from "@/modules/passport/share-service";
import { createPassportPdf } from "@/modules/passport/pdf";
import { HCMC_POC_CLINICS, DEMO_PETS_20 } from "./hcmc-competition-dataset";

describe("Competition Demo Flow: 60-Second End-to-End Verification", () => {
  const clinicA = HCMC_POC_CLINICS[0]; // VetCare D3
  const clinicB = HCMC_POC_CLINICS[1]; // 2Pet D1
  const pet = { ...DEMO_PETS_20[0] }; // Mochi

  it("Step 1: Clinic A scans vaccine barcode and logs a shot in <15s", () => {
    // 1. Barcode scan lookup
    const scannedBarcode = "893850123401"; // Rabisin Barcode
    const catalogItem = lookupBarcode(scannedBarcode);
    expect(catalogItem).not.toBeNull();
    expect(catalogItem?.name).toContain("Rabisin");
    expect(catalogItem?.standardLot).toBe("RAB-2026-X1");

    // 2. Fast logging
    const newVaccination = {
      name: catalogItem!.name,
      lot: catalogItem!.standardLot!,
      date: "2026-10-26",
      nextDue: "2027-10-26",
      clinic: clinicA.name,
      vetName: clinicA.chiefVet,
      verified: true,
    };
    pet.vaccinations.unshift(newVaccination);

    // Verify Rabies status updated to VALID
    const rabiesStatus = evaluateRabiesStatus(pet.vaccinations, new Date("2026-10-26"));
    expect(rabiesStatus.hasRabiesVaccine).toBe(true);
    expect(rabiesStatus.isValid).toBe(true);
    expect(rabiesStatus.lot).toBe("RAB-2026-X1");
  });

  it("Step 2: Owner exports the PDF and generates a verifiable QR link", async () => {
    const rabiesStatus = evaluateRabiesStatus(pet.vaccinations, new Date("2026-10-26"));

    // 1. Server-side PDF Generation with embedded Vietnamese font & QR
    const pdfBytes = await createPassportPdf({
      locale: "vi",
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        birthDate: pet.birthDate,
        microchip: pet.microchip,
        weightKg: pet.weightKg,
      },
      rabiesStatus,
      vaccinations: pet.vaccinations.map((v) => ({
        name: v.name,
        lot: v.lot,
        administeredAt: v.date,
        nextDueAt: v.nextDue,
        clinic: v.clinic,
        vetName: v.vetName,
        verified: v.verified,
      })),
      sections: ["vaccinations", "medications", "allergies", "conditions"],
      generatedAt: new Date("2026-10-26T10:00:00Z"),
      recordId: pet.id,
      verificationUrl: `https://pawcare.vn/records/verify/${pet.id}`,
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(6000);
    // Magic PDF header
    expect(Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8")).toBe("%PDF-");

    // 2. Generate secure unguessable share token
    const token = generateShareToken();
    const tokenHash = hashShareToken(token);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).toHaveLength(64);
  });

  it("Step 3: Clinic B scans the QR and sees verified record with clinic attribution", () => {
    const fullGrant = {
      id: "grant-clinic-b-test",
      shareType: "full_record" as const,
      scopes: ["profile", "vaccinations", "medications", "allergies"],
      expiresAt: new Date("2026-11-02"),
      includeOwnerContact: false,
    };

    const projection = projectSharedRecord(pet, fullGrant, clinicA.name);
    expect(projection.pet.name).toBe("Mochi");
    expect(projection.rabiesStatus.isValid).toBe(true);
    expect(projection.vaccinations?.length).toBeGreaterThan(0);
    expect(projection.vaccinations?.[0].clinic).toBe(clinicA.name);
    expect(projection.vaccinations?.[0].verified).toBe(true);
  });

  it("Step 4: Bite-victim view verifies rabies status from collar QR with zero owner PII leaked", () => {
    const collarGrant = {
      id: "grant-collar-rabies-test",
      shareType: "rabies_verification" as const,
      scopes: ["profile", "vaccinations"],
      expiresAt: new Date("2031-10-26"), // 5-year permanent collar code
      includeOwnerContact: false,
    };

    const projection = projectSharedRecord(pet, collarGrant, clinicA.name);

    // Rabies validity is crystal-clear
    expect(projection.rabiesStatus.isValid).toBe(true);
    expect(projection.rabiesStatus.vaccineName).toContain("Rabisin");
    expect(projection.rabiesStatus.lot).toBe("RAB-2026-X1");

    // DATA MINIMIZATION: Zero owner PII
    expect(projection.ownerContact).toBeUndefined();
    expect(projection.medications).toBeUndefined();
    expect(projection.allergies).toBeUndefined();
    expect(projection.conditions).toBeUndefined();
    expect(projection.visits).toBeUndefined();
  });
});

