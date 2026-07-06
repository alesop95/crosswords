---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - src/**
last-verified-commit: c4a2172
stato: in pianificazione
---

# Lavoro in corso

> La fonte di verità su cosa è fatto resta `memory/index.md` e il work-log, non le spunte di
> questo file.

## Feature: M4, definizioni, formato ipuz e stampa

Cosa fa: editor delle definizioni per ogni parola (liste Orizzontali e Verticali con
riconciliazione al variare dello schema, già presente nel modello), salvataggio e apertura di
file ipuz, vista di stampa A4 con griglia vuota numerata, definizioni e pagina della soluzione.

File da creare:

```
src/ui/cluePanel.ts     editor definizioni con liste per direzione e cestino orfane
src/io/ipuz.ts          toIpuz e fromIpuz, profilo bloccato in scrittura, lettura tollerante
src/io/ipuz.test.ts     round-trip su fixture, anche griglie irregolari
src/print/printView.ts  documento di stampa
src/print/print.css     regole @media print, formato A4
```

File da modificare:

```
src/ui/toolbar.ts    pulsanti Apri, Salva (.ipuz), Stampa, dialogo metadati
src/io/autosave.ts   migrazione dell'autosave dal formato provvisorio v0 a ipuz
src/main.ts          montaggio del pannello definizioni e della stampa
```

Definition of done:

- [ ] round-trip fromIpuz(toIpuz(p)) identico su fixture incluse griglie irregolari
- [ ] file .ipuz scaricabile e riapribile; autosave migrato a ipuz
- [ ] anteprima di stampa corretta per 13x13 e 21x13 (griglia, definizioni, soluzione)
- [ ] le definizioni sopravvivono alle modifiche dello schema (riconciliazione + orfane)

Domande aperte:

Nessuna: il profilo ipuz e le convenzioni sono fissati in ADR-005.

## Riconciliazione

Ultima verifica: 2026-07-06 al commit c4a2172 (M3 completata, commit M2+M3 in attesa).
