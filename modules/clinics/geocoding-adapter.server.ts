import "server-only";

export type GeocodedAddress = { latitude: number; longitude: number; formattedAddress: string };
type GoogleGeocodeResult = { location?: { latitude?: number; longitude?: number }; formattedAddress?: string; addressComponents?: Array<{ shortText?: string; types?: string[] }> };

function isVietnamResult(result: GoogleGeocodeResult) {
  return result.addressComponents?.some((component) => component.types?.includes("country") && component.shortText === "VN") === true;
}

/** Server-only Google Geocoding adapter; the browser maps key is never reused here. */
export async function geocodeAddress(address: string, locale: "vi" | "en"): Promise<GeocodedAddress | null> {
  const key = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
  if (!key) throw new Error("geocoder_unavailable");
  const url = new URL(`https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}`);
  url.searchParams.set("regionCode", "VN");
  url.searchParams.set("languageCode", locale);
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "results.location,results.formattedAddress,results.granularity,results.addressComponents" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("geocoder_request_failed");
  const payload = await response.json() as { results?: GoogleGeocodeResult[] };
  const result = payload.results?.[0];
  const latitude = result?.location?.latitude;
  const longitude = result?.location?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number" || !result?.formattedAddress || !isVietnamResult(result)) return null;
  // SOS dispatch is only enabled in Vietnam; reject addresses geocoded elsewhere.
  if (latitude < 8 || latitude > 24 || longitude < 102 || longitude > 110) return null;
  return { latitude, longitude, formattedAddress: result.formattedAddress };
}

export async function reverseGeocodeCoordinates(latitude: number, longitude: number, locale: "vi" | "en"): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
  if (!key) throw new Error("geocoder_unavailable");
  const url = new URL(`https://geocode.googleapis.com/v4/geocode/location/${latitude},${longitude}`);
  url.searchParams.set("regionCode", "VN"); url.searchParams.set("languageCode", locale);
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "results.formattedAddress,results.addressComponents" },
    signal: AbortSignal.timeout(5000), cache: "no-store",
  });
  if (!response.ok) throw new Error("geocoder_request_failed");
  const payload = await response.json() as { results?: GoogleGeocodeResult[] };
  const result = payload.results?.find(isVietnamResult);
  return result?.formattedAddress ?? null;
}
