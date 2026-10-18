export type MapProvider = "google" | "maplibre";
export function chooseMapProvider(config: { googleKey?: string; demoMode: boolean }): MapProvider | null {
  if (config.googleKey) return "google";
  if (config.demoMode) return "maplibre";
  return null;
}
