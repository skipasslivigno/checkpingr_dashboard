import { Router, type IRouter } from "express";
import { GetFirstEntriesForecastQueryParams, GetFirstEntriesForecastResponse } from "@workspace/api-zod";
import { buildFirstEntriesForecast, validDate } from "../lib/first-entries-forecast";
import { loadForecastExtractions } from "../lib/forecast-data";

const router: IRouter = Router();

router.get("/lifts/first-entries-forecast", async (req, res): Promise<void> => {
  if (typeof req.query.date !== "string" || typeof req.query.season !== "string"
    || (req.query.extraction !== undefined && typeof req.query.extraction !== "string")) {
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
  const rows = await loadForecastExtractions(req.user!.tenantId, input.date);
  if (input.extraction && !rows.some((r) =>
    r.date === input.date && r.season === input.season && r.extraction === input.extraction)) {
    res.status(404).json({ error: "Estrazione non trovata per la data e stagione selezionate" });
    return;
  }
  res.json(GetFirstEntriesForecastResponse.parse(buildFirstEntriesForecast(rows, input)));
});

export default router;
