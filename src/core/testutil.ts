import type { Grid } from './types';

/**
 * Costruisce una griglia da righe ASCII: '#' nero, '.' bianca vuota,
 * lettera maiuscola bianca riempita. Solo per i test.
 */
export function gridFromAscii(rows: string[]): Grid {
  const height = rows.length;
  const width = rows[0].length;
  for (const row of rows) {
    if (row.length !== width) throw new Error('Righe di lunghezza diversa');
  }
  return {
    width,
    height,
    cells: rows
      .join('')
      .split('')
      .map((ch) => {
        if (ch === '#') return { block: true, letter: null };
        if (ch === '.') return { block: false, letter: null };
        if (/^[A-Z]$/.test(ch)) return { block: false, letter: ch };
        throw new Error(`Carattere non valido nella fixture: ${ch}`);
      }),
  };
}
