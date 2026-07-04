import type { Grid, Symmetry } from './types';
import { MAX_SIZE, MIN_SIZE } from './types';

export function createGrid(width: number, height: number): Grid {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < MIN_SIZE ||
    height < MIN_SIZE ||
    width > MAX_SIZE ||
    height > MAX_SIZE
  ) {
    throw new Error(`Dimensioni griglia non valide: ${width}x${height}`);
  }
  return {
    width,
    height,
    cells: Array.from({ length: width * height }, () => ({ block: false, letter: null })),
  };
}

export function cellIndex(grid: Grid, row: number, col: number): number {
  return row * grid.width + col;
}

export function inBounds(grid: Grid, row: number, col: number): boolean {
  return row >= 0 && row < grid.height && col >= 0 && col < grid.width;
}

/** Indice della cella simmetrica per rotazione di 180 gradi. */
export function mirrorIndex(grid: Grid, idx: number): number {
  return grid.width * grid.height - 1 - idx;
}

function cloneGrid(grid: Grid): Grid {
  return { ...grid, cells: grid.cells.map((c) => ({ ...c })) };
}

/**
 * Alterna il nero di una cella. Con simmetria rot180 la cella speculare segue,
 * tranne quando coincide (centro griglia). Annerire cancella la lettera.
 */
export function toggleBlock(grid: Grid, row: number, col: number, symmetry: Symmetry): Grid {
  const idx = cellIndex(grid, row, col);
  const next = cloneGrid(grid);
  const nowBlock = !next.cells[idx].block;
  next.cells[idx] = { block: nowBlock, letter: null };
  if (symmetry === 'rot180') {
    const m = mirrorIndex(grid, idx);
    if (m !== idx) next.cells[m] = { block: nowBlock, letter: null };
  }
  return next;
}

export function setLetter(grid: Grid, row: number, col: number, letter: string | null): Grid {
  const idx = cellIndex(grid, row, col);
  if (grid.cells[idx].block) return grid;
  if (letter !== null && !/^[A-Z]$/.test(letter)) {
    throw new Error(`Lettera non valida: ${letter}`);
  }
  const next = cloneGrid(grid);
  next.cells[idx] = { block: false, letter };
  return next;
}

/**
 * Ridimensiona preservando il contenuto nell'angolo in alto a sinistra.
 */
export function resizeGrid(grid: Grid, width: number, height: number): Grid {
  const next = createGrid(width, height);
  for (let r = 0; r < Math.min(height, grid.height); r++) {
    for (let c = 0; c < Math.min(width, grid.width); c++) {
      next.cells[r * width + c] = { ...grid.cells[r * grid.width + c] };
    }
  }
  return next;
}
