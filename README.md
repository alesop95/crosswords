# crosswords

Costruttore di cruciverba all'italiana: web app locale-first, senza server, in TypeScript puro
con Vite. Editor della griglia con caselle nere libere e simmetria opzionale, riempimento
automatico e assistito basato su un dizionario italiano generato da Morph-it! con punteggi di
frequenza, editor delle definizioni, salvataggio in formato ipuz e stampa. In sviluppo.

## Comandi

```
npm install      installa le dipendenze
npm run dev      avvia il server di sviluppo
npm test         esegue i test (vitest)
npm run build    produce la build statica in dist/
```

## Documentazione

Il quadro giuridico e fiscale per pubblicare cruciverba su riviste italiane è in
`docs/normativa-cruciverba-italia.md`. Le convenzioni di progetto sono descritte da `CLAUDE.md`
e dal sistema in `.claude/PROJECT-SYSTEM.md`.

## Licenza

MIT. I dati del dizionario, quando presenti, hanno licenza e attribuzione proprie descritte in
`public/wordlists/it.NOTICE.md`.
