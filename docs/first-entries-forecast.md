# Previsione dei primi ingressi

La dashboard mostra una stima separata dal dato effettivo. Il conteggio previsto
è **`SUM(nuin)`**, lo stesso che la dashboard chiama «Primi ingressi»: non
`npas` e non una nuova somma dei conteggi di più estrazioni.

## Calcolo e dati ammessi

- Tre orari locali **Europe/Rome**: 10:30, 11:30, 14:00. `dupd` è una stringa
  locale `YYYYMMDDHHmmss`; non viene reinterpretata come UTC.
- Si usa una singola estrazione completa, non l'ultima riga disponibile di ogni
  impianto mescolata ad altre estrazioni. Non si sostituisce un'estrazione mancante
  con quella successiva. Il minuto deve corrispondere all'orario previsto.
- Per lo storico si considerano i cinque anni precedenti alla data richiesta,
  esclusivamente nello stesso tenant. Il limite delle stagioni visibili nei grafici
  non limita le stagioni usate dal modello.
- Consuntivo storico: ultima estrazione del giorno, solo se dalle **18:00** in poi.
  Questa è un'ipotesi operativa di chiusura per l'attuale comprensorio, non una
  scoperta automatica degli orari degli impianti.
- Sono esclusi consuntivi a zero, contatori negativi/in calo, impianti attivi senza
  conteggio, roster incompleti e date duplicate su più stagioni. I null degli impianti
  inattivi sono trattati come zero, come nella dashboard.
- Per la giornata prevista si controllano i roster già noti prima dell'estrazione,
  incluso l'ultimo giorno storico completo della stessa stagione: se mancano
  impianti, nessuna previsione. Un cambio reale di roster che rimuove un impianto può
  quindi sospendere prudentemente la previsione fino a un nuovo giorno completo.
- Non si pretende di riconoscere import incompleti senza alcun precedente utile.

Per ogni giorno utilizzabile si calcola il rapporto consuntivo/conteggio all'orario.
Se ci sono almeno 12 giorni con stesso giorno della settimana, categoria festiva e
periodo entro 45 giorni di calendario, si usano quelli. Altrimenti si allarga lo
storico e si indica attendibilità bassa. La mediana ponderata favorisce periodi
vicini, stesso giorno/settimana lavorativa e dati recenti (emivita di due anni);
si usano al massimo i 180 esempi con peso maggiore. La stima non scende sotto il
conteggio già osservato **a quell'orario**, senza utilizzare un consuntivo successivo.

Le categorie includono Natale/Capodanno (24 dicembre–6 gennaio), festività
nazionali italiane, Pasqua e Pasquetta. Non includono tutti i calendari scolastici
regionali o internazionali. Meteo, aperture e capacità degli impianti non sono
variabili del modello.

## Validazione e intervallo

- Simulazione cronologica sulle ultime 120 giornate idonee per ciascun orario;
  ogni previsione usa soltanto giornate precedenti. La data oggetto della richiesta
  non entra mai in addestramento o validazione.
- Gli indicatori riassumono gli ultimi 60 errori fuori campione: errore
  percentuale **mediano**, errore medio assoluto in ingressi, giorni di validazione.
- L'intervallo indicativo deriva dai quantili 10%/90% dei residui relativi di quelle
  previsioni. Include la stima e non scende sotto il conteggio osservato.
  Non è una garanzia di copertura all'80%.
- La copertura mostrata è misurata cronologicamente: anche l'intervallo di ogni
  giorno di test usa solo errori di giorni precedenti, mai il proprio risultato.
- Servono almeno **12 giorni di addestramento e 12 previsioni validate** per
  pubblicare una stima. I dati insufficienti sono uno stato esplicito, non una
  previsione generata con numeri fittizi.
- Attendibilità alta richiede giorni simili, almeno 40 esempi, 30 validazioni,
  errore mediano ≤10% e copertura ≥75%; media richiede giorni simili, almeno 24
  validazioni, errore ≤20% e copertura ≥60%. Negli altri casi è bassa.

## API e interfaccia

`GET /api/lifts/first-entries-forecast?date=YYYY-MM-DD&season=...&extraction=YYYYMMDDHHmmss&mode=live`

Richiede l'autenticazione esistente. Il tenant deriva dall'utente, mai dai parametri.
La data deve essere reale; un'estrazione specifica deve appartenere alla data e
stagione richieste. Nessun dato successivo all'estrazione selezionata o all'ora
reale può essere utilizzato.

### Previsione ordinaria e modalità verifica

La modalità ordinaria (`mode=live`, predefinita) è limitata alla **data odierna in
Europe/Rome**, finché non è disponibile un'estrazione serale valida dalle 18:00
in poi. La presenza del consuntivo è verificata su tutte le estrazioni odierne della
stagione richiesta, non solo su quella selezionata: tornare alle 10:30 non riattiva
la previsione dopo il consuntivo. Un import con orario futuro non chiude in anticipo
la giornata.

Visualizzatori e operatori non vedono la scheda sulle giornate passate o chiuse.
Le API non eseguono il modello su giornate non ammesse e rispondono con
`availability=past_day|day_closed|future_day` e `forecasts=[]`. Nella risposta
sospesa lo storico non viene calcolato: i contatori di copertura sono zero.

Gli amministratori hanno un interruttore **Modalità verifica**, disattivato per
default, per richiedere `mode=verification` anche sulle giornate passate o già a
consuntivo. Le API controllano il ruolo verificato dal server; un visualizzatore
o operatore che prova a forzare il parametro riceve HTTP 403.
La modalità resta locale alla scheda e all'account corrente, non è una preferenza
globale né viene ereditata da un altro utente. Le date future rimangono escluse.

La scheda si aggiorna al cambio data/stagione/estrazione, con il refresh della
dashboard e con una richiesta ogni minuto mentre la data è ammessa. La data locale
viene rivalutata anche lasciando la scheda aperta a mezzanotte. L'utente può
ispezionare i tre orari e aprire i dettagli. Solo in modalità verifica, all'estrazione
serale resta l'ultima previsione disponibile, al massimo quella delle 14:00:
non viene sostituita dal consuntivo.
Il calcolo è in sola lettura e su richiesta, senza job programmati, invio di email,
modifiche alle estrazioni o salvataggio di previsioni immutabili. Import storici
corretti successivamente possono modificare le ricostruzioni.

## Verifica riproducibile in sviluppo

```sh
pnpm --filter @workspace/api-server run test:forecasts
node --test artifacts/skiarea-dashboard/scripts/forecast-view.test.mjs
pnpm --filter @workspace/api-server run analyze:forecasts 2026-02-10
```

L'analisi legge i dati senza modificarli e non stampa identità, credenziali o
estrazioni grezze. Senza data usa l'ultimo giorno storico disponibile.

Nel dataset di test, alla data 2026-02-10 risultavano 502 giornate complete
utilizzabili nei cinque anni precedenti. Sulle 60 validazioni precedenti a quella
data, gli errori mediani erano circa 8,0%, 2,9% e 0,7% rispettivamente.
Sono misure su quel dataset, non promesse sul comportamento futuro.
La giornata del 10 febbraio stessa è un esempio di errore più alto:
consuntivo 2.500, stime 2.005 / 2.150 / 2.327. Il consuntivo cadeva fuori dagli
intervalli di quel giorno: rendere visibile questo limite è parte della funzionalità.
