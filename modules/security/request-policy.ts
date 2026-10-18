const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const NON_COOKIE_MUTATION_PATHS = new Set([
  "/api/billing/webhook",
  "/api/notifications/unsubscribe",
]);

export function isAllowedMutationOrigin(input: {
  method: string; pathname: string; origin: string | null; requestOrigin: string; fetchSite: string | null;
}) {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return true;
  if (NON_COOKIE_MUTATION_PATHS.has(input.pathname) || input.pathname.startsWith("/api/internal/")) return true;
  if (!input.origin || input.fetchSite === "cross-site") return false;
  try { return new URL(input.origin).origin === new URL(input.requestOrigin).origin; } catch { return false; }
}
