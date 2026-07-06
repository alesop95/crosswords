/**
 * Pipeline offline della wordlist italiana.
 *
 *   node tools/wordlist/build.mjs
 *
 * Scarica le sorgenti (Morph-it + frequenze itWaC) in downloads/ (git-ignorata),
 * normalizza alla convenzione dei cruciverba, assegna i punteggi per lemma,
 * applica extra-short.txt e blocklist.txt, ed emette
 * public/wordlists/it.txt.gz nel formato "PAROLA;score", una voce per riga,
 * ordinato per lunghezza poi punteggio decrescente.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  BASELINE_SCORE,
  isProperNoun,
  normalizeWord,
  parseMorphitLine,
  scoreFromFrequency,
} from './normalize.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const downloadsDir = join(here, 'downloads');
const outDir = join(here, '..', '..', 'public', 'wordlists');
const sourcesPath = join(here, 'sources.json');

async function main() {
  mkdirSync(downloadsDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const manifest = JSON.parse(readFileSync(sourcesPath, 'utf8'));
  const paths = {};
  let manifestChanged = false;

  for (const source of manifest.sources) {
    const filePath = join(downloadsDir, source.file);
    if (!existsSync(filePath)) {
      console.log(`Scarico ${source.name} da ${source.url} ...`);
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`Download fallito (${response.status}): ${source.url}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(filePath, buffer);
    }
    const sha = createHash('sha256').update(readFileSync(filePath)).digest('hex');
    if (source.sha256 === null) {
      source.sha256 = sha;
      manifestChanged = true;
      console.log(`${source.name}: sha256 registrato ${sha.slice(0, 12)}...`);
    } else if (source.sha256 !== sha) {
      throw new Error(
        `${source.name}: sha256 diverso dal manifest. Atteso ${source.sha256}, trovato ${sha}. ` +
          `Se la sorgente e' stata aggiornata di proposito, azzerare il campo nel manifest.`,
      );
    }
    paths[source.name] = filePath;
  }
  if (manifestChanged) {
    writeFileSync(sourcesPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  // 1. Frequenze per lemma dai CSV itWaC (colonne individuate dall'header).
  const lemmaFreq = new Map();
  for (const name of ['itwac-nouns', 'itwac-verbs', 'itwac-adjectives']) {
    loadFrequencies(paths[name], lemmaFreq);
  }
  console.log(`Lemmi con frequenza: ${lemmaFreq.size}`);
  let maxFreq = 0;
  for (const freq of lemmaFreq.values()) if (freq > maxFreq) maxFreq = freq;

  // 2. Forme flesse da Morph-it, normalizzate e punteggiate per lemma.
  const entries = new Map(); // PAROLA -> score massimo
  let read = 0;
  let kept = 0;
  const morphit = readFileSync(paths['morph-it'], 'utf8');
  for (const line of morphit.split('\n')) {
    read++;
    const parsed = parseMorphitLine(line.replace(/\r$/, ''));
    if (!parsed || isProperNoun(parsed)) continue;
    const word = normalizeWord(parsed.form);
    if (!word) continue;
    const freq = lemmaFreq.get(parsed.lemma.toLowerCase());
    const score = freq === undefined ? BASELINE_SCORE : scoreFromFrequency(freq, maxFreq);
    const prev = entries.get(word);
    if (prev === undefined || score > prev) entries.set(word, score);
    kept++;
  }
  console.log(`Morph-it: ${read} righe lette, ${kept} forme accettate, ${entries.size} voci uniche`);

  // 3. extra-short.txt vince sul punteggio calcolato; blocklist.txt rimuove.
  for (const { word, score } of readScoredList(join(here, 'extra-short.txt'))) {
    entries.set(word, score);
  }
  for (const { word } of readScoredList(join(here, 'blocklist.txt'))) {
    entries.delete(word);
  }

  // 4. Ordina per lunghezza poi punteggio decrescente poi alfabetico.
  const sorted = [...entries.entries()].sort((a, b) => {
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : 1;
  });

  const header =
    `# wordlist italiana per cruciverba - generata da tools/wordlist/build.mjs\n` +
    `# voci: ${sorted.length}\n` +
    `# sorgenti: Morph-it 0.48 (CC BY-SA 2.0, Baroni-Zanchetta) + itWaC franfranz (MIT)\n`;
  const body = sorted.map(([word, score]) => `${word};${score}`).join('\n');
  const gz = gzipSync(Buffer.from(header + body + '\n', 'utf8'), { level: 9 });
  const outPath = join(outDir, 'it.txt.gz');
  writeFileSync(outPath, gz);
  console.log(`Scritto ${outPath}: ${sorted.length} voci, ${(gz.length / 1024 / 1024).toFixed(2)} MB gzip`);

  const byLen = new Map();
  for (const [word] of sorted) byLen.set(word.length, (byLen.get(word.length) ?? 0) + 1);
  const stats = [...byLen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([len, count]) => `${len}:${count}`)
    .join(' ');
  console.log(`Distribuzione per lunghezza -> ${stats}`);
}

/** CSV itWaC: individua le colonne lemma e frequenza grezza dall'header. */
function loadFrequencies(filePath, lemmaFreq) {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const lemmaCol = header.findIndex((h) => h.includes('lemma'));
  const freqCol = header.findIndex((h) => h === 'freq' || h.startsWith('freq') || h.includes('f_raw'));
  if (lemmaCol < 0 || freqCol < 0) {
    throw new Error(`Colonne non riconosciute in ${filePath}: ${header.join(', ')}`);
  }
  let added = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = splitCsvLine(lines[i]);
    const lemma = (cols[lemmaCol] ?? '').replace(/^"|"$/g, '').trim().toLowerCase();
    const freq = Number((cols[freqCol] ?? '').replace(/^"|"$/g, ''));
    if (!lemma || !Number.isFinite(freq)) continue;
    lemmaFreq.set(lemma, (lemmaFreq.get(lemma) ?? 0) + freq);
    added++;
  }
  console.log(`${filePath.split(/[\\/]/).pop()}: ${added} righe (lemma=${header[lemmaCol]}, freq=${header[freqCol]})`);
}

/** Split CSV semplice: gestisce i campi tra virgolette senza virgole annidate complesse. */
function splitCsvLine(line) {
  return line.replace(/\r$/, '').split(',');
}

/** Legge un file "PAROLA;score" con commenti #; score opzionale (default baseline). */
function readScoredList(filePath) {
  if (!existsSync(filePath)) return [];
  const out = [];
  for (const raw of readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const [word, scoreText] = line.split(';');
    const normalized = normalizeWord(word);
    if (!normalized) continue;
    const score = Number(scoreText);
    out.push({ word: normalized, score: Number.isFinite(score) ? score : BASELINE_SCORE });
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
