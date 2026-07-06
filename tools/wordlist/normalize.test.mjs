import { describe, expect, it } from 'vitest';
import {
  inflectionPenalty,
  isApocopatedVerb,
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
  it('riconosce iniziali maiuscole e tratto NPR', () => {
    expect(isProperNoun({ form: 'Roma', lemma: 'Roma', features: 'NPR' })).toBe(true);
    expect(isProperNoun({ form: 'Dante', lemma: 'Dante', features: 'NPR' })).toBe(true);
    expect(isProperNoun({ form: 'casa', lemma: 'casa', features: 'NOUN-F:s' })).toBe(false);
  });
});

describe('isApocopatedVerb', () => {
  it('esclude le forme verbali poetiche troncate', () => {
    expect(
      isApocopatedVerb({ form: 'considerasser', lemma: 'considerare', features: 'VER:sub+impf+3+p' }),
    ).toBe(true);
    expect(isApocopatedVerb({ form: 'andar', lemma: 'andare', features: 'VER:inf+pres' })).toBe(true);
    expect(isApocopatedVerb({ form: 'fosser', lemma: 'essere', features: 'AUX:sub+impf+3+p' })).toBe(true);
  });

  it('conserva le forme verbali regolari e le non-verbali in consonante', () => {
    expect(isApocopatedVerb({ form: 'fanno', lemma: 'fare', features: 'VER:ind+pres+3+p' })).toBe(false);
    expect(isApocopatedVerb({ form: 'andò', lemma: 'andare', features: 'VER:ind+past+3+s' })).toBe(false);
    expect(isApocopatedVerb({ form: 'film', lemma: 'film', features: 'NOUN-M:s' })).toBe(false);
    expect(isApocopatedVerb({ form: 'gran', lemma: 'gran', features: 'ADJ:pos+f+s' })).toBe(false);
  });
});

describe('inflectionPenalty', () => {
  it('penalizza gli aggregati con clitici', () => {
    const entry = { form: 'facendogliela', lemma: 'fare', features: 'VER:ger+pres+gliela' };
    expect(inflectionPenalty(entry)).toBeGreaterThanOrEqual(30);
  });

  it('penalizza i superlativi', () => {
    const entry = { form: 'pubblicissima', lemma: 'pubblico', features: 'ADJ:sup+f+s' };
    expect(inflectionPenalty(entry)).toBeGreaterThanOrEqual(25);
  });

  it('non penalizza le forme regolari', () => {
    expect(inflectionPenalty({ form: 'case', lemma: 'casa', features: 'NOUN-F:p' })).toBe(0);
    expect(inflectionPenalty({ form: 'fanno', lemma: 'fare', features: 'VER:ind+pres+3+p' })).toBe(
      0,
    );
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
