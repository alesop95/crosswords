import type { Store } from './store';
import type { Symmetry } from '../core/types';
import { MAX_SIZE, MIN_SIZE } from '../core/types';
import { createPuzzle } from '../core/puzzle';
import { setLetter } from '../core/grid';
import type { FillerClient, FillHandle } from '../fill/fillerClient';
import { activeSlot } from './activeSlot';
import { t } from './i18n';

export function mountToolbar(
  container: HTMLElement,
  store: Store,
  reportStatus: (text: string) => void,
): { setFiller: (filler: FillerClient) => void } {
  container.innerHTML = `
    <div class="toolbar">
      <label>${t.width}
        <input type="number" id="tb-width" min="${MIN_SIZE}" max="${MAX_SIZE}" value="13" />
      </label>
      <label>${t.height}
        <input type="number" id="tb-height" min="${MIN_SIZE}" max="${MAX_SIZE}" value="13" />
      </label>
      <label class="toolbar-check">
        <input type="checkbox" id="tb-symmetry" /> ${t.symmetry}
      </label>
      <button id="tb-new" type="button">${t.newGrid}</button>
      <span class="toolbar-sep"></span>
      <button id="tb-undo" type="button" disabled>${t.undo}</button>
      <button id="tb-redo" type="button" disabled>${t.redo}</button>
      <span class="toolbar-sep"></span>
      <button id="tb-fill" type="button" disabled>${t.fillAll}</button>
      <button id="tb-fill-slot" type="button" disabled>${t.fillSlot}</button>
      <button id="tb-cancel" type="button" hidden>${t.cancelFill}</button>
      <span id="tb-progress" class="toolbar-progress"></span>
    </div>
  `;

  const widthInput = container.querySelector<HTMLInputElement>('#tb-width')!;
  const heightInput = container.querySelector<HTMLInputElement>('#tb-height')!;
  const symmetryInput = container.querySelector<HTMLInputElement>('#tb-symmetry')!;
  const newButton = container.querySelector<HTMLButtonElement>('#tb-new')!;
  const undoButton = container.querySelector<HTMLButtonElement>('#tb-undo')!;
  const redoButton = container.querySelector<HTMLButtonElement>('#tb-redo')!;
  const fillButton = container.querySelector<HTMLButtonElement>('#tb-fill')!;
  const fillSlotButton = container.querySelector<HTMLButtonElement>('#tb-fill-slot')!;
  const cancelButton = container.querySelector<HTMLButtonElement>('#tb-cancel')!;
  const progress = container.querySelector<HTMLSpanElement>('#tb-progress')!;

  let filler: FillerClient | null = null;
  let running: FillHandle | null = null;

  function setRunning(handle: FillHandle | null): void {
    running = handle;
    const busy = handle !== null;
    fillButton.disabled = busy || filler === null;
    fillSlotButton.disabled = busy || filler === null;
    cancelButton.hidden = !busy;
    if (!busy) progress.textContent = '';
  }

  newButton.addEventListener('click', () => {
    if (!window.confirm(t.confirmNew)) return;
    const width = clamp(Number(widthInput.value));
    const height = clamp(Number(heightInput.value));
    const symmetry: Symmetry = symmetryInput.checked ? 'rot180' : 'none';
    store.replacePuzzle(createPuzzle(width, height, symmetry));
  });

  symmetryInput.addEventListener('change', () => {
    const { puzzle } = store.getState();
    const symmetry: Symmetry = symmetryInput.checked ? 'rot180' : 'none';
    store.applyPuzzle({ ...puzzle, symmetry });
  });

  undoButton.addEventListener('click', () => store.undo());
  redoButton.addEventListener('click', () => store.redo());

  fillButton.addEventListener('click', async () => {
    if (!filler || running) return;
    const { puzzle } = store.getState();
    reportStatus(t.fillRunning);
    const handle = filler.fill(puzzle.grid, puzzle.slots, {
      onProgress: (assigned, total) => {
        progress.textContent = `${assigned}/${total}`;
      },
    });
    setRunning(handle);
    const result = await handle.promise;
    setRunning(null);
    if (result === null) {
      reportStatus(t.fillCancelled);
      return;
    }
    if (result.status === 'infeasible') {
      reportStatus(t.fillInfeasible);
      return;
    }
    store.applyPuzzle({ ...store.getState().puzzle, grid: result.grid });
    reportStatus(
      result.status === 'filled' ? t.fillDone : t.fillPartial(result.assigned, result.totalSlots),
    );
  });

  fillSlotButton.addEventListener('click', async () => {
    if (!filler || running) return;
    const state = store.getState();
    const slot = activeSlot(state);
    if (!slot) return;
    const word = await filler.fillSlot(state.puzzle.grid, state.puzzle.slots, slot.id);
    if (word === null) {
      reportStatus(t.fillNoWord);
      return;
    }
    let grid = store.getState().puzzle.grid;
    for (let pos = 0; pos < slot.len; pos++) {
      const row = Math.floor(slot.cellIdxs[pos] / grid.width);
      const col = slot.cellIdxs[pos] % grid.width;
      grid = setLetter(grid, row, col, word[pos]);
    }
    store.applyPuzzle({ ...store.getState().puzzle, grid });
    reportStatus('');
  });

  cancelButton.addEventListener('click', () => {
    running?.cancel();
    setRunning(null);
    reportStatus(t.fillCancelled);
  });

  store.subscribe((state) => {
    undoButton.disabled = !store.canUndo();
    redoButton.disabled = !store.canRedo();
    symmetryInput.checked = state.puzzle.symmetry === 'rot180';
    widthInput.value = String(state.puzzle.grid.width);
    heightInput.value = String(state.puzzle.grid.height);
  });

  return {
    setFiller(client: FillerClient) {
      filler = client;
      if (!running) {
        fillButton.disabled = false;
        fillSlotButton.disabled = false;
      }
    },
  };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 13;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}
