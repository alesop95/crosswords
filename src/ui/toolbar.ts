import type { Store } from './store';
import type { Symmetry } from '../core/types';
import { MAX_SIZE, MIN_SIZE } from '../core/types';
import { createPuzzle } from '../core/puzzle';
import { t } from './i18n';

export function mountToolbar(container: HTMLElement, store: Store): void {
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
    </div>
  `;

  const widthInput = container.querySelector<HTMLInputElement>('#tb-width')!;
  const heightInput = container.querySelector<HTMLInputElement>('#tb-height')!;
  const symmetryInput = container.querySelector<HTMLInputElement>('#tb-symmetry')!;
  const newButton = container.querySelector<HTMLButtonElement>('#tb-new')!;
  const undoButton = container.querySelector<HTMLButtonElement>('#tb-undo')!;
  const redoButton = container.querySelector<HTMLButtonElement>('#tb-redo')!;

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

  store.subscribe((state) => {
    undoButton.disabled = !store.canUndo();
    redoButton.disabled = !store.canRedo();
    symmetryInput.checked = state.puzzle.symmetry === 'rot180';
    widthInput.value = String(state.puzzle.grid.width);
    heightInput.value = String(state.puzzle.grid.height);
  });
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 13;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}
