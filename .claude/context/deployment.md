---
generated-from-commit: PENDING-FIRST-COMMIT
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - vite.config.ts
  - .github/**
last-verified-commit: PENDING-FIRST-COMMIT
---

# Deployment

> Popolare leggendo la configurazione reale di infrastruttura e CI. Commit, push e deploy restano
> operazioni manuali dell'utente.

## Livelli

L'ambiente di sviluppo è il server locale di Vite. La produzione prevista è GitHub Pages sul
repository alesop95/crosswords, con base path /crosswords/ nella configurazione di Vite; il
deploy verrà configurato nella milestone M5 e non esiste ancora.

## Comandi

In sviluppo si usa npm run dev; la build statica si produce con npm run build e si verifica
con npm run preview. Il comando di pubblicazione su Pages sarà definito in M5.

## Variabili d'ambiente e segreti

Nessuna variabile d'ambiente richiesta: l'applicazione è interamente statica e locale, senza
chiavi né servizi esterni.
