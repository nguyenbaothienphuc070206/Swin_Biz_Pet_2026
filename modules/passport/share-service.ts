import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export type ShareType = "full_record" | "rabies_verification";
export type SharePreset = "24h" | "7d" | "30d" | "permanent";

export const ALL_SHARE_SCOPES = [
  "profile",
  "vaccinations",
  "medications",
  "visits",
  "allergies",
  "conditions",
  "weight",
] as const;

export type ShareScope = (typeof ALL_SHARE_SCOPES)[number];

export const createShareGrantSchema = z.object({
  petId: z.string().uuid(),
  shareType: z.enum(["full_record", "rabies_verification"]),
  preset: z.enum(["24h", "7d", "30d", "permanent"]).default("7d"),
  scopes: z.array(z.enum(ALL_SHARE_SCOPES)).default([...ALL_SHARE_SCOPES]),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  includeOwnerContact: z.boolean().default(false),
  label: z.string().max(100).optional(),
});

export type CreateShareGrantInput = z.infer<typeof createShareGrantSchema>;

/**
 * Generates an unguessable token (24 bytes = 192 bits >= 128-bit requirement)
 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Computes SHA-256 hash of a share token for safe persistence
 */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Hashes an optional 4-6 digit PIN with SHA-256
 */
export function hashPin(pin: string): string {
  return createHash("sha256").update(`pawcare-pin:${pin.trim()}`).digest("hex");
}

/**
 * Verifies a provided PIN against its stored hash
 */
export function verifyPin(pin: string, storedHash?: string | null): boolean {
  if (!storedHash) return true;
  return hashPin(pin) === storedHash;
}

/**
 * Computes expiry date based on selected preset
 */
export function calculateExpiryDate(preset: SharePreset, fromDate = new Date()): Date {
  const d = new Date(fromDate);
  switch (preset) {
    case "24h":
      d.setHours(d.getHours() + 24);
      break;
    case "7d":
      d.setDate(d.getDate() + 7);
      break;
    case "30d":
      d.setDate(d.getDate() + 30);
      break;
    case "permanent":
      // 5 years for collar rabies QR code
      d.setFullYear(d.getFullYear() + 5);
      break;
  }
  return d;
}

/**
 * Computes an anonymized, coarse IP hash for owner privacy (Decree 13/2023/ND-CP)
 */
export function hashClientIp(ip: string, salt = "pawcare-audit"): string {
  if (!ip) return "unknown";
  return createHash("sha256").update(`${salt}:${ip.trim()}`).digest("hex").slice(0, 16);
}

/**
 * Detects device type from User-Agent string
 */
export function detectDeviceType(userAgent?: string | null): "mobile" | "tablet" | "desktop" | "bot" {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();
  if (/bot|crawler|spider|crawling/i.test(ua)) return "bot";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|android|touch/i.test(ua)) return "mobile";
  return "desktop";
}

export interface RabiesStatusResult {
  hasRabiesVaccine: boolean;
  isValid: boolean;
  administeredAt?: string;
  expiresAt?: string;
  vaccineName?: string;
  lot?: string;
  issuingClinic?: string;
  daysRemaining?: number;
}

/**
 * Analyzes vaccination records to determine Rabies compliance status
 * (Mandatory from 1 Aug 2026 under Vietnamese Veterinary Regulations Circular 07/2016/TT-BNNPTNT)
 */
export function evaluateRabiesStatus(
  vaccinations: Array<{
    name: string;
    date: string;
    nextDue?: string;
    lot?: string;
    clinic?: string;
  }>,
  referenceDate = new Date()
): RabiesStatusResult {
  const rabiesTerms = ["dại", "rabies", "rabisin", "defensor", "nobivac r"];
  const rabiesRecords = vaccinations
    .filter((v) => {
      const lower = (v.name || "").toLowerCase();
      return rabiesTerms.some((term) => lower.includes(term));
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (rabiesRecords.length === 0) {
    return { hasRabiesVaccine: false, isValid: false };
  }

  const latest = rabiesRecords[0];
  const adminDate = new Date(latest.date);
  
  // Rabies vaccine typically valid for 1 year in Vietnam unless specified
  let expiryDate: Date;
  if (latest.nextDue) {
    expiryDate = new Date(latest.nextDue);
  } else {
    expiryDate = new Date(adminDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  const isValid = expiryDate.getTime() > referenceDate.getTime();
  const diffTime = expiryDate.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    hasRabiesVaccine: true,
    isValid,
    administeredAt: latest.date,
    expiresAt: expiryDate.toISOString().slice(0, 10),
    vaccineName: latest.name,
    lot: latest.lot,
    issuingClinic: latest.clinic,
    daysRemaining,
  };
}

export interface SharedPetDataProjection {
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    gender?: string;
    birthDate?: string;
    weightKg?: number;
    microchip?: string;
    photoUrl?: string;
  };
  rabiesStatus: RabiesStatusResult;
  vaccinations?: Array<any>;
  medications?: Array<any>;
  visits?: Array<any>;
  allergies?: Array<any>;
  conditions?: Array<any>;
  weightHistory?: Array<any>;
  ownerContact?: {
    name?: string;
    phone?: string;
    district?: string;
  };
  provenance: {
    verifiedByClinic: boolean;
    grantId: string;
    shareType: ShareType;
    expiresAt: string;
    issuingClinicName?: string;
  };
}

/**
 * Projects pet health record according to shareType and selected scopes,
 * enforcing Decree 13/2023/ND-CP data minimization.
 */
export function projectSharedRecord(
  rawPet: any,
  grant: {
    id: string;
    shareType: ShareType;
    scopes: string[];
    expiresAt: Date | string;
    includeOwnerContact: boolean;
  },
  issuingClinicName?: string
): SharedPetDataProjection {
  const rabiesStatus = evaluateRabiesStatus(rawPet.vaccinations || []);
  const expiresAtStr =
    grant.expiresAt instanceof Date
      ? grant.expiresAt.toISOString()
      : String(grant.expiresAt);

  // If this is a minimal Rabies Verification (collar QR), strip everything else!
  if (grant.shareType === "rabies_verification") {
    return {
      pet: {
        id: rawPet.id,
        name: rawPet.name,
        species: rawPet.species,
        breed: rawPet.breed,
        gender: rawPet.gender,
        birthDate: rawPet.birthDate,
        microchip: rawPet.microchip,
        photoUrl: rawPet.photoUrl,
      },
      rabiesStatus,
      provenance: {
        verifiedByClinic: Boolean(rabiesStatus.issuingClinic || issuingClinicName),
        grantId: grant.id,
        shareType: "rabies_verification",
        expiresAt: expiresAtStr,
        issuingClinicName: rabiesStatus.issuingClinic || issuingClinicName,
      },
    };
  }

  // Full Record projection filtered by scopes
  const scopes = new Set(grant.scopes || ALL_SHARE_SCOPES);

  const projection: SharedPetDataProjection = {
    pet: {
      id: rawPet.id,
      name: rawPet.name,
      species: rawPet.species,
      breed: rawPet.breed,
      gender: rawPet.gender,
      birthDate: rawPet.birthDate,
      weightKg: rawPet.weightKg,
      microchip: rawPet.microchip,
      photoUrl: rawPet.photoUrl,
    },
    rabiesStatus,
    provenance: {
      verifiedByClinic: Boolean(issuingClinicName),
      grantId: grant.id,
      shareType: "full_record",
      expiresAt: expiresAtStr,
      issuingClinicName,
    },
  };

  if (scopes.has("vaccinations")) {
    projection.vaccinations = rawPet.vaccinations || [];
  }
  if (scopes.has("medications")) {
    projection.medications = rawPet.medications || [];
  }
  if (scopes.has("visits")) {
    projection.visits = rawPet.visits || [];
  }
  if (scopes.has("allergies")) {
    projection.allergies = rawPet.allergies || [];
  }
  if (scopes.has("conditions")) {
    projection.conditions = rawPet.conditions || [];
  }
  if (scopes.has("weight")) {
    projection.weightHistory = rawPet.weightHistory || [];
  }

  if (grant.includeOwnerContact && rawPet.ownerContact) {
    projection.ownerContact = rawPet.ownerContact;
  }

  return projection;
}

