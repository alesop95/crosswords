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
  if (!response.ok || !response.body) {
    throw new Error(`Dizionario non caricabile (${response.status}): ${url}`);
  }
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  let text = await new Response(stream).text();
  const extraWords = [...extra].filter((w) => /^[A-Z]{2,21}$/.test(w));
  if (extraWords.length > 0) {
    text += '\n' + extraWords.map((w) => `${w};55`).join('\n') + '\n';
  }
  return { dict: WordList.fromText(text), text };
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
