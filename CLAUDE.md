# crosswords

> Istruzioni di team, versionate. Questo file è l'indice del progetto: indicizza i soli file satellite tracciati e descrive la procedura di ripresa. Le preferenze personali vivono in `CLAUDE.local.md`, ignorato da git, non qui.

## Cos'è questo progetto

Software open source (MIT) per la costruzione di cruciverba all'italiana: web app locale-first in TypeScript puro con Vite, senza server e senza framework, con editor di griglia, riempimento automatico e assistito basato su dizionario italiano (motore CSP in Web Worker), editor delle definizioni, salvataggio in formato ipuz e stampa. Modello architetturale di riferimento: Exet.

## Procedura di ripresa in una sessione nuova

Lo stato del progetto è interamente recuperabile su disco. All'inizio di una sessione si segue questo percorso fisso. Si legge per primo `.claude/memory/index.md`, che dà branch, commit di riferimento, stato di verifica di ogni scheda e punto di ripresa. Si legge poi `.claude/context/current-work.md` se c'è una feature attiva, per sapere cosa è in lavorazione e quali sono i TODO e i limiti d'ambiente. Si invoca la skill `sync-context` per verificare il drift tra schede e codice, e si leggono solo le schede pertinenti al task, mai tutte insieme. Il work-log `.claude/memory/progress.md` e il registro `.claude/memory/decisions.md` forniscono la storia e le decisioni quando servono. Il materiale grezzo sotto `_notes/` si apre solo per verificare un requisito originale. Per una ripresa rapida esiste, quando presente, `_notes/RESUME-PROMPT.md`, privato e ignorato: riporta lo stato raggiunto e un prompt pronto da incollare. Va aggiornato alla fine di ogni sessione con il punto in cui si è arrivati, mentre lo stato canonico resta `.claude/memory/index.md`.

## Indice dei file satellite tracciati

Memoria e meta-stato, sotto `.claude/memory/`, letti sempre a inizio sessione.

```
.claude/memory/index.md       snapshot e tabella di sincronizzazione, da leggere per primo
.claude/memory/progress.md    work-log append-only di passi e riconciliazioni
.claude/memory/decisions.md   registro ADR-lite delle decisioni architetturali
```

Schede tecniche, sotto `.claude/context/`, con frontmatter di riconciliazione.

```
.claude/context/STACK.md                stack, flussi di codice, ruolo architetturale dei file
.claude/context/design-and-security.md  paradigmi di design e sicurezza applicativa
.claude/context/deployment.md           livelli test e produzione, hosting, comandi
.claude/context/dev-testing.md          test di sviluppo, runner, rotte mockate, hook
.claude/context/current-work.md         feature attiva, definition of done, domande aperte
.claude/context/roadmap.md              direzione e priorità
```

Documentazione di dominio, sotto `docs/`.

```
docs/normativa-cruciverba-italia.md    quadro giuridico e fiscale per pubblicare cruciverba in Italia
docs/reference/                        materiale di riferimento (guida Qxw, link); pdf ed exe ignorati
```

Regole modulari caricate su necessità, sotto `.claude/rules/`, e skill richiamabili, sotto `.claude/skills/`. Lo standard di sistema completo è in `.claude/PROJECT-SYSTEM.md`.

## Regole di architettura del codice

La logica di dominio vive in `src/core/` e non importa nulla; `src/dict/`, `src/fill/` e `src/io/` importano solo `core`; `src/ui/` e `src/print/` possono importare tutto ma nessun modulo importa `ui`. Questo mantiene modello, filler e I/O testabili headless con vitest. Il filler gira esclusivamente nel Web Worker (`src/fill/worker.ts`) dietro il protocollo messaggi di `fillerClient.ts`. Il formato di serializzazione è uno solo, ipuz JSON, usato sia per i file sia per l'autosave in localStorage.

Norme caricate su richiesta, una riga per situazione con le parole con cui si presenta, così che il caricamento non dipenda dal ricordare che la norma esista.

- `git worktree list` mostra più di un albero, se ne crea o se ne rimuove uno, si deve decidere da dove leggere la memoria versionata: skill `alberi-di-lavoro`.
- Un recupero web fallisce con 403 o con una pagina di verifica anti-bot, la fonte sta su Reddit o su Discord, serve la trascrizione di un video, si sta per annotare una fonte non letta: skill `fonti-non-recuperabili`.
- Si scrive o si valuta una prova automatica, si chiude un difetto, una verifica manuale smentisce una suite verde, si sta per dichiarare completo un intervento il cui scopo era un effetto misurabile: skill `prove-che-misurano`.
- Si inizializza o si allinea il progetto, oppure cambia il modo in cui si prova e si rilascia, e va deciso come separare test e produzione: skill `separazione-ambienti`.

## Apprendimenti recenti

Voci brevi e datate per le decisioni e le scoperte operative che non hanno ancora una casa definitiva. La voce nasce qui e migra appena possibile nella sede propria, poi si cancella: questa sezione è un buffer, non un archivio.

```
- [<YYYY-MM-DD>] <decisione o scoperta, una riga>
```

## Vincoli di team

Le operazioni di `git add`, commit e push restano sempre manuali dell'utente: l'agente prepara i file, non committa. L'identità git è impostata a livello locale del repo secondo `.claude/rules/git-identity-and-repo.md`. Lo stile di documentazione e di interazione è quello di `.claude/rules/interaction-style.md`. Claude non scrive autonomamente nei file di memoria e di contesto: li aggiorna solo su richiesta esplicita, così il versionamento resta sotto controllo umano.
