export const roles = ["owner", "clinic_staff", "clinic_admin", "platform_admin"] as const;
export type AppRole = (typeof roles)[number];
type Claims = {app_metadata?: Record<string, unknown>; role?: unknown} | undefined | null;

export function roleFromClaims(claims: Claims): AppRole | null {
  const candidate = claims?.app_metadata?.role ?? claims?.role;
  return typeof candidate === "string" && roles.includes(candidate as AppRole) ? candidate as AppRole : null;
}

export function parseRole(candidate: unknown): AppRole | null {
  return typeof candidate === "string" && roles.includes(candidate as AppRole) ? candidate as AppRole : null;
}

export function canAccessRole(role: AppRole, allowed: readonly AppRole[]) { return allowed.includes(role); }
export function homeForRole(role: AppRole) {
  if (role === "clinic_staff" || role === "clinic_admin") return "/clinic";
  if (role === "platform_admin") return "/admin";
  return "/owner";
}

export interface DevSessionPayload {
  sub: string;
  email?: string;
  role: AppRole;
  name?: string;
  owner_id?: string;
  clinic_id?: string;
}

export function parseDevSessionCookie(raw?: string | null): DevSessionPayload | null {
  if (!raw || typeof raw !== "string") return null;
  let cur = raw.trim();
  if ((cur.startsWith('"') && cur.endsWith('"')) || (cur.startsWith("'") && cur.endsWith("'"))) {
    cur = cur.slice(1, -1);
  }
  if (cur.includes("%")) {
    try {
      cur = decodeURIComponent(cur);
    } catch {}
  }
  if ((cur.startsWith('"') && cur.endsWith('"')) || (cur.startsWith("'") && cur.endsWith("'"))) {
    cur = cur.slice(1, -1);
  }
  try {
    const obj = JSON.parse(cur);
    if (obj && typeof obj === "object" && typeof obj.sub === "string" && obj.sub.length > 0) {
      const role = parseRole(obj.role) ?? "owner";
      return {
        sub: String(obj.sub),
        email: typeof obj.email === "string" ? obj.email : undefined,
        role,
        name: typeof obj.name === "string" ? obj.name : undefined,
        owner_id: typeof obj.owner_id === "string" ? obj.owner_id : undefined,
        clinic_id: typeof obj.clinic_id === "string" ? obj.clinic_id : undefined,
      };
    }
  } catch {}
  return null;
}

