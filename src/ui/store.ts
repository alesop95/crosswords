import type { Dir, Puzzle } from '../core/types';

export interface Cursor {
  row: number;
  col: number;
  dir: Dir;
}

export interface CellAnnotations {
  /** indice cella -> numero di lettere ammissibili (solo celle bianche vuote). */
  feasibleCounts: Map<number, number>;
}

export interface AppState {
  puzzle: Puzzle;
  cursor: Cursor;
  /** Derivato dalla propagazione sul dizionario; null finche' non caricato. */
  annotations: CellAnnotations | null;
}

type Listener = (state: AppState) => void;

/**
 * Store minimale a stato immutabile. Le modifiche al puzzle passano da
 * applyPuzzle, che alimenta lo stack di undo; il cursore non entra nella
 * cronologia. Un solo canale di notifica: chi ascolta ridisegna il suo pezzo.
 */
export class Store {
  private state: AppState;
  private undoStack: Puzzle[] = [];
  private redoStack: Puzzle[] = [];
  private listeners = new Set<Listener>();
  private static readonly MAX_HISTORY = 200;

  constructor(puzzle: Puzzle) {
    this.state = { puzzle, cursor: { row: 0, col: 0, dir: 'across' }, annotations: null };
  }

  /** Annotazioni derivate: non entrano nella cronologia di undo. */
  setAnnotations(annotations: CellAnnotations | null): void {
    this.state = { ...this.state, annotations };
    this.emit();
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  setCursor(cursor: Partial<Cursor>): void {
    this.state = { ...this.state, cursor: { ...this.state.cursor, ...cursor } };
    this.emit();
  }

  /** Applica un nuovo puzzle registrandolo nella cronologia di undo. */
  applyPuzzle(puzzle: Puzzle): void {
    if (puzzle === this.state.puzzle) return;
    this.undoStack.push(this.state.puzzle);
    if (this.undoStack.length > Store.MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
    this.state = { ...this.state, puzzle };
    this.emit();
  }

  /** Sostituisce il puzzle senza toccare la cronologia (caricamenti, restore). */
  replacePuzzle(puzzle: Puzzle): void {
    this.undoStack = [];
    this.redoStack = [];
    this.state = { ...this.state, puzzle, cursor: { row: 0, col: 0, dir: 'across' } };
    this.emit();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.state.puzzle);
    this.state = { ...this.state, puzzle: prev };
    this.emit();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.state.puzzle);
    this.state = { ...this.state, puzzle: next };
    this.emit();
  }
}
