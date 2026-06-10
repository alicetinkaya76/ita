/* Citation export. Generates BibTeX / RIS referencing the İTA atlas entry
 * (and, for works, the work's author). Built entirely from existing fields. */

export interface CitationInput {
  kind: 'scholar' | 'work';
  id: string;          // AU_00581 / WK_00012
  title: string;       // meshur_isim / eser_adi
  author?: string;     // works: the work's author name
  url: string;         // full deployed entry URL
  accessed: string;    // YYYY-MM-DD
}

const PUBLISHER = 'İslam Tarihyazım Atlası (İTA)';

/** Build the absolute URL for an entry path (base-path aware, domain-agnostic). */
export function entryUrl(path: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = import.meta.env.BASE_URL || '/';
  return `${origin}${base}${path}`;
}

/** Escape a value for a BibTeX brace-delimited field. */
function bib(v: string): string {
  return v.replace(/[{}]/g, '');
}

export function toBibTeX(c: CitationInput): string {
  const lines: string[] = [];
  if (c.author) lines.push(`  author       = {${bib(c.author)}}`);
  lines.push(`  title        = {${bib(c.title)}}`);
  lines.push(`  howpublished = {${PUBLISHER}}`);
  lines.push(`  url          = {${c.url}}`);
  lines.push(`  urldate      = {${c.accessed}}`);
  return `@misc{ita_${c.id},\n${lines.join(',\n')}\n}`;
}

export function toRIS(c: CitationInput): string {
  const lines: string[] = ['TY  - ELEC'];
  lines.push(`TI  - ${c.title}`);
  if (c.author) lines.push(`AU  - ${c.author}`);
  lines.push(`PB  - ${PUBLISHER}`);
  lines.push(`UR  - ${c.url}`);
  lines.push(`Y2  - ${c.accessed.replace(/-/g, '/')}`);
  lines.push('ER  - ');
  return lines.join('\n');
}
