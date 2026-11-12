---
name: Confronti settimanali e progressivi
description: Regole di business concordate per allineare le stagioni e distinguere parziali e consuntivi.
---

Usare i **primi ingressi**, non passaggi o altri contatori. Le settimane partono
dal sabato. Il confronto è sullo stesso giorno della settimana, partendo dal
primo giorno utile delle rispettive stagioni, impostabile dagli admin per ogni
stagione. Di prassi le stagioni iniziano di sabato.

**Why:** l'utente ha specificato metrica, allineamento e configurazione delle
aperture; non è corretto dedurre l'apertura ufficiale dal primo dato importato.

**How to apply:** niente anniversario di calendario o offset fisso annuale.
Il sabato della settimana dell'apertura è l'ancora del confronto; le somme
iniziano comunque dalla data configurata. Un'apertura non di sabato è ammessa
con avviso, perché «di prassi» non è un divieto.

I consuntivi sono i record delle **23:30**. Senza consuntivo della giornata,
alle 10:30/11:30 i totali si fermano al giorno precedente e si confrontano
con il precedente giorno equivalente dell'altra stagione. Alle 14:00,
16:30 e 18:00 si include anche il parziale della giornata. Se il consuntivo
esiste già, si include la giornata anche selezionando un'estrazione mattutina.

**Why:** regola esplicita dell'utente; ha confermato separatamente l'inclusione
alle 14:00. Le 18:00 non sono quindi il consuntivo.

**How to apply:** usare lo stesso termine equivalente in entrambi i periodi;
storico e giorni precedenti richiedono le 23:30. Il riconoscimento del
consuntivo va mantenuto coerente anche nelle previsioni.

Non sostituire consuntivi mancanti con parziali o zeri, né inventare percentuali
quando il riferimento è assente o zero.

**Why:** evita confronti apparentemente precisi ma sottostimati per dati mancanti.

**How to apply:** indicare indisponibilità e rendere consultabili le date mancanti;
conservare gli zeri effettivamente importati.

## Durate diverse e fine stagione

Le stagioni possono finire in giorni diversi, per esempio il primo maggio o
dopo. L'utente vuole il totale definitivo precedente, non «dati incompleti»,
quando il confronto supera la fine della stagione precedente.

**Why:** richiesta esplicita dell'utente; l'assenza di dati dopo la chiusura non
è un buco negli import.

**How to apply:** consentire agli admin di configurare anche l'ultimo giorno
di apertura incluso. Il progressivo precedente si ferma al totale annuale;
il settimanale usa l'ultima settimana di apertura. Mostrare «Definitivo» solo
quando i consuntivi entro la chiusura sono completi. Non dedurre la chiusura
da un ultimo record isolato e non nascondere buchi interni alla stagione.

## Precedenza dei dati nella stagione selezionata

La data di fine configurata non deve far perdere la giornata visualizzata
quando contiene un'estrazione includibile o il consuntivo, né consuntivi
precedenti già presenti oltre quel limite.

**Why:** l'utente ha segnalato un progressivo fermo al 2 maggio mentre
visualizzava il consuntivo del 3 maggio; ha ribadito che le 14:00, 16:30,
18:00 e 23:30 includono la giornata, e la mattina la include se esiste il
consuntivo.

**How to apply:** per la stagione selezionata usare la fine configurata
solo per limitare giorni successivi senza dati. I dati osservati hanno
precedenza; una data finale contraddetta dai dati non certifica un totale
definitivo. Conservare il limite configurato per il confronto precedente.
