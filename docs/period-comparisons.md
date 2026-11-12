# Riepiloghi settimanali e progressivi

I due riepiloghi della dashboard sommano i **primi ingressi (`nuin`)**.
Il primo giorno di ogni stagione viene configurato dall'amministratore in
**Impostazioni → Inizio stagione**, separatamente per ciascun tenant.
Il sabato suggerito dai primi dati disponibili non è una data di apertura
confermata: deve essere salvato esplicitamente.

## Allineamento

- La settimana comincia di sabato.
- Il progressivo comincia dal primo giorno configurato della stagione.
- Il confronto usa la stessa settimana e lo stesso giorno della settimana
  rispetto al sabato della settimana di apertura delle due stagioni.
- Non usa il semplice anniversario di calendario né una sottrazione fissa
  di 365 giorni. Per esempio: lunedì 8 dicembre 2025, con apertura
  29 novembre 2025, viene confrontato con lunedì 9 dicembre 2024 se
  l'apertura precedente è il 30 novembre 2024.
- La precedente è la stagione dell'anno precedente, non una stagione
  più vecchia scelta silenziosamente se mancano dati.
- Le aperture normalmente sono di sabato. Una data diversa è consentita
  con avviso: l'allineamento conserva il giorno settimanale e le somme
  non includono giorni prima delle rispettive aperture.

## Consuntivi e giornata selezionata

Solo le estrazioni delle **23:30** sono consuntivi. Non si sommano le
diverse estrazioni dello stesso giorno e non si mescolano import diversi.
Lo storico della stagione selezionata e quello precedente usano esclusivamente
un consuntivo per giornata.

Se esiste il consuntivo della giornata selezionata, il giorno viene incluso
anche selezionando un'estrazione mattutina. Altrimenti:

| Estrazione selezionata | Termine del periodo |
| --- | --- |
| 10:30, 11:30, altri orari prima delle 14 | Giorno precedente |
| 14:00, 16:30, 18:00 | Giorno selezionato con il parziale scelto |
| 23:30 | Giorno selezionato con il consuntivo |

Il periodo precedente termina sempre al giorno equivalente dello stesso
periodo corrente. Al sabato mattina senza consuntivo il termine è il venerdì,
quindi il settimanale rappresenta la settimana appena conclusa. Prima del
primo giorno utile non si contano giorni appartenenti ad altre stagioni.

## Dati mancanti

Un giorno senza il consuntivo atteso non viene interpretato come zero e
non viene sostituito con il parziale delle 18:00. La relativa somma è
indisponibile e la dashboard permette di vedere le date mancanti.
Uno zero realmente importato rimane zero; se il confronto ha denominatore
zero, la percentuale è «n.d.» anziché infinita.

Date di apertura mancanti, stagione precedente assente, input errati,
estrazioni inesistenti e dati incompleti hanno stati espliciti.
Non vengono salvati nuovi totali o modificati gli snapshot importati.

La configurazione delle aperture è persistente e l'aggiornamento di una
stagione modifica atomicamente solo quella voce, preservando colori,
logo e salvataggi simultanei di altre stagioni.

## Verifica

`pnpm --filter @workspace/api-server run test:periods`

Copre allineamento, orari, consuntivi, zeri, buchi, confini, permessi,
isolamento tenant, salvataggio parallelo e persistenza su dati di test
temporanei rimossi automaticamente.

Il riconoscimento del consuntivo del modello previsionale usa la stessa
regola delle 23:30; la versione è `historical-ratio-2330-v2`.
