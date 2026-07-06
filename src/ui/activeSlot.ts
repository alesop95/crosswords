import type { AppState } from './store';
import type { Slot } from '../core/types';
import { cellIndex } from '../core/grid';
import { slotsByCell } from '../core/slots';

/** Slot attivo: quello sotto il cursore nella direzione corrente, o l'altro. */
export function activeSlot(state: AppState): Slot | undefined {
  const idx = cellIndex(state.puzzle.grid, state.cursor.row, state.cursor.col);
  const here = slotsByCell(state.puzzle.slots).get(idx) ?? [];
  return here.find((s) => s.dir === state.cursor.dir) ?? here[0];
}
