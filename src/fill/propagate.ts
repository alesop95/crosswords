import type { Grid, Slot } from '../core/types';
import { slotPattern, slotsByCell } from '../core/slots';
import { ALPHA, Bitset, WordList } from '../dict/wordlist';

export interface SlotDomain {
  slot: Slot;
  /** Bitset delle parole del dizionario ancora compatibili, per lunghezza slot. */
  domain: Bitset | null;
}

export interface PropagationResult {
  /** slotId -> dominio corrente (null se il dizionario non copre la lunghezza). */
  domains: Map<string, SlotDomain>;
  /** indice cella -> insieme lettere ammissibili (sottoinsieme di ALPHA). */
  feasibleLetters: Map<number, Set<string>>;
  /** true se almeno uno slot ha dominio vuoto o una cella non ha lettere. */
  hasDeadEnd: boolean;
}

/**
 * Propagazione a punto fisso delle lettere ammissibili.
 *
 * Per ogni slot il dominio parte dalle parole compatibili col pattern corrente;
 * per ogni cella la lettera c e' ammissibile se entrambi gli slot che la
 * attraversano hanno almeno una parola con c in quella posizione. Quando le
 * lettere di una cella si restringono, i domini degli slot coinvolti si
 * rifiltrano, fino a stabilita'. Costa pochi millisecondi sulle griglie 25x25:
 * la UI la rilancia integralmente a ogni modifica.
 */
export function propagate(grid: Grid, slots: Slot[], dict: WordList): PropagationResult {
  const domains = new Map<string, SlotDomain>();
  for (const slot of slots) {
    domains.set(slot.id, { slot, domain: dict.matchPattern(slotPattern(grid, slot)) });
  }

  const byCell = slotsByCell(slots);
  const queue: Slot[] = [...slots];
  const queued = new Set(slots.map((s) => s.id));

  const letterSetOf = (slot: Slot, pos: number): Set<string> => {
    const entry = domains.get(slot.id)!;
    const index = dict.index(slot.len);
    const letters = new Set<string>();
    if (!entry.domain || !index) {
      // lunghezza non coperta dal dizionario: nessun vincolo dal lato slot
      const fixed = grid.cells[slot.cellIdxs[pos]].letter;
      if (fixed) letters.add(fixed);
      else for (const c of ALPHA) letters.add(c);
      return letters;
    }
    for (let c = 0; c < 26; c++) {
      const bits = index.byPosLetter[pos][c].clone().andInPlace(entry.domain);
      if (!bits.isEmpty()) letters.add(ALPHA[c]);
    }
    return letters;
  };

  while (queue.length > 0) {
    const slot = queue.shift()!;
    queued.delete(slot.id);
    const entry = domains.get(slot.id)!;
    const index = dict.index(slot.len);
    if (!entry.domain || !index) continue;

    for (let pos = 0; pos < slot.len; pos++) {
      const cellIdx = slot.cellIdxs[pos];
      const others = (byCell.get(cellIdx) ?? []).filter((s) => s.id !== slot.id);
      for (const other of others) {
        const otherEntry = domains.get(other.id)!;
        const otherIndex = dict.index(other.len);
        if (!otherEntry.domain || !otherIndex) continue;
        const otherPos = other.cellIdxs.indexOf(cellIdx);

        // lettere ammesse dallo slot corrente in questa cella
        const allowed = letterSetOf(slot, pos);
        // filtra il dominio dell'altro slot: OR dei bitset delle lettere ammesse
        const mask = new Bitset(otherIndex.words.length);
        for (const letter of allowed) {
          mask.orInPlace(otherIndex.byPosLetter[otherPos][letter.charCodeAt(0) - 65]);
        }
        const before = otherEntry.domain.count();
        otherEntry.domain.andInPlace(mask);
        if (otherEntry.domain.count() < before && !queued.has(other.id)) {
          queue.push(other);
          queued.add(other.id);
        }
      }
    }
  }

  const feasibleLetters = new Map<number, Set<string>>();
  let hasDeadEnd = false;
  for (const slot of slots) {
    const entry = domains.get(slot.id)!;
    if (entry.domain?.isEmpty()) hasDeadEnd = true;
    for (let pos = 0; pos < slot.len; pos++) {
      const cellIdx = slot.cellIdxs[pos];
      const letters = letterSetOf(slot, pos);
      const existing = feasibleLetters.get(cellIdx);
      if (existing) {
        for (const c of [...existing]) if (!letters.has(c)) existing.delete(c);
      } else {
        feasibleLetters.set(cellIdx, letters);
      }
    }
  }
  for (const letters of feasibleLetters.values()) {
    if (letters.size === 0) hasDeadEnd = true;
  }

  return { domains, feasibleLetters, hasDeadEnd };
}
