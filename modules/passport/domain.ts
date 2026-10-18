import { z } from "zod";

export const vaccineEntrySchema = z.object({
  petId: z.string().uuid(),
  vaccineName: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(80),
  dose: z.string().trim().min(1).max(80),
  lot: z.string().trim().min(1).max(100),
  administeredAt: z.iso.date(),
  nextDueAt: z.iso.date().optional(),
}).refine((value) => !value.nextDueAt || value.nextDueAt >= value.administeredAt, { path: ["nextDueAt"], message: "next_due_before_administered" });

export type VaccineEntryInput = z.infer<typeof vaccineEntrySchema>;

export function canClinicReadRecord(grant: { clinicId: string; scopes: string[]; expiresAt: Date; revokedAt?: Date | null }, clinicId: string, scope: string, now = new Date()) {
  return grant.clinicId === clinicId && !grant.revokedAt && grant.expiresAt.getTime() > now.getTime() && grant.scopes.includes(scope);
}

export function buildAmendment<T extends Record<string, unknown>>(current: T, patch: Partial<T>, expectedVersion: number, actualVersion: number) {
  if (expectedVersion !== actualVersion) return { ok: false as const, reason: "version_conflict" as const };
  const changed = Object.fromEntries(Object.entries(patch).filter(([key, value]) => current[key] !== value)) as Partial<T>;
  if (Object.keys(changed).length === 0) return { ok: false as const, reason: "no_changes" as const };
  return { ok: true as const, priorVersion: actualVersion, nextVersion: actualVersion + 1, patch: changed };
}
