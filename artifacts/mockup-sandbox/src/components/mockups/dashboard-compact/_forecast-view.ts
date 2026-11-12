import type { FirstEntriesForecastPoint } from "./_fixtures";

export const FORECAST_VIEW_SLOTS = ["10:30", "11:30", "14:00"] as const;

export function romeDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function forecastDateAllowed(date: string, verification: boolean, now = new Date()): boolean {
  const today = romeDate(now);
  return date === today || (verification && date < today);
}

export function extractionBelongsToDate(extraction: string | undefined, date: string): boolean {
  if (!extraction) return true;
  return /^\d{14}$/.test(extraction) && extraction.slice(0, 8) === date.replaceAll("-", "");
}

export function defaultForecastSlot(points: ReadonlyMap<string, Pick<FirstEntriesForecastPoint, "status">>): string {
  const ready = FORECAST_VIEW_SLOTS.filter((slot) => points.get(slot)?.status === "ready");
  if (ready.length) return ready[ready.length - 1];
  const reached = FORECAST_VIEW_SLOTS.filter((slot) => {
    const status = points.get(slot)?.status;
    return status && status !== "before_extraction";
  });
  return reached.at(-1) ?? FORECAST_VIEW_SLOTS[0];
}
