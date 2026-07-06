import { createPuzzle } from './core/puzzle';
import { Store } from './ui/store';
import { mountGridView } from './ui/gridView';
import { mountToolbar } from './ui/toolbar';
import { mountSuggestPanel } from './ui/suggestPanel';
import { mountCluePanel } from './ui/cluePanel';
import { startHotspots } from './ui/hotspots';
import { isStorageAvailable, load, startAutosave } from './io/autosave';
import { loadPersonalWords, loadWordList } from './dict/loader';
import { FillerClient } from './fill/fillerClient';
import { renderPrintView } from './print/printView';
import { t } from './ui/i18n';
import './print/print.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <header class="topbar">
      <h1>${t.appTitle}</h1>
      <div id="toolbar-root"></div>
    </header>
    <main class="workspace">
      <div class="editor-row">
        <div id="grid-root" class="grid-root"></div>
        <aside id="suggest-root" class="suggest-root"></aside>
      </div>
      <div id="clue-root"></div>
      <p class="hint">${t.helpHint}</p>
      <p id="status" class="status"></p>
    </main>
  `;

  const printRoot = document.createElement('div');
  printRoot.id = 'print-root';
  document.body.appendChild(printRoot);

  const status = app.querySelector<HTMLParagraphElement>('#status')!;
  const storageOk = isStorageAvailable();

  const restored = storageOk ? load() : null;
  const store = new Store(restored ?? createPuzzle(13, 13));
  if (restored) status.textContent = t.restored;
  if (!storageOk) status.textContent = t.storageUnavailable;

  const toolbar = mountToolbar(
    app.querySelector('#toolbar-root')!,
    store,
    (text) => {
      status.textContent = text;
    },
    () => {
      renderPrintView(printRoot, store.getState().puzzle);
      window.print();
    },
  );
  mountGridView(app.querySelector('#grid-root')!, store);
  const suggestPanel = mountSuggestPanel(app.querySelector('#suggest-root')!, store);
  mountCluePanel(app.querySelector('#clue-root')!, store);

  if (storageOk) {
    startAutosave(
      () => store.getState().puzzle,
      (cb) => store.subscribe(cb),
    );
  }

  const personal = storageOk ? loadPersonalWords() : [];
  loadWordList(`${import.meta.env.BASE_URL}wordlists/it.txt.gz`, personal)
    .then(({ dict, text }) => {
      suggestPanel.setWordList(dict);
      startHotspots(store, dict);
      toolbar.setFiller(new FillerClient(text));
      if (!restored && storageOk) status.textContent = t.dictReady;
    })
    .catch((err) => {
      console.error(err);
      status.textContent = t.dictError;
    });
}
