export type Language = "it" | "en";

export interface Translations {
  today: string;
  yesterday: string;
  dashboard: string;
  lastSync: string;
  passages: string;
  guestsOnLifts: string;
  activeLifts: string;
  season: string;
  topLiftsToday: string;
  topLiftsDate: string;
  noDataToday: string;
  noDataDate: string;
  pushFirstExtraction: string;
  tryDifferentDate: string;

  allLifts: string;
  searchLift: string;
  searchGroup: string;
  all: string;
  noLiftsMatchFilters: string;
  noLiftDataAvailable: string;
  lift: string;
  lifts: string;

  integration: string;
  integrationSubtitle: string;
  syncEndpoint: string;
  syncEndpointDesc: string;
  postUrl: string;
  jsonPayload: string;
  jsonPayloadDesc: string;
  requestBody: string;
  sqlAgentScript: string;
  sqlAgentScriptDesc: string;
  tsqlLabel: string;
  idempotentNote: string;
  copy: string;
  copied: string;

  back: string;
  code: string;
  seasonLabel: string;
  onLiftsNow: string;
  firstPassage: string;
  secondPassage: string;
  todaysHistory: string;
  historySubtitle: string;
  noHistoryToday: string;
  passagesRowLabel: string;
  onLiftLabel: string;
  firstPassLabel: string;

  tabDashboard: string;
  tabLifts: string;
  tabGroups: string;
  tabPeriod: string;
  tabCharts: string;
  tabIntegration: string;

  period: string;
  periodFrom: string;
  periodTo: string;
  periodApply: string;
  periodTotalPassages: string;
  periodTotalGuests: string;
  periodActiveDays: string;
  periodBusiestDay: string;
  periodBusiestLift: string;
  periodRankedLifts: string;
  periodNoData: string;
  periodNoDataSub: string;
  periodDays: string;
  periodExportCsv: string;
  periodCompareSeasons: string;
  periodComparing: string;
  periodCurrent: string;
  periodPrior: string;
  periodVs: string;
  periodNoPriorSeason: string;

  groups: string;
  noGroupData: string;
  activeLiftsOf: string;
  firstPassages: string;

  charts: string;
  chartsSubtitle: string;
  chartsDailyPassages: string;
  chartsCumulative: string;
  chartsWeekly: string;
  chartsWeeklySubtitle: string;
  chartsWeek: string;
  chartsNoData: string;
  chartsNoDataSub: string;
  chartsSeasonSelector: string;
  chartsPassages: string;
  chartsDay: string;

  guestsToday: string;
  liftPrefix: string;

  sqlComment1: string;
  sqlComment2: string;
  sqlCommentChunkSize: string;
  sqlPrintRowsToSync: string;
  sqlPrintChunkOk: string;
  sqlPrintComplete: string;
  sqlErrorChunkFailed: string;

  errorTitle: string;
  errorMessage: string;
  errorTryAgain: string;
  errorDetails: string;
  notFoundTitle: string;
  notFoundLink: string;
}

const it: Translations = {
  today: "Oggi",
  yesterday: "Ieri",
  dashboard: "Dashboard",
  lastSync: "Ultima sincronizzazione",
  passages: "Passaggi",
  guestsOnLifts: "Ospiti sugli impianti",
  activeLifts: "Impianti attivi",
  season: "Stagione",
  topLiftsToday: "Top Impianti Oggi",
  topLiftsDate: "Top Impianti",
  noDataToday: "Nessun dato per oggi",
  noDataDate: "Nessun dato per",
  pushFirstExtraction: "Carica la prima estrazione per iniziare",
  tryDifferentDate: "Prova una data diversa",

  allLifts: "Tutti gli impianti",
  searchLift: "Cerca impianto...",
  searchGroup: "Cerca gruppo o impianto...",
  all: "Tutti",
  noLiftsMatchFilters: "Nessun impianto corrisponde ai filtri",
  noLiftDataAvailable: "Nessun dato disponibile",
  lift: "impianto",
  lifts: "impianti",

  integration: "Integrazione",
  integrationSubtitle: "Invia i dati di estrazione dal tuo script MSSQL a questo dashboard",
  syncEndpoint: "Endpoint di sincronizzazione",
  syncEndpointDesc: "Aggiungi un passaggio HTTP POST al tuo script di estrazione MSSQL esistente. Invia i tuoi dati a:",
  postUrl: "URL POST",
  jsonPayload: "Payload JSON",
  jsonPayloadDesc: "Invia un corpo JSON con le righe snapshot. I nomi dei campi corrispondono alle colonne della tabella:",
  requestBody: "Corpo della richiesta (JSON)",
  sqlAgentScript: "Script SQL Server Agent",
  sqlAgentScriptDesc: "Incolla questo nel tuo job Agent. Organizza le righe in una tabella temporanea, poi le invia in blocchi da 50 per evitare i limiti di OLE Automation. Include i campi azienda/gruppo dal join SKP_SOCIETA.",
  tsqlLabel: "T-SQL — sincronizzazione a blocchi con campi azienda",
  idempotentNote: "I dati vengono inseriti/aggiornati per ID riga — inviare la stessa estrazione due volte è sicuro e idempotente.",
  copy: "Copia",
  copied: "Copiato",

  back: "Indietro",
  code: "Codice",
  seasonLabel: "Stagione",
  onLiftsNow: "Sugli impianti",
  firstPassage: "1° passaggio",
  secondPassage: "2° passaggio",
  todaysHistory: "Storico di oggi",
  historySubtitle: "Ogni riga è uno snapshot di estrazione",
  noHistoryToday: "Nessuno storico per oggi",
  passagesRowLabel: "passaggi",
  onLiftLabel: "sull'imp.",
  firstPassLabel: "1° pass.",

  tabDashboard: "Dashboard",
  tabLifts: "Impianti",
  tabGroups: "Gruppi",
  tabPeriod: "Periodo",
  tabCharts: "Grafici",
  tabIntegration: "Integrazione",

  period: "Periodo",
  periodFrom: "Da",
  periodTo: "A",
  periodApply: "Applica",
  periodTotalPassages: "Passaggi totali",
  periodTotalGuests: "Ospiti totali",
  periodActiveDays: "Giorni attivi",
  periodBusiestDay: "Giorno più affollato",
  periodBusiestLift: "Impianto più usato",
  periodRankedLifts: "Impianti per passaggi",
  periodNoData: "Nessun dato per questo periodo",
  periodNoDataSub: "Prova un intervallo di date diverso",
  periodDays: "giorni",
  periodExportCsv: "Esporta CSV",
  periodCompareSeasons: "Confronta stagioni",
  periodComparing: "Confronto stagioni",
  periodCurrent: "Corrente",
  periodPrior: "Precedente",
  periodVs: "vs",
  periodNoPriorSeason: "Nessuna stagione precedente disponibile",

  groups: "Gruppi",
  noGroupData: "Nessun dato per questo gruppo",
  activeLiftsOf: "attivi su",
  firstPassages: "1° pass.",

  charts: "Grafici",
  chartsSubtitle: "Confronto stagioni",
  chartsDailyPassages: "Passaggi giornalieri",
  chartsCumulative: "Passaggi cumulativi",
  chartsWeekly: "Passaggi settimanali",
  chartsWeeklySubtitle: "Sab–Ven · ogni barra = una settimana",
  chartsWeek: "Sett.",
  chartsNoData: "Nessun dato disponibile",
  chartsNoDataSub: "Carica dati per visualizzare i grafici",
  chartsSeasonSelector: "Stagioni da confrontare",
  chartsPassages: "Passaggi",
  chartsDay: "Giorno",

  guestsToday: "ospiti oggi",
  liftPrefix: "Impianto #",

  sqlComment1: "-- POST HTTP a blocchi — invia 50 righe per chiamata, sicuro per caricamenti completi",
  sqlComment2: "-- Sostituisci SKP_PASSAGGI / SKP_IMPIANTI / SKP_SOCIETA con i nomi reali delle tabelle",
  sqlCommentChunkSize: "-- righe per POST; mantenere <= 100",
  sqlPrintRowsToSync: "Righe da sincronizzare: ",
  sqlPrintChunkOk: "-> ok",
  sqlPrintComplete: "Sincronizzazione completata",
  sqlErrorChunkFailed: "Blocco fallito. HTTP %d all''offset %d. Body: %s",

  errorTitle: "Qualcosa è andato storto",
  errorMessage: "Ricarica l'app per continuare.",
  errorTryAgain: "Riprova",
  errorDetails: "Dettagli errore",
  notFoundTitle: "Questa pagina non esiste.",
  notFoundLink: "Vai alla schermata principale",
};

const en: Translations = {
  today: "Today",
  yesterday: "Yesterday",
  dashboard: "Dashboard",
  lastSync: "Last sync",
  passages: "Passages",
  guestsOnLifts: "Guests on lifts",
  activeLifts: "Active lifts",
  season: "Season",
  topLiftsToday: "Top Lifts Today",
  topLiftsDate: "Top Lifts",
  noDataToday: "No data for today yet",
  noDataDate: "No data for",
  pushFirstExtraction: "Push your first extraction to get started",
  tryDifferentDate: "Try a different date",

  allLifts: "All Lifts",
  searchLift: "Search lift...",
  searchGroup: "Search group or lift...",
  all: "All",
  noLiftsMatchFilters: "No lifts match your filters",
  noLiftDataAvailable: "No lift data available",
  lift: "lift",
  lifts: "lifts",

  integration: "Integration",
  integrationSubtitle: "Push extraction data from your on-site MSSQL script to this dashboard",
  syncEndpoint: "Sync Endpoint",
  syncEndpointDesc: "Add an HTTP POST step to your existing MSSQL extraction script. Send your data to:",
  postUrl: "POST URL",
  jsonPayload: "JSON Payload",
  jsonPayloadDesc: "Send a JSON body with your snapshot rows. Field names match your existing table columns:",
  requestBody: "Request Body (JSON)",
  sqlAgentScript: "SQL Server Agent Script",
  sqlAgentScriptDesc: "Paste this into your Agent job step. It stages today's rows into a temp table, then POSTs them in chunks of 50 to avoid OLE Automation size limits. Includes the company/group fields from the SKP_SOCIETA join.",
  tsqlLabel: "T-SQL — chunked sync with company fields",
  idempotentNote: "Data is upserted by row ID — pushing the same extraction twice is safe and idempotent.",
  copy: "Copy",
  copied: "Copied",

  back: "Back",
  code: "Code",
  seasonLabel: "Season",
  onLiftsNow: "On lifts now",
  firstPassage: "1st passage",
  secondPassage: "2nd passage",
  todaysHistory: "Today's history",
  historySubtitle: "Each row is one extraction snapshot",
  noHistoryToday: "No history for today",
  passagesRowLabel: "passages",
  onLiftLabel: "on lift",
  firstPassLabel: "1st pass",

  tabDashboard: "Dashboard",
  tabLifts: "Lifts",
  tabGroups: "Groups",
  tabPeriod: "Period",
  tabCharts: "Charts",
  tabIntegration: "Integration",

  period: "Period",
  periodFrom: "From",
  periodTo: "To",
  periodApply: "Apply",
  periodTotalPassages: "Total passages",
  periodTotalGuests: "Total guests",
  periodActiveDays: "Active days",
  periodBusiestDay: "Busiest day",
  periodBusiestLift: "Busiest lift",
  periodRankedLifts: "Lifts by passages",
  periodNoData: "No data for this period",
  periodNoDataSub: "Try a different date range",
  periodDays: "days",
  periodExportCsv: "Export CSV",
  periodCompareSeasons: "Compare seasons",
  periodComparing: "Season comparison",
  periodCurrent: "Current",
  periodPrior: "Prior",
  periodVs: "vs",
  periodNoPriorSeason: "No prior season available",

  groups: "Groups",
  noGroupData: "No data for this group",
  activeLiftsOf: "active of",
  firstPassages: "1st pass.",

  charts: "Charts",
  chartsSubtitle: "Season comparison",
  chartsDailyPassages: "Daily passages",
  chartsCumulative: "Cumulative passages",
  chartsWeekly: "Weekly Passages",
  chartsWeeklySubtitle: "Sat–Fri · each bar = one week",
  chartsWeek: "Week",
  chartsNoData: "No data available",
  chartsNoDataSub: "Push data to see charts",
  chartsSeasonSelector: "Seasons to compare",
  chartsPassages: "Passages",
  chartsDay: "Day",

  guestsToday: "guests today",
  liftPrefix: "Lift #",

  sqlComment1: "-- Chunked HTTP POST — sends 50 rows per call, safe for full history loads",
  sqlComment2: "-- Replace SKP_PASSAGGI / SKP_IMPIANTI / SKP_SOCIETA with your table names",
  sqlCommentChunkSize: "-- rows per POST; keep <= 100",
  sqlPrintRowsToSync: "Rows to sync: ",
  sqlPrintChunkOk: "-> ok",
  sqlPrintComplete: "Sync complete",
  sqlErrorChunkFailed: "Chunk failed. HTTP %d at offset %d. Body: %s",

  errorTitle: "Something went wrong",
  errorMessage: "Please reload the app to continue.",
  errorTryAgain: "Try Again",
  errorDetails: "Error Details",
  notFoundTitle: "This screen doesn't exist.",
  notFoundLink: "Go to home screen",
};

export const translations: Record<Language, Translations> = { it, en };
