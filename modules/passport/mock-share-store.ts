import {
  hashShareToken,
  type ShareType,
  type SharePreset,
  type ShareScope,
} from "./share-service";
import { getPortalDatabase, persistPortalDatabase } from "@/lib/portal-store/server-store";

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

const globalMockGrants = new Map<string, StoredGrant>();

export function saveMockGrant(grant: StoredGrant) {
  globalMockGrants.set(grant.tokenHash, grant);
  globalMockGrants.set(grant.token, grant);
  globalMockGrants.set(grant.id, grant);
  try {
    const db = getPortalDatabase();
    db.shareGrants[grant.id] = grant;
    persistPortalDatabase(db);
  } catch {}
}

export function findMockGrantByTokenOrHash(tokenOrHash: string): StoredGrant | null {
  let found =
    globalMockGrants.get(tokenOrHash) ||
    globalMockGrants.get(hashShareToken(tokenOrHash));

  if (!found) {
    try {
      const db = getPortalDatabase();
      const hashed = hashShareToken(tokenOrHash);
      for (const g of Object.values(db.shareGrants || {})) {
        if (g.id === tokenOrHash || g.token === tokenOrHash || g.tokenHash === tokenOrHash || g.tokenHash === hashed) {
          found = g;
          break;
        }
      }
    } catch {}
  }

  if (!found) return null;
  if (found.revokedAt) return null;
  if (new Date(found.expiresAt).getTime() < Date.now()) return null;
  return found;
}

export function revokeMockGrant(grantId: string): boolean {
  let revoked = false;
  for (const grant of globalMockGrants.values()) {
    if (grant.id === grantId) {
      grant.revokedAt = new Date().toISOString();
      revoked = true;
    }
  }
  try {
    const db = getPortalDatabase();
    if (db.shareGrants[grantId]) {
      db.shareGrants[grantId].revokedAt = new Date().toISOString();
      persistPortalDatabase(db);
      revoked = true;
    }
  } catch {}
  return revoked;
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
  const logEntry = {
    id: crypto.randomUUID(),
    accessedAt: new Date().toISOString(),
    ...entry,
  };
  for (const grant of globalMockGrants.values()) {
    if (grant.id === grantId) {
      grant.accessLogs.unshift(logEntry);
      break;
    }
  }
  try {
    const db = getPortalDatabase();
    if (db.shareGrants[grantId]) {
      db.shareGrants[grantId].accessLogs.unshift(logEntry);
      persistPortalDatabase(db);
    }
  } catch {}
}
