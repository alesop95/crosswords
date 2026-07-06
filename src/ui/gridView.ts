import type { AppState, Store } from './store';
import type { Slot } from '../core/types';
import { cellIndex, inBounds, setLetter, toggleBlock } from '../core/grid';
import { withGrid } from '../core/puzzle';
import { activeSlot } from './activeSlot';

const CELL = 36;
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Vista SVG della griglia: rendering completo a ogni notifica dello store
 * (griglie fino a 25x25, il ridisegno costa meno della complessita' di un
 * aggiornamento incrementale) e gestione di mouse e tastiera.
 */
export function mountGridView(container: HTMLElement, store: Store): void {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'grid-svg');
  svg.setAttribute('tabindex', '0');
  container.appendChild(svg);

  function render(state: AppState): void {
    const { grid } = state.puzzle;
    const { cursor } = state;
    svg.setAttribute('viewBox', `0 0 ${grid.width * CELL} ${grid.height * CELL}`);
    svg.setAttribute('width', String(grid.width * CELL));
    svg.setAttribute('height', String(grid.height * CELL));
    svg.replaceChildren();

    const active = activeSlot(state);
    const activeCells = new Set(active?.cellIdxs ?? []);
    const numberByCell = startNumbers(state.puzzle.slots);

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const idx = cellIndex(grid, row, col);
        const cell = grid.cells[idx];
        const g = document.createElementNS(SVG_NS, 'g');

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(col * CELL));
        rect.setAttribute('y', String(row * CELL));
        rect.setAttribute('width', String(CELL));
        rect.setAttribute('height', String(CELL));
        let cls = 'cell';
        if (cell.block) cls += ' cell-block';
        else if (row === cursor.row && col === cursor.col) cls += ' cell-cursor';
        else if (activeCells.has(idx)) cls += ' cell-active-slot';
        if (!cell.block && !cell.letter && state.annotations) {
          const count = state.annotations.feasibleCounts.get(idx);
          if (count === 0) cls += ' cell-dead';
          else if (count !== undefined && count <= 2) cls += ' cell-tight';
        }
        rect.setAttribute('class', cls);
        g.appendChild(rect);

        const number = numberByCell.get(idx);
        if (number !== undefined && !cell.block) {
          const num = document.createElementNS(SVG_NS, 'text');
          num.setAttribute('x', String(col * CELL + 2.5));
          num.setAttribute('y', String(row * CELL + 10));
          num.setAttribute('class', 'cell-number');
          num.textContent = String(number);
          g.appendChild(num);
        }

        if (cell.letter) {
          const letter = document.createElementNS(SVG_NS, 'text');
          letter.setAttribute('x', String(col * CELL + CELL / 2));
          letter.setAttribute('y', String(row * CELL + CELL / 2 + 7));
          letter.setAttribute('class', 'cell-letter');
          letter.textContent = cell.letter;
          g.appendChild(letter);
        }

        svg.appendChild(g);
      }
    }
  }

  function cellFromEvent(event: MouseEvent): { row: number; col: number } | null {
    const rect = svg.getBoundingClientRect();
    const { grid } = store.getState().puzzle;
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * grid.width);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * grid.height);
    return inBounds(grid, row, col) ? { row, col } : null;
  }

  svg.addEventListener('click', (event) => {
    const pos = cellFromEvent(event);
    if (!pos) return;
    const state = store.getState();
    const { cursor } = state;
    if (pos.row === cursor.row && pos.col === cursor.col) {
      store.setCursor({ dir: cursor.dir === 'across' ? 'down' : 'across' });
    } else {
      store.setCursor(pos);
    }
    svg.focus();
  });

  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const pos = cellFromEvent(event);
    if (pos) toggleBlockAt(store, pos.row, pos.col);
  });

  svg.addEventListener('keydown', (event) => {
    if (handleKey(store, event)) event.preventDefault();
  });

  store.subscribe(render);
  render(store.getState());
  svg.focus();
}

/** Numeri di partenza per cella (una sola voce per cella anche con doppio slot). */
function startNumbers(slots: Slot[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const slot of slots) {
    const startIdx = slot.cellIdxs[0];
    if (!map.has(startIdx)) map.set(startIdx, slot.number);
  }
  return map;
}

function toggleBlockAt(store: Store, row: number, col: number): void {
  const { puzzle } = store.getState();
  const grid = toggleBlock(puzzle.grid, row, col, puzzle.symmetry);
  store.applyPuzzle(withGrid(puzzle, grid));
}

function moveCursor(store: Store, dr: number, dc: number): void {
  const { puzzle, cursor } = store.getState();
  const row = cursor.row + dr;
  const col = cursor.col + dc;
  if (inBounds(puzzle.grid, row, col)) store.setCursor({ row, col });
}

function advance(store: Store, delta: 1 | -1): void {
  const { cursor } = store.getState();
  if (cursor.dir === 'across') moveCursor(store, 0, delta);
  else moveCursor(store, delta, 0);
}

function typeLetter(store: Store, letter: string): void {
  const { puzzle, cursor } = store.getState();
  const idx = cellIndex(puzzle.grid, cursor.row, cursor.col);
  if (puzzle.grid.cells[idx].block) return;
  const grid = setLetter(puzzle.grid, cursor.row, cursor.col, letter);
  store.applyPuzzle({ ...puzzle, grid });
  advance(store, 1);
}

function eraseLetter(store: Store): void {
  const { puzzle, cursor } = store.getState();
  const idx = cellIndex(puzzle.grid, cursor.row, cursor.col);
  if (puzzle.grid.cells[idx].letter) {
    const grid = setLetter(puzzle.grid, cursor.row, cursor.col, null);
    store.applyPuzzle({ ...puzzle, grid });
  } else {
    advance(store, -1);
    const after = store.getState();
    const backIdx = cellIndex(after.puzzle.grid, after.cursor.row, after.cursor.col);
    if (after.puzzle.grid.cells[backIdx].letter) {
      const grid = setLetter(after.puzzle.grid, after.cursor.row, after.cursor.col, null);
      store.applyPuzzle({ ...after.puzzle, grid });
    }
  }
}

function nextSlot(store: Store, delta: 1 | -1): void {
  const state = store.getState();
  const { slots } = state.puzzle;
  if (slots.length === 0) return;
  const active = activeSlot(state);
  const pos = active ? slots.findIndex((s) => s.id === active.id) : -1;
  const next = slots[(pos + delta + slots.length) % slots.length];
  store.setCursor({ row: next.row, col: next.col, dir: next.dir });
}

/** Ritorna true se il tasto e' stato gestito. */
function handleKey(store: Store, event: KeyboardEvent): boolean {
  if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    if (event.shiftKey) store.redo();
    else store.undo();
    return true;
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'y') {
    store.redo();
    return true;
  }
  if (event.ctrlKey || event.altKey || event.metaKey) return false;

  const { cursor } = store.getState();
  switch (event.key) {
    case 'ArrowUp':
      moveCursor(store, -1, 0);
      return true;
    case 'ArrowDown':
      moveCursor(store, 1, 0);
      return true;
    case 'ArrowLeft':
      moveCursor(store, 0, -1);
      return true;
    case 'ArrowRight':
      moveCursor(store, 0, 1);
      return true;
    case 'Enter':
      store.setCursor({ dir: cursor.dir === 'across' ? 'down' : 'across' });
      return true;
    case ' ':
      toggleBlockAt(store, cursor.row, cursor.col);
      return true;
    case 'Backspace':
      eraseLetter(store);
      return true;
    case 'Delete':
      eraseLetter(store);
      return true;
    case 'Tab':
      nextSlot(store, event.shiftKey ? -1 : 1);
      return true;
    default: {
      const upper = event.key.toUpperCase();
      if (/^[A-Z]$/.test(upper) && event.key.length === 1) {
        typeLetter(store, upper);
        return true;
      }
      return false;
    }
  }
}
