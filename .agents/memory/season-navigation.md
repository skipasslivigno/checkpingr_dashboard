---
name: Navigazione nelle stagioni
description: Regole richieste per la selezione di stagione e giorno in Dashboard e Impianti.
---

La navigazione giornaliera in Dashboard e Impianti non deve consentire di passare al giorno precedente il primo giorno della stagione o successivo all'ultimo.

**Why:** richiesta esplicita dell'utente: questi giorni ricadrebbero in un'altra stagione.

**How to apply:** anche la stagione più recente deve essere trattata come una stagione specifica, non come assenza di filtro. Il cambio stagione deve selezionare un giorno valido nella stagione scelta, anche dopo un refresh su Impianti.
