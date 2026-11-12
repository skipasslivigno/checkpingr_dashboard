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
`docs/first-entries-forecast.md`. L'utente ha chiarito che il consuntivo è
l'estrazione delle **23:30**: le 18:00 sono ancora un parziale. Applicare
questa regola sia allo storico di addestramento sia alla chiusura dei dati
odierni per i visualizzatori.

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

## Presentazione compatta

La dashboard non deve ripetere la stagione in una scheda statistica, perché è già
indicata nella fascia di selezione in alto. Al suo posto va mostrato il valore
previsto, quando disponibile. Gli altri dati della previsione devono apparire solo
su richiesta.

**Why:** l'utente ha segnalato che il blocco con i dettagli della previsione
riempiva troppo lo schermo e che la scheda della stagione era ridondante.

**How to apply:** mantenere il riepilogo compatto tra le statistiche e i dettagli
in un pannello apribile; la verifica admin deve restare raggiungibile anche senza
una previsione ordinaria disponibile, senza ripristinare il grande blocco inline.
