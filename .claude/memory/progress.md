# Work-log

> Append-only, in ordine cronologico inverso (la voce più recente in alto). Ogni passo
> significativo di codice e ogni intervento manuale rilevante lascia una voce con data, file
> toccati, motivo e commit di riferimento. Qui confluisce anche il log di riconciliazione dei
> documenti `.docx`, con il nome del documento sorgente e l'esito, così la data di allineamento
> sopravvive a un clone.

## 2026-07-04 — Milestone M1: modello griglia ed editor

Commit: PENDING-FIRST-COMMIT
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

Commit: PENDING-FIRST-COMMIT
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
