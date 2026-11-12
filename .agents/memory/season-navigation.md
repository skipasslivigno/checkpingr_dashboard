---
name: Navigazione nelle stagioni
description: Regole richieste per la selezione di stagione e giorno in Dashboard e Impianti.
---

La navigazione giornaliera in Dashboard e Impianti non deve consentire di passare al giorno precedente il primo giorno della stagione o successivo all'ultimo.

**Why:** richiesta esplicita dell'utente: questi giorni ricadrebbero in un'altra stagione.

**How to apply:** anche la stagione più recente deve essere trattata come una stagione specifica, non come assenza di filtro. Il cambio stagione deve selezionare un giorno valido nella stagione scelta, anche dopo un refresh su Impianti.

## Confronto nei grafici

L'utente deve poter confrontare tutte le stagioni rese disponibili nelle impostazioni, comprese quattro stagioni contemporaneamente, con colori coerenti tra selettore, legenda e grafici.

**Why:** l'utente ha richiesto esplicitamente che aggiungendo quattro stagioni sia possibile visualizzarle tutte e quattro con i colori giusti.

**How to apply:** non introdurre un limite di confronto inferiore a quello configurabile; il colore identifica la stagione e non la sua posizione nel sottoinsieme selezionato.
