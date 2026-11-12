# Invio delle credenziali tramite Gmail

## Configurazione personale

Ogni amministratore configura la **propria** casella dall'elenco utenti, usando
il pulsante **Email e credenziali**. Il mittente è l'indirizzo dell'account
amministratore collegato all'app: non è possibile indicare un altro mittente.
Anche un indirizzo aziendale con dominio personalizzato è compatibile se la
casella è effettivamente ospitata su Gmail / Google Workspace.

1. Attivare la verifica in due passaggi nell'account Google.
2. Aprire <https://myaccount.google.com/apppasswords> e creare una password per
   questa applicazione. Non utilizzare la password normale dell'account Google.
   Se l'opzione non compare, verificare le limitazioni del proprio account e
   le policy dell'amministratore Google Workspace.
3. Nell'app impostare nome mittente, password per app Google e **indirizzo HTTPS
   di accesso al sito pubblico**, verificando che sia quello dell'ambiente corretto.
   L'indirizzo non viene dedotto dal dominio di sviluppo.
4. Personalizzare oggetto e corpo del template e controllare l'anteprima.
5. Salvare: il salvataggio non invia email e non verifica la connessione.
6. Usare **Invia email di prova**. Il destinatario è sempre l'amministratore
   collegato; viene richiesta una conferma prima dell'invio reale.

La conferma di Gmail significa che il suo server SMTP ha accettato il messaggio,
non che il destinatario lo abbia ricevuto nella posta in arrivo. Controllare
anche spam, limiti di invio e policy Google Workspace.

## Invio a un utente

Nell'elenco utenti usare **Invia credenziali** sulla riga desiderata.
La conferma mostra mittente, destinatario e anteprima con una password di esempio
non valida. Nessun invio automatico avviene alla creazione di un account.

Confermando l'invio viene generata una nuova password temporanea. Quando Gmail
accetta il messaggio, la password sostituisce quella precedente, le vecchie
sessioni vengono invalidate e il cambio password diventa obbligatorio.
L'utente può completarlo con la password temporanea ricevuta via email.
Gli utenti disattivati non possono ricevere credenziali.

Un errore SMTP non modifica la password precedente. Se la richiesta si interrompe
o compare un errore generico dopo l'invio, controllare la data dell'ultimo invio
e la casella del destinatario prima di riprovare: una connessione interrotta
non prova che il messaggio non sia stato accettato.
Tra due invii allo stesso utente deve trascorrere almeno un minuto.

## Template

Il template è personale per amministratore. I campi supportati sono:

- `{{nome_app}}`
- `{{nome_organizzazione}}`
- `{{nome_utente}}`
- `{{email_utente}}`
- `{{password_temporanea}}`
- `{{url_accesso}}`
- `{{nome_amministratore}}`

Il corpo deve contenere email utente, password temporanea e URL di accesso.
La password non può comparire nell'oggetto. L'editor accetta testo semplice:
il server produce una versione testuale e una HTML con caratteri protetti.
Le anteprime non generano password valide e non inviano messaggi.

## Requisiti del VPS e protezione dei dati

- Consentire connessioni in uscita verso `smtp.gmail.com` sulla porta TCP **465**.
  La connessione usa TLS con verifica del certificato; host e porta non sono
  modificabili dall'interfaccia.
- Conservare una `SESSION_SECRET` forte e stabile, di almeno 32 caratteri, sul
  server API. Oltre alla firma delle sessioni, da questa viene derivata una
  chiave separata per cifrare le password per app con AES-256-GCM, associate
  al singolo amministratore.
- **Cambiare `SESSION_SECRET` rende illeggibili le password per app salvate**:
  ogni amministratore dovrà reinserire la propria. Non sostituirla durante
  i normali deploy.
- La password per app è scrivibile nell'interfaccia ma non è mai restituita dalle
  API. Non viene salvata nella memoria persistente del browser né nei log.
  La password temporanea dell'utente viene inviata solo via email; nel database
  viene conservato esclusivamente l'hash bcrypt.
- **Rimuovi configurazione** elimina password per app e template personali di
  quell'amministratore, senza cambiare le impostazioni degli altri.
- Il deploy deve applicare anche le modifiche allo schema del database, tramite
  la procedura già prevista in `scripts/deploy.sh`, oltre a ricompilare API e web.

## Verifica automatica

Nell'ambiente di sviluppo, con il database di sviluppo e `SESSION_SECRET`
configurati:

```bash
pnpm --filter @workspace/api-server run test:email
```

I test usano organizzazioni temporanee e un trasporto SMTP simulato:
non inviano email reali e rimuovono i propri dati al termine. Non eseguire
questo comando con una connessione al database di produzione.
