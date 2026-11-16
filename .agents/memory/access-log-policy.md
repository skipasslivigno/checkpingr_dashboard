---
name: Registro accessi
description: Ambito del registro degli accessi richiesto per questa app
---

Il registro deve includere gli accessi riusciti e i tentativi falliti.

**Why:** l'utente ha scelto esplicitamente «Riusciti e falliti».

**How to apply:** mantenere entrambi gli esiti nelle future modifiche del registro; non ridurlo al solo ultimo accesso riuscito.

Registrare anche l'IP di connessione.

**Why:** l'utente ha chiesto esplicitamente di tracciare anche l'IP.

**How to apply:** includerlo nei tentativi riusciti e falliti. Fidarsi delle intestazioni inoltrate solo da proxy affidabili, non dal client pubblico; sul VPS il proxy nginx documentato si collega localmente. Se cambia la topologia, rivalutare la fiducia prima di ampliarla.

Gli eventi per email sconosciute non vanno mostrati agli amministratori di un'organizzazione.

**Why:** un tentativo anonimo con email sconosciuta non contiene un'appartenenza affidabile; esporlo in tutti i registri violerebbe l'isolamento fra organizzazioni.

**How to apply:** non inferire l'organizzazione dal dominio email, da parametri del client o dall'amministratore che consulta il registro.

Se il registro non può salvare un accesso, non emettere una nuova sessione.

**Why:** il registro deve essere verificabile; ignorare il fallimento produrrebbe accessi riusciti non tracciati.

**How to apply:** segnalare indisponibilità temporanea senza mostrare credenziali o dettagli tecnici; assicurarsi che la tabella esista prima di attivare il codice in produzione.
