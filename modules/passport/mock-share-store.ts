import {
  generateShareToken,
  hashShareToken,
  hashPin,
  calculateExpiryDate,
  type ShareType,
  type SharePreset,
  type ShareScope,
} from "./share-service";

export interface StoredGrant {
  id: string;
  petId: string;
  ownerId: string;
  shareType: ShareType;
  preset: SharePreset;
  scopes: ShareScope[];
  pinHash?: string | null;
  includeOwnerContact: boolean;
  label?: string;
  tokenHash: string;
  token: string; // stored only in mock memory for easy lookup
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  accessLogs: Array<{
    id: string;
    accessedAt: string;
    ipHash: string;
    userAgent: string;
    deviceType: string;
    action: string;
    coarseLocation: string;
  }>;
}

// Global in-memory map for dev/mock persistence across hot-reloads
const globalMockGrants = new Map<string, StoredGrant>();

export function saveMockGrant(grant: StoredGrant) {
  globalMockGrants.set(grant.tokenHash, grant);
  globalMockGrants.set(grant.token, grant);
  globalMockGrants.set(grant.id, grant);
}

export function findMockGrantByTokenOrHash(tokenOrHash: string): StoredGrant | null {
  const found = globalMockGrants.get(tokenOrHash) || globalMockGrants.get(hashShareToken(tokenOrHash));
  if (!found) return null;
  if (found.revokedAt) return null;
  if (new Date(found.expiresAt).getTime() < Date.now()) return null;
  return found;
}

export function revokeMockGrant(grantId: string): boolean {
  for (const grant of globalMockGrants.values()) {
    if (grant.id === grantId) {
      grant.revokedAt = new Date().toISOString();
      return true;
    }
  }
  return false;
}

export function logMockShareAccess(
  grantId: string,
  entry: {
    ipHash: string;
    userAgent: string;
    deviceType: string;
    action: string;
    coarseLocation: string;
  }
) {
  for (const grant of globalMockGrants.values()) {
    if (grant.id === grantId) {
      grant.accessLogs.unshift({
        id: crypto.randomUUID(),
        accessedAt: new Date().toISOString(),
        ...entry,
      });
      break;
    }
  }
}

