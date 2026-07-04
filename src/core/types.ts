export type Dir = 'across' | 'down';

export interface Cell {
  block: boolean;
  /** Lettera A-Z oppure null se vuota. */
  letter: string | null;
}

export interface Grid {
  width: number;
  height: number;
  /** Celle in ordine row-major: indice = row * width + col. */
  cells: Cell[];
}

export interface Slot {
  /** Identificatore stabile nel formato "A5" (across) o "D12" (down). */
  id: string;
  dir: Dir;
  number: number;
  row: number;
  col: number;
  len: number;
  /** Indici delle celle in grid.cells, in ordine. */
  cellIdxs: number[];
}

export interface Crossing {
  /** Posizione della lettera dentro lo slot corrente. */
  pos: number;
  otherSlotId: string;
  /** Posizione della stessa cella dentro l'altro slot. */
  otherPos: number;
}

export type Symmetry = 'none' | 'rot180';

export interface PuzzleMeta {
  title: string;
  author: string;
  copyright: string;
  notes: string;
}

export interface Puzzle {
  grid: Grid;
  /** Derivati dalla griglia, ricalcolati a ogni modifica del nero. */
  slots: Slot[];
  /** slotId -> testo della definizione. */
  clues: Record<string, string>;
  /** Definizioni rimaste orfane dopo una modifica dello schema, recuperabili. */
  orphanClues: Record<string, string>;
  meta: PuzzleMeta;
  symmetry: Symmetry;
}

export const MIN_SIZE = 5;
export const MAX_SIZE = 25;
export const MIN_WORD_LEN = 2;
