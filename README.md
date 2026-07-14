# crosswords

Costruttore di cruciverba all'italiana nel browser: web app locale-first, senza server e senza
framework, in TypeScript con Vite. Tutto il lavoro resta sulla tua macchina.

Con l'app si disegna lo schema (caselle nere libere, parole da due lettere in su, simmetria
180° facoltativa, dimensioni da 5×5 a 25×25), si riempie la griglia in automatico o parola per
parola con un dizionario italiano di circa 350.000 voci con punteggio (nomi propri inclusi), si
scrivono le definizioni, si salva in formato aperto ipuz e si stampa schema e soluzione in A4.

## Funzioni principali

Il motore di riempimento è un risolutore a vincoli (backtracking con euristica MRV, forward
checking e consistenza d'arco, restart e timeout con miglior riempimento parziale) che gira in
un Web Worker: la pagina resta reattiva e il riempimento si può fermare. Durante il disegno
dello schema le celle si colorano quando un incrocio diventa critico: rosso se nessuna lettera
è possibile, arancio se ne restano due o meno. Il pannello dei suggerimenti propone le parole
compatibili con lo slot selezionato, ordinate per punteggio; Invio cambia direzione tra
orizzontale e verticale. Le definizioni si scrivono accanto alla griglia e sopravvivono alle
modifiche dello schema grazie a un cestino delle definizioni orfane. Con «Parole mie» si
importa un elenco personale (.txt, una parola per riga) che si aggiunge al dizionario della
propria macchina.

## Comandi

```
npm install      installa le dipendenze
npm run dev      avvia il server di sviluppo (porta 5871)
npm test         esegue i test (vitest)
npm run build    produce la build statica in dist/
npm run preview  serve la build (porta 5872)
npm run wordlist rigenera l'asset del dizionario da Morph-it! e itWaC
```

## Dizionario

L'asset `public/wordlists/it.txt.gz` è generato dalla pipeline in `tools/wordlist/`: forme
flesse da Morph-it! (Baroni-Zanchetta, Università di Bologna), punteggi dalle liste di
frequenza itWaC di franfranz, normalizzazione alla convenzione dei cruciverba (maiuscole senza
accenti), nomi propri con punteggio dedicato, esclusione delle forme verbali poetiche
apocopate, lista curata di parole brevi e blocklist. Licenza e attribuzione dei dati sono in
`public/wordlists/it.NOTICE.md`.

## Formato dei file

Il salvataggio usa ipuz versione 2, profilo crossword: un JSON aperto e interoperabile. La
lettura tollera le varianti comuni della specifica, la scrittura usa un profilo fisso con
blocco `#`. Lo stesso JSON è usato per il salvataggio automatico in localStorage.

## Deploy

Ogni push su `main` esegue test e build e pubblica su GitHub Pages tramite il workflow
`.github/workflows/deploy.yml` (richiede Pages impostato su "GitHub Actions" nelle
impostazioni del repository).

## Documentazione

Il quadro giuridico e fiscale per pubblicare cruciverba su riviste italiane è in
`docs/normativa-cruciverba-italia.md`. Le convenzioni di progetto sono in `CLAUDE.md` e nel
sistema descritto da `.claude/PROJECT-SYSTEM.md`.

## Licenza

Codice MIT (file `LICENSE`). I dati del dizionario hanno licenza e attribuzione proprie,
descritte in `public/wordlists/it.NOTICE.md`.
