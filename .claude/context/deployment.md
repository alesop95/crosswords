---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - vite.config.ts
  - .github/**
last-verified-commit: c4a2172
---

# Deployment

> Popolare leggendo la configurazione reale di infrastruttura e CI. Commit, push e deploy restano operazioni manuali dell'utente.

## Livelli

L'ambiente di sviluppo è il server locale di Vite, fissato alla porta 5871 (anteprima della build alla 5872) con strictPort, così un conflitto di porta produce un errore esplicito invece di uno spostamento silenzioso. La produzione è GitHub Pages sul repository alesop95/crosswords all'indirizzo https://alesop95.github.io/crosswords/: la base di Vite è /crosswords/ nella sola build (in dev resta la radice). Il deploy è il workflow .github/workflows/deploy.yml, che a ogni push su main esegue npm ci, npm test, npm run build e pubblica dist con actions/deploy-pages; richiede, una volta sola, l'impostazione Pages su "GitHub Actions" nelle impostazioni del repository.

## Comandi

In sviluppo si usa npm run dev; la build statica si produce con npm run build e si verifica con npm run preview. La pubblicazione avviene da sola con il push su main; il workflow si può rilanciare a mano da GitHub con workflow_dispatch.

## Variabili d'ambiente e segreti

Nessuna variabile d'ambiente richiesta: l'applicazione è interamente statica e locale, senza chiavi né servizi esterni.
