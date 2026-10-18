export type GeoPoint = { lat: number; lng: number };

/** Snaps public map points to roughly 50m cells in Ho Chi Minh City. Exact points remain private. */
export function fuzzLocation(point: GeoPoint, cellDegrees = 0.0005): GeoPoint {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    throw new Error("invalid_location");
  }
  if (!Number.isFinite(cellDegrees) || cellDegrees <= 0 || cellDegrees > 0.01) throw new Error("invalid_fuzz_cell");
  return {
    lat: Number((Math.round(point.lat / cellDegrees) * cellDegrees).toFixed(6)),
    lng: Number((Math.round(point.lng / cellDegrees) * cellDegrees).toFixed(6)),
  };
}

type Report = { id: string; kind: "lost" | "found"; species: string; colors: string[]; lat: number; lng: number; status: "open" | "resolved" };
type Match = { report: Report; distanceKm: number; score: number };
const earthKm = 6371;
function distanceKm(a: GeoPoint, b: GeoPoint) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

/** Suggestions only: never changes a report's status or declares a match as confirmed. */
export function matchLostFoundReports(source: Report, candidates: Report[], maxDistanceKm = 10): Match[] {
  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) throw new Error("invalid_radius");
  const colors = new Set(source.colors.map((color) => color.trim().toLowerCase()).filter(Boolean));
  return candidates.flatMap((candidate) => {
    if (candidate.id === source.id || candidate.status !== "open" || candidate.kind === source.kind) return [];
    if (candidate.species.toLowerCase() !== source.species.toLowerCase()) return [];
    const distance = distanceKm(source, candidate);
    if (distance > maxDistanceKm) return [];
    const overlap = candidate.colors.some((color) => colors.has(color.trim().toLowerCase()));
    const score = Math.round(40 + (overlap ? 35 : 0) + 25 * (1 - distance / maxDistanceKm));
    return [{ report: candidate, distanceKm: Math.round(distance * 100) / 100, score }];
  }).sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.report.id.localeCompare(b.report.id));
}

export type DonationReceiptInput = {
  amountVnd: number;
  recipientType: "clinic" | "rescue_partner";
  paidDirectly: boolean;
  receiptVerified: boolean;
  receiptHash: string | null;
};

/** MVP ledger only recognizes money already paid directly to a verified partner. */
export function verifyDonationReceipt(entry: DonationReceiptInput, receiptHash: string, verifierIsAuthorized: boolean) {
  if (!Number.isSafeInteger(entry.amountVnd) || entry.amountVnd <= 0) return { ok: false as const, reason: "invalid_amount" as const };
  if (!entry.paidDirectly) return { ok: false as const, reason: "platform_must_not_hold_funds" as const };
  if (!verifierIsAuthorized) return { ok: false as const, reason: "verifier_not_authorized" as const };
  const normalized = receiptHash.trim().toLowerCase();
  if (!/^[a-f0-9]{32,128}$/.test(normalized)) return { ok: false as const, reason: "invalid_receipt_hash" as const };
  return { ok: true as const, status: "verified" as const, receiptHash: normalized, publicAmountVnd: entry.amountVnd, recipientType: entry.recipientType };
}

export type ModerationState = "pending" | "approved" | "rejected" | "hidden";
export function moderateContent(input: { status: ModerationState; role: string; appealSubmitted?: boolean }, action: "approve" | "reject" | "hide" | "appeal") {
  if (action === "appeal") {
    if (input.role !== "owner" || !["rejected","hidden"].includes(input.status) || !input.appealSubmitted) return { ok: false as const, status: input.status };
    return { ok: true as const, status: "pending" as const };
  }
  if (input.role !== "platform_admin" || input.status !== "pending") return { ok: false as const, status: input.status };
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";
  return { ok: true as const, status };
}
