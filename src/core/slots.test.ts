import { describe, expect, it } from 'vitest';
import { gridFromAscii } from './testutil';
import {
  crossingsOf,
  extractSlots,
  slotPattern,
  slotWord,
  validateGrid,
} from './slots';
import { createGrid, toggleBlock } from './grid';

describe('extractSlots: numerazione standard su griglia 5x5', () => {
  const grid = gridFromAscii([
    '..#..',
    '.....',
    '#...#',
    '.....',
    '..#..',
  ]);
  const slots = extractSlots(grid);

  it('trova tutti gli slot con lunghezza minima 2', () => {
    const ids = slots.map((s) => s.id).sort();
    expect(ids).toEqual(
      ['A1', 'D1', 'D2', 'A3', 'D3', 'D4', 'A5', 'D6', 'A7', 'A8', 'D8', 'D9', 'A10', 'A11'].sort(),
    );
  });

  it('assegna numeri per cella di partenza, non per slot', () => {
    const a1 = slots.find((s) => s.id === 'A1')!;
    const d1 = slots.find((s) => s.id === 'D1')!;
    expect(a1.row).toBe(0);
    expect(a1.col).toBe(0);
    expect(d1.row).toBe(0);
    expect(d1.col).toBe(0);
  });

  it('calcola le lunghezze corrette', () => {
    const byId = new Map(slots.map((s) => [s.id, s]));
    expect(byId.get('A5')!.len).toBe(5);
    expect(byId.get('D2')!.len).toBe(5);
    expect(byId.get('D6')!.len).toBe(3);
    expect(byId.get('A11')!.len).toBe(2);
  });
});

describe('extractSlots: regole italiane', () => {
  it('accetta parole di due lettere', () => {
    const grid = gridFromAscii(['..#', '..#', '###']);
    const ids = extractSlots(grid).map((s) => s.id).sort();
    expect(ids).toEqual(['A1', 'A3', 'D1', 'D2'].sort());
  });

  it('non crea slot di una lettera', () => {
    const grid = gridFromAscii(['.#.', '###', '.#.']);
    expect(extractSlots(grid)).toEqual([]);
  });

  it('griglia piena senza nero: solo slot lunghi quanto i lati', () => {
    const grid = createGrid(5, 5);
    const slots = extractSlots(grid);
    expect(slots).toHaveLength(10);
    expect(slots.every((s) => s.len === 5)).toBe(true);
  });
});

describe('crossingsOf', () => {
  it('trova gli incroci con posizioni coerenti', () => {
    const grid = gridFromAscii(['...', '.#.', '...']);
    const slots = extractSlots(grid);
    const a1 = slots.find((s) => s.id === 'A1')!;
    const crossings = crossingsOf(a1, slots);
    expect(crossings).toHaveLength(2);
    const d1 = crossings.find((c) => c.otherSlotId === 'D1')!;
    expect(d1.pos).toBe(0);
    expect(d1.otherPos).toBe(0);
  });
});

describe('validateGrid', () => {
  it('segnala celle bianche isolate', () => {
    const grid = gridFromAscii(['.#.', '###', '...']);
    const issues = validateGrid(grid);
    expect(issues.some((i) => i.kind === 'isolated-cell')).toBe(true);
  });

  it('segnala regioni disconnesse', () => {
    const grid = gridFromAscii(['..#..', '..#..', '#####', '..#..', '..#..']);
    const issues = validateGrid(grid);
    expect(issues.some((i) => i.kind === 'disconnected-region')).toBe(true);
  });

  it('griglia sana: nessun problema', () => {
    const grid = gridFromAscii(['...', '...', '...']);
    expect(validateGrid(grid)).toEqual([]);
  });
});

describe('slotPattern e slotWord', () => {
  it('pattern con lettere e vuoti', () => {
    const grid = gridFromAscii(['CA..', '####', '....', '####']);
    const slots = extractSlots(grid);
    const a1 = slots.find((s) => s.dir === 'across' && s.row === 0)!;
    expect(slotPattern(grid, a1)).toBe('CA??');
    expect(slotWord(grid, a1)).toBeNull();
  });

  it('parola completa', () => {
    const grid = gridFromAscii(['CASA', '####', '....', '####']);
    const slots = extractSlots(grid);
    const a1 = slots.find((s) => s.dir === 'across' && s.row === 0)!;
    expect(slotWord(grid, a1)).toBe('CASA');
  });
});

describe('toggleBlock con simmetria', () => {
  it('rot180 annerisce anche la speculare', () => {
    const grid = createGrid(5, 5);
    const next = toggleBlock(grid, 0, 1, 'rot180');
    expect(next.cells[1].block).toBe(true);
    expect(next.cells[23].block).toBe(true);
  });

  it('la cella centrale non si duplica', () => {
    const grid = createGrid(5, 5);
    const next = toggleBlock(grid, 2, 2, 'rot180');
    expect(next.cells.filter((c) => c.block)).toHaveLength(1);
  });

  it('senza simmetria tocca solo la cella richiesta', () => {
    const grid = createGrid(5, 5);
    const next = toggleBlock(grid, 0, 1, 'none');
    expect(next.cells.filter((c) => c.block)).toHaveLength(1);
  });
});
