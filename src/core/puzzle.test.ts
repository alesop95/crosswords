import { describe, expect, it } from 'vitest';
import { gridFromAscii } from './testutil';
import { createPuzzle, setClue, withGrid } from './puzzle';
import { toggleBlock } from './grid';

describe('withGrid: riconciliazione definizioni', () => {
  it('una definizione segue lo slot se posizione e lunghezza restano', () => {
    let puzzle = createPuzzle(5, 5);
    const a1 = puzzle.slots.find((s) => s.id === 'A1')!;
    puzzle = setClue(puzzle, a1.id, 'Prima orizzontale');
    // annerire in fondo alla griglia non tocca A1
    const grid = toggleBlock(puzzle.grid, 4, 4, 'none');
    const next = withGrid(puzzle, grid);
    const stillA1 = next.slots.find((s) => s.row === 0 && s.col === 0 && s.dir === 'across')!;
    expect(next.clues[stillA1.id]).toBe('Prima orizzontale');
  });

  it('una definizione orfana finisce nel cestino, non si perde', () => {
    let puzzle = createPuzzle(5, 5);
    const a1 = puzzle.slots.find((s) => s.id === 'A1')!;
    puzzle = setClue(puzzle, a1.id, 'Definizione preziosa');
    // annerire dentro A1 ne cambia la lunghezza: la definizione diventa orfana
    const grid = toggleBlock(puzzle.grid, 0, 2, 'none');
    const next = withGrid(puzzle, grid);
    expect(Object.values(next.clues)).not.toContain('Definizione preziosa');
    expect(Object.values(next.orphanClues)).toContain('Definizione preziosa');
  });

  it('la rinumerazione sposta la definizione sul nuovo id', () => {
    let puzzle = createPuzzle(5, 5);
    const a1 = puzzle.slots.find((s) => s.dir === 'across' && s.row === 2 && s.col === 0)!;
    puzzle = setClue(puzzle, a1.id, 'Riga centrale');
    // un nero in alto a sinistra rinumera tutto ma la riga centrale sopravvive
    const grid = gridFromAscii(['#....', '.....', '.....', '.....', '.....']);
    const next = withGrid(puzzle, grid);
    const moved = next.slots.find((s) => s.dir === 'across' && s.row === 2 && s.col === 0)!;
    expect(next.clues[moved.id]).toBe('Riga centrale');
  });
});
