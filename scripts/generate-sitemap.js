/**
 * Generates public/sitemap.xml covering every public URL:
 * static pages + 1 per scholar, work, basin (havza + historiography), and article.
 * Runs as part of `npm run build` (before vite build) so data and sitemap stay in sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://alicetinkaya76.github.io/ita';
const DATA = path.join(__dirname, '..', 'public', 'data');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const toArr = (j) => (Array.isArray(j) ? j : j.authors || j.works || Object.values(j).find(Array.isArray) || []);

const authors = toArr(readJson('itta_authors.json'));
const works = toArr(readJson('itta_works.json'));

const basins = [...new Set(authors.map((a) => (a.havza || '').trim()).filter(Boolean))];

let articleIds = [];
try {
  const ai = readJson('articles_index.json');
  const list = Array.isArray(ai) ? ai : ai.articles || Object.values(ai).find(Array.isArray) || [];
  articleIds = list.map((x) => (typeof x === 'string' ? x : x.id || x.key || x.slug)).filter(Boolean);
} catch {
  /* optional */
}
for (const p of ['formation', 'development', 'contraction']) if (!articleIds.includes(p)) articleIds.push(p);

const STATIC = [
  '', 'havzalar', 'veritabani', 'hanedanlar', 'turler', 'makaleler',
  'periodization', 'historiography', 'scholars', 'sources', 'map', 'network',
  'silsile', 'timeline', 'compare', 'statistics', 'videolar', 'about',
  'hikaye', 'zaman-haritasi',
];

const today = new Date().toISOString().slice(0, 10);
const urls = [];
const add = (p, priority) => urls.push({ loc: p === '' ? `${BASE}/` : `${BASE}/${p}`, priority });

STATIC.forEach((p) => add(p, p === '' ? '1.0' : '0.8'));
basins.forEach((b) => { add(`havza/${b}`, '0.7'); add(`historiography/${b}`, '0.7'); });
articleIds.forEach((a) => add(`makale/${a}`, '0.6'));
authors.forEach((a) => a.author_id && add(`scholars/${a.author_id}`, '0.6'));
works.forEach((w) => w.work_id && add(`sources/${w.work_id}`, '0.5'));

const body = urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${urls.length} URL (${authors.length} tarihci, ${works.length} eser, ${basins.length} havza, ${articleIds.length} makale)`);
