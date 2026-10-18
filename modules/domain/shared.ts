export type Locale = "vi" | "en";

export function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function includesAny(values: readonly string[], candidates: readonly string[]) {
  const set = new Set(values.map((value) => value.trim().toLocaleLowerCase()));
  return candidates.some((candidate) => set.has(candidate.trim().toLocaleLowerCase()));
}
