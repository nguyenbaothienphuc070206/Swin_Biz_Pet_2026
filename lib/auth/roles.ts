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
