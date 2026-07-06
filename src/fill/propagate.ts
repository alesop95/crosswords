import type { Grid, Slot } from '../core/types';
import { slotPattern, slotsByCell } from '../core/slots';
import { ALPHA, Bitset, WordList } from '../dict/wordlist';

export interface SlotDomain {
  slot: Slot;
  /** Bitset delle parole compatibili; null se slot completo o non coperto. */
  domain: Bitset | null;
  /** Pattern completo quando lo slot e' gia' tutto scritto: lettere fisse. */
  fixedPattern: string | null;
}

export interface PropagationResult {
  domains: Map<string, SlotDomain>;
  /** indice cella -> insieme lettere ammissibili (sottoinsieme di ALPHA). */
  feasibleLetters: Map<number, Set<string>>;
  /** true se uno slot incompleto ha dominio vuoto o una cella resta senza lettere. */
  hasDeadEnd: boolean;
}

/**
 * Propagazione a punto fisso delle lettere ammissibili.
 *
 * Gli slot completi sono vincoli fissi: le loro lettere esistono comunque,
 * anche se la parola non sta nel dizionario (parole dell'utente ammesse), e
 * si limitano a vincolare gli incroci. Gli slot incompleti hanno il dominio
 * delle parole compatibili col pattern; quando le lettere possibili di una
 * cella si restringono, i domini incrociati si rifiltrano fino a stabilita'.
 */
export function propagate(grid: Grid, slots: Slot[], dict: WordList): PropagationResult {
  const domains = new Map<string, SlotDomain>();
  for (const slot of slots) {
    const pattern = slotPattern(grid, slot);
    if (!pattern.includes('?')) {
      domains.set(slot.id, { slot, domain: null, fixedPattern: pattern });
    } else {
      domains.set(slot.id, { slot, domain: dict.matchPattern(pattern), fixedPattern: null });
    }
  }

  const byCell = slotsByCell(slots);
  const queue: Slot[] = [...slots];
  const queued = new Set(slots.map((s) => s.id));

  const letterSetOf = (slot: Slot, pos: number): Set<string> => {
    const entry = domains.get(slot.id)!;
    if (entry.fixedPattern) return new Set([entry.fixedPattern[pos]]);
    const index = dict.index(slot.len);
    if (!entry.domain || !index) {
      // lunghezza non coperta dal dizionario: vincola solo dove c'e' una lettera
      const fixed = grid.cells[slot.cellIdxs[pos]].letter;
      if (fixed) return new Set([fixed]);
      return new Set(ALPHA);
    }
    const letters = new Set<string>();
    for (let c = 0; c < 26; c++) {
      const bits = index.byPosLetter[pos][c].clone().andInPlace(entry.domain);
      if (!bits.isEmpty()) letters.add(ALPHA[c]);
    }
    return letters;
  };

  while (queue.length > 0) {
    const slot = queue.shift()!;
    queued.delete(slot.id);

    for (let pos = 0; pos < slot.len; pos++) {
      const cellIdx = slot.cellIdxs[pos];
      const allowed = letterSetOf(slot, pos);
      if (allowed.size === 26) continue;
      const others = (byCell.get(cellIdx) ?? []).filter((s) => s.id !== slot.id);
      for (const other of others) {
        const otherEntry = domains.get(other.id)!;
        const otherIndex = dict.index(other.len);
        if (!otherEntry.domain || !otherIndex) continue;
        const otherPos = other.cellIdxs.indexOf(cellIdx);

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
  for (const [cellIdx, letters] of feasibleLetters) {
    if (letters.size === 0 && !grid.cells[cellIdx].letter) hasDeadEnd = true;
  }

  return { domains, feasibleLetters, hasDeadEnd };
}
