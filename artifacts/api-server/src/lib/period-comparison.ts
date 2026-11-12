import type { PeriodComparison, PeriodComparisonValue } from "@workspace/api-zod";
import { isFinalExtraction } from "./closing-extraction";

const DAY = 86_400_000;
export interface EntryBatch {
  date: string;
  season: string;
  extraction: string;
  entries: number;
  valid: boolean;
}
export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}
function dayDistance(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}
export function saturday(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDate(date, -((dow + 1) % 7));
}
function emptyPeriod(): PeriodComparisonValue {
  return {
    currentTotal: null, previousTotal: null, changePercent: null,
    currentFromDate: null, currentToDate: null, previousFromDate: null, previousToDate: null,
    missingCurrentDays: [], missingPreviousDays: [],
    currentDefinitive: false, previousDefinitive: false,
  };
}
function dailyFinals(rows: EntryBatch[], season: string) {
  const result = new Map<string, EntryBatch>();
  for (const row of rows) {
    if (row.season !== season || !isFinalExtraction(row.extraction)) continue;
    const old = result.get(row.date);
    if (!old || old.extraction < row.extraction) result.set(row.date, row);
  }
  return result;
}
function total(
  from: string, to: string, rows: ReadonlyMap<string, EntryBatch>,
): { total: number | null; missing: string[] } {
  const days = dayDistance(from, to);
  if (days > 800) throw new RangeError("Season opening date is too far from the requested period");
  let sum = 0;
  const missing: string[] = [];
  for (let i = 0; i <= days; i++) {
    const date = shiftDate(from, i);
    const row = rows.get(date);
    if (!row || !row.valid || !Number.isFinite(row.entries) || row.entries < 0) missing.push(date);
    else sum += row.entries;
  }
  return { total: missing.length ? null : sum, missing };
}

/** No guessed opening dates, latest-per-lift mixing, partial historical days, or fake zero denominators. */
export function comparePeriods(input: {
  date: string; season: string; previousSeason: string | null;
  starts: Record<string, string>; ends?: Record<string, string>; rows: EntryBatch[]; extraction?: string;
}): PeriodComparison {
  const { date, season, previousSeason, starts, extraction } = input;
  const start = starts[season] ?? null;
  const previousStart = previousSeason ? starts[previousSeason] ?? null : null;
  const end = input.ends?.[season];
  const rows = input.rows.filter(r => validCalendarDate(r.date)
    && /^\d{14}$/.test(r.extraction) && r.extraction.slice(0, 8) === r.date.replaceAll("-", ""));
  // For the previous season, an explicit closure takes precedence; otherwise
  // its last observed date is the boundary. Include partial-only last days in
  // this boundary so a missing closing batch is not silently discarded.
  const previousEnd = previousSeason
    ? input.ends?.[previousSeason] ?? rows.filter(r => r.season === previousSeason)
      .map(r => r.date).sort().at(-1)
    : undefined;
  const day = rows.filter(r => r.season === season && r.date === date)
    .sort((a, b) => a.extraction.localeCompare(b.extraction));
  const closing = day.filter(r => isFinalExtraction(r.extraction)).at(-1);
  const selected = extraction ? day.find(r => r.extraction === extraction) : day.at(-1);
  // A final already present overrides a morning selection, as requested.
  const source = closing ?? selected;
  const eligibleDay = !!closing || !!selected && selected.extraction.slice(8, 12) >= "1400";
  const requestedThrough = eligibleDay ? date : shiftDate(date, -1);
  const currentDaily = dailyFinals(rows, season);
  const currentEndContradicted = !!end && rows.some(r => r.season === season && r.date > end && r.date <= date);
  let through = requestedThrough;
  if (end && requestedThrough > end) {
    // A configured closure may bound absent trailing days, never discard observed
    // finals or the selected day's eligible batch in the season being viewed.
    through = end;
    for (const observedDate of currentDaily.keys()) {
      if (observedDate > through && observedDate <= requestedThrough) through = observedDate;
    }
    if (eligibleDay) through = date;
  }
  const includeDay = eligibleDay && through === date;
  const missingConfiguration = [!start ? season : null, previousSeason && !previousStart ? previousSeason : null]
    .filter((s): s is string => !!s);
  const result: PeriodComparison = {
    date, season, previousSeason, status: missingConfiguration.length ? "configuration_required" : "ready",
    includedSelectedDay: includeDay, sourceExtraction: source?.extraction ?? null,
    currentSeasonStartDate: start, previousSeasonStartDate: previousStart, missingConfiguration,
    weekly: emptyPeriod(), progressive: emptyPeriod(),
  };
  if (!start) return result;
  if (through < start) {
    result.status = "before_season";
    result.weekly.currentTotal = result.progressive.currentTotal = 0;
    return result;
  }
  // Only the included selected day may use a non-final batch. All earlier days require 23:30.
  if (includeDay && source) currentDaily.set(date, source);
  if (end && date > end && date > through) result.sourceExtraction = currentDaily.get(through)?.extraction ?? null;
  if (!result.sourceExtraction && !missingConfiguration.length) result.status = "no_data";
  const previousDaily = previousSeason ? dailyFinals(rows, previousSeason) : new Map<string, EntryBatch>();
  const mappedPreviousThrough = previousStart
    ? shiftDate(saturday(previousStart), dayDistance(saturday(start), through)) : null;
  const previousThrough = previousEnd && mappedPreviousThrough && mappedPreviousThrough > previousEnd
    ? previousEnd : mappedPreviousThrough;
  const currentWeekStart = [saturday(through), start].sort().at(-1)!;
  const previousWeekStart = previousStart && previousThrough
    ? [saturday(previousThrough), previousStart].sort().at(-1)! : null;

  function period(from: string, previousFrom: string | null): PeriodComparisonValue {
    const current = total(from, through, currentDaily);
    const previous = previousFrom && previousThrough
      ? total(previousFrom, previousThrough, previousDaily) : { total: null, missing: [] };
    return {
      currentTotal: current.total, previousTotal: previous.total,
      changePercent: current.total != null && previous.total != null && previous.total !== 0
        ? (current.total - previous.total) / previous.total * 100 : null,
      currentDefinitive: !!end && !currentEndContradicted && through === end && current.total != null
        && isFinalExtraction(currentDaily.get(end)?.extraction ?? ""),
      previousDefinitive: !!previousEnd && previousThrough === previousEnd
        && previous.total != null,
      currentFromDate: from, currentToDate: through,
      previousFromDate: previousFrom, previousToDate: previousThrough,
      missingCurrentDays: current.missing, missingPreviousDays: previous.missing,
    };
  }
  result.weekly = period(currentWeekStart, previousWeekStart);
  result.progressive = period(start, previousStart);
  return result;
}
