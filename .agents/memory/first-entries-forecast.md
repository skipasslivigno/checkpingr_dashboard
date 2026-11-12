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
