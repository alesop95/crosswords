/// <reference lib="webworker" />
import { WordList } from '../dict/wordlist';
import { bestWordForSlot, fillGrid } from './filler';
import type { Grid, Slot } from '../core/types';

export type WorkerRequest =
  | { type: 'init'; dictText: string }
  | { type: 'fill'; requestId: number; grid: Grid; slots: Slot[]; seed: number; timeoutMs: number }
  | { type: 'fillSlot'; requestId: number; grid: Grid; slots: Slot[]; slotId: string; seed: number };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; requestId: number; assigned: number; total: number }
  | { type: 'result'; requestId: number; result: ReturnType<typeof fillGrid> }
  | { type: 'slotResult'; requestId: number; word: string | null }
  | { type: 'error'; message: string };

let dict: WordList | null = null;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      dict = WordList.fromText(msg.dictText);
      post({ type: 'ready' });
      return;
    }
    if (!dict) {
      post({ type: 'error', message: 'worker non inizializzato' });
      return;
    }
    if (msg.type === 'fill') {
      const result = fillGrid(msg.grid, msg.slots, dict, {
        seed: msg.seed,
        timeoutMs: msg.timeoutMs,
        onProgress: (assigned, total) =>
          post({ type: 'progress', requestId: msg.requestId, assigned, total }),
      });
      post({ type: 'result', requestId: msg.requestId, result });
      return;
    }
    if (msg.type === 'fillSlot') {
      const word = bestWordForSlot(msg.grid, msg.slots, dict, msg.slotId, msg.seed);
      post({ type: 'slotResult', requestId: msg.requestId, word });
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

function post(message: WorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}
