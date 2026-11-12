/** Keep a valid selection on refresh; start at the latest day when switching seasons. */
export function resolveSeasonDate(
  dates: readonly string[],
  selectedDate: string,
  seasonChanged: boolean,
): string | undefined {
  if (dates.length === 0) return undefined;
  return seasonChanged || !dates.includes(selectedDate) ? dates[0] : selectedDate;
}

/** Dates must belong to one season and be ordered newest first by the API. */
export function getDateNavigation(dates: readonly string[], selectedDate: string) {
  const index = dates.indexOf(selectedDate);
  // While a season is loading/changing, never navigate from an invalid date.
  return {
    newerDate: index > 0 ? dates[index - 1] : undefined,
    olderDate: index >= 0 && index < dates.length - 1 ? dates[index + 1] : undefined,
  };
}
