/**
 * Regole di normalizzazione per la wordlist dei cruciverba italiani.
 * Funzioni pure, testate in normalize.test.mjs.
 */

const MIN_LEN = 2;
const MAX_LEN = 21;

/** Traslittera alla convenzione dei cruciverba: e' -> E, perde ogni segno. */
export function stripDiacritics(word) {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalizza una voce grezza: maiuscole senza accenti; ritorna null se la voce
 * non e' spendibile in griglia (apostrofi, spazi, trattini, cifre, lunghezza).
 */
export function normalizeWord(raw) {
  if (typeof raw !== 'string') return null;
  const word = stripDiacritics(raw.trim()).toUpperCase();
  if (!/^[A-Z]+$/.test(word)) return null;
  if (word.length < MIN_LEN || word.length > MAX_LEN) return null;
  return word;
}

/** Riga Morph-it: forma<TAB>lemma<TAB>tratti. Ritorna null su righe malformate. */
export function parseMorphitLine(line) {
  const parts = line.split('\t');
  if (parts.length < 3) return null;
  const [form, lemma, features] = parts;
  if (!form || !lemma || !features) return null;
  return { form, lemma, features };
}

/**
 * Proxy per i nomi propri: in Morph-it le voci comuni sono minuscole, i nomi
 * propri portano l'iniziale maiuscola (o il tratto NPR quando presente).
 */
export function isProperNoun(entry) {
  if (/^[A-ZÀ-Þ]/.test(entry.form)) return true;
  return /\bNPR\b/i.test(entry.features);
}

/**
 * Punteggio 0..100 dalla frequenza grezza del lemma (log-compressione).
 * Con maxFreq la scala e' normalizzata sul lemma piu' frequente del corpus,
 * cosi' il vertice della distribuzione non satura a 100.
 */
export function scoreFromFrequency(freq, maxFreq) {
  if (!Number.isFinite(freq) || freq <= 0) return 0;
  if (Number.isFinite(maxFreq) && maxFreq > 0) {
    return Math.max(0, Math.min(100, Math.round((100 * Math.log10(freq + 1)) / Math.log10(maxFreq + 1))));
  }
  return Math.max(0, Math.min(100, Math.round(20 * Math.log10(freq + 1))));
}

export const BASELINE_SCORE = 5;
