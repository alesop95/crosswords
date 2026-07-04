import type { Crossing, Dir, Grid, Slot } from './types';
import { MIN_WORD_LEN } from './types';
import { cellIndex } from './grid';

function isWhite(grid: Grid, row: number, col: number): boolean {
  return (
    row >= 0 &&
    row < grid.height &&
    col >= 0 &&
    col < grid.width &&
    !grid.cells[cellIndex(grid, row, col)].block
  );
}

function runLength(grid: Grid, row: number, col: number, dir: Dir): number {
  let len = 0;
  let r = row;
  let c = col;
  while (isWhite(grid, r, c)) {
    len++;
    if (dir === 'across') c++;
    else r++;
  }
  return len;
}

function startsSlot(grid: Grid, row: number, col: number, dir: Dir): boolean {
  if (!isWhite(grid, row, col)) return false;
  const prevWhite =
    dir === 'across' ? isWhite(grid, row, col - 1) : isWhite(grid, row - 1, col);
  if (prevWhite) return false;
  return runLength(grid, row, col, dir) >= MIN_WORD_LEN;
}

/**
 * Estrae gli slot con la numerazione standard dei cruciverba (identica alla
 * convenzione italiana): scansione row-major, una cella riceve un numero se vi
 * inizia almeno uno slot, il contatore avanza per cella numerata.
 */
export function extractSlots(grid: Grid): Slot[] {
  const slots: Slot[] = [];
  let number = 0;
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const across = startsSlot(grid, row, col, 'across');
      const down = startsSlot(grid, row, col, 'down');
      if (!across && !down) continue;
      number++;
      if (across) slots.push(makeSlot(grid, row, col, 'across', number));
      if (down) slots.push(makeSlot(grid, row, col, 'down', number));
    }
  }
  return slots;
}

function makeSlot(grid: Grid, row: number, col: number, dir: Dir, number: number): Slot {
  const len = runLength(grid, row, col, dir);
  const cellIdxs: number[] = [];
  for (let i = 0; i < len; i++) {
    cellIdxs.push(
      dir === 'across' ? cellIndex(grid, row, col + i) : cellIndex(grid, row + i, col),
    );
  }
  return {
    id: `${dir === 'across' ? 'A' : 'D'}${number}`,
    dir,
    number,
    row,
    col,
    len,
    cellIdxs,
  };
}

/** Mappa indice cella -> slot che la attraversano (al piu' uno per direzione). */
export function slotsByCell(slots: Slot[]): Map<number, Slot[]> {
  const map = new Map<number, Slot[]>();
  for (const slot of slots) {
    for (const idx of slot.cellIdxs) {
      const list = map.get(idx);
      if (list) list.push(slot);
      else map.set(idx, [slot]);
    }
  }
  return map;
}

/** Incroci di uno slot con gli slot dell'altra direzione. */
export function crossingsOf(slot: Slot, slots: Slot[]): Crossing[] {
  const byCell = slotsByCell(slots);
  const crossings: Crossing[] = [];
  slot.cellIdxs.forEach((idx, pos) => {
    for (const other of byCell.get(idx) ?? []) {
      if (other.id === slot.id || other.dir === slot.dir) continue;
      crossings.push({ pos, otherSlotId: other.id, otherPos: other.cellIdxs.indexOf(idx) });
    }
  });
  return crossings;
}

export interface GridIssue {
  kind: 'isolated-cell' | 'disconnected-region';
  cellIdxs: number[];
}

/**
 * Segnala celle bianche non coperte da alcuno slot (isolate) e regioni bianche
 * disconnesse (tollerate nei cruciverba italiani ma quasi sempre indesiderate).
 */
export function validateGrid(grid: Grid): GridIssue[] {
  const issues: GridIssue[] = [];
  const slots = extractSlots(grid);
  const covered = new Set<number>();
  for (const slot of slots) for (const idx of slot.cellIdxs) covered.add(idx);

  const isolated: number[] = [];
  grid.cells.forEach((cell, idx) => {
    if (!cell.block && !covered.has(idx)) isolated.push(idx);
  });
  if (isolated.length > 0) issues.push({ kind: 'isolated-cell', cellIdxs: isolated });

  const whiteIdxs = grid.cells
    .map((cell, idx) => (cell.block ? -1 : idx))
    .filter((idx) => idx >= 0);
  if (whiteIdxs.length > 0) {
    const seen = new Set<number>();
    const queue = [whiteIdxs[0]];
    seen.add(whiteIdxs[0]);
    while (queue.length > 0) {
      const idx = queue.pop()!;
      const row = Math.floor(idx / grid.width);
      const col = idx % grid.width;
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const r = row + dr;
        const c = col + dc;
        if (isWhite(grid, r, c)) {
          const n = cellIndex(grid, r, c);
          if (!seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
    }
    const unreachable = whiteIdxs.filter((idx) => !seen.has(idx));
    if (unreachable.length > 0) {
      issues.push({ kind: 'disconnected-region', cellIdxs: unreachable });
    }
  }
  return issues;
}

/** Pattern corrente di uno slot, es. "C?S?": '?' per le celle vuote. */
export function slotPattern(grid: Grid, slot: Slot): string {
  return slot.cellIdxs
    .map((idx) => grid.cells[idx].letter ?? '?')
    .join('');
}

/** Parola completa dello slot oppure null se ha celle vuote. */
export function slotWord(grid: Grid, slot: Slot): string | null {
  const pattern = slotPattern(grid, slot);
  return pattern.includes('?') ? null : pattern;
}
