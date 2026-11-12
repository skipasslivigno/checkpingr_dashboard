---
name: Workspace Node test runtime
description: Why server tests need bundling rather than native Node loading of workspace TypeScript
---

Non affidarsi al supporto TypeScript nativo di Node per eseguire direttamente
i test server che importano pacchetti workspace: i barrel sorgente usano
import di directory che il resolver ESM di Node non supporta.
Anche esternalizzare tutti i pacchetti durante il bundle può fallire:
le dipendenze transitive di un pacchetto workspace non sono necessariamente
installate nel pacchetto server.

**Why:** il runtime Node accetta il TypeScript ma fallisce prima dei test
sulla risoluzione dei moduli; lasciare esterno il workspace sposta il problema,
non lo risolve.

**How to apply:** per i test server mantenere il bundling dei sorgenti
workspace e delle loro dipendenze, usando il runner esistente come riferimento.
CommonJS evita inoltre i problemi di `require` dinamico delle librerie Node
incluse nel bundle. Non aggiungere dipendenze duplicate solo per far funzionare
un test bundle completamente esternalizzato.
