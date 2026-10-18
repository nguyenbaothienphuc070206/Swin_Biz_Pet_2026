export type CatalogBarcode = { code: string; name: string; kind: "vaccine" | "medication"; activeIngredient?: string; isDemo?: boolean };

export function lookupBarcode(code: string, catalog: CatalogBarcode[]) {
  const normalized = code.replace(/\s+/g, "").toUpperCase();
  if (!normalized || normalized.length > 80) return null;
  return catalog.find((item) => item.code.replace(/\s+/g, "").toUpperCase() === normalized) ?? null;
}
