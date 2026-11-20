---
name: Responsive layout preference
description: User-approved local device/browser width policy and sizing constraints for the main dashboard screens
---

La larghezza massima dell'interfaccia è una preferenza del **dispositivo/browser**,
non dell'account. Le opzioni approvate sono Compatta (640 px), Standard (960 px,
predefinita), Ampia (1200 px) e Tutto schermo (senza limite).

**Why:** l'utente ha segnalato Periodo e Grafici troppo larghi su PC e ha scelto
di poter usare larghezze diverse su PC e telefono senza sincronizzarle.

**How to apply:** mantenere il contenuto centrato e il limite condiviso fra le
schede principali, inclusa la barra di navigazione inferiore nel browser come
richiesto dall'utente. Su telefono è un massimo, non una larghezza fissa. Rendere la
scelta accessibile anche a visualizzatori e operatori. Non spostarla nelle sole
impostazioni amministrative né nel database dell'utente.

Le liste virtualizzate devono essere limitate tramite il loro contenitore,
non solo tramite lo stile del contenuto interno.

**Why:** uno stile applicato soltanto al contenuto di FlatList non limitava le
righe: nomi e colonne numeriche restavano distanti su monitor larghi.

**How to apply:** per nuove schede riusare la preferenza condivisa; misurare i
grafici sul contenitore effettivo, non sul monitor. Non cambiare incidentalmente
i breakpoint delle schermate amministrative o dei modali non vincolati.

Usare il logo e il titolo in maiuscolo nel colore principale in tutte le
intestazioni delle schede. In Dashboard la data va mostrata nel selettore,
non ripetuta nell'intestazione.

**Why:** l'utente vuole uno stile uniforme e ha segnalato che il logo mobile
era diventato troppo piccolo.

**How to apply:** su schermi stretti spostare i comandi secondari sotto
l'intestazione piuttosto che ridurre troppo il logo o troncare il titolo.
