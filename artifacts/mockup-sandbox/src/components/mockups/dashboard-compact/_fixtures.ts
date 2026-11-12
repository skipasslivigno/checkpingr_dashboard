import type { FirstEntriesForecast, FirstEntriesForecastPoint } from "./_api-types";
import { romeDate } from "./_forecast-view";
export type { FirstEntriesForecast, FirstEntriesForecastPoint } from "./_api-types";

interface Params { date: string; season: string; extraction?: string; mode?: string }

// Static preview fixtures at the original API boundary. No authentication or live API bypass.
export function useGetFirstEntriesForecast(params: Params, _options: unknown) {
  const availability = params.mode === "verification" ? "verification"
    : params.date === romeDate() ? "live" : "past_day";
  const data: FirstEntriesForecast = {
    date: params.date, season: params.season, metric: "nuin", modelVersion: "historical-ratio-v1",
    timeZone: "Europe/Rome", availability,
    history: { daysExamined: 825, completeDays: 502, fromDate: "2021-03-01", toDate: "2026-02-09" },
    forecasts: ["10:30", "11:30", "14:00"].map((slot, index): FirstEntriesForecastPoint => {
      const before = params.extraction ? slot.replace(":", "") > params.extraction.slice(8, 12) : false;
      return {
        slot: slot as FirstEntriesForecastPoint["slot"], status: before ? "before_extraction" : "ready",
        extraction: before ? null : `${params.date.replaceAll("-", "")}${slot.replace(":", "")}00`,
        observedEntries: before ? null : [1436, 1911, 2262][index],
        predictedTotal: before ? null : [2005, 2150, 2327][index],
        lowerBound: before ? null : [1898, 2103, 2311][index],
        upperBound: before ? null : [2454, 2387, 2401][index],
        sampleDays: 26, comparisonScope: "similar_days", confidence: before ? "unavailable" : "medium",
        validation: { sampleDays: 60, medianAbsolutePercentageError: 0.029, meanAbsoluteError: 270, intervalCoverage: 0.83 },
      };
    }),
  };
  return { data, isLoading: false, isError: false, isFetching: false, refetch: async () => ({ data }) };
}

export function getGetFirstEntriesForecastQueryKey(params: Params) {
  return ["/api/lifts/first-entries-forecast", params];
}
