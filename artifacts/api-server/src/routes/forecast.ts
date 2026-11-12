import { Router, type IRouter } from "express";
import { GetFirstEntriesForecastQueryParams, GetFirstEntriesForecastResponse } from "@workspace/api-zod";
import { buildFirstEntriesForecast, validDate } from "../lib/first-entries-forecast";
import { loadForecastExtractions } from "../lib/forecast-data";
import { forecastAvailability, unavailableForecast } from "../lib/forecast-access";

export function createForecastRouter(now: () => Date = () => new Date()): IRouter {
const router: IRouter = Router();

router.get("/lifts/first-entries-forecast", async (req, res): Promise<void> => {
  if (typeof req.query.date !== "string" || typeof req.query.season !== "string"
    || (req.query.extraction !== undefined && typeof req.query.extraction !== "string")
    || (req.query.mode !== undefined && typeof req.query.mode !== "string")) {
    res.status(400).json({ error: "Data, stagione o estrazione non valida" });
    return;
  }
  const parsed = GetFirstEntriesForecastQueryParams.safeParse(req.query);
  if (!parsed.success || !validDate(parsed.data.date)
    || (parsed.data.extraction && (
      parsed.data.extraction.slice(0, 8) !== parsed.data.date.replaceAll("-", "")
      || parsed.data.extraction.slice(8, 10) > "23"
      || parsed.data.extraction.slice(10, 12) > "59"
      || parsed.data.extraction.slice(12, 14) > "59"
    ))) {
    res.status(400).json({ error: "Data, stagione o estrazione non valida" });
    return;
  }
  const input = parsed.data;
  const verification = input.mode === "verification";
  if (verification && req.user!.role !== "admin") {
    res.status(403).json({ error: "La modalità verifica è riservata agli amministratori" });
    return;
  }
  const clock = now();
  let availability = forecastAvailability(input.date, input.season, verification, [], clock);
  if (availability === "live") {
    // Closing checks need today's batches only, never a five-year scan/model calculation.
    const todayRows = await loadForecastExtractions(req.user!.tenantId, input.date, { season: input.season });
    availability = forecastAvailability(input.date, input.season, false, todayRows, clock);
  }
  if (availability !== "live" && availability !== "verification") {
    res.json(GetFirstEntriesForecastResponse.parse(unavailableForecast(input.date, input.season, availability)));
    return;
  }
  const rows = await loadForecastExtractions(req.user!.tenantId, input.date);
  if (input.extraction && !rows.some((r) =>
    r.date === input.date && r.season === input.season && r.extraction === input.extraction)) {
    res.status(404).json({ error: "Estrazione non trovata per la data e stagione selezionate" });
    return;
  }
  const forecast = buildFirstEntriesForecast(rows, input, clock);
  res.json(GetFirstEntriesForecastResponse.parse({ ...forecast, availability }));
});

return router;
}

export default createForecastRouter();
