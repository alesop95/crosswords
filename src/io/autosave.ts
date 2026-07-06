import type { Puzzle } from '../core/types';
import { extractSlots } from '../core/slots';
import { parseIpuz, serializeIpuz } from './ipuz';

/**
 * Autosalvataggio in localStorage. Dal v1 il formato e' lo stesso ipuz dei
 * file (ADR-005: una sola serializzazione); il vecchio formato interno v0
 * viene migrato in lettura e poi rimosso.
 */
const KEY_V1 = 'crosswords:autosave:v1';
const KEY_V0 = 'crosswords:autosave:v0';
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
  window.localStorage.setItem(KEY_V1, serializeIpuz(puzzle));
}

export function load(): Puzzle | null {
  const rawV1 = window.localStorage.getItem(KEY_V1);
  if (rawV1) {
    try {
      return parseIpuz(rawV1);
    } catch {
      // autosave corrotto: si ignora, non vale un blocco all'avvio
    }
  }
  const legacy = loadLegacyV0();
  if (legacy) {
    saveNow(legacy);
    window.localStorage.removeItem(KEY_V0);
  }
  return legacy;
}

function loadLegacyV0(): Puzzle | null {
  const raw = window.localStorage.getItem(KEY_V0);
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
