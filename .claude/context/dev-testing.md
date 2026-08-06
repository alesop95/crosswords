---
generated-from-commit: c4a2172
generated-from-branch: main
generated-date: 2026-07-03
covers-paths:
  - src/**/*.test.ts
  - vitest.config.ts
last-verified-commit: c4a2172
---

# Test di sviluppo

> Popolare leggendo la configurazione reale dei test. La checklist operativa locale dei test manuali vive invece in `_notes/TEST-CHECKLIST.md`, ignorata da git.

## Test runner e comandi

Il runner è vitest, eseguito con npm test. I test unitari sono colocati accanto ai moduli come file .test.ts e coprono la logica pura: estrazione e numerazione degli slot su griglie fixture, ricerca per pattern nel dizionario confrontata con un'implementazione ingenua di riferimento, propagazione delle lettere ammissibili su casi costruiti a mano, filler su mini griglie con dizionario giocattolo e seed fisso, round-trip del formato ipuz, regole di normalizzazione della pipeline wordlist.

## Rotte e dati mockati

Non esistono servizi esterni da simulare. Le fixture sono griglie descritte come array di stringhe ASCII e piccoli dizionari giocattolo inclusi nei file di test.

## Hook e controlli di qualità

Prima di ogni commit si eseguono npm test e npm run build; il type-check è parte della build tramite tsc. Il benchmark di qualità del riempimento, npm run bench, verrà aggiunto in M3 e i suoi numeri di riferimento si annotano in _notes, non nel repository.
