import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, tenantSettingsTable } from "@workspace/db";
import { GetPeriodComparisonQueryParams, UpdateSeasonStartBody, UpdateSeasonStartParams } from "@workspace/api-zod";
import { requireRole } from "../middleware/requireAuth";
import { comparePeriods, validCalendarDate } from "../lib/period-comparison";
import { loadComparisonBatches, loadSeasonStarts } from "../lib/season-starts";

const router = Router();
router.get("/settings/season-starts", async (req, res): Promise<void> => {
  res.json(await loadSeasonStarts(req.user!.tenantId));
});
router.put("/settings/season-starts/:season", requireRole("admin"), async (req, res): Promise<void> => {
  const path = UpdateSeasonStartParams.safeParse(req.params);
  const body = UpdateSeasonStartBody.safeParse(req.body);
  if (!path.success || !body.success
    || body.data.startDate === undefined && body.data.endDate === undefined
    || body.data.startDate && !validCalendarDate(body.data.startDate)
    || body.data.endDate && !validCalendarDate(body.data.endDate)) {
    res.status(400).json({ error: "Invalid season or calendar date (YYYY-MM-DD)" }); return;
  }
  const tenantId = req.user!.tenantId;
  const { season } = path.data;
  const { startDate, endDate } = body.data;
  const rows = await loadSeasonStarts(tenantId);
  const current = rows.find(r => r.season === season);
  if (!current) { res.status(404).json({ error: "Season not found" }); return; }
  const effectiveStart = startDate === undefined ? current.startDate : startDate;
  const effectiveEnd = endDate === undefined ? current.endDate : endDate;
  if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
    res.status(400).json({ error: "Season end must not precede the opening date" }); return;
  }
  const seasonYear = /^(\d{4})/.exec(season)?.[1];
  if (seasonYear && [startDate, endDate].some(value => value &&
    ![Number(seasonYear), Number(seasonYear) + 1].includes(Number(value.slice(0, 4))))) {
    res.status(400).json({ error: "Season dates must be within the selected season's years" }); return;
  }
  // Atomic key merge prevents two row saves (or other settings saves) from losing each other.
  await db.insert(tenantSettingsTable).values({
    tenantId, seasonStartDates: startDate ? { [season]: startDate } : {},
    seasonEndDates: endDate ? { [season]: endDate } : {},
  }).onConflictDoUpdate({
    target: tenantSettingsTable.tenantId,
    set: {
      ...(startDate !== undefined ? { seasonStartDates: startDate
        ? sql`${tenantSettingsTable.seasonStartDates} || ${JSON.stringify({ [season]: startDate })}::jsonb`
        : sql`${tenantSettingsTable.seasonStartDates} - ${season}` } : {}),
      ...(endDate !== undefined ? { seasonEndDates: endDate
        ? sql`${tenantSettingsTable.seasonEndDates} || ${JSON.stringify({ [season]: endDate })}::jsonb`
        : sql`${tenantSettingsTable.seasonEndDates} - ${season}` } : {}),
      updatedAt: new Date(),
    },
  });
  res.json({ ...current, startDate: effectiveStart, endDate: effectiveEnd });
});

router.get("/lifts/period-comparison", async (req, res): Promise<void> => {
  const parsed = GetPeriodComparisonQueryParams.safeParse(req.query);
  if (!parsed.success || !validCalendarDate(parsed.data.date)) {
    res.status(400).json({ error: "Invalid date, season or extraction" }); return;
  }
  const { date, season, extraction } = parsed.data;
  if (extraction && (extraction.slice(0, 8) !== date.replaceAll("-", "") || extraction.slice(8, 10) > "23"
    || extraction.slice(10, 12) > "59" || extraction.slice(12, 14) > "59")) {
    res.status(400).json({ error: "Extraction must belong to the selected date and have a valid time" }); return;
  }
  const seasons = await loadSeasonStarts(req.user!.tenantId);
  const index = seasons.findIndex(s => s.season === season);
  if (index === -1) { res.status(404).json({ error: "Season not found" }); return; }
  const year = /^(\d{4})/.exec(season)?.[1];
  const previous = year
    ? seasons.find(s => Number(/^(\d{4})/.exec(s.season)?.[1]) === Number(year) - 1)
    : seasons[index + 1];
  const previousSeason = previous?.season ?? null;
  const relevant = [seasons[index], ...(previous ? [previous] : [])];
  const starts = Object.fromEntries(relevant.filter(s => s.startDate).map(s => [s.season, s.startDate!]));
  const ends = Object.fromEntries(relevant.filter(s => s.endDate).map(s => [s.season, s.endDate!]));
  const fromDate = [...Object.values(starts), date].sort()[0];
  const rows = await loadComparisonBatches(req.user!.tenantId, relevant.map(s => s.season), fromDate, date);
  if (extraction && !rows.some(r => r.date === date && r.season === season && r.extraction === extraction)) {
    res.status(404).json({ error: "Selected extraction not found" }); return;
  }
  try {
    res.json(comparePeriods({ date, season, previousSeason, starts, ends, extraction, rows }));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    res.status(400).json({ error: error.message });
  }
});
export default router;
