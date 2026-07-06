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
 * Nomi propri: in Morph-it portano il tratto NPR o l'iniziale maiuscola.
 * Non si scartano (l'enigmistica italiana ne fa largo uso: storici,
 * letterati, toponimi) ma ricevono un punteggio dedicato.
 */
export function isProperNoun(entry) {
  if (/^[A-ZÀ-Þ]/.test(entry.form)) return true;
  return /\bNPR\b/i.test(entry.features);
}

export const PROPER_NOUN_SCORE = 40;

/**
 * Forme verbali apocopate/poetiche (considerasser, andar, fosser, amar):
 * Morph-it le include come forme normali, ma in italiano standard ogni forma
 * verbale termina in vocale. Una forma verbale che finisce in consonante e'
 * un troncamento poetico e non appartiene a un cruciverba moderno.
 */
export function isApocopatedVerb(entry) {
  if (!/^(VER|AUX|MOD|CAU):/.test(entry.features)) return false;
  return /[^aeiou]$/i.test(stripDiacritics(entry.form));
}

const CLITICS =
  /\+(la|le|li|lo|mi|ti|si|ci|vi|ne|gli|gliela|gliele|glieli|glielo|gliene|cela|cele|celi|celo|cene|mela|mele|meli|melo|mene|tela|tele|teli|telo|tene|sela|sele|seli|selo|sene|vela|vele|veli|velo|vene)$/;

/**
 * Penalita' per le forme flesse "gonfie" che ereditano il punteggio del
 * lemma senza averne la frequenza d'uso: aggregati con clitici
 * (facendogliela), superlativi (pubblicissima) e in generale forme molto
 * piu' lunghe del lemma.
 */
export function inflectionPenalty(entry) {
  let penalty = 0;
  if (CLITICS.test(entry.features)) penalty += 30;
  if (/[:+]sup\b/.test(entry.features)) penalty += 25;
  const extra = entry.form.length - entry.lemma.length;
  if (extra > 1) penalty += 3 * (extra - 1);
  return penalty;
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
