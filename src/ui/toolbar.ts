import type { Store } from './store';
import type { Symmetry } from '../core/types';
import { MAX_SIZE, MIN_SIZE } from '../core/types';
import { createPuzzle } from '../core/puzzle';
import { setLetter } from '../core/grid';
import type { FillerClient, FillHandle } from '../fill/fillerClient';
import { parseIpuz, serializeIpuz } from '../io/ipuz';
import { loadPersonalWords, normalizePersonalWord, savePersonalWords } from '../dict/loader';
import { activeSlot } from './activeSlot';
import { t } from './i18n';

export function mountToolbar(
  container: HTMLElement,
  store: Store,
  reportStatus: (text: string) => void,
  onPrint: () => void,
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
      <span class="toolbar-sep"></span>
      <button id="tb-open" type="button">${t.open}</button>
      <button id="tb-save" type="button">${t.save}</button>
      <button id="tb-print" type="button">${t.print}</button>
      <button id="tb-meta" type="button">${t.metadata}</button>
      <button id="tb-words" type="button" title="${t.personalWordsHint}">${t.personalWords}</button>
      <input id="tb-file" type="file" accept=".ipuz,application/json,.json" hidden />
      <input id="tb-words-file" type="file" accept=".txt,text/plain" hidden />
    </div>
    <dialog id="tb-meta-dialog">
      <form method="dialog" class="meta-form">
        <label>${t.metaTitle} <input id="meta-title" type="text" /></label>
        <label>${t.metaAuthor} <input id="meta-author" type="text" /></label>
        <label>${t.metaCopyright} <input id="meta-copyright" type="text" /></label>
        <label>${t.metaNotes} <input id="meta-notes" type="text" /></label>
        <div class="meta-actions">
          <button value="cancel" formnovalidate>${t.metaCancel}</button>
          <button id="meta-ok" value="ok">${t.metaOk}</button>
        </div>
      </form>
    </dialog>
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
    const startPuzzle = store.getState().puzzle;
    reportStatus(t.fillRunning);
    const handle = filler.fill(startPuzzle.grid, startPuzzle.slots, {
      onProgress: (assigned, total) => {
        progress.textContent = `${assigned}/${total}`;
      },
    });
    setRunning(handle);
    const result = await handle.promise;
    setRunning(null);
    // se nel frattempo il puzzle e' cambiato (nuova griglia, undo, modifiche)
    // il risultato riguarda uno schema che non esiste piu': si scarta
    if (store.getState().puzzle !== startPuzzle) {
      reportStatus(t.fillStale);
      return;
    }
    if (result === null) {
      reportStatus(t.fillCancelled);
      return;
    }
    if (result.status === 'infeasible') {
      reportStatus(t.fillInfeasible);
      return;
    }
    store.applyPuzzle({ ...startPuzzle, grid: result.grid });
    reportStatus(
      result.status === 'filled' ? t.fillDone : t.fillPartial(result.assigned, result.totalSlots),
    );
  });

  fillSlotButton.addEventListener('click', async () => {
    if (!filler || running) return;
    const state = store.getState();
    const slot = activeSlot(state);
    if (!slot) return;
    const startPuzzle = state.puzzle;
    const word = await filler.fillSlot(state.puzzle.grid, state.puzzle.slots, slot.id);
    if (store.getState().puzzle !== startPuzzle) {
      reportStatus(t.fillStale);
      return;
    }
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

  const openButton = container.querySelector<HTMLButtonElement>('#tb-open')!;
  const saveButton = container.querySelector<HTMLButtonElement>('#tb-save')!;
  const printButton = container.querySelector<HTMLButtonElement>('#tb-print')!;
  const metaButton = container.querySelector<HTMLButtonElement>('#tb-meta')!;
  const fileInput = container.querySelector<HTMLInputElement>('#tb-file')!;
  const metaDialog = container.querySelector<HTMLDialogElement>('#tb-meta-dialog')!;

  openButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const puzzle = parseIpuz(await file.text());
      store.replacePuzzle(puzzle);
      reportStatus('');
    } catch (err) {
      reportStatus(t.openError + (err instanceof Error ? err.message : String(err)));
    }
  });

  saveButton.addEventListener('click', () => {
    const { puzzle } = store.getState();
    const blob = new Blob([serializeIpuz(puzzle)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const name = puzzle.meta.title.trim().replaceAll(/[^\w-]+/g, '-') || 'cruciverba';
    link.download = `${name}.ipuz`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  printButton.addEventListener('click', onPrint);

  const wordsButton = container.querySelector<HTMLButtonElement>('#tb-words')!;
  const wordsInput = container.querySelector<HTMLInputElement>('#tb-words-file')!;
  wordsButton.addEventListener('click', () => wordsInput.click());
  wordsInput.addEventListener('change', async () => {
    const file = wordsInput.files?.[0];
    wordsInput.value = '';
    if (!file) return;
    const text = await file.text();
    const existing = new Set(loadPersonalWords());
    let added = 0;
    for (const line of text.split(/\r?\n/)) {
      const word = normalizePersonalWord(line.split(';')[0]);
      if (word && !existing.has(word)) {
        existing.add(word);
        added++;
      }
    }
    savePersonalWords([...existing].sort());
    reportStatus(t.personalWordsImported(added, existing.size));
    // il dizionario indicizzato e il worker vanno ricostruiti: il lavoro e'
    // al sicuro nell'autosave, la ricarica e' la via piu' semplice e onesta
    window.setTimeout(() => window.location.reload(), 800);
  });

  metaButton.addEventListener('click', () => {
    const { meta } = store.getState().puzzle;
    container.querySelector<HTMLInputElement>('#meta-title')!.value = meta.title;
    container.querySelector<HTMLInputElement>('#meta-author')!.value = meta.author;
    container.querySelector<HTMLInputElement>('#meta-copyright')!.value = meta.copyright;
    container.querySelector<HTMLInputElement>('#meta-notes')!.value = meta.notes;
    metaDialog.showModal();
  });
  metaDialog.addEventListener('close', () => {
    if (metaDialog.returnValue !== 'ok') return;
    const { puzzle } = store.getState();
    store.applyPuzzle({
      ...puzzle,
      meta: {
        title: container.querySelector<HTMLInputElement>('#meta-title')!.value.trim(),
        author: container.querySelector<HTMLInputElement>('#meta-author')!.value.trim(),
        copyright: container.querySelector<HTMLInputElement>('#meta-copyright')!.value.trim(),
        notes: container.querySelector<HTMLInputElement>('#meta-notes')!.value.trim(),
      },
    });
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
