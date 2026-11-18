---
name: Diario operativo
description: Ambito del diario condiviso e separazione dalle metriche e dalle estrazioni.
---

Il diario operativo deve accettare annotazioni anche nelle giornate senza
estrazioni, comprese manutenzione e preparazione della stagione. Le note non
dipendono dall'estrazione oraria selezionata e non modificano conteggi o previsioni.
Nei confronti di periodo le annotazioni delle due stagioni restano separate,
con le rispettive date effettive.

**Why:** l'utente ha richiesto un diario che aiuti a interpretare i risultati,
non una fonte di correzioni dei dati o di indicatori operativi dedotti.

**How to apply:** non vincolare il diario autonomo alle date disponibili nei
conteggi o alla navigazione stagionale della Dashboard. Meteo e neve da API
esterna sono un'attività separata, non parte delle annotazioni manuali.

Il diario non deve spostare in basso gli impianti: accesso tramite un'icona,
nessun riquadro vuoto se non ci sono note. Le note visibili possono stare
in fondo, dopo l'elenco impianti.

**Why:** l'utente vuole mantenere prioritari i dati degli impianti nella Dashboard.

**How to apply:** mantenere l'accesso al diario anche senza note, evitando
blocchi introduttivi o messaggi di assenza note sopra gli impianti.
