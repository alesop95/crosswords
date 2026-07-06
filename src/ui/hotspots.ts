import type { Store } from './store';
import type { Puzzle } from '../core/types';
import type { WordList } from '../dict/wordlist';
import { propagate } from '../fill/propagate';

const DEBOUNCE_MS = 120;

/**
 * Controller degli hotspot: a ogni modifica del puzzle rilancia la
 * propagazione sul dizionario e pubblica nello store il numero di lettere
 * ammissibili per ogni cella bianca vuota. La vista della griglia colora le
 * celle senza lettere possibili (rosse) o con due o meno (arancio).
 */
export function startHotspots(store: Store, dict: WordList): void {
  let timer: number | undefined;
  let lastPuzzle: Puzzle | null = null;

  function recompute(): void {
    const { puzzle } = store.getState();
    lastPuzzle = puzzle;
    const result = propagate(puzzle.grid, puzzle.slots, dict);
    const feasibleCounts = new Map<number, number>();
    for (const [cellIdx, letters] of result.feasibleLetters) {
      if (!puzzle.grid.cells[cellIdx].letter) feasibleCounts.set(cellIdx, letters.size);
    }
    store.setAnnotations({ feasibleCounts });
  }

  store.subscribe((state) => {
    if (state.puzzle === lastPuzzle) return; // notifiche di cursore o annotazioni
    window.clearTimeout(timer);
    timer = window.setTimeout(recompute, DEBOUNCE_MS);
  });
  recompute();
}
