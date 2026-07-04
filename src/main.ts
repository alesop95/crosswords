import { createPuzzle } from './core/puzzle';
import { Store } from './ui/store';
import { mountGridView } from './ui/gridView';
import { mountToolbar } from './ui/toolbar';
import { isStorageAvailable, load, startAutosave } from './io/autosave';
import { t } from './ui/i18n';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <header class="topbar">
      <h1>${t.appTitle}</h1>
      <div id="toolbar-root"></div>
    </header>
    <main class="workspace">
      <div id="grid-root" class="grid-root"></div>
      <p class="hint">${t.helpHint}</p>
      <p id="status" class="status"></p>
    </main>
  `;

  const status = app.querySelector<HTMLParagraphElement>('#status')!;
  const storageOk = isStorageAvailable();

  const restored = storageOk ? load() : null;
  const store = new Store(restored ?? createPuzzle(13, 13));
  if (restored) status.textContent = t.restored;
  if (!storageOk) status.textContent = t.storageUnavailable;

  mountToolbar(app.querySelector('#toolbar-root')!, store);
  mountGridView(app.querySelector('#grid-root')!, store);

  if (storageOk) {
    startAutosave(
      () => store.getState().puzzle,
      (cb) => store.subscribe(cb),
    );
  }
}
