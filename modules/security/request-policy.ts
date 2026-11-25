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
  try {
    const orig = new URL(input.origin).origin;
    const reqOrig = new URL(input.requestOrigin).origin;
    if (orig === reqOrig) return true;
    const origHost = new URL(input.origin).hostname;
    const reqHost = new URL(input.requestOrigin).hostname;
    const isLocal = (h: string) => h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.") || h.endsWith(".local");
    if (isLocal(origHost) && isLocal(reqHost)) return true;
    return false;
  } catch {
    return false;
  }
}
