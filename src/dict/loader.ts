import { WordList } from './wordlist';

/**
 * Carica l'asset gzip del dizionario e lo indicizza. Il testo grezzo viene
 * restituito insieme agli indici: serve al Web Worker del filler, che
 * costruisce la propria copia. Le parole personali dell'utente (localStorage)
 * si uniscono a runtime.
 */
export async function loadWordList(
  url: string,
  extra: Iterable<string> = [],
): Promise<{ dict: WordList; text: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Dizionario non caricabile (${response.status}): ${url}`);
  }
  // Alcuni server (Vite in dev) dichiarano Content-Encoding: gzip sui file
  // .gz: il browser decomprime da solo e il corpo arriva gia' in chiaro.
  // Altri (GitHub Pages) lo servono binario. Si decide dai magic byte.
  const buffer = new Uint8Array(await response.arrayBuffer());
  let text: string;
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(buffer);
  }
  const extraWords = [...extra].filter((w) => /^[A-Z]{2,21}$/.test(w));
  if (extraWords.length > 0) {
    text += '\n' + extraWords.map((w) => `${w};55`).join('\n') + '\n';
  }
  return { dict: WordList.fromText(text), text };
}

/** Normalizza una parola dell'utente alla convenzione della griglia. */
export function normalizePersonalWord(raw: string): string | null {
  const word = raw
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  return /^[A-Z]{2,21}$/.test(word) ? word : null;
}

const PERSONAL_KEY = 'crosswords:personal-words:v1';

export function loadPersonalWords(): string[] {
  try {
    const raw = window.localStorage.getItem(PERSONAL_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

export function savePersonalWords(words: string[]): void {
  window.localStorage.setItem(PERSONAL_KEY, JSON.stringify(words));
}
