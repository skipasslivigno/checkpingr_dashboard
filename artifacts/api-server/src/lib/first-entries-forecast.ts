import type { FirstEntriesForecast, FirstEntriesForecastPoint, ForecastValidation } from "@workspace/api-zod";

export const FORECAST_SLOTS = ["10:30", "11:30", "14:00"] as const;
type Slot = typeof FORECAST_SLOTS[number];
const MIN_TRAINING_DAYS = 12;
const MIN_VALIDATION_DAYS = 12;
const DAY_MS = 86_400_000;

/** One complete import batch, not a mixture of the latest row from each lift. */
export interface ForecastExtraction {
  date: string;
  season: string;
  extraction: string;
  entries: number;
  liftIds: string;
  valid: boolean;
}

interface HistoricalDay {
  date: string;
  season: string;
  liftIds: string;
  final: number;
  points: Partial<Record<Slot, number>>;
}

interface Estimate {
  total: number;
  sampleDays: number;
  scope: FirstEntriesForecastPoint["comparisonScope"];
}

interface ValidationError {
  residual: number;
  absolute: number;
  percentage: number;
  covered: boolean | null;
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function romeTimestamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return ["year", "month", "day", "hour", "minute", "second"].map(part).join("");
}

function time(row: ForecastExtraction): string {
  return `${row.extraction.slice(8, 10)}:${row.extraction.slice(10, 12)}`;
}

function timestamp(date: string): number {
  return Date.parse(`${date}T12:00:00Z`);
}

// Italian national holidays, Christmas/New Year peak, Easter and Easter Monday.
// This does not claim to cover regional/international school holiday calendars.
function holidayClass(date: string): string {
  const md = date.slice(5);
  if (md >= "12-24" || md <= "01-06") return "christmas";
  if (["01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08"].includes(md)) return "holiday";
  const y = Number(date.slice(0, 4));
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = Date.UTC(y, month - 1, day, 12);
  return [easter, easter + DAY_MS].includes(timestamp(date)) ? "holiday" : "ordinary";
}

function seasonalDistance(a: string, b: string): number {
  const distance = Math.abs(timestamp(`2000-${a.slice(5)}`) - timestamp(`2000-${b.slice(5)}`)) / DAY_MS;
  return Math.min(distance, 366 - distance);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const low = Math.floor(index);
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low);
}

function weightedMedian(values: Array<{ value: number; weight: number }>): number {
  values.sort((a, b) => a.value - b.value);
  const half = values.reduce((sum, item) => sum + item.weight, 0) / 2;
  let accumulated = 0;
  for (const item of values) {
    accumulated += item.weight;
    if (accumulated >= half) return item.value;
  }
  return values[values.length - 1].value;
}

function estimate(history: HistoricalDay[], date: string, slot: Slot, observed: number): Estimate | null {
  const eligible = history.filter((day) => day.date < date && (day.points[slot] ?? 0) > 0);
  if (eligible.length < MIN_TRAINING_DAYS) return null;
  const targetWeekday = weekday(date);
  const targetHoliday = holidayClass(date);
  const similar = eligible.filter((day) =>
    holidayClass(day.date) === targetHoliday
    && weekday(day.date) === targetWeekday
    && seasonalDistance(day.date, date) <= 45);
  const scope = similar.length >= MIN_TRAINING_DAYS ? "similar_days" : "broader_history";
  const pool = scope === "similar_days" ? similar : eligible;
  const weighted = pool.map((day) => {
    const age = (timestamp(date) - timestamp(day.date)) / DAY_MS;
    const distance = seasonalDistance(day.date, date);
    const wd = weekday(day.date);
    const sameWeekday = wd === targetWeekday;
    const sameDayType = (wd === 0 || wd === 6) === (targetWeekday === 0 || targetWeekday === 6);
    const weight = Math.pow(0.5, age / 730)
      * Math.exp(-0.5 * Math.pow(distance / 45, 2))
      * (sameWeekday ? 4 : sameDayType ? 1.5 : 0.75)
      * (holidayClass(day.date) === targetHoliday ? 3 : 0.4);
    return { value: day.final / day.points[slot]!, weight };
  }).sort((a, b) => b.weight - a.weight).slice(0, 180);
  return {
    total: Math.max(observed, Math.round(observed * weightedMedian(weighted))),
    sampleDays: weighted.length,
    scope,
  };
}

function interval(predicted: number, observed: number, errors: ValidationError[]): [number, number] {
  // Central 80% of earlier out-of-sample residuals. Indicative, not a guarantee.
  const lower = Math.max(observed, Math.floor(predicted * (1 + quantile(errors.map((e) => e.residual), 0.1))));
  const upper = Math.max(observed, Math.ceil(predicted * (1 + quantile(errors.map((e) => e.residual), 0.9))));
  return [Math.min(lower, predicted), Math.max(upper, predicted)];
}

function validate(history: HistoricalDay[], slot: Slot): { summary: ForecastValidation; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  // Walk forward: neither the tested final nor later dates enter its training/calibration.
  const testDays = history.filter((d) => (d.points[slot] ?? 0) > 0).slice(-120);
  for (const day of testDays) {
    const observed = day.points[slot]!;
    const prediction = estimate(history, day.date, slot, observed);
    if (!prediction) continue;
    let covered: boolean | null = null;
    if (errors.length >= MIN_VALIDATION_DAYS) {
      const [lower, upper] = interval(prediction.total, observed, errors.slice(-60));
      covered = day.final >= lower && day.final <= upper;
    }
    errors.push({
      residual: (day.final - prediction.total) / prediction.total,
      absolute: Math.abs(day.final - prediction.total),
      percentage: Math.abs(day.final - prediction.total) / day.final,
      covered,
    });
  }
  const recent = errors.slice(-60);
  const intervals = recent.filter((e) => e.covered !== null);
  return {
    errors: recent,
    summary: {
      sampleDays: recent.length,
      medianAbsolutePercentageError: recent.length ? quantile(recent.map((e) => e.percentage), 0.5) : null,
      meanAbsoluteError: recent.length ? recent.reduce((sum, e) => sum + e.absolute, 0) / recent.length : null,
      intervalCoverage: intervals.length >= MIN_VALIDATION_DAYS
        ? intervals.filter((e) => e.covered).length / intervals.length : null,
    },
  };
}

function groupDays(rows: ForecastExtraction[]): Map<string, ForecastExtraction[]> {
  const days = new Map<string, ForecastExtraction[]>();
  for (const row of rows) {
    // Imported extraction timestamps are local Europe/Rome YYYYMMDDHHmmss.
    if (!validDate(row.date) || !/^\d{14}$/.test(row.extraction)
      || row.extraction.slice(0, 8) !== row.date.replaceAll("-", "")
      || row.extraction.slice(8, 10) > "23" || row.extraction.slice(10, 12) > "59"
      || row.extraction.slice(12, 14) > "59") continue;
    const key = `${row.date}|${row.season}`;
    const day = days.get(key) ?? [];
    day.push(row);
    days.set(key, day);
  }
  for (const day of days.values()) day.sort((a, b) => a.extraction.localeCompare(b.extraction));
  return days;
}

function historicalDays(groups: Map<string, ForecastExtraction[]>, date: string): HistoricalDay[] {
  const candidates: HistoricalDay[] = [];
  for (const rows of groups.values()) {
    if (rows[0].date >= date) continue;
    const final = rows[rows.length - 1];
    // A morning-only day is not a final. 18:00 is the conservative closing cutoff.
    if (time(final) < "18:00" || !final.valid || final.entries <= 0) continue;
    const roster = [...new Set(rows.flatMap((r) => r.liftIds.split(",")))].sort((a, b) => Number(a) - Number(b)).join(",");
    if (roster !== final.liftIds) continue;
    const comparable = rows.filter((r) => r.valid && r.liftIds === roster);
    if (comparable.some((r, index) => index > 0 && r.entries < comparable[index - 1].entries)) continue;
    const points: HistoricalDay["points"] = {};
    for (const slot of FORECAST_SLOTS) {
      const row = rows.filter((r) => time(r) === slot).at(-1);
      if (row?.valid && row.liftIds === roster && row.entries > 0 && row.entries <= final.entries) {
        points[slot] = row.entries;
      }
    }
    if (Object.keys(points).length) candidates.push({
      date: final.date, season: final.season, liftIds: roster, final: final.entries, points,
    });
  }
  // Ambiguous duplicate dates in different seasons must not count as independent evidence.
  const counts = new Map<string, number>();
  for (const day of candidates) counts.set(day.date, (counts.get(day.date) ?? 0) + 1);
  return candidates.filter((d) => counts.get(d.date) === 1).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildFirstEntriesForecast(
  rows: ForecastExtraction[],
  input: { date: string; season: string; extraction?: string },
  now = new Date(),
): FirstEntriesForecast {
  const currentTimestamp = romeTimestamp(now);
  // Never let a future imported batch bypass the real clock.
  const requestedCutoff = input.extraction ?? `${input.date.replaceAll("-", "")}235959`;
  const cutoff = requestedCutoff < currentTimestamp ? requestedCutoff : currentTimestamp;
  const groups = groupDays(rows);
  const prior = new Map([...groups].filter(([, values]) =>
    values[0].date < input.date && values.at(-1)!.extraction <= currentTimestamp));
  const history = historicalDays(prior, input.date);
  const previousRoster = history.filter((day) => day.season === input.season).at(-1)?.liftIds.split(",") ?? [];
  const current = (groups.get(`${input.date}|${input.season}`) ?? []).filter((r) => r.extraction <= cutoff);
  const forecasts = FORECAST_SLOTS.map((slot): FirstEntriesForecastPoint => {
    const validation = validate(history, slot);
    const result: FirstEntriesForecastPoint = {
      slot, status: "no_data", extraction: null, observedEntries: null,
      predictedTotal: null, lowerBound: null, upperBound: null, sampleDays: 0,
      comparisonScope: "broader_history", confidence: "unavailable", validation: validation.summary,
    };
    const slotTimestamp = `${input.date.replaceAll("-", "")}${slot.replace(":", "")}00`;
    if (cutoff < slotTimestamp) return { ...result, status: "before_extraction" };
    if (!current.length) return result;
    const point = current.filter((r) => time(r) === slot).at(-1);
    if (!point) return { ...result, status: "missing_extraction" };
    result.extraction = point.extraction;
    result.observedEntries = point.entries;
    // Only the roster known at or before this point, never a later batch, may be used.
    const known = current.filter((r) => r.extraction <= point.extraction);
    const currentIds = new Set(point.liftIds.split(","));
    if (!point.valid || known.some((r) => r.liftIds !== point.liftIds)
      || previousRoster.some((id) => !currentIds.has(id))
      || known.some((r) => r.valid && r.entries > point.entries)) {
      return { ...result, status: "incomplete_extraction" };
    }
    if (point.entries === 0) return { ...result, status: "zero_entries" };
    const prediction = estimate(history, input.date, slot, point.entries);
    if (!prediction) return { ...result, status: "insufficient_history" };
    result.sampleDays = prediction.sampleDays;
    result.comparisonScope = prediction.scope;
    if (validation.errors.length < MIN_VALIDATION_DAYS) return { ...result, status: "insufficient_validation" };
    const [lowerBound, upperBound] = interval(prediction.total, point.entries, validation.errors);
    const mape = validation.summary.medianAbsolutePercentageError!;
    const coverage = validation.summary.intervalCoverage ?? 0;
    const confidence = prediction.scope === "similar_days" && prediction.sampleDays >= 40
      && validation.errors.length >= 30 && mape <= 0.1 && coverage >= 0.75 ? "high"
      : prediction.scope === "similar_days" && validation.errors.length >= 24
        && mape <= 0.2 && coverage >= 0.6 ? "medium" : "low";
    return { ...result, status: "ready", predictedTotal: prediction.total, lowerBound, upperBound, confidence };
  });
  return {
    ...input, metric: "nuin", modelVersion: "historical-ratio-v1", timeZone: "Europe/Rome",
    history: {
      daysExamined: new Set([...prior.values()].map((r) => r[0].date)).size,
      completeDays: history.length,
      fromDate: history[0]?.date ?? null,
      toDate: history.at(-1)?.date ?? null,
    },
    forecasts,
  };
}
