#!/usr/bin/env node
/**
 * İTTA Data Merge Script
 * Merges İTTA authors/works with DİA scholars data at build time.
 * 
 * Input:  raw data files (itta_all_authors.json, itta_all_works.json, scholars_full.csv, etc.)
 * Output: public/data/ (itta_authors.json, itta_works.json, itta_relations.json, itta_stats.json)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.argv[2] || join(__dirname, '..', 'raw-data');
const OUT_DIR = join(__dirname, '..', 'public', 'data');

mkdirSync(OUT_DIR, { recursive: true });

// --- CSV Parser (simple, handles BOM) ---
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { vals.push(current); current = ''; }
      else { current += ch; }
    }
    vals.push(current);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  });
}

// --- Load Data ---
console.log('Loading İTTA authors...');
const ittaAuthors = JSON.parse(readFileSync(join(DATA_DIR, 'itta_all_authors.json'), 'utf-8'));

console.log('Loading İTTA works...');
const ittaWorks = JSON.parse(readFileSync(join(DATA_DIR, 'itta_all_works.json'), 'utf-8'));

console.log('Loading DİA scholars...');
const diaScholars = parseCSV(readFileSync(join(DATA_DIR, 'scholars_full.csv'), 'utf-8'));

console.log('Loading DİA relations...');
const diaRelations = parseCSV(readFileSync(join(DATA_DIR, 'scholars_relations_full.csv'), 'utf-8'));

console.log('Loading DİA works...');
const diaWorks = parseCSV(readFileSync(join(DATA_DIR, 'scholars_works_full.csv'), 'utf-8'));

// --- Build DİA lookup ---
const diaBySlug = {};
for (const s of diaScholars) {
  diaBySlug[s.url_slug] = s;
}

// --- Merge authors ---
console.log(`Merging ${ittaAuthors.length} İTTA authors with DİA...`);
const ittaSlugs = new Set();
let matchCount = 0;

const mergedAuthors = ittaAuthors.map(a => {
  const merged = { ...a };
  if (a.dia_slug) {
    ittaSlugs.add(a.dia_slug);
    const dia = diaBySlug[a.dia_slug];
    if (dia) {
      matchCount++;
      merged.arabic_name = dia.arabic_name || '';
      merged.birth_place = dia.birth_place || '';
      merged.death_place = dia.death_place || '';
      merged.importance_score = dia.importance_score ? parseFloat(dia.importance_score) : null;
      merged.fields = dia.fields || '';
      merged.dia_short_desc = dia.short_description || '';
    }
  }
  return merged;
});

console.log(`  Matched: ${matchCount}/${ittaAuthors.length}`);

// --- Extract relations between İTTA scholars ---
console.log('Extracting İTTA-internal relations...');
const ittaRelations = [];
const relTypes = ['TEACHER_OF', 'STUDENT_OF', 'CONTEMPORARY_OF'];

for (const rel of diaRelations) {
  if (!relTypes.includes(rel.relation_type)) continue;
  if (ittaSlugs.has(rel.source_slug) || ittaSlugs.has(rel.target_slug)) {
    ittaRelations.push({
      source: rel.source_slug,
      source_name: rel.source_title,
      type: rel.relation_type,
      target: rel.target_slug,
      target_name: rel.target_name,
      both_in_itta: ittaSlugs.has(rel.source_slug) && ittaSlugs.has(rel.target_slug)
    });
  }
}

console.log(`  Relations involving İTTA scholars: ${ittaRelations.length}`);
console.log(`  Both-in-İTTA relations: ${ittaRelations.filter(r => r.both_in_itta).length}`);

// --- DİA works for İTTA scholars ---
console.log('Extracting DİA works for İTTA scholars...');
const diaWorksForItta = [];
for (const w of diaWorks) {
  if (ittaSlugs.has(w.scholar_slug)) {
    diaWorksForItta.push({
      scholar_slug: w.scholar_slug,
      work_name: w.work_name,
      work_type: w.work_type || '',
    });
  }
}
console.log(`  DİA works for İTTA scholars: ${diaWorksForItta.length}`);

// --- Compute stats ---
const havzaCounts = {};
const centuryCounts = {};
const typeCounts = {};

for (const a of mergedAuthors) {
  havzaCounts[a.havza] = (havzaCounts[a.havza] || 0) + 1;
  if (a.yuzyil) centuryCounts[a.yuzyil] = (centuryCounts[a.yuzyil] || 0) + 1;
}
for (const w of ittaWorks) {
  if (w.eser_turu) typeCounts[w.eser_turu] = (typeCounts[w.eser_turu] || 0) + 1;
}

const stats = {
  total_scholars: mergedAuthors.length,
  total_works: ittaWorks.length,
  total_havzas: Object.keys(havzaCounts).length,
  dia_matches: matchCount,
  dia_relations: ittaRelations.length,
  dia_works: diaWorksForItta.length,
  havza_counts: havzaCounts,
  century_counts: centuryCounts,
  type_counts: typeCounts,
  generated_at: new Date().toISOString()
};

// --- Write outputs ---
writeFileSync(join(OUT_DIR, 'itta_authors.json'), JSON.stringify(mergedAuthors));
console.log(`Wrote itta_authors.json (${mergedAuthors.length} records)`);

writeFileSync(join(OUT_DIR, 'itta_works.json'), JSON.stringify(ittaWorks));
console.log(`Wrote itta_works.json (${ittaWorks.length} records)`);

writeFileSync(join(OUT_DIR, 'itta_relations.json'), JSON.stringify(ittaRelations));
console.log(`Wrote itta_relations.json (${ittaRelations.length} records)`);

writeFileSync(join(OUT_DIR, 'itta_stats.json'), JSON.stringify(stats, null, 2));
console.log(`Wrote itta_stats.json`);

console.log('\n✅ Merge complete!');
console.log(`   Scholars: ${stats.total_scholars} | Works: ${stats.total_works}`);
console.log(`   DİA matches: ${stats.dia_matches} | Relations: ${stats.dia_relations}`);
