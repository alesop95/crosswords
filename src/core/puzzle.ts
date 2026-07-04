import type { Grid, Puzzle, Slot, Symmetry } from './types';
import { createGrid } from './grid';
import { extractSlots } from './slots';

export function createPuzzle(width: number, height: number, symmetry: Symmetry = 'none'): Puzzle {
  const grid = createGrid(width, height);
  return {
    grid,
    slots: extractSlots(grid),
    clues: {},
    orphanClues: {},
    meta: { title: '', author: '', copyright: '', notes: '' },
    symmetry,
  };
}

/**
 * Applica una nuova griglia al puzzle ricalcolando gli slot e riconciliando le
 * definizioni: una definizione segue lo slot che mantiene stessa posizione e
 * direzione anche se il numero cambia; le altre finiscono tra le orfane, senza
 * perdere il lavoro di scrittura per un colpo di nero.
 */
export function withGrid(puzzle: Puzzle, grid: Grid): Puzzle {
  const slots = extractSlots(grid);
  const byPos = new Map<string, Slot>();
  for (const slot of slots) byPos.set(`${slot.row},${slot.col},${slot.dir}`, slot);

  const clues: Record<string, string> = {};
  const orphanClues: Record<string, string> = { ...puzzle.orphanClues };

  for (const oldSlot of puzzle.slots) {
    const text = puzzle.clues[oldSlot.id];
    if (!text) continue;
    const match = byPos.get(`${oldSlot.row},${oldSlot.col},${oldSlot.dir}`);
    if (match && match.len === oldSlot.len) clues[match.id] = text;
    else orphanClues[`${oldSlot.id}:${text.slice(0, 30)}`] = text;
  }

  return { ...puzzle, grid, slots, clues, orphanClues };
}

export function setClue(puzzle: Puzzle, slotId: string, text: string): Puzzle {
  const clues = { ...puzzle.clues };
  if (text.trim() === '') delete clues[slotId];
  else clues[slotId] = text;
  return { ...puzzle, clues };
}
