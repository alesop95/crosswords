import { describe, expect, it } from 'vitest';
import { gridFromAscii } from '../core/testutil';
import { extractSlots } from '../core/slots';
import type { Puzzle } from '../core/types';
import { fromIpuz, parseIpuz, serializeIpuz, toIpuz } from './ipuz';
import { setClue } from '../core/puzzle';

function puzzleFrom(rows: string[], symmetry: 'none' | 'rot180' = 'none'): Puzzle {
  const grid = gridFromAscii(rows);
  return {
    grid,
    slots: extractSlots(grid),
    clues: {},
    orphanClues: {},
    meta: { title: 'Prova', author: 'alesop95', copyright: '', notes: '' },
    symmetry,
  };
}

describe('round-trip ipuz', () => {
  it.each([
    [['CASA#', 'A..S.', 'SI#NO', '.#.#.', 'RESTO']],
    [['..#..', '.....', '#...#', '.....', '..#..']],
    [['AB', 'BA']],
  ])('fromIpuz(toIpuz(p)) conserva griglia e lettere %#', (rows) => {
    let puzzle = puzzleFrom(rows as string[], 'rot180');
    const firstSlot = puzzle.slots[0];
    puzzle = setClue(puzzle, firstSlot.id, 'Definizione di prova');
    const back = fromIpuz(toIpuz(puzzle));
    expect(back.grid.width).toBe(puzzle.grid.width);
    expect(back.grid.height).toBe(puzzle.grid.height);
    expect(back.grid.cells.map((c) => (c.block ? '#' : (c.letter ?? '.')))).toEqual(
      puzzle.grid.cells.map((c) => (c.block ? '#' : (c.letter ?? '.'))),
    );
    expect(back.slots.map((s) => s.id)).toEqual(puzzle.slots.map((s) => s.id));
    expect(back.clues).toEqual(puzzle.clues);
    expect(back.meta.title).toBe('Prova');
    expect(back.symmetry).toBe('rot180');
  });

  it('serializza e riparsa via testo', () => {
    const puzzle = puzzleFrom(['NO..', '..#.', '....', '.#..']);
    const back = parseIpuz(serializeIpuz(puzzle));
    expect(back.grid.cells[0].letter).toBe('N');
  });
});

describe('lettura tollerante', () => {
  const base = {
    version: 'http://ipuz.org/v2',
    kind: ['http://ipuz.org/crossword#1'],
    dimensions: { width: 2, height: 2 },
  };

  it('accetta celle come oggetti, null come blocco e clue come oggetti', () => {
    const doc = {
      ...base,
      puzzle: [
        [{ cell: 1 }, 2],
        [null, { cell: 3 }],
      ],
      solution: [
        [{ value: 'n' }, 'o'],
        ['#', 'x'],
      ],
      clues: {
        Across: [{ number: 1, clue: 'Prima' }],
        Down: [[2, 'Seconda']],
      },
    };
    const puzzle = fromIpuz(doc);
    expect(puzzle.grid.cells[0].letter).toBe('N');
    expect(puzzle.grid.cells[2].block).toBe(true);
    // A1 esiste (riga 0), la clue "Prima" deve finire su di lui
    const a1 = puzzle.slots.find((s) => s.dir === 'across' && s.number === 1)!;
    expect(puzzle.clues[a1.id]).toBe('Prima');
  });

  it('rifiuta documenti non crossword o senza dimensioni', () => {
    expect(() => fromIpuz({ ...base, kind: ['http://ipuz.org/sudoku#1'], puzzle: [] })).toThrow();
    expect(() => fromIpuz({ version: base.version, kind: base.kind, puzzle: [] })).toThrow();
    expect(() => parseIpuz('{ non json')).toThrow();
  });

  it('rispetta un token di blocco personalizzato', () => {
    const doc = {
      ...base,
      block: 'X',
      puzzle: [
        [1, 'X'],
        [2, 3],
      ],
    };
    const puzzle = fromIpuz(doc);
    expect(puzzle.grid.cells[1].block).toBe(true);
    expect(puzzle.grid.cells[0].block).toBe(false);
  });
});
