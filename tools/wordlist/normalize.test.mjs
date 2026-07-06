import { describe, expect, it } from 'vitest';
import {
  isProperNoun,
  normalizeWord,
  parseMorphitLine,
  scoreFromFrequency,
  stripDiacritics,
} from './normalize.mjs';

describe('stripDiacritics', () => {
  it('traslittera gli accenti italiani', () => {
    expect(stripDiacritics('città')).toBe('citta');
    expect(stripDiacritics('perché')).toBe('perche');
    expect(stripDiacritics('più')).toBe('piu');
  });
});

describe('normalizeWord', () => {
  it('porta in maiuscolo senza accenti', () => {
    expect(normalizeWord('città')).toBe('CITTA');
    expect(normalizeWord('caffè')).toBe('CAFFE');
  });

  it('scarta apostrofi, spazi, trattini e cifre', () => {
    expect(normalizeWord("po'")).toBeNull();
    expect(normalizeWord('a priori')).toBeNull();
    expect(normalizeWord('week-end')).toBeNull();
    expect(normalizeWord('k2')).toBeNull();
  });

  it('rispetta i limiti di lunghezza', () => {
    expect(normalizeWord('a')).toBeNull();
    expect(normalizeWord('no')).toBe('NO');
    expect(normalizeWord('x'.repeat(22))).toBeNull();
  });

  it('accetta le lettere straniere ormai italiane', () => {
    expect(normalizeWord('jolly')).toBe('JOLLY');
    expect(normalizeWord('week')).toBe('WEEK');
  });
});

describe('parseMorphitLine', () => {
  it('estrae forma, lemma e tratti', () => {
    expect(parseMorphitLine('case\tcasa\tNOUN-F:p')).toEqual({
      form: 'case',
      lemma: 'casa',
      features: 'NOUN-F:p',
    });
  });

  it('ritorna null su righe malformate', () => {
    expect(parseMorphitLine('solo-una-colonna')).toBeNull();
    expect(parseMorphitLine('due\tcolonne')).toBeNull();
    expect(parseMorphitLine('')).toBeNull();
  });
});

describe('isProperNoun', () => {
  it('riconosce le iniziali maiuscole', () => {
    expect(isProperNoun({ form: 'Roma', lemma: 'Roma', features: 'NOUN-F:s' })).toBe(true);
    expect(isProperNoun({ form: 'casa', lemma: 'casa', features: 'NOUN-F:s' })).toBe(false);
  });
});

describe('scoreFromFrequency', () => {
  it('cresce con la frequenza e resta in 0..100', () => {
    expect(scoreFromFrequency(0)).toBe(0);
    expect(scoreFromFrequency(9)).toBe(20);
    expect(scoreFromFrequency(1e6)).toBeGreaterThan(90);
    expect(scoreFromFrequency(1e9)).toBe(100);
  });

  it('con maxFreq normalizza: solo il massimo tocca 100', () => {
    expect(scoreFromFrequency(1e6, 1e6)).toBe(100);
    expect(scoreFromFrequency(1e5, 1e6)).toBeLessThan(100);
    expect(scoreFromFrequency(1e5, 1e6)).toBeGreaterThan(70);
    expect(scoreFromFrequency(0, 1e6)).toBe(0);
  });
});
