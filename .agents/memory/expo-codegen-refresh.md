---
name: Rigenerazione del client con Expo attivo
description: Errore transitorio di Metro quando Orval ricrea la cartella dei client generati.
---

Se Metro segnala di non trovare il client generato durante o dopo il codegen,
verificare prima che la rigenerazione sia terminata e che il file esista.
Non correggere un import valido solo per questo errore.

**Why:** Orval elimina e ricrea la cartella; durante un aggiornamento il server
Expo attivo ha segnalato il modulo mancante nonostante il codegen e il controllo
tipi fossero poi terminati correttamente.

**How to apply:** dopo il batch di modifiche, se l'errore resta nei log o la
preview non si aggiorna, riavviare il workflow Expo e confermare che il bundle
venga servito correttamente. Non reinstallare dipendenze per questo caso.
