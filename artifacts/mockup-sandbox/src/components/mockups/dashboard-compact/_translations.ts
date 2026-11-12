export type Language = "it" | "en";

export interface Translations {
  seasonBounds: Record<"title"|"hint"|"dates"|"end"|"optional"|"invalidRange"|"clear"|"definitive", string>;
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
  periodShareComparison: string;

  calendarSelectFrom: string;
  calendarSelectDate: string;
  calendarSelectTo: string;
  calendarHasData: string;

  allCompanies: string;
  sortBy: string;
  sortById: string;
  sortByName: string;

  groups: string;
  noGroupData: string;
  noGroupsMatchSearch: string;
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
  chartsAllSeasons: string;
  chartsPassages: string;
  chartsFirstEntries: string;
  chartsDay: string;
  chartsTapHint: string;
  chartsVsPrev: string;

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

  loginTitle: string;
  loginSubtitle: string;
  loginEmail: string;
  loginPassword: string;
  loginButton: string;
  loginError: string;
  logout: string;
  userProfile: string;
  userRole: string;
  roleAdmin: string;
  roleOperator: string;
  roleViewer: string;

  settingsTitle: string;
  settingsSave: string;
  settingsSaveError: string;
  settingsLogo: string;
  settingsNoLogo: string;
  settingsUploadLogo: string;
  settingsRemoveLogo: string;
  settingsLogoPermission: string;
  settingsPrimaryColor: string;
  settingsPrimaryColorHint: string;
  settingsPrimaryColorLabel: string;
  settingsColors: string;
  settingsColorsHint: string;
  settingsColor: string;
  settingsAddColor: string;
  settingsMaxSeasons: string;
  settingsMaxSeasonsHint: string;
  settingsMaxSeasonsError: string;
  settingsOpen: string;

  adminTitle: string;
  adminNoUsers: string;
  adminCreateUser: string;
  adminEditUser: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordHint: string;
  adminRole: string;
  adminSave: string;
  adminCancel: string;
  adminDelete: string;
  adminDeleteConfirm: string;
  adminDeactivate: string;
  adminActivate: string;
  adminActive: string;
  adminInactive: string;
  adminOpen: string;
  adminErrorCreate: string;
  adminErrorUpdate: string;
  adminErrorDelete: string;
  adminPasswordMin: string;
  adminActions: string;
  adminStatus: string;
  adminSortAscending: string;
  adminSortDescending: string;
  adminYou: string;
  adminDeleteTitle: string;
  adminDeleteSelf: string;
  adminDeleting: string;
  adminSaving: string;

  periodViewList: string;
  sessionErrorTitle: string;
  sessionErrorBody: string;
  cpTitle: string;
  cpSubtitle: string;
  cpCurrent: string;
  cpNew: string;
  cpConfirm: string;
  cpSubmit: string;
  cpSaving: string;
  cpErrCurrent: string;
  cpErrMin: string;
  cpErrMax: string;
  cpErrSame: string;
  cpErrMatch: string;
  cpErrWrong: string;
  cpErrGeneric: string;
  adminForceChange: string;
  adminForceChangeHint: string;
  adminPwdColumn: string;
  adminPwdRequired: string;
  adminPwdOk: string;
  periodViewGroups: string;
  emTitle: string;
  emLink: string;
  emAdminOnly: string;
  emLoadError: string;
  emStatusConfigured: string;
  emStatusNotConfigured: string;
  emStatusNote: string;
  emSender: string;
  emSenderHint: string;
  emSenderName: string;
  emAppPassword: string;
  emAppPasswordHint: string;
  emAppPasswordSaved: string;
  emAppPasswordMissing: string;
  emLoginUrl: string;
  emLoginUrlHint: string;
  emSubject: string;
  emBody: string;
  emPlaceholders: string;
  emResetDefaults: string;
  emSmtpInfo: string;
  emGuideTitle: string;
  emGuide1: string;
  emGuide2: string;
  emGuide3: string;
  emGuideWorkspace: string;
  emSave: string;
  emSaving: string;
  emSaved: string;
  emRequired: string;
  emUnsaved: string;
  emPreview: string;
  emPreviewing: string;
  emPreviewNote: string;
  emPreviewSubject: string;
  emTest: string;
  emTesting: string;
  emTestDisabled: string;
  emTestConfirmTitle: string;
  emTestConfirmBody: string;
  emTestSent: string;
  emDelete: string;
  emDeleting: string;
  emDeleteTitle: string;
  emDeleteBody: string;
  emDeleted: string;
  emCancel: string;
  emConfirm: string;
  emClose: string;
  emErrorGeneric: string;
  emSendColumn: string;
  emSendCreds: string;
  emNeverSent: string;
  emInactive: string;
  emSendTitle: string;
  emSendFrom: string;
  emSendTo: string;
  emSendWarn: string;
  emSendSelfWarn: string;
  emSendConfirm: string;
  emSending: string;
  emSendSuccess: string;
  emSendPreviewLoading: string;
  emRetry: string;
  fcTitle: string; fcSubtitle: string; fcEstimate: string; fcNoSeason: string; fcError: string; fcEmpty: string;
  fcPredictedAt: string; fcInterval: string; fcObserved: string; fcTrainingDays: string; fcReliability: string;
  fcScopeSimilar: string; fcScopeBroader: string; fcDetails: string; fcMape: string; fcMae: string;
  fcValidationDays: string; fcCoverage: string; fcHistory: string; fcMethod: string; fcIntervalNote: string; fcModel: string;
  fcStatus: Record<"ready"|"before_extraction"|"missing_extraction"|"incomplete_extraction"|"insufficient_history"|"insufficient_validation"|"no_data"|"zero_entries", string>;
  fcStatusHelp: Record<"ready"|"before_extraction"|"missing_extraction"|"incomplete_extraction"|"insufficient_history"|"insufficient_validation"|"no_data"|"zero_entries", string>;
  fcConfidence: Record<"unavailable"|"low"|"medium"|"high", string>;
  fcVerificationMode: string; fcVerificationHint: string; fcVerificationActive: string; fcLiveOnly: string;
  fcTileLabel: string; fcTileAt: string; fcTileOpen: string; fcTileVerify: string; fcTileUnavailable: string; fcClose: string; fcSlots: string;
  fcInlineEstimate: string; fcInlineDetails: string; fcActualEntries: string; fcActualLatest: string; fcActualAt: string;
  searchOpen: string; searchClose: string;
  pc: Record<"weekly"|"progressive"|"title"|"prev"|"diff"|"na"|"error"|"retry"|"config"|"configAdmin"|"openSettings"|"beforeSeason"|"noData"|"partial"|"missing"|"missingCur"|"missingPrev"|"noPrevSeason"|"ssTitle"|"ssHint"|"ssFirstData"|"ssSuggested"|"ssUseSuggested"|"ssConfigured"|"ssNotSet"|"ssSave"|"ssClear"|"ssSaved"|"ssInvalid"|"ssNotSaturday"|"ssError"|"ssLoadError"|"ssEmpty"|"colSeason"|"colStart"|"colAction", string>;
}

const it: Translations = {
  seasonBounds: {
    title: "Date della stagione", dates: "Date", end: "Ultimo giorno", optional: "Facoltativo",
    hint: "Imposta il primo e l'ultimo giorno di apertura, inclusi. La fine è facoltativa: oltre quella data il confronto usa il dato definitivo, se i consuntivi sono completi.",
    invalidRange: "La fine non può precedere l'inizio.", clear: "Rimuovi date", definitive: "Definitivo",
  },
  today: "Oggi",
  yesterday: "Ieri",
  dashboard: "Dashboard",
  lastSync: "Ultima sincronizzazione",
  passages: "Passaggi",
  guestsOnLifts: "Primi ingressi",
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

  integration: "Info",
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
  onLiftLabel: "presenze",
  firstPassLabel: "1° ingressi",

  tabDashboard: "Dashboard",
  tabLifts: "Impianti",
  tabGroups: "Impianti",
  tabPeriod: "Periodo",
  tabCharts: "Grafici",
  tabIntegration: "Info",

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
  periodShareComparison: "Condividi confronto",

  calendarSelectFrom: "Seleziona data inizio",
  calendarSelectDate: "Seleziona una data",
  calendarSelectTo: "Seleziona data fine",
  calendarHasData: "Giorni con dati disponibili",

  allCompanies: "Tutte le società",
  sortBy: "Ordina per",
  sortById: "ID",
  sortByName: "Nome",

  groups: "Gruppi",
  noGroupData: "Nessun dato per questo gruppo",
  noGroupsMatchSearch: "Nessun gruppo o impianto corrisponde alla ricerca",
  activeLiftsOf: "attivi su",
  firstPassages: "1° ingressi",

  charts: "Grafici",
  chartsSubtitle: "Confronto stagioni",
  chartsDailyPassages: "Primi ingressi giornalieri",
  chartsCumulative: "Primi ingressi cumulativi",
  chartsWeekly: "Primi ingressi settimanali",
  chartsWeeklySubtitle: "Sab–Ven · ogni barra = una settimana",
  chartsWeek: "Sett.",
  chartsNoData: "Nessun dato disponibile",
  chartsNoDataSub: "Carica dati per visualizzare i grafici",
  chartsSeasonSelector: "Stagioni da confrontare",
  chartsAllSeasons: "Tutte",
  chartsPassages: "Passaggi",
  chartsFirstEntries: "Primi ingressi",
  chartsDay: "Giorno",
  chartsTapHint: "Tocca un punto per i dettagli",
  chartsVsPrev: "vs prec.",

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

  loginTitle: "Ski Area Dashboard",
  loginSubtitle: "Accedi per visualizzare i dati",
  loginEmail: "Email",
  loginPassword: "Password",
  loginButton: "Accedi",
  loginError: "Credenziali non valide",
  logout: "Esci",
  userProfile: "Profilo",
  userRole: "Ruolo",
  roleAdmin: "Amministratore",
  roleOperator: "Operatore",
  roleViewer: "Visualizzatore",

  settingsTitle: "Impostazioni",
  settingsSave: "Salva",
  settingsSaveError: "Errore durante il salvataggio. Riprova.",
  settingsLogo: "Logo",
  settingsNoLogo: "Nessun logo",
  settingsUploadLogo: "Carica logo",
  settingsRemoveLogo: "Rimuovi",
  settingsLogoPermission: "Permesso alla libreria fotografica richiesto.",
  settingsPrimaryColor: "Colore predefinito testo",
  settingsPrimaryColorHint: "Colore principale dell'interfaccia (pulsanti, icone attive). Formato esadecimale #RRGGBB.",
  settingsPrimaryColorLabel: "Colore UI",
  settingsColors: "Colori grafici",
  settingsColorsHint: "Fino a 10 colori per le serie dei grafici (passaggi, primi ingressi, presenze). Formato #RRGGBB.",
  settingsColor: "Colore",
  settingsAddColor: "Aggiungi colore",
  settingsMaxSeasons: "Stagioni visualizzabili",
  settingsMaxSeasonsHint: "Numero massimo di stagioni mostrate nel selettore (default: 3).",
  settingsMaxSeasonsError: "Inserisci un numero tra 1 e 20.",
  settingsOpen: "Impostazioni",

  adminTitle: "Gestione utenti",
  adminNoUsers: "Nessun utente trovato",
  adminCreateUser: "Nuovo utente",
  adminEditUser: "Modifica utente",
  adminName: "Nome",
  adminEmail: "Email",
  adminPassword: "Password",
  adminPasswordHint: "Lascia vuoto per non modificarla",
  adminRole: "Ruolo",
  adminSave: "Salva",
  adminCancel: "Annulla",
  adminDelete: "Elimina",
  adminDeleteConfirm: "Eliminare questo utente? L'operazione non è reversibile.",
  adminDeactivate: "Disattiva",
  adminActivate: "Attiva",
  adminActive: "Attivo",
  adminInactive: "Inattivo",
  adminOpen: "Amministrazione",
  adminErrorCreate: "Errore nella creazione dell'utente.",
  adminErrorUpdate: "Errore nell'aggiornamento dell'utente.",
  adminErrorDelete: "Errore nell'eliminazione dell'utente.",
  adminPasswordMin: "La password deve essere di almeno 8 caratteri.",
  adminActions: "Azioni",
  adminStatus: "Stato",
  adminSortAscending: "Ordina in modo crescente",
  adminSortDescending: "Ordina in modo decrescente",
  adminYou: "tu",
  adminDeleteTitle: "Eliminare utente?",
  adminDeleteSelf: "Non puoi eliminare il tuo account",
  adminDeleting: "Eliminazione...",
  adminSaving: "Salvataggio...",

  periodViewList: "Lista",
  sessionErrorTitle: "Impossibile verificare la sessione",
  sessionErrorBody: "Il server non è raggiungibile. Controlla la connessione e riprova.",
  cpTitle: "Imposta una nuova password",
  cpSubtitle: "Per motivi di sicurezza devi cambiare la password prima di continuare.",
  cpCurrent: "Password attuale",
  cpNew: "Nuova password",
  cpConfirm: "Conferma nuova password",
  cpSubmit: "Aggiorna password",
  cpSaving: "Aggiornamento...",
  cpErrCurrent: "Inserisci la password attuale.",
  cpErrMin: "La nuova password deve avere almeno 8 caratteri.",
  cpErrMax: "La nuova password è troppo lunga (max 72 byte).",
  cpErrSame: "La nuova password deve essere diversa da quella attuale.",
  cpErrMatch: "Le password non coincidono.",
  cpErrWrong: "Password attuale non corretta.",
  cpErrGeneric: "Impossibile aggiornare la password. Riprova.",
  adminForceChange: "Forza cambio password al prossimo accesso",
  adminForceChangeHint: "L'utente dovrà impostare una nuova password",
  adminPwdColumn: "Password",
  adminPwdRequired: "Cambio richiesto",
  adminPwdOk: "OK",
  periodViewGroups: "Gruppi",
  emTitle: "Email credenziali",
  emLink: "Impostazioni Gmail",
  emAdminOnly: "Solo gli amministratori possono accedere a questa pagina.",
  emLoadError: "Impossibile caricare le impostazioni email.",
  emStatusConfigured: "Configurazione salvata",
  emStatusNotConfigured: "Non configurato",
  emStatusNote: "\"Salvata\" significa solo che i dati sono memorizzati: la connessione a Gmail non è verificata finché non invii un test.",
  emSender: "Mittente (il tuo account)",
  emSenderHint: "Derivato dall'amministratore connesso, non modificabile.",
  emSenderName: "Nome mittente",
  emAppPassword: "Nuova password per le app Gmail",
  emAppPasswordHint: "Non è la password del tuo account Google. Lascia vuoto per mantenere quella salvata.",
  emAppPasswordSaved: "Una password per le app è salvata (non viene mai mostrata).",
  emAppPasswordMissing: "Nessuna password per le app salvata.",
  emLoginUrl: "URL di accesso (HTTPS)",
  emLoginUrlHint: "Inserisci manualmente l'indirizzo HTTPS che gli utenti useranno per accedere.",
  emSubject: "Oggetto",
  emBody: "Testo del messaggio",
  emPlaceholders: "Segnaposto supportati",
  emResetDefaults: "Ripristina modello predefinito",
  emSmtpInfo: "Server SMTP fisso: smtp.gmail.com, porta 465, TLS.",
  emGuideTitle: "Come ottenere una password per le app",
  emGuide1: "1. Attiva la verifica in due passaggi sul tuo account Google.",
  emGuide2: "2. Apri Account Google > Password per le app:",
  emGuide3: "3. Crea una password per questa app e incollala qui sotto.",
  emGuideWorkspace: "Negli account Google Workspace l'amministratore può vietare le password per le app.",
  emSave: "Salva",
  emSaving: "Salvataggio…",
  emSaved: "Configurazione salvata. Nessuna email è stata inviata.",
  emRequired: "Nome mittente, URL di accesso, oggetto e testo sono obbligatori.",
  emUnsaved: "Modifiche non salvate",
  emPreview: "Anteprima",
  emPreviewing: "Anteprima…",
  emPreviewNote: "Anteprima: non viene inviato nulla. La password mostrata è un esempio non utilizzabile.",
  emPreviewSubject: "Oggetto",
  emTest: "Invia email di prova",
  emTesting: "Invio…",
  emTestDisabled: "Salva una configurazione valida senza modifiche in sospeso per inviare una prova.",
  emTestConfirmTitle: "Inviare email di prova?",
  emTestConfirmBody: "Verrà inviata un'email reale solo a te:",
  emTestSent: "Accettata da Gmail per {email}. La consegna in casella non è garantita.",
  emDelete: "Elimina configurazione",
  emDeleting: "Eliminazione…",
  emDeleteTitle: "Eliminare la configurazione Gmail?",
  emDeleteBody: "Rimuove nome mittente, URL, modelli e password per le app salvati solo per il tuo account amministratore.",
  emDeleted: "Configurazione eliminata.",
  emCancel: "Annulla",
  emConfirm: "Conferma",
  emClose: "Chiudi",
  emErrorGeneric: "Operazione non riuscita. Riprova.",
  emSendColumn: "Credenziali",
  emSendCreds: "Invia credenziali",
  emNeverSent: "Mai inviate",
  emInactive: "Utente inattivo",
  emSendTitle: "Inviare nuove credenziali?",
  emSendFrom: "Da",
  emSendTo: "A",
  emSendWarn: "Verrà generata una NUOVA password che sostituisce quella attuale. Le sessioni attive dell'utente verranno revocate e dovrà cambiare password al prossimo accesso.",
  emSendSelfWarn: "Stai inviando le credenziali a te stesso: la tua sessione potrebbe terminare dopo l'invio.",
  emSendConfirm: "Reimposta e invia",
  emSending: "Invio…",
  emSendSuccess: "Accettata da Gmail per {email}. La consegna non è garantita.",
  emSendPreviewLoading: "Caricamento anteprima…",
  emRetry: "Riprova",
  fcTitle: "Previsione primi ingressi",
  fcTileLabel: "Ingressi previsti",
  fcTileAt: "Stima delle {time}",
  fcTileOpen: "Apri dettagli previsione",
  fcTileVerify: "Verifica",
  fcTileUnavailable: "Previsione non disponibile",
  fcClose: "Chiudi",
  fcInlineEstimate: "stimati {n}",
  fcInlineDetails: "Previsione",
  fcActualEntries: "Primi ingressi reali",
  fcActualLatest: "ultima estrazione",
  fcActualAt: "estrazione delle {time}",
  searchOpen: "Cerca gruppo o impianto",
  searchClose: "Chiudi ricerca",
  fcSlots: "Orari di previsione",
  fcVerificationMode: "Modalità verifica",
  fcVerificationHint: "Calcola anche su giornate passate o già a consuntivo. Solo amministratori.",
  fcVerificationActive: "Modalità verifica attiva: simulazione sui dati disponibili all'estrazione selezionata.",
  fcLiveOnly: "La previsione ordinaria è disponibile solo per oggi, prima del consuntivo. Attiva la modalità verifica per analizzare una giornata passata o chiusa; le date future restano escluse.",
  fcSubtitle: "Stima del totale giornaliero, separata dai dati reali",
  fcEstimate: "Stima",
  fcNoSeason: "Seleziona una stagione per vedere la previsione.",
  fcError: "Impossibile caricare la previsione.",
  fcEmpty: "Nessuna previsione disponibile per questa data.",
  fcPredictedAt: "Totale previsto (orario {slot})",
  fcInterval: "Intervallo indicativo",
  fcObserved: "Osservati alle {time}",
  fcTrainingDays: "Giorni di addestramento",
  fcReliability: "Affidabilità",
  fcScopeSimilar: "Confronto con giorni simili.",
  fcScopeBroader: "Confronto con lo storico più ampio (pochi giorni simili).",
  fcDetails: "Dettagli del modello",
  fcMape: "Errore percentuale mediano (backtest)",
  fcMae: "Errore medio assoluto (ingressi)",
  fcValidationDays: "Giorni di validazione",
  fcCoverage: "Copertura intervallo nel backtest",
  fcHistory: "Giorni storici completi / esaminati",
  fcMethod: "Il totale è stimato confrontando i primi ingressi osservati all'orario programmato con giornate complete precedenti, anche di altre stagioni, negli ultimi 5 anni. Sono favoriti lo stesso giorno della settimana, periodi simili e festività nazionali italiane, Natale e Pasqua. Servono almeno 12 giorni di addestramento e 12 di validazione. Meteo e aperture non sono considerati. Il consuntivo del giorno previsto non entra nel calcolo; all'ultima estrazione resta la previsione più recente disponibile, al massimo delle 14:00.",
  fcIntervalNote: "L'intervallo indicativo è l'80% centrale degli errori passati: non garantisce l'80% di copertura.",
  fcModel: "Modello",
  fcStatus: { ready: "Pronta", before_extraction: "Non ancora", missing_extraction: "Estrazione mancante", incomplete_extraction: "Estrazione incompleta", insufficient_history: "Storico insufficiente", insufficient_validation: "Validazione insufficiente", no_data: "Nessun dato", zero_entries: "Zero ingressi" },
  fcStatusHelp: { ready: "", before_extraction: "L'estrazione selezionata è precedente a questo orario.", missing_extraction: "Nessuna estrazione disponibile a questo orario.", incomplete_extraction: "L'estrazione a questo orario è incompleta.", insufficient_history: "Meno di 12 giorni storici utilizzabili.", insufficient_validation: "Meno di 12 giorni di validazione.", no_data: "Nessun dato per questa data.", zero_entries: "Nessun primo ingresso registrato a questo orario." },
  fcConfidence: { unavailable: "Non disponibile", low: "Bassa", medium: "Media", high: "Alta" },
  pc: { weekly: "Settimanali", progressive: "Progressivi", title: "Primi ingressi", prev: "Prec.", diff: "Diff%", na: "n.d.", error: "Confronto non disponibile.", retry: "Riprova", config: "Data inizio stagione da configurare (amministratore).", configAdmin: "Configura la data di inizio stagione.", openSettings: "Apri impostazioni", beforeSeason: "Data precedente all'inizio stagione.", noData: "Nessun dato per il confronto.", partial: "Parziale ore {time}", missing: "Copertura incompleta", missingCur: "Giorni mancanti (attuale)", missingPrev: "Giorni mancanti (precedente)", noPrevSeason: "Nessuna stagione precedente", ssTitle: "Inizio stagione", ssHint: "Primo giorno utile per stagione (di norma sabato). Usato per i confronti settimanali e progressivi.", ssFirstData: "Primo dato", ssSuggested: "Suggerito", ssUseSuggested: "Usa suggerito", ssConfigured: "Configurato", ssNotSet: "Non configurato", ssSave: "Salva", ssClear: "Rimuovi", ssSaved: "Salvato", ssInvalid: "Formato AAAA-MM-GG", ssNotSaturday: "Non è un sabato", ssError: "Salvataggio non riuscito", ssLoadError: "Impossibile caricare le stagioni.", ssEmpty: "Nessuna stagione.", colSeason: "Stagione", colStart: "Primo giorno", colAction: "Azione" },
};

const en: Translations = {
  seasonBounds: {
    title: "Season dates", dates: "Dates", end: "Last day", optional: "Optional",
    hint: "Set the first and last operating days, inclusive. The end is optional: later comparisons use the final figure if closing imports are complete.",
    invalidRange: "The end must not precede the start.", clear: "Clear dates", definitive: "Final",
  },
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

  integration: "Info",
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
  tabGroups: "Lifts",
  tabPeriod: "Period",
  tabCharts: "Charts",
  tabIntegration: "Info",

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
  periodShareComparison: "Share comparison",

  calendarSelectFrom: "Select start date",
  calendarSelectDate: "Select a date",
  calendarSelectTo: "Select end date",
  calendarHasData: "Days with available data",

  allCompanies: "All companies",
  sortBy: "Sort by",
  sortById: "ID",
  sortByName: "Name",

  groups: "Groups",
  noGroupData: "No data for this group",
  noGroupsMatchSearch: "No groups or lifts match your search",
  activeLiftsOf: "active of",
  firstPassages: "1st pass.",

  charts: "Charts",
  chartsSubtitle: "Season comparison",
  chartsDailyPassages: "Daily First Entries",
  chartsCumulative: "Cumulative First Entries",
  chartsWeekly: "Weekly First Entries",
  chartsWeeklySubtitle: "Sat–Fri · each bar = one week",
  chartsWeek: "Week",
  chartsNoData: "No data available",
  chartsNoDataSub: "Push data to see charts",
  chartsSeasonSelector: "Seasons to compare",
  chartsAllSeasons: "All",
  chartsPassages: "Passages",
  chartsFirstEntries: "First Entries",
  chartsDay: "Day",
  chartsTapHint: "Tap a point to see details",
  chartsVsPrev: "vs prev.",

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

  loginTitle: "Ski Area Dashboard",
  loginSubtitle: "Sign in to view data",
  loginEmail: "Email",
  loginPassword: "Password",
  loginButton: "Sign In",
  loginError: "Invalid credentials",
  logout: "Sign Out",
  userProfile: "Profile",
  userRole: "Role",
  roleAdmin: "Administrator",
  roleOperator: "Operator",
  roleViewer: "Viewer",

  settingsTitle: "Settings",
  settingsSave: "Save",
  settingsSaveError: "Failed to save. Please try again.",
  settingsLogo: "Logo",
  settingsNoLogo: "No logo",
  settingsUploadLogo: "Upload logo",
  settingsRemoveLogo: "Remove",
  settingsLogoPermission: "Photo library permission required.",
  settingsPrimaryColor: "Default text color",
  settingsPrimaryColorHint: "Main UI color (buttons, active icons). Hex format #RRGGBB.",
  settingsPrimaryColorLabel: "UI color",
  settingsColors: "Chart colors",
  settingsColorsHint: "Up to 10 colors for chart series (passages, first entries, presences). Format #RRGGBB.",
  settingsColor: "Color",
  settingsAddColor: "Add color",
  settingsMaxSeasons: "Visible seasons",
  settingsMaxSeasonsHint: "Maximum number of seasons shown in the selector (default: 3).",
  settingsMaxSeasonsError: "Enter a number between 1 and 20.",
  settingsOpen: "Settings",

  adminTitle: "User Management",
  adminNoUsers: "No users found",
  adminCreateUser: "New User",
  adminEditUser: "Edit User",
  adminName: "Name",
  adminEmail: "Email",
  adminPassword: "Password",
  adminPasswordHint: "Leave blank to keep current password",
  adminRole: "Role",
  adminSave: "Save",
  adminCancel: "Cancel",
  adminDelete: "Delete",
  adminDeleteConfirm: "Delete this user? This action cannot be undone.",
  adminDeactivate: "Deactivate",
  adminActivate: "Activate",
  adminActive: "Active",
  adminInactive: "Inactive",
  adminOpen: "Administration",
  adminErrorCreate: "Failed to create user.",
  adminErrorUpdate: "Failed to update user.",
  adminErrorDelete: "Failed to delete user.",
  adminPasswordMin: "Password must be at least 8 characters.",
  adminActions: "Actions",
  adminStatus: "Status",
  adminSortAscending: "Sort ascending",
  adminSortDescending: "Sort descending",
  adminYou: "you",
  adminDeleteTitle: "Delete user?",
  adminDeleteSelf: "You cannot delete your own account",
  adminDeleting: "Deleting...",
  adminSaving: "Saving...",

  periodViewList: "List",
  sessionErrorTitle: "Could not verify your session",
  sessionErrorBody: "The server could not be reached. Check your connection and try again.",
  cpTitle: "Set a new password",
  cpSubtitle: "For security you must change your password before continuing.",
  cpCurrent: "Current password",
  cpNew: "New password",
  cpConfirm: "Confirm new password",
  cpSubmit: "Update password",
  cpSaving: "Updating...",
  cpErrCurrent: "Enter your current password.",
  cpErrMin: "New password must be at least 8 characters.",
  cpErrMax: "New password is too long (max 72 bytes).",
  cpErrSame: "New password must differ from the current one.",
  cpErrMatch: "Passwords do not match.",
  cpErrWrong: "Current password is incorrect.",
  cpErrGeneric: "Could not update password. Please try again.",
  adminForceChange: "Force password change on next login",
  adminForceChangeHint: "User must set a new password",
  adminPwdColumn: "Password",
  adminPwdRequired: "Change required",
  adminPwdOk: "OK",
  periodViewGroups: "Groups",
  emTitle: "Credential email",
  emLink: "Gmail settings",
  emAdminOnly: "Only administrators can access this page.",
  emLoadError: "Could not load email settings.",
  emStatusConfigured: "Configuration saved",
  emStatusNotConfigured: "Not configured",
  emStatusNote: "\"Saved\" only means the data is stored: the Gmail connection is not verified until you send a test.",
  emSender: "Sender (your account)",
  emSenderHint: "Derived from the signed-in administrator, cannot be changed.",
  emSenderName: "Sender name",
  emAppPassword: "New Gmail app password",
  emAppPasswordHint: "Not your Google account password. Leave blank to keep the saved one.",
  emAppPasswordSaved: "An app password is stored (never displayed).",
  emAppPasswordMissing: "No app password stored.",
  emLoginUrl: "Login URL (HTTPS)",
  emLoginUrlHint: "Enter manually the HTTPS address users will use to sign in.",
  emSubject: "Subject",
  emBody: "Message body",
  emPlaceholders: "Supported placeholders",
  emResetDefaults: "Reset to default template",
  emSmtpInfo: "Fixed SMTP server: smtp.gmail.com, port 465, TLS.",
  emGuideTitle: "How to get an app password",
  emGuide1: "1. Turn on 2-Step Verification on your Google account.",
  emGuide2: "2. Open Google Account > App passwords:",
  emGuide3: "3. Create a password for this app and paste it below.",
  emGuideWorkspace: "On Google Workspace accounts, your admin may prohibit app passwords.",
  emSave: "Save",
  emSaving: "Saving…",
  emSaved: "Configuration saved. No email was sent.",
  emRequired: "Sender name, login URL, subject and body are required.",
  emUnsaved: "Unsaved changes",
  emPreview: "Preview",
  emPreviewing: "Previewing…",
  emPreviewNote: "Preview: nothing is sent. The password shown is a non-usable sample.",
  emPreviewSubject: "Subject",
  emTest: "Send test email",
  emTesting: "Sending…",
  emTestDisabled: "Save a valid configuration with no pending changes to send a test.",
  emTestConfirmTitle: "Send test email?",
  emTestConfirmBody: "A real email will be sent only to you:",
  emTestSent: "Accepted by Gmail for {email}. Inbox delivery is not guaranteed.",
  emDelete: "Delete configuration",
  emDeleting: "Deleting…",
  emDeleteTitle: "Delete Gmail configuration?",
  emDeleteBody: "Removes the sender name, URL, templates and stored app password for your admin account only.",
  emDeleted: "Configuration deleted.",
  emCancel: "Cancel",
  emConfirm: "Confirm",
  emClose: "Close",
  emErrorGeneric: "Operation failed. Please try again.",
  emSendColumn: "Credentials",
  emSendCreds: "Send credentials",
  emNeverSent: "Never sent",
  emInactive: "Inactive user",
  emSendTitle: "Send new credentials?",
  emSendFrom: "From",
  emSendTo: "To",
  emSendWarn: "A NEW password will be generated and will replace the current one. The user's active sessions will be revoked and they must change password at next sign-in.",
  emSendSelfWarn: "You are sending credentials to yourself: your own session may end after sending.",
  emSendConfirm: "Reset and send",
  emSending: "Sending…",
  emSendSuccess: "Accepted by Gmail for {email}. Delivery is not guaranteed.",
  emSendPreviewLoading: "Loading preview…",
  emRetry: "Retry",
  fcTitle: "First entries forecast",
  fcTileLabel: "Expected entries",
  fcTileAt: "Estimate at {time}",
  fcTileOpen: "Open forecast details",
  fcTileVerify: "Verify",
  fcTileUnavailable: "Forecast unavailable",
  fcClose: "Close",
  fcInlineEstimate: "est. {n}",
  fcInlineDetails: "Forecast",
  fcActualEntries: "Actual first entries",
  fcActualLatest: "latest extraction",
  fcActualAt: "extraction at {time}",
  searchOpen: "Search group or lift",
  searchClose: "Close search",
  fcSlots: "Forecast times",
  fcVerificationMode: "Verification mode",
  fcVerificationHint: "Also calculate for past or already closed days. Administrators only.",
  fcVerificationActive: "Verification mode enabled: simulation using data available at the selected extraction.",
  fcLiveOnly: "Live forecasts are available only for today before final counts arrive. Enable verification mode to inspect a past or closed day; future dates remain excluded.",
  fcSubtitle: "Estimated daily total, separate from actual counts",
  fcEstimate: "Estimate",
  fcNoSeason: "Select a season to see the forecast.",
  fcError: "Could not load the forecast.",
  fcEmpty: "No forecast available for this date.",
  fcPredictedAt: "Predicted total ({slot} slot)",
  fcInterval: "Indicative interval",
  fcObserved: "Observed at {time}",
  fcTrainingDays: "Training days",
  fcReliability: "Reliability",
  fcScopeSimilar: "Compared with similar days.",
  fcScopeBroader: "Compared with broader history (few similar days).",
  fcDetails: "Model details",
  fcMape: "Median percentage error (backtest)",
  fcMae: "Mean absolute error (entries)",
  fcValidationDays: "Validation days",
  fcCoverage: "Interval coverage in backtest",
  fcHistory: "Complete / examined history days",
  fcMethod: "The total compares observed first entries at the scheduled time with earlier complete days across seasons in the last 5 years. Matching weekdays, similar periods, Italian national holidays, Christmas and Easter receive more weight. At least 12 training and 12 validation days are required. Weather and lift openings are not considered. The predicted day's final count is never used; at the final extraction the latest available forecast remains, no later than 14:00.",
  fcIntervalNote: "The indicative interval is the central 80% of earlier errors: it does not guarantee 80% coverage.",
  fcModel: "Model",
  fcStatus: { ready: "Ready", before_extraction: "Not yet", missing_extraction: "Missing extraction", incomplete_extraction: "Incomplete extraction", insufficient_history: "Insufficient history", insufficient_validation: "Insufficient validation", no_data: "No data", zero_entries: "Zero entries" },
  fcStatusHelp: { ready: "", before_extraction: "The selected extraction is before this time.", missing_extraction: "No extraction available at this time.", incomplete_extraction: "The extraction at this time is incomplete.", insufficient_history: "Fewer than 12 usable history days.", insufficient_validation: "Fewer than 12 validation days.", no_data: "No data for this date.", zero_entries: "No first entries recorded at this time." },
  fcConfidence: { unavailable: "Unavailable", low: "Low", medium: "Medium", high: "High" },
  pc: { weekly: "Weekly", progressive: "Season to date", title: "First entries", prev: "Prev.", diff: "Diff%", na: "n/a", error: "Comparison unavailable.", retry: "Retry", config: "Season start date needs admin configuration.", configAdmin: "Configure the season start date.", openSettings: "Open settings", beforeSeason: "Date is before season start.", noData: "No data for comparison.", partial: "Partial at {time}", missing: "Incomplete coverage", missingCur: "Missing days (current)", missingPrev: "Missing days (previous)", noPrevSeason: "No previous season", ssTitle: "Season start", ssHint: "First useful day per season (normally Saturday). Used for weekly and season-to-date comparisons.", ssFirstData: "First data", ssSuggested: "Suggested", ssUseSuggested: "Use suggested", ssConfigured: "Configured", ssNotSet: "Not configured", ssSave: "Save", ssClear: "Clear", ssSaved: "Saved", ssInvalid: "Format YYYY-MM-DD", ssNotSaturday: "Not a Saturday", ssError: "Save failed", ssLoadError: "Unable to load seasons.", ssEmpty: "No seasons.", colSeason: "Season", colStart: "First day", colAction: "Action" },
};

export const translations: Record<Language, Translations> = { it, en };
