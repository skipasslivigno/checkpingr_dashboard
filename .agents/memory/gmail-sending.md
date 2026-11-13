---
name: Gmail sending requirements
description: User's choice of personal Gmail senders and app-password authentication for credential emails
---

La posta interna usa Gmail. Le email con le credenziali devono partire
dall'indirizzo dell'amministratore collegato in quel momento, non da una
casella condivisa impostata globalmente. L'utente ha scelto **Gmail con
password per app**, non autorizzazione Google OAuth.

**Why:** scelta esplicita dell'utente per gli invii delle credenziali
nell'app pubblicata sul VPS.

**How to apply:** mantenere la configurazione personale per amministratore
e l'identità del mittente legata all'account autenticato. Non sostituire
questo comportamento con un unico account Gmail del progetto.

## Password temporanee e primo accesso

Le password generate per l'invio delle credenziali devono seguire lo schema
richiesto dall'utente: **una parola, quattro numeri e un simbolo**, senza spazi.
Nel cambio obbligatorio dopo l'accesso con la password temporanea non va
richiesta una seconda volta la vecchia password.

**Why:** l'utente ha segnalato password generate troppo lunghe e un reinserimento
superfluo della password già usata per accedere.

**How to apply:** mantenere semplice il percorso obbligatorio, senza estendere
l'esenzione al cambio volontario della password. La condizione va verificata
sul server, non accettata da un flag inviato dal client.
