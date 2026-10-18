export type AssuranceLevel = "aal1" | "aal2" | null;
export function canPerformSensitiveAdminAction(role: string, currentLevel: AssuranceLevel): boolean {
  return role === "platform_admin" && currentLevel === "aal2";
}

export function sanitizeAuditMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const forbidden = /password|token|secret|document|phone|email|address|body|payload/i;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !forbidden.test(key)));
}
