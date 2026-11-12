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
