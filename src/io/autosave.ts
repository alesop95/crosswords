import type { Puzzle } from '../core/types';
import { extractSlots } from '../core/slots';

/**
 * Autosalvataggio in localStorage. La chiave e' versionata: v0 e' il formato
 * interno provvisorio, sostituito da ipuz nella milestone M4 con migrazione.
 */
const KEY = 'crosswords:autosave:v0';
const DEBOUNCE_MS = 1000;

export function isStorageAvailable(): boolean {
  try {
    const probe = '__crosswords_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function saveNow(puzzle: Puzzle): void {
  const payload = {
    v: 0,
    grid: {
      width: puzzle.grid.width,
      height: puzzle.grid.height,
      cells: puzzle.grid.cells.map((c) => (c.block ? '#' : (c.letter ?? '.'))).join(''),
    },
    clues: puzzle.clues,
    orphanClues: puzzle.orphanClues,
    meta: puzzle.meta,
    symmetry: puzzle.symmetry,
  };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

export function load(): Puzzle | null {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data.v !== 0) return null;
    const { width, height, cells } = data.grid;
    if (typeof width !== 'number' || typeof height !== 'number') return null;
    if (typeof cells !== 'string' || cells.length !== width * height) return null;
    const grid = {
      width,
      height,
      cells: cells.split('').map((ch: string) => {
        if (ch === '#') return { block: true, letter: null };
        if (ch === '.') return { block: false, letter: null };
        return { block: false, letter: /^[A-Z]$/.test(ch) ? ch : null };
      }),
    };
    // Gli id degli slot sono deterministici a parita' di griglia: le definizioni
    // salvate restano valide, basta ricalcolare gli slot.
    const puzzle: Puzzle = {
      grid,
      slots: extractSlots(grid),
      clues: typeof data.clues === 'object' && data.clues ? data.clues : {},
      orphanClues:
        typeof data.orphanClues === 'object' && data.orphanClues ? data.orphanClues : {},
      meta: {
        title: String(data.meta?.title ?? ''),
        author: String(data.meta?.author ?? ''),
        copyright: String(data.meta?.copyright ?? ''),
        notes: String(data.meta?.notes ?? ''),
      },
      symmetry: data.symmetry === 'rot180' ? 'rot180' : 'none',
    };
    return puzzle;
  } catch {
    return null;
  }
}

export function startAutosave(getPuzzle: () => Puzzle, subscribe: (cb: () => void) => void): void {
  let timer: number | undefined;
  subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => saveNow(getPuzzle()), DEBOUNCE_MS);
  });
}
