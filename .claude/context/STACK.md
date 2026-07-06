---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - src/**
  - tools/**
  - vite.config.ts
  - package.json
last-verified-commit: c4a2172
---

# Stack applicativo

> Documento di recupero più importante: tracciato, perché un collega che clona deve vederlo.

## Stack e runtime

L'applicazione è una web app locale-first per la costruzione di cruciverba all'italiana,
scritta in TypeScript puro senza framework di interfaccia, costruita con Vite (template
vanilla-ts) e testata con vitest. Non esiste alcun server: tutto gira nel browser e i dati
dell'utente restano sulla macchina, con autosalvataggio in localStorage. Il gestore pacchetti
è npm. Il motore di riempimento è un risolutore CSP con backtracking implementato in proprio
e eseguito in un Web Worker. La lista di parole italiana è un asset generato offline dalla
pipeline Node in tools/wordlist a partire dal lessico Morph-it! con punteggi derivati dalle
liste di frequenza ItWaC, distribuito come public/wordlists/it.txt.gz nel formato una riga
per voce PAROLA;punteggio.

## Alternative deliberatamente escluse

Il motore ingrid_core (Rust compilato in WebAssembly) è stato valutato e rimandato: le griglie
italiane, ricche di caselle nere, producono sottoproblemi piccoli che un filler TypeScript
gestisce bene, e il calcolo delle lettere ammissibili per il feedback visivo va comunque fatto
in TypeScript; il protocollo messaggi del worker è però progettato perché ingrid_core possa
sostituire il filler in futuro senza toccare l'interfaccia. Sono stati esclusi framework di
interfaccia (React, Preact) perché il componente centrale, la griglia SVG con gestione di
cursore e tastiera, andrebbe comunque scritto in modo imperativo. Sono escluse dipendenze con
licenze copyleft forte: Qxw (GPL) e Crosshare (AGPL) restano riferimenti architetturali, non
codice riusato. Il formato di salvataggio nativo è ipuz JSON; il formato .puz è rimandato.

## Flussi di codice e ruolo architetturale dei file

La regola di dipendenza è che src/core non importa nulla, src/dict, src/fill e src/io
importano solo core, mentre src/ui e src/print possono importare tutto e nessun modulo importa
ui. In core vivono i tipi (types.ts), la griglia con simmetria opzionale (grid.ts),
l'estrazione e numerazione degli slot con parole da due lettere in su (slots.ts) e l'aggregato
puzzle (puzzle.ts). In dict il caricatore dell'asset gzip (loader.ts) e gli indici bitset per
lunghezza, posizione e lettera (wordlist.ts). In fill la costruzione del grafo di vincoli
(csp.ts), la propagazione delle lettere ammissibili condivisa tra interfaccia e ricerca
(propagate.ts), la ricerca backtracking con euristica MRV, insieme delle parole usate e
restart (filler.ts), l'ingresso del worker (worker.ts) e il client lato pagina
(fillerClient.ts). In io la lettura e scrittura ipuz (ipuz.ts) e l'autosalvataggio
(autosave.ts). In ui lo stato applicativo con undo e redo (store.ts), la vista della griglia
(gridView.ts), la barra strumenti (toolbar.ts), il pannello suggerimenti (suggestPanel.ts),
l'editor delle definizioni (cluePanel.ts), la colorazione delle celle critiche (hotspots.ts) e
le stringhe italiane (i18n.ts). In print la generazione del documento di stampa (printView.ts
e print.css).

## Riferimenti a snippet

Da popolare quando il codice esiste, nella forma percorso:simbolo.
