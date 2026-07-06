import type { Grid, Slot } from '../core/types';
import type { FillResult } from './filler';
import type { WorkerRequest, WorkerResponse } from './worker';

export interface FillHandle {
  promise: Promise<FillResult | null>;
  cancel: () => void;
}

/**
 * Client del worker di riempimento. Il dizionario (testo grezzo) viene
 * inviato una volta all'avvio del worker; l'annullamento termina il worker e
 * ne avvia uno nuovo, perche' la ricerca sincrona non puo' ascoltare messaggi.
 */
export class FillerClient {
  private worker: Worker | null = null;
  private ready: Promise<void> = Promise.resolve();
  private nextId = 1;
  private busy = false;

  constructor(private dictText: string) {
    this.spawn();
  }

  isBusy(): boolean {
    return this.busy;
  }

  private spawn(): void {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const worker = this.worker;
    this.ready = new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          worker.removeEventListener('message', onMessage);
          resolve();
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.message));
        }
      };
      worker.addEventListener('message', onMessage);
    });
    const init: WorkerRequest = { type: 'init', dictText: this.dictText };
    worker.postMessage(init);
  }

  /** Riempie la griglia; onProgress riceve i miglioramenti del parziale. */
  fill(
    grid: Grid,
    slots: Slot[],
    options: { seed?: number; timeoutMs?: number; onProgress?: (assigned: number, total: number) => void } = {},
  ): FillHandle {
    const requestId = this.nextId++;
    this.busy = true;
    let cancelled = false;

    const promise = this.ready.then(
      () =>
        new Promise<FillResult | null>((resolve) => {
          const worker = this.worker!;
          const onMessage = (event: MessageEvent<WorkerResponse>) => {
            const msg = event.data;
            if (msg.type === 'progress' && msg.requestId === requestId) {
              options.onProgress?.(msg.assigned, msg.total);
            } else if (msg.type === 'result' && msg.requestId === requestId) {
              worker.removeEventListener('message', onMessage);
              this.busy = false;
              resolve(msg.result);
            } else if (msg.type === 'error') {
              worker.removeEventListener('message', onMessage);
              this.busy = false;
              resolve(null);
            }
          };
          worker.addEventListener('message', onMessage);
          const request: WorkerRequest = {
            type: 'fill',
            requestId,
            grid,
            slots,
            seed: options.seed ?? Math.floor(Math.random() * 1e9),
            timeoutMs: options.timeoutMs ?? 10000,
          };
          worker.postMessage(request);
        }),
    );

    return {
      promise: promise.then((r) => (cancelled ? null : r)),
      cancel: () => {
        if (cancelled || !this.busy) return;
        cancelled = true;
        this.busy = false;
        // la ricerca e' sincrona nel worker: si annulla terminandolo
        this.worker?.terminate();
        this.spawn();
      },
    };
  }

  /** Migliore parola per un singolo slot (veloce, niente progresso). */
  async fillSlot(grid: Grid, slots: Slot[], slotId: string): Promise<string | null> {
    await this.ready;
    const requestId = this.nextId++;
    return new Promise((resolve) => {
      const worker = this.worker!;
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if ((msg.type === 'slotResult' && msg.requestId === requestId) || msg.type === 'error') {
          worker.removeEventListener('message', onMessage);
          resolve(msg.type === 'slotResult' ? msg.word : null);
        }
      };
      worker.addEventListener('message', onMessage);
      const request: WorkerRequest = {
        type: 'fillSlot',
        requestId,
        grid,
        slots,
        slotId,
        seed: Math.floor(Math.random() * 1e9),
      };
      worker.postMessage(request);
    });
  }
}
