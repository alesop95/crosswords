import { describe, expect, it } from 'vitest';
import { gridFromAscii } from '../core/testutil';
import { extractSlots } from '../core/slots';
import { WordList } from '../dict/wordlist';
import { propagate } from './propagate';
import { cellIndex } from '../core/grid';

// dizionario giocattolo di sole parole di 2 lettere, chiuso sugli incroci:
// NO/ON e SI/IS permettono griglie 2x2 complete
const DICT = WordList.fromText(['NO;90', 'ON;80', 'SI;70', 'IS;60'].join('\n'));

describe('propagate su griglia 2x2 piena', () => {
  // quattro slot di lunghezza 2 tutti incrociati
  const grid = gridFromAscii(['..', '..']);
  const slots = extractSlots(grid);

  it('senza lettere: ammesse solo le lettere del dizionario coerenti', () => {
    const result = propagate(grid, slots, DICT);
    expect(result.hasDeadEnd).toBe(false);
    // cella (0,0): iniziali coerenti con almeno un incrocio completo
    const letters = result.feasibleLetters.get(cellIndex(grid, 0, 0))!;
    expect([...letters].sort()).toEqual(['I', 'N', 'O', 'S']);
  });

  it('una lettera fissata restringe gli incroci', () => {
    const g2 = gridFromAscii(['N.', '..']);
    const result = propagate(g2, extractSlots(g2), DICT);
    // orizzontale N? -> NO; verticale N? -> NO: cella (0,1) puo' essere solo O
    const right = result.feasibleLetters.get(cellIndex(g2, 0, 1))!;
    expect([...right]).toEqual(['O']);
    const below = result.feasibleLetters.get(cellIndex(g2, 1, 0))!;
    expect([...below]).toEqual(['O']);
  });

  it('lettera incompatibile: vicolo cieco segnalato', () => {
    const g3 = gridFromAscii(['X.', '..']);
    const result = propagate(g3, extractSlots(g3), DICT);
    expect(result.hasDeadEnd).toBe(true);
  });
});

describe('propagate con parole complete fuori dizionario', () => {
  it('una parola completa non nel dizionario non uccide la griglia', () => {
    // XY completa sulla prima riga NON e' nel dizionario: vincola gli
    // incroci alle sue lettere ma non deve produrre il vicolo cieco globale
    const g = gridFromAscii(['XY', '..']);
    const slots = extractSlots(g);
    const dictWide = WordList.fromText(['XO;60', 'YO;70', 'OO;10', 'NO;90'].join('\n'));
    const result = propagate(g, slots, dictWide);
    // sotto la X e' ammessa solo la O (unica X? nel dizionario: XO)
    const below = result.feasibleLetters.get(cellIndex(g, 1, 0))!;
    expect([...below]).toEqual(['O']);
    expect(result.hasDeadEnd).toBe(false);
  });
});

describe('propagate con lunghezze non coperte dal dizionario', () => {
  it('slot lunghi non vincolano ma le celle restano libere', () => {
    const grid = gridFromAscii(['...', '...', '...']);
    const slots = extractSlots(grid);
    const result = propagate(grid, slots, DICT); // il dizionario ha solo len 2
    expect(result.hasDeadEnd).toBe(false);
    const letters = result.feasibleLetters.get(cellIndex(grid, 1, 1))!;
    expect(letters.size).toBe(26);
  });
});
