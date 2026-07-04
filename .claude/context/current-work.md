---
generated-from-commit: PENDING-FIRST-COMMIT
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - src/**
last-verified-commit: PENDING-FIRST-COMMIT
stato: in corso
---

# Lavoro in corso

> La fonte di verità su cosa è fatto resta `memory/index.md` e il work-log, non le spunte di
> questo file.

## Feature: M0, bootstrap del progetto

Cosa fa: allinea il repository al sistema del template e crea lo scaffold applicativo Vite
vanilla-ts con vitest, in modo che le milestone successive partano da una base funzionante.

File da creare:

```
package.json, vite.config.ts, tsconfig.json, vitest.config.ts   scaffold toolchain
index.html, src/main.ts, src/styles/app.css                     ingresso applicazione
```

File da modificare:

```
nessuno oltre allo scaffold
```

Definition of done:

- [x] struttura .claude conforme al template, gitignore attivo prima di _notes
- [x] materiale di riferimento spostato in docs/reference, exe e pdf ignorati
- [x] documento normativo salvato in docs/normativa-cruciverba-italia.md
- [x] npm run build e npm test verdi
- [ ] comandi git consegnati all'utente ed eseguiti, poi sync-context

Domande aperte:

Nessuna al momento; le scelte di stack sono registrate in memory/decisions.md.

## Riconciliazione

Ultima verifica: 2026-07-03 al commit PENDING-FIRST-COMMIT.
