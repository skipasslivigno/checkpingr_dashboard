/** Matches the maximum season count supported by tenant settings. Never silently truncate. */
export function parseComparisonSeasons(value: unknown): string[] | null {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("seasons must be a comma-separated string");
  const seasons = [...new Set(value.split(",").map((s) => s.trim()).filter(Boolean))];
  if (seasons.length > 20) throw new Error("A maximum of 20 seasons can be compared");
  return seasons.length > 0 ? seasons : null;
}
