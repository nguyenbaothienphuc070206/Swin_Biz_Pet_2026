import { isIP } from "node:net";

export function isSafeAffiliateDestination(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || !host.includes(".")) return false;
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isIP(host)) return false;
    return true;
  } catch { return false; }
}
