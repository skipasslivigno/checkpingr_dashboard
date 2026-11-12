const FALLBACK_COLORS = [
  "#0070BA", "#E6007E", "#008577", "#D97706", "#7C3AED",
  "#DC2626", "#0891B2", "#4D7C0F", "#BE185D", "#475569",
  "#4338CA", "#A16207", "#0F766E", "#C2410C", "#A21CAF",
  "#0369A1", "#15803D", "#B91C1C", "#6D28D9", "#92400E",
];

/** Key colors by season identity, never by the selected subset or API response order. */
export function buildSeasonColorMap(seasons: readonly string[], customColors: readonly string[]) {
  const result: Record<string, string> = {};
  const used = new Set(customColors.map((color) => color.toUpperCase()));
  let fallbackIndex = 0;
  for (const [index, season] of seasons.entries()) {
    let color = customColors[index];
    if (!color) {
      while (used.has(FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]!)) fallbackIndex++;
      color = FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length]!;
      used.add(color.toUpperCase());
    }
    result[season] = color;
  }
  return result;
}

export function resolveChartSeasons(visible: readonly string[], selected: readonly string[]) {
  const valid = visible.filter((season) => selected.includes(season));
  return valid.length > 0 ? valid : visible.slice(0, 2);
}

export function toggleChartSeason(visible: readonly string[], selected: readonly string[], season: string) {
  const current = resolveChartSeasons(visible, selected);
  if (!visible.includes(season)) return current;
  // Always leave at least one season selected, rather than unexpectedly restoring defaults.
  if (current.includes(season)) return current.length > 1 ? current.filter((s) => s !== season) : current;
  return visible.filter((s) => s === season || current.includes(s));
}
