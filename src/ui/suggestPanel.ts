import type { Store } from './store';
import type { AppState } from './store';
import type { Slot } from '../core/types';
import { setLetter } from '../core/grid';
import { slotPattern, slotWord } from '../core/slots';
import type { WordList } from '../dict/wordlist';
import { activeSlot } from './activeSlot';
import { t } from './i18n';

const MAX_SUGGESTIONS = 60;

/**
 * Pannello dei suggerimenti per lo slot attivo: parole compatibili col pattern
 * corrente, ordinate per punteggio; il click inserisce la parola in griglia.
 * Il dizionario arriva in modo asincrono via setWordList.
 */
export function mountSuggestPanel(container: HTMLElement, store: Store): {
  setWordList: (dict: WordList) => void;
} {
  container.innerHTML = `
    <div class="suggest-panel">
      <h2 id="suggest-title">${t.suggestions}</h2>
      <p id="suggest-status" class="suggest-status">${t.dictLoading}</p>
      <ul id="suggest-list" class="suggest-list"></ul>
    </div>
  `;
  const title = container.querySelector<HTMLHeadingElement>('#suggest-title')!;
  const status = container.querySelector<HTMLParagraphElement>('#suggest-status')!;
  const list = container.querySelector<HTMLUListElement>('#suggest-list')!;

  let dict: WordList | null = null;

  function usedWords(state: AppState): Set<string> {
    const used = new Set<string>();
    for (const slot of state.puzzle.slots) {
      const word = slotWord(state.puzzle.grid, slot);
      if (word) used.add(word);
    }
    return used;
  }

  function insertWord(state: AppState, slot: Slot, word: string): void {
    let grid = state.puzzle.grid;
    for (let pos = 0; pos < slot.len; pos++) {
      const row = Math.floor(slot.cellIdxs[pos] / grid.width);
      const col = slot.cellIdxs[pos] % grid.width;
      grid = setLetter(grid, row, col, word[pos]);
    }
    store.applyPuzzle({ ...state.puzzle, grid });
  }

  function render(state: AppState): void {
    const slot = activeSlot(state);
    if (!slot) {
      title.textContent = t.suggestions;
      status.textContent = dict ? t.noActiveSlot : t.dictLoading;
      list.replaceChildren();
      return;
    }
    const pattern = slotPattern(state.puzzle.grid, slot);
    const dirLabel = slot.dir === 'across' ? t.dirAcross : t.dirDown;
    title.textContent = `${slot.number} ${dirLabel} — ${pattern.replaceAll('?', '·')}`;
    if (!dict) {
      status.textContent = t.dictLoading;
      return;
    }
    const complete = !pattern.includes('?');
    const exclude = usedWords(state);
    const suggestions = dict.suggestions(pattern, MAX_SUGGESTIONS, complete ? undefined : exclude);
    status.textContent = complete
      ? suggestions.length > 0
        ? t.wordInDict
        : t.wordNotInDict
      : suggestions.length === 0
        ? t.noSuggestions
        : '';
    list.replaceChildren(
      ...suggestions.map(({ word, score }) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggest-word';
        button.textContent = word;
        button.title = `punteggio ${score}`;
        button.addEventListener('click', () => insertWord(store.getState(), slot, word));
        li.appendChild(button);
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'suggest-score';
        scoreSpan.textContent = String(score);
        li.appendChild(scoreSpan);
        return li;
      }),
    );
  }

  store.subscribe(render);
  render(store.getState());

  return {
    setWordList(loaded: WordList) {
      dict = loaded;
      render(store.getState());
    },
  };
}
