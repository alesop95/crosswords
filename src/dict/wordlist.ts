/**
 * Dizionario indicizzato per il suggerimento e il riempimento.
 *
 * Per ogni lunghezza L tiene le parole con punteggio e un indice bitset
 * byPosLetter[p][c]: i bit accesi sono gli id delle parole con la lettera c in
 * posizione p. La ricerca per pattern e' un AND di bitset, O(n/32) per posizione
 * fissata.
 */

export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Bitset {
  readonly words: Uint32Array;

  constructor(readonly size: number, words?: Uint32Array) {
    this.words = words ?? new Uint32Array(Math.ceil(size / 32));
  }

  set(i: number): void {
    this.words[i >> 5] |= 1 << (i & 31);
  }

  has(i: number): boolean {
    return (this.words[i >> 5] & (1 << (i & 31))) !== 0;
  }

  clone(): Bitset {
    return new Bitset(this.size, this.words.slice());
  }

  /** this &= other, ritorna this. */
  andInPlace(other: Bitset): Bitset {
    for (let w = 0; w < this.words.length; w++) this.words[w] &= other.words[w];
    return this;
  }

  /** this |= other, ritorna this. */
  orInPlace(other: Bitset): Bitset {
    for (let w = 0; w < this.words.length; w++) this.words[w] |= other.words[w];
    return this;
  }

  isEmpty(): boolean {
    for (let w = 0; w < this.words.length; w++) if (this.words[w] !== 0) return false;
    return true;
  }

  count(): number {
    let n = 0;
    for (let w = 0; w < this.words.length; w++) {
      let v = this.words[w];
      v = v - ((v >>> 1) & 0x55555555);
      v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
      n += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
    }
    return n;
  }

  /** Itera gli indici accesi (in ordine crescente). */
  *indices(): Generator<number> {
    for (let w = 0; w < this.words.length; w++) {
      let v = this.words[w];
      while (v !== 0) {
        const bit = v & -v;
        yield (w << 5) + 31 - Math.clz32(bit);
        v ^= bit;
      }
    }
  }

  static full(size: number): Bitset {
    const bs = new Bitset(size);
    bs.words.fill(0xffffffff);
    const tail = size & 31;
    if (tail !== 0) bs.words[bs.words.length - 1] = (1 << tail) - 1;
    return bs;
  }
}

export interface LengthIndex {
  words: string[];
  scores: Uint8Array;
  /** [posizione][lettera 0..25] -> bitset degli id parola. */
  byPosLetter: Bitset[][];
}

export class WordList {
  private byLen = new Map<number, LengthIndex>();

  /** Parole extra dell'utente gia' normalizzate, unite a runtime. */
  static fromText(text: string, extra: Iterable<string> = []): WordList {
    const staging = new Map<number, { word: string; score: number }[]>();
    const seen = new Set<string>();
    const push = (word: string, score: number) => {
      if (seen.has(word)) return;
      seen.add(word);
      const list = staging.get(word.length);
      if (list) list.push({ word, score });
      else staging.set(word.length, [{ word, score }]);
    };

    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const sep = line.indexOf(';');
      const word = sep >= 0 ? line.slice(0, sep) : line;
      const score = sep >= 0 ? Number(line.slice(sep + 1)) : 50;
      if (!/^[A-Z]{2,21}$/.test(word)) continue;
      push(word, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50);
    }
    for (const word of extra) {
      if (/^[A-Z]{2,21}$/.test(word)) push(word, 55);
    }

    const list = new WordList();
    for (const [len, items] of staging) {
      items.sort((a, b) => b.score - a.score);
      const index: LengthIndex = {
        words: items.map((i) => i.word),
        scores: Uint8Array.from(items.map((i) => i.score)),
        byPosLetter: Array.from({ length: len }, () =>
          Array.from({ length: 26 }, () => new Bitset(items.length)),
        ),
      };
      items.forEach((item, id) => {
        for (let p = 0; p < len; p++) {
          index.byPosLetter[p][item.word.charCodeAt(p) - 65].set(id);
        }
      });
      list.byLen.set(len, index);
    }
    return list;
  }

  index(len: number): LengthIndex | undefined {
    return this.byLen.get(len);
  }

  size(): number {
    let n = 0;
    for (const idx of this.byLen.values()) n += idx.words.length;
    return n;
  }

  /**
   * Bitset delle parole compatibili col pattern ("C?S?": '?' jolly).
   * Ritorna null se nessuna parola ha quella lunghezza.
   */
  matchPattern(pattern: string): Bitset | null {
    const index = this.byLen.get(pattern.length);
    if (!index) return null;
    let result: Bitset | null = null;
    for (let p = 0; p < pattern.length; p++) {
      const ch = pattern[p];
      if (ch === '?') continue;
      const letterBits = index.byPosLetter[p][ch.charCodeAt(0) - 65];
      if (!letterBits) return new Bitset(index.words.length);
      if (result === null) result = letterBits.clone();
      else result.andInPlace(letterBits);
      if (result.isEmpty()) return result;
    }
    return result ?? Bitset.full(index.words.length);
  }

  /** Prime maxItems parole compatibili col pattern, gia' in ordine di punteggio. */
  suggestions(pattern: string, maxItems: number, exclude?: Set<string>): { word: string; score: number }[] {
    const index = this.byLen.get(pattern.length);
    if (!index) return [];
    const bits = this.matchPattern(pattern);
    if (!bits) return [];
    const out: { word: string; score: number }[] = [];
    for (const id of bits.indices()) {
      const word = index.words[id];
      if (exclude?.has(word)) continue;
      out.push({ word, score: index.scores[id] });
      if (out.length >= maxItems) break;
    }
    // gli id crescono per punteggio decrescente ma indices() scorre i bit in
    // ordine numerico, che coincide: nessun riordino necessario
    return out;
  }
}
