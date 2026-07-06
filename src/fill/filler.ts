import type { Grid, Slot } from '../core/types';
import { setLetter } from '../core/grid';
import type { WordList } from '../dict/wordlist';
import type { CspProblem, SlotVar } from './csp';
import { buildProblem, forwardCheck, propagateDomains, undoTrail } from './csp';

export interface FillOptions {
  seed?: number;
  timeoutMs?: number;
  maxBacktracksPerRestart?: number;
  /** Candidati valutati per variabile a ogni nodo. */
  topK?: number;
  onProgress?: (assigned: number, total: number) => void;
}

export type FillStatus = 'filled' | 'partial' | 'infeasible';

export interface FillResult {
  status: FillStatus;
  grid: Grid;
  assigned: number;
  totalSlots: number;
  elapsedMs: number;
}

/** PRNG deterministico (mulberry32) per run riproducibili nei test. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Riempimento della griglia: backtracking con MRV, forward checking, divieto
 * di parole ripetute, restart con seed diversi e timeout con miglior parziale.
 * Funzione pura e sincrona: nel browser gira dentro il Web Worker.
 */
export function fillGrid(grid: Grid, slots: Slot[], dict: WordList, options: FillOptions = {}): FillResult {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 10000;
  const baseBacktracks = options.maxBacktracksPerRestart ?? 250;
  const topK = options.topK ?? 24;
  const baseSeed = options.seed ?? 1;

  const totalVars = () => buildProblem(grid, slots, dict).vars.size;
  let best: Map<string, string> | null = null;
  let bestSize = -1;
  let infeasibleProven = false;

  for (let restart = 0; Date.now() - start < timeoutMs; restart++) {
    const problem = buildProblem(grid, slots, dict);
    if (problem.vars.size === 0) {
      return { status: 'filled', grid, assigned: 0, totalSlots: 0, elapsedMs: Date.now() - start };
    }
    if (problem.infeasible) {
      infeasibleProven = true;
      break;
    }
    // consistenza d'arco iniziale: coglie i vicoli ciechi strutturali subito
    const initialTrail: Parameters<typeof undoTrail>[0] = [];
    if (!propagateDomains(problem, dict, [...problem.vars.keys()], initialTrail)) {
      infeasibleProven = true;
      break;
    }
    const rng = mulberry32(baseSeed + restart * 7919);
    // restart geometrici: prime fughe rapide dalle scelte sbagliate, poi
    // ricerche via via piu' profonde
    const maxBacktracks = baseBacktracks * Math.pow(2, Math.min(restart, 7));
    const outcome = search(problem, dict, rng, {
      deadline: start + timeoutMs,
      maxBacktracks,
      topK,
      onBetter: (assignment) => {
        if (assignment.size > bestSize) {
          bestSize = assignment.size;
          best = new Map(assignment);
          options.onProgress?.(assignment.size, problem.vars.size);
        }
      },
    });
    if (outcome === 'solved') {
      const assignment = new Map<string, string>();
      for (const v of problem.vars.values()) assignment.set(v.slot.id, v.assigned!);
      return {
        status: 'filled',
        grid: applyAssignment(grid, slots, assignment),
        assigned: assignment.size,
        totalSlots: problem.vars.size,
        elapsedMs: Date.now() - start,
      };
    }
    if (outcome === 'exhausted') {
      // spazio esaurito senza tagli di budget: nessun fill esiste
      infeasibleProven = true;
      break;
    }
  }

  if (infeasibleProven && bestSize <= 0) {
    return { status: 'infeasible', grid, assigned: 0, totalSlots: totalVars(), elapsedMs: Date.now() - start };
  }
  const partial = best !== null ? applyAssignment(grid, slots, best) : grid;
  return {
    status: best !== null && bestSize > 0 ? 'partial' : 'infeasible',
    grid: partial,
    assigned: Math.max(0, bestSize),
    totalSlots: totalVars(),
    elapsedMs: Date.now() - start,
  };
}

interface SearchControl {
  deadline: number;
  maxBacktracks: number;
  topK: number;
  onBetter: (assignment: Map<string, string>) => void;
}

type SearchOutcome = 'solved' | 'exhausted' | 'exhausted-pruned' | 'aborted';

function search(problem: CspProblem, dict: WordList, rng: () => number, control: SearchControl): SearchOutcome {
  const trail: { variable: SlotVar; domain: SlotVar['domain']; count: number }[] = [];
  const assignment = new Map<string, string>();
  let backtracks = 0;
  let aborted = false;
  let pruned = false;

  function pickVariable(): SlotVar | null {
    let bestVar: SlotVar | null = null;
    for (const v of problem.vars.values()) {
      if (v.assigned !== null) continue;
      if (bestVar === null || v.count < bestVar.count) bestVar = v;
    }
    return bestVar;
  }

  function candidatesFor(variable: SlotVar): string[] {
    const index = dict.index(variable.slot.len)!;
    const scored: { word: string; value: number }[] = [];
    let evaluated = 0;
    for (const id of variable.domain.indices()) {
      const word = index.words[id];
      if (problem.used.has(word)) continue;
      // somma logaritmica dei domini residui sugli incroci (least-constraining)
      let value = 0;
      let dead = false;
      for (const arc of variable.arcs) {
        const other = problem.vars.get(arc.otherId)!;
        if (other.assigned !== null) continue;
        const mask = dict.index(other.slot.len)!.byPosLetter[arc.otherPos][word.charCodeAt(arc.pos) - 65];
        const rem = other.domain.clone().andInPlace(mask).count();
        if (rem === 0) {
          dead = true;
          break;
        }
        value += Math.log1p(rem);
      }
      evaluated++;
      if (dead) {
        // continua a cercare: i candidati vivi possono stare oltre i primi id
        if (evaluated >= 3000) break;
        continue;
      }
      value += index.scores[id] * 0.02 + rng() * 0.5;
      scored.push({ word, value });
      // gli id sono gia' in ordine di punteggio: con abbastanza vivi ci si ferma
      if (scored.length >= control.topK * 4 || evaluated >= 3000) break;
    }
    scored.sort((a, b) => b.value - a.value);
    if (scored.length > control.topK || evaluated >= 3000) pruned = true;
    return scored.slice(0, control.topK).map((s) => s.word);
  }

  function step(): boolean {
    if (Date.now() > control.deadline || backtracks > control.maxBacktracks) {
      aborted = true;
      return false;
    }
    const variable = pickVariable();
    if (variable === null) return true; // tutte assegnate

    for (const word of candidatesFor(variable)) {
      const mark = trail.length;
      variable.assigned = word;
      problem.used.add(word);
      assignment.set(variable.slot.id, word);
      control.onBetter(assignment);

      const consistent =
        forwardCheck(problem, variable, word, dict, trail) &&
        propagateDomains(
          problem,
          dict,
          variable.arcs.map((a) => a.otherId),
          trail,
        );
      if (consistent && step()) return true;
      if (aborted) return false;

      undoTrail(trail, mark);
      variable.assigned = null;
      problem.used.delete(word);
      assignment.delete(variable.slot.id);
      backtracks++;
      if (backtracks > control.maxBacktracks) {
        aborted = true;
        return false;
      }
    }
    return false;
  }

  if (step()) return 'solved';
  if (aborted) return 'aborted';
  return pruned ? 'exhausted-pruned' : 'exhausted';
}

function applyAssignment(grid: Grid, slots: Slot[], assignment: Map<string, string>): Grid {
  let next = grid;
  const byId = new Map(slots.map((s) => [s.id, s]));
  for (const [slotId, word] of assignment) {
    const slot = byId.get(slotId);
    if (!slot) continue;
    for (let pos = 0; pos < slot.len; pos++) {
      const row = Math.floor(slot.cellIdxs[pos] / grid.width);
      const col = slot.cellIdxs[pos] % grid.width;
      next = setLetter(next, row, col, word[pos]);
    }
  }
  return next;
}

/**
 * Migliore parola per un singolo slot, coerente con gli incroci correnti.
 * Ritorna null se nessuna parola e' compatibile.
 */
export function bestWordForSlot(
  grid: Grid,
  slots: Slot[],
  dict: WordList,
  slotId: string,
  seed = 1,
): string | null {
  const problem = buildProblem(grid, slots, dict);
  const variable = problem.vars.get(slotId);
  if (!variable) return null;
  const rng = mulberry32(seed);
  const index = dict.index(variable.slot.len)!;
  let bestWord: string | null = null;
  let bestValue = -Infinity;
  let considered = 0;
  for (const id of variable.domain.indices()) {
    const word = index.words[id];
    if (problem.used.has(word)) continue;
    let value = index.scores[id] * 0.05 + rng() * 0.1;
    let dead = false;
    for (const arc of variable.arcs) {
      const other = problem.vars.get(arc.otherId)!;
      const mask = dict.index(other.slot.len)!.byPosLetter[arc.otherPos][word.charCodeAt(arc.pos) - 65];
      const rem = other.domain.clone().andInPlace(mask).count();
      if (rem === 0) {
        dead = true;
        break;
      }
      value += Math.log1p(rem);
    }
    if (dead) continue;
    if (value > bestValue) {
      bestValue = value;
      bestWord = word;
    }
    if (++considered >= 200) break;
  }
  return bestWord;
}
