import type { FirstEntriesForecastPoint } from "@workspace/api-client-react";

export const FORECAST_VIEW_SLOTS = ["10:30", "11:30", "14:00"] as const;

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
