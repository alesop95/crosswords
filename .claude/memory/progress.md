# Work-log

> Append-only, in ordine cronologico inverso (la voce più recente in alto). Ogni passo
> significativo di codice e ogni intervento manuale rilevante lascia una voce con data, file
> toccati, motivo e commit di riferimento. Qui confluisce anche il log di riconciliazione dei
> documenti `.docx`, con il nome del documento sorgente e l'esito, così la data di allineamento
> sopravvive a un clone.

## 2026-07-06 — Milestone M4: definizioni, formato ipuz e stampa

Commit: da creare
File toccati: `src/io/ipuz.ts` con test round-trip e lettura tollerante, `src/io/autosave.ts`
(migrato a ipuz v1 con migrazione dal v0), `src/ui/cluePanel.ts` (liste Orizzontali/Verticali,
cestino definizioni orfane con recupero), `src/print/{printView.ts,print.css}` (pagina griglia
numerata + definizioni, pagina soluzione, A4), toolbar con Apri/Salva/.ipuz/Stampa/dialog
metadati, `main.ts`, css.
Motivo: completamento del ciclo autore: scrivere le definizioni accanto alla griglia,
salvare e riaprire il lavoro in formato ipuz v2 (profilo bloccato in scrittura, lettura
tollerante alle varianti: celle oggetto, null come blocco, clue come coppie o oggetti, token
di blocco personalizzato), stampare schema e soluzione dal dialogo del browser. Test 68 verdi.

## 2026-07-06 — Collaudo manuale round 3: fuori le forme verbali apocopate

Commit: da creare
File toccati: `tools/wordlist/{normalize,build}.mjs` + test, asset rigenerato.
Motivo: il collaudo utente ha scovato CONSIDERASSER proposto dal filler: Morph-it include le
forme verbali poetiche troncate (considerasser, andar, fosser, amar) taggate come forme
normali, e la frequenza del lemma le faceva salire in classifica. Regola nuova: una forma
taggata VER/AUX/MOD/CAU che termina in consonante e' un troncamento poetico e si esclude;
FILM, GAS, GRAN (non verbali) e le forme regolari restano. Rimosse ~46.000 voci, asset a
349.027; test 61 verdi, fill 13x13 5/5 seed.

## 2026-07-06 — Collaudo manuale round 2: tre fix da feedback utente

Commit: da creare
File toccati: `src/fill/propagate.ts` (slot completi come vincoli fissi), `src/ui/toolbar.ts`
(guardia anti-corsa sul risultato del fill), `src/ui/{suggestPanel,i18n}.ts` (etichette
Orizzontale/Verticale), `tools/wordlist/{normalize,build}.mjs` + test, asset rigenerato.
Motivo: (1) una parola completa assente dal dizionario faceva collassare la propagazione e
tingeva di rosso l'intera griglia: ora le parole complete sono lettere fisse che vincolano gli
incroci senza dichiarare vicolo cieco; (2) il risultato di un riempimento avviato su uno
schema poi sostituito veniva applicato o notificato sulla griglia nuova: ora si scarta con
messaggio dedicato; (3) dizionario: inclusi i nomi propri di Morph-it (tratto NPR: Dante,
Roma, Manzoni, Garibaldi) con punteggio fisso 40, penalizzate le forme con clitici (-30), i
superlativi (-25) e le forme molto piu' lunghe del lemma, che ereditavano il punteggio pieno
(FACENDOGLIELA 100 -> 46, PUBBLICISSIMA 87 -> 50). Asset: 395.023 voci. Test 59 verdi; fill
13x13 5/5 seed tra 141 e 598 ms.

## 2026-07-06 — Fix caricamento dizionario nel browser (doppia decompressione)

Commit: da creare
File toccati: `src/dict/loader.ts`; `vite.config.ts` (porta dev fissa 5871, preview 5872,
strictPort) e scheda `deployment.md`.
Motivo: primo collaudo manuale nel browser fallito, dizionario mai caricato ("Failed to
fetch" in console). Causa: il dev server di Vite serve i file .gz con Content-Encoding: gzip,
il browser decomprime da solo e il DecompressionStream applicato al corpo gia' in chiaro
andava in errore; su GitHub Pages invece il file arrivera' binario. Il loader ora decide dai
magic byte (0x1f 0x8b) se decomprimere. Verificato via Node su entrambi gli scenari, 392.920
voci in entrambi i casi.

## 2026-07-06 — Milestone M3: filler automatico e assistito nel Web Worker

Commit: da creare
File toccati: `src/fill/{csp,filler,worker,fillerClient}.ts` con test (`filler.test.ts`,
`perf.test.ts` multi-seed), `src/ui/{toolbar,activeSlot,i18n}.ts`, `src/dict/loader.ts`
(ritorna anche il testo grezzo per il worker), `main.ts`, css, `@types/node`.
Motivo: motore CSP con backtracking, euristica MRV, ordinamento dei valori least-constraining
con punteggio, divieto di parole duplicate, forward checking piu' consistenza d'arco (MAC) con
soglia sui domini grandi, restart geometrici e timeout con miglior parziale; distinzione tra
spazio esaurito con e senza potatura dei candidati, cosi' l'infeasibility e' dimostrata solo
quando vera. Nel browser il motore gira in un Web Worker (annullamento per terminazione e
respawn); pulsanti Riempi griglia, Riempi parola e Ferma con avanzamento. Lezione registrata:
la prima fixture 13x13 aveva cinque colonne intere adiacenti, configurazione avversaria fuori
target che il forward checking puro non regge; con schema realistico il fill riesce 5/5 seed
tra 93 e 2365 ms. Test totali 55 verdi.

## 2026-07-04 — Milestone M2: wordlist italiana, suggerimenti e hotspot

Commit: da creare (successivo a c4a2172)
File toccati: `tools/wordlist/{build,normalize}.mjs` con test, `sources.json` con sha256,
`extra-short.txt`, `blocklist.txt`, `public/wordlists/{it.txt.gz,it.NOTICE.md}`,
`src/dict/{loader,wordlist}.ts` con test, `src/fill/{propagate,perf}.test/ts`,
`src/ui/{suggestPanel,hotspots}.ts`, store con annotazioni, gridView con classi hotspot,
`main.ts`, css, tsconfig (types vite/client).
Motivo: gate licenze superato (Morph-it CC BY-SA 2.0/LGPL duale, frequenze itWaC franfranz
MIT): asset committabile con NOTICE share-alike separato, codice MIT. Pipeline offline con
checksum delle sorgenti, 392.920 voci, 1,14 MB gzip, punteggi normalizzati sul lemma piu'
frequente (istogramma a campana, senza saturazione a 100). Indici bitset per lunghezza,
posizione e lettera; propagazione a punto fisso condivisa tra hotspot e futuro filler.
Misure con dizionario reale: parse e indici 205 ms, propagate su 13x13 32 ms. Test 47 verdi.

## 2026-07-04 — Primo ancoraggio delle schede al commit iniziale

Commit: c4a2172
File toccati: frontmatter di STACK.md, design-and-security.md, deployment.md, dev-testing.md,
current-work.md, roadmap.md; tabella e commit di riferimento in memory/index.md.
Motivo: primo commit del repository (push riuscito su github-personal:alesop95/crosswords);
sync-context ha sostituito il segnaposto PENDING-FIRST-COMMIT con l'hash reale in tutte le
schede, che risultano aggiornate al commit di ancoraggio.

## 2026-07-04 — Milestone M1: modello griglia ed editor

Commit: c4a2172
File toccati: `src/core/{types,grid,slots,puzzle}.ts` con test colocati (18 verdi),
`src/ui/{store,gridView,toolbar,i18n}.ts`, `src/io/autosave.ts`, `src/main.ts`,
`src/styles/app.css`.
Motivo: implementazione del modello puro della griglia con estrazione e numerazione degli slot
(lunghezza minima due, convenzione italiana), validazioni di celle isolate e regioni
disconnesse, riconciliazione delle definizioni al variare del nero con cestino delle orfane,
store con undo e redo, vista SVG con tastiera e mouse, barra strumenti con dimensioni e
simmetria opzionale, autosalvataggio in localStorage con formato provvisorio v0 da sostituire
con ipuz in M4. Build, test e smoke check del server superati. Verifica manuale nel browser
demandata all'utente con npm run dev.

## 2026-07-03 — Inizializzazione del sistema di progetto e ricerche preliminari

Commit: c4a2172
File toccati: anatomia di `.claude`, `CLAUDE.md`, `.gitignore`, schede di `context/`,
`docs/normativa-cruciverba-italia.md`, spostamento del materiale di riferimento in
`docs/reference/`.
Motivo: installazione del sistema portabile di contesto secondo `.claude/PROJECT-SYSTEM.md` in
modalità greenfield, dopo tre ricerche preliminari: inventario del materiale raccolto (Qxw come
riferimento, contesto italiano), panorama open source dei tool per cruciverba (Exet, ingrid_core,
formato ipuz, Morph-it! per il lessico), quadro giuridico e fiscale per la pubblicazione di
cruciverba su riviste italiane, salvato come documento tracciato. Le decisioni di stack sono in
`memory/decisions.md`, ADR-002 fino ad ADR-006. Prossimo passo: scaffold Vite vanilla-ts con
vitest e consegna dei comandi git per il primo commit.
