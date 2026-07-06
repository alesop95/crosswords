import type { Grid, Slot } from '../core/types';
import { slotPattern, slotWord, slotsByCell } from '../core/slots';
import type { WordList } from '../dict/wordlist';
import { Bitset } from '../dict/wordlist';

/** Incrocio precalcolato tra due variabili. */
export interface Arc {
  pos: number;
  otherId: string;
  otherPos: number;
}

/** Variabile del CSP: uno slot da riempire con il suo dominio corrente. */
export interface SlotVar {
  slot: Slot;
  domain: Bitset;
  count: number;
  assigned: string | null;
  arcs: Arc[];
}

export interface CspProblem {
  vars: Map<string, SlotVar>;
  /** Parole gia' complete in griglia o assegnate: vietate ai nuovi slot. */
  used: Set<string>;
  /** Slot con lunghezza non coperta dal dizionario: non riempibili. */
  uncovered: Slot[];
  /** true se un dominio e' gia' vuoto in partenza. */
  infeasible: boolean;
}

/**
 * Costruisce il problema dal puzzle corrente: una variabile per ogni slot
 * incompleto coperto dal dizionario, dominio dalle parole compatibili col
 * pattern (le lettere dell'utente sono vincoli rigidi), parole complete nel
 * set delle usate.
 */
export function buildProblem(grid: Grid, slots: Slot[], dict: WordList): CspProblem {
  const vars = new Map<string, SlotVar>();
  const used = new Set<string>();
  const uncovered: Slot[] = [];
  let infeasible = false;

  for (const slot of slots) {
    const word = slotWord(grid, slot);
    if (word !== null) {
      used.add(word);
      continue;
    }
    const domain = dict.matchPattern(slotPattern(grid, slot));
    if (domain === null) {
      uncovered.push(slot);
      continue;
    }
    const count = domain.count();
    if (count === 0) infeasible = true;
    vars.set(slot.id, { slot, domain, count, assigned: null, arcs: [] });
  }

  const byCell = slotsByCell(slots);
  for (const variable of vars.values()) {
    variable.slot.cellIdxs.forEach((cellIdx, pos) => {
      for (const other of byCell.get(cellIdx) ?? []) {
        if (other.id === variable.slot.id || !vars.has(other.id)) continue;
        variable.arcs.push({
          pos,
          otherId: other.id,
          otherPos: other.cellIdxs.indexOf(cellIdx),
        });
      }
    });
  }

  return { vars, used, uncovered, infeasible };
}

/** Voce del trail per il ripristino al backtrack. */
export interface TrailEntry {
  variable: SlotVar;
  domain: Bitset;
  count: number;
}

/**
 * Forward checking: restringe i domini degli slot incrociati alla lettera
 * imposta. Registra i domini precedenti nel trail; ritorna false su dominio
 * vuoto (il chiamante ripristina il trail).
 */
export function forwardCheck(
  problem: CspProblem,
  variable: SlotVar,
  word: string,
  dict: WordList,
  trail: TrailEntry[],
): boolean {
  for (const arc of variable.arcs) {
    const other = problem.vars.get(arc.otherId)!;
    if (other.assigned !== null) continue;
    const index = dict.index(other.slot.len)!;
    const mask = index.byPosLetter[arc.otherPos][word.charCodeAt(arc.pos) - 65];
    trail.push({ variable: other, domain: other.domain, count: other.count });
    const next = other.domain.clone().andInPlace(mask);
    other.domain = next;
    other.count = next.count();
    if (other.count === 0) return false;
  }
  return true;
}

export function undoTrail(trail: TrailEntry[], mark: number): void {
  while (trail.length > mark) {
    const entry = trail.pop()!;
    entry.variable.domain = entry.domain;
    entry.variable.count = entry.count;
  }
}

/**
 * Consistenza d'arco sui domini (MAC): dai semi indicati, per ogni incrocio
 * calcola le lettere ancora possibili nello slot sorgente e maschera il
 * dominio dello slot incrociato; i domini che si restringono rientrano in
 * coda fino al punto fisso. Ritorna false su dominio vuoto (il chiamante
 * ripristina il trail). E' il rinforzo che il solo forward checking non da':
 * necessario per le griglie con parole lunghe che incrociano tutto.
 */
export function propagateDomains(
  problem: CspProblem,
  dict: WordList,
  seedIds: Iterable<string>,
  trail: TrailEntry[],
): boolean {
  // Sopra questa taglia un dominio ammette quasi certamente tutte le lettere
  // in ogni posizione: mascherare gli incroci non pota nulla e costa molto.
  const PROPAGATE_MAX_DOMAIN = 4000;
  const queue: string[] = [...seedIds];
  const queued = new Set(queue);
  while (queue.length > 0) {
    const id = queue.shift()!;
    queued.delete(id);
    const variable = problem.vars.get(id);
    if (!variable || variable.assigned !== null) continue;
    if (variable.count > PROPAGATE_MAX_DOMAIN) continue;
    const index = dict.index(variable.slot.len)!;

    for (const arc of variable.arcs) {
      const other = problem.vars.get(arc.otherId)!;
      if (other.assigned !== null) continue;
      const otherIndex = dict.index(other.slot.len)!;

      const mask = new Bitset(otherIndex.words.length);
      for (let c = 0; c < 26; c++) {
        const letterBits = index.byPosLetter[arc.pos][c].clone().andInPlace(variable.domain);
        if (!letterBits.isEmpty()) mask.orInPlace(otherIndex.byPosLetter[arc.otherPos][c]);
      }

      const next = other.domain.clone().andInPlace(mask);
      const after = next.count();
      if (after < other.count) {
        trail.push({ variable: other, domain: other.domain, count: other.count });
        other.domain = next;
        other.count = after;
        if (after === 0) return false;
        if (!queued.has(arc.otherId)) {
          queue.push(arc.otherId);
          queued.add(arc.otherId);
        }
      }
    }
  }
  return true;
}
