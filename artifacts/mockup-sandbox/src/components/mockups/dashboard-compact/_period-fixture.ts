import type { PeriodComparison } from "./_api-types";

// Same scenario asserted by the real SQL/API tests. Preview data only.
const data: PeriodComparison = {
  date: "2025-12-08", season: "2025-2026", previousSeason: "2024-2025", status: "ready",
  includedSelectedDay: true, sourceExtraction: "20251208140000",
  currentSeasonStartDate: "2025-11-29", previousSeasonStartDate: "2024-11-30", missingConfiguration: [],
  weekly: {
    currentTotal: 260, previousTotal: 150, changePercent: 73.333333,
    currentFromDate: "2025-12-06", currentToDate: "2025-12-08",
    previousFromDate: "2024-12-07", previousToDate: "2024-12-09",
    missingCurrentDays: [], missingPreviousDays: [],
  },
  progressive: {
    currentTotal: 960, previousTotal: 500, changePercent: 92,
    currentFromDate: "2025-11-29", currentToDate: "2025-12-08",
    previousFromDate: "2024-11-30", previousToDate: "2024-12-09",
    missingCurrentDays: [], missingPreviousDays: [],
  },
};
export function getGetPeriodComparisonQueryKey(_params: unknown) { return ["/api/lifts/period-comparison"]; }
export function useGetPeriodComparison(_params: unknown, _options: unknown) {
  return { data, isLoading: false, isError: false, isFetching: false, refetch: async () => ({ data }) };
}
