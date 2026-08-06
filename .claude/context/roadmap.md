---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths: []
last-verified-commit: c4a2172
---

# Roadmap

> Direzione e priorità del progetto. Tracciata. Non è il work-log: qui sta dove si va, non cosa è già stato fatto.

## Direzione

Arrivare a una prima versione completa del costruttore di cruciverba all'italiana nel browser: disegno della griglia, riempimento automatico e assistito con dizionario italiano, scrittura delle definizioni, salvataggio in ipuz e stampa, pubblicata su GitHub Pages.

## Priorità

La sequenza delle milestone è M1 modello griglia ed editor, perché tutto il resto vi si appoggia; M2 lista di parole italiana con suggerimenti e segnalazione delle celle critiche, perché la qualità del dizionario determina la qualità dei riempimenti; M3 riempimento automatico nel Web Worker; M4 definizioni, formato ipuz e stampa; M5 rifinitura e deploy su GitHub Pages. Il primo passo di M2 è la verifica delle licenze dei dati sorgente, che decide se l'asset generato si committa o si rigenera localmente.

## Idee e ipotesi da verificare

Per la versione due restano da valutare l'import ed export del formato .puz, il supporto alle griglie di stile americano con simmetria obbligatoria, i suggerimenti di definizione assistiti da un modello linguistico con revisione umana, e l'eventuale sostituzione del filler con ingrid_core compilato in WebAssembly dietro lo stesso protocollo del worker. Sono ipotesi, non impegni.
