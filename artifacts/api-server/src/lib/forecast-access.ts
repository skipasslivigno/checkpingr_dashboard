import type { FirstEntriesForecast } from "@workspace/api-zod";
import { romeTimestamp, type ForecastExtraction } from "./first-entries-forecast";

export function forecastAvailability(
  date: string,
  season: string,
  verification: boolean,
  rows: ForecastExtraction[] = [],
  now = new Date(),
): FirstEntriesForecast["availability"] {
  const clock = romeTimestamp(now);
  const today = `${clock.slice(0, 4)}-${clock.slice(4, 6)}-${clock.slice(6, 8)}`;
  if (date > today) return "future_day";
  if (verification) return "verification";
  if (date < today) return "past_day";
  // Closure is based on all data actually available now, NOT the selected extraction:
  // choosing this morning cannot restore a live forecast after the final has arrived.
  const closed = rows.some((r) => r.date === date && r.season === season
    && r.valid && /^\d{14}$/.test(r.extraction)
    && r.extraction.slice(0, 8) === clock.slice(0, 8)
    && r.extraction.slice(8) >= "180000" && r.extraction.slice(8) <= "235959"
    && r.extraction <= clock);
  return closed ? "day_closed" : "live";
}

export function unavailableForecast(
  date: string,
  season: string,
  availability: FirstEntriesForecast["availability"],
): FirstEntriesForecast {
  return {
    date, season, availability, metric: "nuin",
    modelVersion: "historical-ratio-v1", timeZone: "Europe/Rome",
    history: { daysExamined: 0, completeDays: 0, fromDate: null, toDate: null },
    forecasts: [],
  };
}
