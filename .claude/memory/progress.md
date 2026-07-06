# Work-log

> Append-only, in ordine cronologico inverso (la voce più recente in alto). Ogni passo
> significativo di codice e ogni intervento manuale rilevante lascia una voce con data, file
> toccati, motivo e commit di riferimento. Qui confluisce anche il log di riconciliazione dei
> documenti `.docx`, con il nome del documento sorgente e l'esito, così la data di allineamento
> sopravvive a un clone.

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
