import { describe, expect, it } from 'vitest';
import { Bitset, WordList } from './wordlist';

const SAMPLE = ['CASA;80', 'COSA;75', 'CENA;60', 'ROSA;70', 'MELA;50', 'RE;40', 'NO;90'].join('\n');

/** Implementazione ingenua di riferimento per il confronto. */
function naiveMatch(words: string[], pattern: string): string[] {
  const re = new RegExp('^' + pattern.replaceAll('?', '.') + '$');
  return words.filter((w) => w.length === pattern.length && re.test(w));
}

describe('Bitset', () => {
  it('set, has, count, indices', () => {
    const bs = new Bitset(70);
    bs.set(0);
    bs.set(33);
    bs.set(69);
    expect(bs.has(33)).toBe(true);
    expect(bs.has(34)).toBe(false);
    expect(bs.count()).toBe(3);
    expect([...bs.indices()]).toEqual([0, 33, 69]);
  });

  it('full rispetta la coda', () => {
    const bs = Bitset.full(35);
    expect(bs.count()).toBe(35);
    expect(bs.has(34)).toBe(true);
  });

  it('and e or lavorano in place', () => {
    const a = new Bitset(10);
    const b = new Bitset(10);
    a.set(1);
    a.set(2);
    b.set(2);
    b.set(3);
    expect([...a.clone().andInPlace(b).indices()]).toEqual([2]);
    expect([...a.clone().orInPlace(b).indices()]).toEqual([1, 2, 3]);
  });
});

describe('WordList.matchPattern', () => {
  const list = WordList.fromText(SAMPLE);
  const all = ['CASA', 'COSA', 'CENA', 'ROSA', 'MELA', 'RE', 'NO'];

  it.each(['C?SA', '????', 'R???', '?E??', 'XXXX', '??'])(
    'coincide con il matcher ingenuo per %s',
    (pattern) => {
      const index = list.index(pattern.length);
      const got = index
        ? [...(list.matchPattern(pattern)?.indices() ?? [])].map((id) => index.words[id]).sort()
        : [];
      expect(got).toEqual(naiveMatch(all, pattern).sort());
    },
  );
});

describe('WordList.suggestions', () => {
  const list = WordList.fromText(SAMPLE);

  it('ordina per punteggio decrescente', () => {
    const got = list.suggestions('??SA', 10);
    expect(got.map((s) => s.word)).toEqual(['CASA', 'COSA', 'ROSA']);
  });

  it('esclude le parole gia usate', () => {
    const got = list.suggestions('??SA', 10, new Set(['CASA']));
    expect(got.map((s) => s.word)).toEqual(['COSA', 'ROSA']);
  });

  it('rispetta il limite', () => {
    expect(list.suggestions('????', 2)).toHaveLength(2);
  });
});

describe('WordList.fromText', () => {
  it('ignora commenti, righe vuote e voci non valide', () => {
    const list = WordList.fromText('# commento\n\nCASA;80\ncasa;10\nA;5\nBUONGIORNO-A-TUTTI;9\n');
    expect(list.size()).toBe(1);
  });

  it('unisce le parole personali senza duplicati', () => {
    const list = WordList.fromText('CASA;80', ['CASA', 'TETTO']);
    expect(list.size()).toBe(2);
  });
});
