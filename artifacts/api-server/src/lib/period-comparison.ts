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
  starts: Record<string, string>; rows: EntryBatch[]; extraction?: string;
}): PeriodComparison {
  const { date, season, previousSeason, starts, extraction } = input;
  const start = starts[season] ?? null;
  const previousStart = previousSeason ? starts[previousSeason] ?? null : null;
  const rows = input.rows.filter(r => validCalendarDate(r.date)
    && /^\d{14}$/.test(r.extraction) && r.extraction.slice(0, 8) === r.date.replaceAll("-", ""));
  const day = rows.filter(r => r.season === season && r.date === date)
    .sort((a, b) => a.extraction.localeCompare(b.extraction));
  const closing = day.filter(r => isFinalExtraction(r.extraction)).at(-1);
  const selected = extraction ? day.find(r => r.extraction === extraction) : day.at(-1);
  // A final already present overrides a morning selection, as requested.
  const source = closing ?? selected;
  const includeDay = !!closing || !!selected && selected.extraction.slice(8, 12) >= "1400";
  const through = includeDay ? date : shiftDate(date, -1);
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
  if (!source && !missingConfiguration.length) result.status = "no_data";

  const currentDaily = dailyFinals(rows, season);
  // Only the included selected day may use a non-final batch. All earlier days require 23:30.
  if (includeDay && source) currentDaily.set(date, source);
  const previousDaily = previousSeason ? dailyFinals(rows, previousSeason) : new Map<string, EntryBatch>();
  const previousThrough = previousStart
    ? shiftDate(saturday(previousStart), dayDistance(saturday(start), through)) : null;
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
      currentFromDate: from, currentToDate: through,
      previousFromDate: previousFrom, previousToDate: previousThrough,
      missingCurrentDays: current.missing, missingPreviousDays: previous.missing,
    };
  }
  result.weekly = period(currentWeekStart, previousWeekStart);
  result.progressive = period(start, previousStart);
  return result;
}
