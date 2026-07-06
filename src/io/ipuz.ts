import type { Grid, Puzzle, Symmetry } from '../core/types';
import { extractSlots } from '../core/slots';

/**
 * Lettura e scrittura del formato ipuz v2, profilo crossword (ADR-005).
 * In scrittura si usa un profilo bloccato: blocco "#", cella numerata =
 * intero, cella bianca non numerata = 0; la soluzione porta le lettere.
 * In lettura si tollerano le varianti comuni della specifica: celle come
 * oggetti {cell: ...}, null come blocco, definizioni come coppie [numero,
 * testo] o come oggetti {number, clue}. Le impostazioni di progetto viaggiano
 * in chiavi con namespace proprio.
 */

const VERSION = 'http://ipuz.org/v2';
const KIND = 'http://ipuz.org/crossword#1';
const NS = 'com.github.alesop95.crosswords';

export function toIpuz(puzzle: Puzzle): Record<string, unknown> {
  const { grid } = puzzle;
  const slots = extractSlots(grid);
  const numberAt = new Map<number, number>();
  for (const slot of slots) {
    const start = slot.cellIdxs[0];
    if (!numberAt.has(start)) numberAt.set(start, slot.number);
  }

  const puzzleRows: (number | string)[][] = [];
  const solutionRows: (number | string)[][] = [];
  for (let row = 0; row < grid.height; row++) {
    const pRow: (number | string)[] = [];
    const sRow: (number | string)[] = [];
    for (let col = 0; col < grid.width; col++) {
      const idx = row * grid.width + col;
      const cell = grid.cells[idx];
      if (cell.block) {
        pRow.push('#');
        sRow.push('#');
      } else {
        pRow.push(numberAt.get(idx) ?? 0);
        sRow.push(cell.letter ?? 0);
      }
    }
    puzzleRows.push(pRow);
    solutionRows.push(sRow);
  }

  const across: [number, string][] = [];
  const down: [number, string][] = [];
  for (const slot of slots) {
    const text = puzzle.clues[slot.id] ?? '';
    if (slot.dir === 'across') across.push([slot.number, text]);
    else down.push([slot.number, text]);
  }

  const out: Record<string, unknown> = {
    version: VERSION,
    kind: [KIND],
    dimensions: { width: grid.width, height: grid.height },
    puzzle: puzzleRows,
    solution: solutionRows,
    clues: { Across: across, Down: down },
    [`${NS}:symmetry`]: puzzle.symmetry,
  };
  if (puzzle.meta.title) out.title = puzzle.meta.title;
  if (puzzle.meta.author) out.author = puzzle.meta.author;
  if (puzzle.meta.copyright) out.copyright = puzzle.meta.copyright;
  if (puzzle.meta.notes) out.notes = puzzle.meta.notes;
  if (Object.keys(puzzle.orphanClues).length > 0) {
    out[`${NS}:orphanClues`] = puzzle.orphanClues;
  }
  return out;
}

export function serializeIpuz(puzzle: Puzzle): string {
  return JSON.stringify(toIpuz(puzzle));
}

/** Cella del campo puzzle in una qualunque delle rappresentazioni ammesse. */
function isBlockCell(value: unknown, blockToken: string): boolean {
  if (value === null) return true;
  if (typeof value === 'string') return value === blockToken;
  if (typeof value === 'object' && value !== null && 'cell' in value) {
    return isBlockCell((value as { cell: unknown }).cell, blockToken);
  }
  return false;
}

function solutionLetter(value: unknown): string | null {
  if (typeof value === 'string' && /^[A-Za-z]$/.test(value)) return value.toUpperCase();
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return solutionLetter((value as { value: unknown }).value);
  }
  return null;
}

function readClueEntry(entry: unknown): { number: number; text: string } | null {
  if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === 'number') {
    return { number: entry[0], text: String(entry[1] ?? '') };
  }
  if (typeof entry === 'object' && entry !== null) {
    const obj = entry as { number?: unknown; clue?: unknown };
    if (typeof obj.number === 'number') {
      return { number: obj.number, text: String(obj.clue ?? '') };
    }
  }
  return null;
}

export function fromIpuz(json: unknown): Puzzle {
  if (typeof json !== 'object' || json === null) {
    throw new Error('ipuz: documento non valido');
  }
  const doc = json as Record<string, unknown>;
  const kind = doc.kind;
  if (!Array.isArray(kind) || !kind.some((k) => typeof k === 'string' && k.includes('crossword'))) {
    throw new Error('ipuz: non è un cruciverba (kind mancante o diverso)');
  }
  const dims = doc.dimensions as { width?: unknown; height?: unknown } | undefined;
  const width = Number(dims?.width);
  const height = Number(dims?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('ipuz: dimensioni mancanti o non valide');
  }
  const puzzleRows = doc.puzzle;
  if (!Array.isArray(puzzleRows) || puzzleRows.length !== height) {
    throw new Error('ipuz: campo puzzle mancante o di altezza sbagliata');
  }
  const blockToken = typeof doc.block === 'string' ? (doc.block as string) : '#';

  const grid: Grid = {
    width,
    height,
    cells: Array.from({ length: width * height }, () => ({ block: false, letter: null })),
  };
  for (let row = 0; row < height; row++) {
    const rowCells = puzzleRows[row];
    if (!Array.isArray(rowCells) || rowCells.length !== width) {
      throw new Error(`ipuz: riga ${row + 1} di larghezza sbagliata`);
    }
    for (let col = 0; col < width; col++) {
      if (isBlockCell(rowCells[col], blockToken)) {
        grid.cells[row * width + col].block = true;
      }
    }
  }

  const solutionRows = doc.solution;
  if (Array.isArray(solutionRows)) {
    for (let row = 0; row < Math.min(height, solutionRows.length); row++) {
      const rowCells = solutionRows[row];
      if (!Array.isArray(rowCells)) continue;
      for (let col = 0; col < Math.min(width, rowCells.length); col++) {
        const idx = row * width + col;
        if (grid.cells[idx].block) continue;
        grid.cells[idx].letter = solutionLetter(rowCells[col]);
      }
    }
  }

  const slots = extractSlots(grid);
  const byNumberDir = new Map<string, string>();
  for (const slot of slots) byNumberDir.set(`${slot.number}:${slot.dir}`, slot.id);

  const clues: Record<string, string> = {};
  const cluesDoc = doc.clues as Record<string, unknown> | undefined;
  if (cluesDoc && typeof cluesDoc === 'object') {
    for (const [key, dir] of [
      ['Across', 'across'],
      ['Down', 'down'],
    ] as const) {
      const list = cluesDoc[key];
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        const parsed = readClueEntry(entry);
        if (!parsed || parsed.text === '') continue;
        const slotId = byNumberDir.get(`${parsed.number}:${dir}`);
        if (slotId) clues[slotId] = parsed.text;
      }
    }
  }

  const symmetryRaw = doc[`${NS}:symmetry`];
  const symmetry: Symmetry = symmetryRaw === 'rot180' ? 'rot180' : 'none';
  const orphanRaw = doc[`${NS}:orphanClues`];
  const orphanClues: Record<string, string> = {};
  if (typeof orphanRaw === 'object' && orphanRaw !== null) {
    for (const [k, v] of Object.entries(orphanRaw)) {
      if (typeof v === 'string') orphanClues[k] = v;
    }
  }

  return {
    grid,
    slots,
    clues,
    orphanClues,
    meta: {
      title: typeof doc.title === 'string' ? doc.title : '',
      author: typeof doc.author === 'string' ? doc.author : '',
      copyright: typeof doc.copyright === 'string' ? doc.copyright : '',
      notes: typeof doc.notes === 'string' ? doc.notes : '',
    },
    symmetry,
  };
}

export function parseIpuz(text: string): Puzzle {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('ipuz: JSON non valido');
  }
  return fromIpuz(json);
}
