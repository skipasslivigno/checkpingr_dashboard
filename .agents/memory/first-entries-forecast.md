---
name: Previsione dei primi ingressi
description: Significato del conteggio da prevedere e limiti operativi da non reinterpretare.
---

La previsione richiesta è il totale a fine giornata dei «Primi ingressi» già
mostrati nella dashboard, alle estrazioni 10:30, 11:30 e 14:00. Non ridefinire
silenziosamente questa metrica scegliendo un contatore dal nome apparentemente
più appropriato.

**Why:** l'utente ha chiesto una previsione della metrica esistente. I contatori
importati possono coincidere nei dati recenti e divergere nei vecchi: il solo
nome «primi» non basta per decidere quale sia il dato atteso dal prodotto.

**How to apply:** mantenere previsione e dato effettivo semanticamente coerenti;
un'eventuale revisione del significato dei contatori va concordata separatamente.
Le assunzioni e il metodo riproducibile sono descritti in
`docs/first-entries-forecast.md`, incluso il limite operativo delle estrazioni
serali dalle 18:00, che non è una conferma esterna degli orari di chiusura.

## Disponibilità per ruolo

Per i visualizzatori la previsione va fatta solo sui dati odierni e va evitata
quando la giornata è passata in consuntivo. Per gli amministratori deve esserci
un'opzione per calcolarla anche sulle giornate passate o chiuse.

**Why:** l'utente vuole usare l'opzione amministratore per verificare il
funzionamento, senza mostrare ai visualizzatori previsioni inutili sui consuntivi.

**How to apply:** la modalità ordinaria resta limitata a oggi e prima del
consuntivo; l'eccezione di verifica è esplicita e controllata dal ruolo anche sul
server. Selezionare un'estrazione mattutina di una giornata già chiusa non deve
aggirare il limite.
