---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - src/**
last-verified-commit: c4a2172
---

# Design e sicurezza applicativa

> Popolare leggendo il codice attuale. I diagrammi referenziati vivono in `diagrams/` in corrispondenza uno a uno con i componenti descritti (sezione 7).

## Paradigmi di software design

Il progetto separa rigidamente la logica di dominio dall'interfaccia: src/core contiene solo funzioni pure senza DOM e non importa nulla, i moduli dict, fill e io dipendono solo da core, mentre ui e print stanno in cima e nessuno dipende da loro. Lo stato dell'interfaccia vive in un piccolo store con pattern command per undo e redo e sottoscrizioni selettive. Il lavoro pesante del riempimento gira in un Web Worker dietro un protocollo di messaggi esplicito, così la pagina resta reattiva e il motore è sostituibile. La serializzazione è unica, ipuz JSON, usata sia per i file scambiati sia per l'autosalvataggio in localStorage.

## Sicurezza applicativa

Non esistono autenticazione, rete o segreti: l'applicazione è statica e i dati restano nel browser dell'utente. Le superfici da presidiare sono l'import di file ipuz e di liste di parole dell'utente, che vanno validati e trattati come testo senza mai interpretarli come codice o inserirli nel DOM senza escaping, e la quota di localStorage, la cui indisponibilità va segnalata senza perdita silenziosa di dati. La pipeline wordlist scarica sorgenti esterne con checksum dichiarati in tools/wordlist/sources.json e i file scaricati non si committano.

## Diagrammi

| Diagramma | Sorgente | Componenti rappresentati |
|---|---|---|
| da creare | da creare | architettura moduli quando il codice esiste |
