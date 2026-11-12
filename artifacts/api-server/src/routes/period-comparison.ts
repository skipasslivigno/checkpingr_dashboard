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
  if (!path.success || !body.success || body.data.startDate && !validCalendarDate(body.data.startDate)) {
    res.status(400).json({ error: "Invalid season or calendar date (YYYY-MM-DD)" }); return;
  }
  const tenantId = req.user!.tenantId;
  const { season } = path.data;
  const { startDate } = body.data;
  const rows = await loadSeasonStarts(tenantId);
  const current = rows.find(r => r.season === season);
  if (!current) { res.status(404).json({ error: "Season not found" }); return; }
  const seasonYear = /^(\d{4})/.exec(season)?.[1];
  if (startDate && seasonYear && ![Number(seasonYear), Number(seasonYear) + 1].includes(Number(startDate.slice(0, 4)))) {
    res.status(400).json({ error: "Opening date must be within the selected season's years" }); return;
  }
  // Atomic key merge prevents two row saves (or other settings saves) from losing each other.
  const entry = JSON.stringify(startDate ? { [season]: startDate } : {});
  await db.insert(tenantSettingsTable).values({
    tenantId, seasonStartDates: startDate ? { [season]: startDate } : {},
  }).onConflictDoUpdate({
    target: tenantSettingsTable.tenantId,
    set: {
      seasonStartDates: startDate
        ? sql`${tenantSettingsTable.seasonStartDates} || ${entry}::jsonb`
        : sql`${tenantSettingsTable.seasonStartDates} - ${season}`,
      updatedAt: new Date(),
    },
  });
  res.json({ ...current, startDate });
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
  const fromDate = [...Object.values(starts), date].sort()[0];
  const rows = await loadComparisonBatches(req.user!.tenantId, relevant.map(s => s.season), fromDate, date);
  if (extraction && !rows.some(r => r.date === date && r.season === season && r.extraction === extraction)) {
    res.status(404).json({ error: "Selected extraction not found" }); return;
  }
  try {
    res.json(comparePeriods({ date, season, previousSeason, starts, extraction, rows }));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    res.status(400).json({ error: error.message });
  }
});
export default router;
