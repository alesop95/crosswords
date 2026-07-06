import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { WordList } from '../dict/wordlist';
import { extractSlots, slotWord, validateGrid } from '../core/slots';
import { gridFromAscii } from '../core/testutil';
import { propagate } from './propagate';
import { fillGrid } from './filler';

const ASSET = 'public/wordlists/it.txt.gz';

// Griglia 13x13 all'italiana realistica: nero distribuito, nessuna riga o
// colonna intera, run verticali massimi 9-10 (gli schemi con piu' colonne
// da 13 adiacenti sono configurazioni avversarie fuori dal target v1)
const GRID_13 = gridFromAscii([
  '....#....#...',
  '....#....#...',
  '......#......',
  '#......#.....',
  '.....#.....#.',
  '..#.....#....',
  '......#......',
  '....#.....#..',
  '.#.....#.....',
  '.....#......#',
  '......#......',
  '...#....#....',
  '...#....#....',
]);

describe.skipIf(!existsSync(ASSET))('prestazioni con il dizionario reale', () => {
  it('carica, indicizza e propaga in tempi accettabili', () => {
    const t0 = performance.now();
    const text = gunzipSync(readFileSync(ASSET)).toString('utf8');
    const dict = WordList.fromText(text);
    const t1 = performance.now();
    expect(dict.size()).toBeGreaterThan(300000);

    const slots = extractSlots(GRID_13);
    expect(slots.length).toBeGreaterThan(30);
    // la fixture deve essere uno schema sano
    expect(validateGrid(GRID_13)).toEqual([]);
    const t2 = performance.now();
    const result = propagate(GRID_13, slots, dict);
    const t3 = performance.now();

    console.log(
      `dizionario: parse+indici ${(t1 - t0).toFixed(0)}ms, propagate 13x13 ${(t3 - t2).toFixed(0)}ms`,
    );
    expect(result.hasDeadEnd).toBe(false);
    // limiti larghi da CI: in browser i tempi osservati sono piu' bassi
    expect(t1 - t0).toBeLessThan(10000);
    expect(t3 - t2).toBeLessThan(2000);
  });

  it('riempie la 13x13 italiana con il dizionario reale su piu seed', () => {
    const text = gunzipSync(readFileSync(ASSET)).toString('utf8');
    const dict = WordList.fromText(text);
    const slots = extractSlots(GRID_13);
    let successes = 0;
    const times: number[] = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const t0 = performance.now();
      const result = fillGrid(GRID_13, slots, dict, { seed, timeoutMs: 5000 });
      times.push(performance.now() - t0);
      if (result.status !== 'filled') continue;
      const filled = extractSlots(result.grid).map((s) => slotWord(result.grid, s));
      expect(filled.every((w) => w !== null)).toBe(true);
      expect(new Set(filled).size).toBe(filled.length);
      successes++;
    }
    console.log(
      `fill 13x13: ${successes}/5 riusciti, tempi ms = ${times.map((t) => t.toFixed(0)).join(', ')}`,
    );
    // criterio M3: almeno il 90% dei run entro il timeout (qui 5/5 attesi)
    expect(successes).toBeGreaterThanOrEqual(4);
  }, 60000);
});
