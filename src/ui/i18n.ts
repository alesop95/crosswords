/** Stringhe dell'interfaccia, tutte qui per revisione e futura localizzazione. */
export const t = {
  appTitle: 'Cruciverba',
  newGrid: 'Nuova griglia',
  width: 'Colonne',
  height: 'Righe',
  symmetry: 'Simmetria 180°',
  undo: 'Annulla',
  redo: 'Ripristina',
  across: 'Orizzontali',
  down: 'Verticali',
  confirmNew: 'Creare una nuova griglia? Il lavoro corrente viene sostituito.',
  restored: 'Lavoro precedente ripristinato.',
  storageUnavailable:
    'Attenzione: localStorage non disponibile, il salvataggio automatico è disattivato.',
  helpHint:
    'Frecce: sposta il cursore. Lettere: scrivi e avanza. Invio: cambia direzione. ' +
    'Spazio o clic destro: casella nera. Backspace: cancella. Tab: slot successivo.',
} as const;
