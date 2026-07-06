import { describe, expect, it } from 'vitest';
import { gridFromAscii } from '../core/testutil';
import { extractSlots, slotWord } from '../core/slots';
import { WordList } from '../dict/wordlist';
import { bestWordForSlot, fillGrid } from './filler';

function words(gridText: string[], dictText: string[]) {
  const grid = gridFromAscii(gridText);
  return { grid, slots: extractSlots(grid), dict: WordList.fromText(dictText.join('\n')) };
}

describe('fillGrid su mini griglie', () => {
  it('riempie una 2x2 completa', () => {
    // quadrato di parole distinte: righe NO/ET, colonne NE/OT
    const { grid, slots, dict } = words(['..', '..'], ['NO;90', 'ET;80', 'NE;70', 'OT;60']);
    const result = fillGrid(grid, slots, dict, { seed: 1, timeoutMs: 2000 });
    expect(result.status).toBe('filled');
    const filled = extractSlots(result.grid).map((s) => slotWord(result.grid, s));
    expect(filled.every((w) => w !== null)).toBe(true);
    // nessuna parola ripetuta
    expect(new Set(filled).size).toBe(filled.length);
  });

  it('rileva infeasibility con dizionario incompatibile', () => {
    // NO/ON/SI/IS: ogni quadrato 2x2 duplicherebbe le parole, quindi niente fill
    const { grid, slots, dict } = words(['..', '..'], ['NO;90', 'ON;80', 'SI;70', 'IS;60']);
    const result = fillGrid(grid, slots, dict, { seed: 1, timeoutMs: 800 });
    expect(result.status).not.toBe('filled');
  });

  it('rispetta le lettere inserite a mano', () => {
    const { grid, slots, dict } = words(['N.', '..'], ['NO;90', 'ET;80', 'NE;70', 'OT;60']);
    const result = fillGrid(grid, slots, dict, { seed: 1, timeoutMs: 2000 });
    expect(result.status).toBe('filled');
    expect(result.grid.cells[0].letter).toBe('N');
    expect(result.grid.cells[1].letter).toBe('O');
  });

  it('riempie una 3x3 con blocco centrale', () => {
    // slot: 2 orizzontali da 3, 2 verticali da 3? no: griglia:
    // . . .
    // . # .
    // . . .
    // slot: A(0,0-2) len3, A(2,0-2) len3, D(0,0) len3, D(0,2) len3
    const dictText = ['ORA;80', 'ODA;70', 'ARA;60', 'AIA;50', 'ORO;40', 'OSA;30', 'ASA;20'];
    const { grid, slots, dict } = words(['...', '.#.', '...'], dictText);
    const result = fillGrid(grid, slots, dict, { seed: 3, timeoutMs: 2000 });
    expect(result.status).toBe('filled');
    const filled = extractSlots(result.grid).map((s) => slotWord(result.grid, s));
    expect(new Set(filled).size).toBe(filled.length);
  });

  it('e deterministico a parita di seed', () => {
    const dictText = ['ORA;80', 'ODA;70', 'ARA;60', 'AIA;50', 'ORO;40', 'OSA;30', 'ASA;20'];
    const a = words(['...', '.#.', '...'], dictText);
    const r1 = fillGrid(a.grid, a.slots, a.dict, { seed: 42, timeoutMs: 2000 });
    const b = words(['...', '.#.', '...'], dictText);
    const r2 = fillGrid(b.grid, b.slots, b.dict, { seed: 42, timeoutMs: 2000 });
    expect(r1.grid.cells.map((c) => c.letter)).toEqual(r2.grid.cells.map((c) => c.letter));
  });
});

describe('bestWordForSlot', () => {
  it('propone una parola coerente con gli incroci', () => {
    const { grid, slots, dict } = words(['N.', '..'], ['NO;90', 'ON;80', 'SI;70', 'IS;60']);
    const across = slots.find((s) => s.dir === 'across' && s.row === 0)!;
    expect(bestWordForSlot(grid, slots, dict, across.id)).toBe('NO');
  });

  it('ritorna null senza candidati', () => {
    const { grid, slots, dict } = words(['X.', '..'], ['NO;90', 'ON;80']);
    const across = slots.find((s) => s.dir === 'across' && s.row === 0)!;
    expect(bestWordForSlot(grid, slots, dict, across.id)).toBeNull();
  });
});
