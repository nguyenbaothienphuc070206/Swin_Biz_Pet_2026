import { describe, it, expect } from "vitest";
import {
  generateShareToken,
  hashShareToken,
  hashPin,
  verifyPin,
  calculateExpiryDate,
  detectDeviceType,
  evaluateRabiesStatus,
  projectSharedRecord,
  type ShareType,
} from "./share-service";

describe("share-service: Token & PIN security", () => {
  it("generates 24-byte unguessable base64url tokens (>=128 bits)", () => {
    const token1 = generateShareToken();
    const token2 = generateShareToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens reproducibly using SHA-256", () => {
    const token = "pawcare-test-token-1234567890";
    const hash1 = hashShareToken(token);
    const hash2 = hashShareToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it("hashes and verifies 4-6 digit PINs correctly", () => {
    const pin = "2026";
    const hash = hashPin(pin);
    expect(verifyPin("2026", hash)).toBe(true);
    expect(verifyPin("9999", hash)).toBe(false);
    expect(verifyPin("2026", null)).toBe(true); // No PIN required
  });

  it("calculates expiry dates correctly across presets", () => {
    const base = new Date("2026-10-26T12:00:00Z");
    const exp24h = calculateExpiryDate("24h", base);
    expect(exp24h.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);

    const exp7d = calculateExpiryDate("7d", base);
    expect(exp7d.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

    const exp30d = calculateExpiryDate("30d", base);
    expect(exp30d.getDate()).toBe(25); // Nov 25th
  });

  it("detects device types from user agents", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")).toBe("tablet");
    expect(detectDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(detectDeviceType("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe("bot");
  });
});

describe("share-service: Rabies Compliance Evaluation", () => {
  it("evaluates valid rabies vaccination correctly", () => {
    const vax = [
      {
        name: "Vắc-xin phòng dại Rabisin",
        date: "2026-06-01",
        nextDue: "2027-06-01",
        lot: "RAB-2026-01",
        clinic: "Phòng khám Thú y PawCare D3",
      },
    ];
    const status = evaluateRabiesStatus(vax, new Date("2026-10-26"));
    expect(status.hasRabiesVaccine).toBe(true);
    expect(status.isValid).toBe(true);
    expect(status.vaccineName).toContain("Rabisin");
    expect(status.daysRemaining).toBeGreaterThan(0);
  });

  it("evaluates expired rabies vaccination as invalid", () => {
    const vax = [
      {
        name: "Rabies vaccine",
        date: "2025-01-01",
        nextDue: "2026-01-01",
        lot: "LOT-OLD",
      },
    ];
    const status = evaluateRabiesStatus(vax, new Date("2026-10-26"));
    expect(status.hasRabiesVaccine).toBe(true);
    expect(status.isValid).toBe(false);
  });

  it("reports no vaccine when none recorded", () => {
    const vax = [
      {
        name: "Vanguard Plus 5/CV-L (7 bệnh)",
        date: "2026-05-01",
      },
    ];
    const status = evaluateRabiesStatus(vax, new Date("2026-10-26"));
    expect(status.hasRabiesVaccine).toBe(false);
    expect(status.isValid).toBe(false);
  });
});

describe("share-service: Data Minimization & Scoped Projections", () => {
  const samplePet = {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Mochi",
    species: "dog",
    breed: "Corgi Pembroke",
    gender: "male",
    birthDate: "2022-03-15",
    weightKg: 11.5,
    microchip: "982000412345678",
    vaccinations: [
      { name: "Rabisin (Phòng Dại)", date: "2026-04-10", nextDue: "2027-04-10", lot: "RB26" },
      { name: "Vanguard Plus 5", date: "2026-04-10", nextDue: "2027-04-10", lot: "VG5" },
    ],
    medications: [{ name: "Bravecto 10-20kg", dose: "1 viên", startedAt: "2026-08-01" }],
    allergies: [{ name: "Dị ứng thịt bò", severity: "moderate" }],
    conditions: [{ name: "Viêm da cơ địa nhẹ", status: "active" }],
    visits: [{ date: "2026-04-10", clinic: "PawCare D1", summary: "Tiêm phòng định kỳ" }],
    ownerContact: { name: "Nguyễn Văn A", phone: "0901234567", district: "Quận 1" },
  };

  it("enforces rabies_verification minimal projection without owner PII", () => {
    const projection = projectSharedRecord(samplePet, {
      id: "grant-1",
      shareType: "rabies_verification",
      scopes: ["profile", "vaccinations"],
      expiresAt: new Date("2027-01-01"),
      includeOwnerContact: true, // Should still be ignored in rabies mode!
    });

    expect(projection.pet.name).toBe("Mochi");
    expect(projection.rabiesStatus.isValid).toBe(true);
    // Crucial: No medications, visits, allergies, conditions, or owner contact
    expect(projection.medications).toBeUndefined();
    expect(projection.allergies).toBeUndefined();
    expect(projection.ownerContact).toBeUndefined();
  });

  it("filters full_record by selected scopes and minimizes owner contact", () => {
    const projection = projectSharedRecord(samplePet, {
      id: "grant-2",
      shareType: "full_record",
      scopes: ["profile", "vaccinations", "allergies"], // medications and visits excluded
      expiresAt: new Date("2026-11-01"),
      includeOwnerContact: false, // owner contact off by default
    });

    expect(projection.vaccinations).toBeDefined();
    expect(projection.allergies).toBeDefined();
    expect(projection.medications).toBeUndefined();
    expect(projection.visits).toBeUndefined();
    expect(projection.ownerContact).toBeUndefined();
  });

  it("includes owner contact only when explicitly authorized", () => {
    const projection = projectSharedRecord(samplePet, {
      id: "grant-3",
      shareType: "full_record",
      scopes: ["profile", "vaccinations"],
      expiresAt: new Date("2026-11-01"),
      includeOwnerContact: true,
    });

    expect(projection.ownerContact).toBeDefined();
    expect(projection.ownerContact?.phone).toBe("0901234567");
  });
});

