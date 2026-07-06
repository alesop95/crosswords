import type { Puzzle, Slot } from '../core/types';
import { slotWord } from '../core/slots';
import { t } from '../ui/i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 32;

/**
 * Documento di stampa: pagina 1 con griglia vuota numerata e definizioni,
 * pagina 2 con la soluzione. Il contenitore vive nascosto nella pagina e
 * diventa visibile solo in @media print (print.css); si stampa col dialogo
 * del browser, che produce anche il PDF.
 */
export function renderPrintView(container: HTMLElement, puzzle: Puzzle): void {
  container.replaceChildren();

  const page1 = document.createElement('section');
  page1.className = 'print-page';
  if (puzzle.meta.title) {
    const h1 = document.createElement('h1');
    h1.textContent = puzzle.meta.title;
    page1.appendChild(h1);
  }
  if (puzzle.meta.author) {
    const byline = document.createElement('p');
    byline.className = 'print-byline';
    byline.textContent = puzzle.meta.author;
    page1.appendChild(byline);
  }
  page1.appendChild(gridSvg(puzzle, false));
  page1.appendChild(clueColumns(puzzle));
  container.appendChild(page1);

  const page2 = document.createElement('section');
  page2.className = 'print-page';
  const h2 = document.createElement('h1');
  h2.textContent = puzzle.meta.title ? `${puzzle.meta.title} — ${t.solution}` : t.solution;
  page2.appendChild(h2);
  page2.appendChild(gridSvg(puzzle, true));
  container.appendChild(page2);
}

function gridSvg(puzzle: Puzzle, withLetters: boolean): SVGSVGElement {
  const { grid } = puzzle;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${grid.width * CELL} ${grid.height * CELL}`);
  svg.setAttribute('class', 'print-grid');

  const numberAt = new Map<number, number>();
  for (const slot of puzzle.slots) {
    const start = slot.cellIdxs[0];
    if (!numberAt.has(start)) numberAt.set(start, slot.number);
  }

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const idx = row * grid.width + col;
      const cell = grid.cells[idx];
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(col * CELL));
      rect.setAttribute('y', String(row * CELL));
      rect.setAttribute('width', String(CELL));
      rect.setAttribute('height', String(CELL));
      rect.setAttribute('class', cell.block ? 'pcell pcell-block' : 'pcell');
      svg.appendChild(rect);

      if (cell.block) continue;
      const number = numberAt.get(idx);
      if (number !== undefined) {
        const num = document.createElementNS(SVG_NS, 'text');
        num.setAttribute('x', String(col * CELL + 2));
        num.setAttribute('y', String(row * CELL + 9));
        num.setAttribute('class', 'pcell-number');
        num.textContent = String(number);
        svg.appendChild(num);
      }
      if (withLetters && cell.letter) {
        const letter = document.createElementNS(SVG_NS, 'text');
        letter.setAttribute('x', String(col * CELL + CELL / 2));
        letter.setAttribute('y', String(row * CELL + CELL / 2 + 6));
        letter.setAttribute('class', 'pcell-letter');
        letter.textContent = cell.letter;
        svg.appendChild(letter);
      }
    }
  }
  return svg;
}

function clueColumns(puzzle: Puzzle): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'print-clues';
  for (const [label, dir] of [
    [t.across, 'across'],
    [t.down, 'down'],
  ] as const) {
    const col = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = label;
    col.appendChild(h2);
    const list = document.createElement('ol');
    for (const slot of puzzle.slots.filter((s: Slot) => s.dir === dir)) {
      const li = document.createElement('li');
      li.value = slot.number;
      const text = puzzle.clues[slot.id] ?? '';
      const word = slotWord(puzzle.grid, slot);
      li.textContent = text || (word ? `(${word.length}) —` : `(${slot.len}) —`);
      list.appendChild(li);
    }
    col.appendChild(list);
    wrap.appendChild(col);
  }
  return wrap;
}
