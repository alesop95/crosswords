import type { Store } from './store';
import type { AppState } from './store';
import type { Slot } from '../core/types';
import { setClue } from '../core/puzzle';
import { slotPattern } from '../core/slots';
import { t } from './i18n';

/**
 * Editor delle definizioni: due liste, Orizzontali e Verticali, una riga per
 * slot con numero, parola corrente (o pattern) e campo di testo. Le
 * definizioni orfane (schema modificato) sono recuperabili: un clic le
 * assegna allo slot selezionato, il cestino si puo' svuotare.
 */
export function mountCluePanel(container: HTMLElement, store: Store): void {
  container.innerHTML = `
    <div class="clue-panel">
      <div class="clue-col">
        <h2>${t.across}</h2>
        <div id="clues-across"></div>
      </div>
      <div class="clue-col">
        <h2>${t.down}</h2>
        <div id="clues-down"></div>
      </div>
      <div class="clue-col clue-orphans" id="clue-orphans" hidden>
        <h2>${t.orphanClues}</h2>
        <p class="clue-hint">${t.orphanHint}</p>
        <ul id="orphan-list"></ul>
        <button id="orphan-clear" type="button">${t.orphanClear}</button>
      </div>
    </div>
  `;

  const acrossRoot = container.querySelector<HTMLDivElement>('#clues-across')!;
  const downRoot = container.querySelector<HTMLDivElement>('#clues-down')!;
  const orphanRoot = container.querySelector<HTMLDivElement>('#clue-orphans')!;
  const orphanList = container.querySelector<HTMLUListElement>('#orphan-list')!;
  const orphanClear = container.querySelector<HTMLButtonElement>('#orphan-clear')!;

  orphanClear.addEventListener('click', () => {
    const { puzzle } = store.getState();
    store.applyPuzzle({ ...puzzle, orphanClues: {} });
  });

  function rowFor(state: AppState, slot: Slot): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'clue-row';
    const { cursor } = state;
    const isActive =
      slot.dir === cursor.dir &&
      slot.cellIdxs.includes(cursor.row * state.puzzle.grid.width + cursor.col);
    if (isActive) row.classList.add('clue-row-active');

    const label = document.createElement('span');
    label.className = 'clue-number';
    label.textContent = String(slot.number);
    row.appendChild(label);

    const word = document.createElement('span');
    word.className = 'clue-word';
    word.textContent = slotPattern(state.puzzle.grid, slot).replaceAll('?', '·');
    word.title = `${slot.len} lettere`;
    word.addEventListener('click', () => {
      store.setCursor({ row: slot.row, col: slot.col, dir: slot.dir });
    });
    row.appendChild(word);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'clue-input';
    input.placeholder = t.cluePlaceholder;
    input.value = state.puzzle.clues[slot.id] ?? '';
    input.addEventListener('change', () => {
      store.applyPuzzle(setClue(store.getState().puzzle, slot.id, input.value));
    });
    input.addEventListener('focus', () => {
      store.setCursor({ row: slot.row, col: slot.col, dir: slot.dir });
    });
    row.appendChild(input);

    return row;
  }

  function render(state: AppState): void {
    // non ridisegnare mentre si sta scrivendo in un campo definizione
    if (container.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') {
      return;
    }
    acrossRoot.replaceChildren(
      ...state.puzzle.slots.filter((s) => s.dir === 'across').map((s) => rowFor(state, s)),
    );
    downRoot.replaceChildren(
      ...state.puzzle.slots.filter((s) => s.dir === 'down').map((s) => rowFor(state, s)),
    );

    const orphans = Object.entries(state.puzzle.orphanClues);
    orphanRoot.hidden = orphans.length === 0;
    orphanList.replaceChildren(
      ...orphans.map(([key, text]) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'orphan-clue';
        button.textContent = text;
        button.title = t.orphanRestore;
        button.addEventListener('click', () => {
          const current = store.getState();
          const active = current.puzzle.slots.find(
            (s) =>
              s.dir === current.cursor.dir &&
              s.cellIdxs.includes(current.cursor.row * current.puzzle.grid.width + current.cursor.col),
          );
          if (!active) return;
          let next = setClue(current.puzzle, active.id, text);
          const orphanClues = { ...next.orphanClues };
          delete orphanClues[key];
          next = { ...next, orphanClues };
          store.applyPuzzle(next);
        });
        li.appendChild(button);
        return li;
      }),
    );
  }

  store.subscribe(render);
  render(store.getState());
}
