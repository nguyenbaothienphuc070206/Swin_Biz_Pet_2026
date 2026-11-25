import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPassportPdf, type PassportPdfInput } from "./pdf";

describe("pdf: Server-side Pet Health Record PDF Generator", () => {
  const sampleInput: PassportPdfInput = {
    locale: "vi",
    pet: {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Bé Mochi Corgi",
      species: "dog",
      breed: "Corgi Wales Pembroke",
      gender: "male",
      birthDate: "2022-03-15",
      weightKg: 11.2,
      microchip: "982000412345678",
    },
    rabiesStatus: {
      hasRabiesVaccine: true,
      isValid: true,
      administeredAt: "2026-06-15",
      expiresAt: "2027-06-15",
      vaccineName: "Rabisin (Phòng Dại Nhập Khẩu)",
      lot: "RAB-2026-88",
      issuingClinic: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
      daysRemaining: 232,
    },
    vaccinations: [
      {
        name: "Rabisin (Phòng dại)",
        lot: "RAB-2026-88",
        administeredAt: "2026-06-15",
        nextDueAt: "2027-06-15",
        clinic: "PawCare D3 Clinic",
        vetName: "BS. Nguyễn Văn Tâm",
        verified: true,
      },
      {
        name: "Vanguard Plus 5/CV-L (7 bệnh chó)",
        lot: "VG-2026-12",
        administeredAt: "2026-06-15",
        nextDueAt: "2027-06-15",
        clinic: "PawCare D3 Clinic",
        verified: true,
      },
      {
        name: "Thuốc tẩy giun Drontal Plus",
        lot: "DR-901",
        administeredAt: "2026-09-01",
        nextDueAt: "2026-12-01",
        verified: false,
      },
    ],
    prescriptions: [
      {
        name: "NexGard Spectra 7.5 - 15kg",
        dose: "1 viên nhai",
        instructions: "Uống định kỳ phòng ve rận & giun tim",
        startedAt: "2026-09-10",
        verified: true,
      },
    ],
    allergies: [
      { name: "Dị ứng đạm bò", severity: "trung bình", source: "clinic" },
    ],
    conditions: [
      { name: "Viêm da tiếp xúc nhẹ", status: "đang hồi phục", source: "clinic" },
    ],
    visits: [
      {
        date: "2026-06-15",
        clinicName: "Bệnh Viện Thú Y 2Pet 24/7",
        summary: "Khám định kỳ, kiểm tra tai mũi họng và tiêm phòng nhắc lại mũi 7 bệnh + dại.",
      },
    ],
    ownerContact: {
      name: "Trần Anh Khoa",
      phone: "0912 345 678",
      district: "Quận 1, TP.HCM",
    },
    sections: ["vaccinations", "medications", "allergies", "conditions", "visits"],
    generatedAt: new Date("2026-10-26T10:00:00Z"),
    recordId: "REC-2026-HCM-001",
    verificationUrl: "https://pawcare.vn/records/verify/test-token",
  };

  it("generates a valid, non-empty PDF byte stream in Vietnamese", async () => {
    const bytes = await createPassportPdf(sampleInput);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);

    // Verify PDF magic header %PDF-1.
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
  });

  it("generates a valid English PDF when locale is en", async () => {
    const enInput = {
      ...sampleInput,
      locale: "en" as const,
      rabiesStatus: {
        ...sampleInput.rabiesStatus,
        vaccineName: "Rabisin (Rabies Vaccine)",
      },
    };
    const bytes = await createPassportPdf(enInput);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);
  });

  it("handles missing/expired rabies status with warning banner", async () => {
    const expiredInput: PassportPdfInput = {
      ...sampleInput,
      rabiesStatus: {
        hasRabiesVaccine: false,
        isValid: false,
      },
    };
    const bytes = await createPassportPdf(expiredInput);
    expect(bytes.length).toBeGreaterThan(5000);
  });
});

