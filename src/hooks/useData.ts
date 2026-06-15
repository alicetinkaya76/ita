import { useState, useEffect } from 'react';

export interface Author {
  author_id: string;
  havza: string;
  meshur_isim: string;
  tam_isim: string;
  dogum_yili_h: number | null;
  dogum_yili_m: number | null;
  vefat_yili_h: number | null;
  vefat_yili_m: number | null;
  yuzyil: number | null;
  sehir: string;
  mezhep: string;
  kimlik: string;
  dia_slug: string;
  dia_url: string;
  eser_sayisi: number;
  // DİA enriched
  arabic_name?: string;
  birth_place?: string;
  death_place?: string;
  importance_score?: number | null;
  fields?: string;
  dia_short_desc?: string;
}

export interface Work {
  work_id: string;
  author_id: string;
  havza: string;
  eser_adi: string;
  dil: string;
  eser_turu: string;
  yazilma_sehri: string;
  kaynak_sayfa: number;
  tanitim: string;
  hanedan: string;
  diger_adlari?: string[];
}

export interface Relation {
  source: string;
  source_name: string;
  type: string;
  target: string;
  target_name: string;
  both_in_itta: boolean;
}

export interface Stats {
  total_scholars: number;
  total_works: number;
  total_havzas: number;
  dia_matches: number;
  dia_relations: number;
  dia_works: number;
  havza_counts: Record<string, number>;
  century_counts: Record<string, number>;
  type_counts: Record<string, number>;
  generated_at: string;
}

export type CityCoords = Record<string, [number, number]>;

export interface HavzaGeoFeature {
  type: 'Feature';
  properties: { id: string; name_tr: string; name_en: string; name_ar: string };
  geometry: { type: string; coordinates: number[][][] };
}

export interface HavzaGeoCollection {
  type: 'FeatureCollection';
  features: HavzaGeoFeature[];
}

// Period & Historiography types
export interface PeriodSchool {
  id: string;
  key_scholars_ids: string[];
  tr: { name: string; desc: string };
  en: { name: string; desc: string };
}

export interface Period {
  id: string;
  century_min: number;
  century_max: number;
  color: string;
  schools: PeriodSchool[];
  genres: string[];
  key_scholars_ids: string[];
  tr: { name: string; subtitle: string; summary: string; detailed: string };
  en: { name: string; subtitle: string; summary: string; detailed: string };
}

export interface GenreDetail {
  id: string;
  key_works_ids: string[];
  tr: { name: string; desc: string };
  en: { name: string; desc: string };
}

export interface PeriodsData {
  periods: Period[];
  genre_details: GenreDetail[];
  references: { citation: string; doi?: string; isbn?: string }[];
}

export interface BasinDynasty {
  name_tr: string;
  name_en: string;
  years: string;
  period: string;
}

export interface BasinPeriodEntry {
  tr: string;
  en: string;
  key_themes?: string[];
  key_historians?: string[];
}

export interface Basin {
  id: string;
  havza_key: string;
  color: string;
  dynasties: BasinDynasty[];
  key_scholars_ids: string[];
  periods: {
    formation: BasinPeriodEntry;
    development: BasinPeriodEntry;
    contraction: BasinPeriodEntry;
  };
  references: { citation: string; doi?: string }[];
  has_article?: boolean;
}

export interface HistoriographyData {
  basins: Basin[];
}

const cache: Record<string, unknown> = {};
const inflight: Record<string, Promise<unknown> | undefined> = {};
const BASE = import.meta.env.BASE_URL;

async function loadJSON<T>(path: string): Promise<T> {
  if (cache[path]) return cache[path] as T;
  if (inflight[path]) return inflight[path] as Promise<T>;
  const p = fetch(BASE + path)
    .then(res => res.json())
    .then(data => { cache[path] = data; delete inflight[path]; return data; })
    .catch(err => { delete inflight[path]; throw err; });
  inflight[path] = p;
  return p as Promise<T>;
}

/** Warm the JSON cache ahead of navigation (deduped via the cache above). Used by intent-based prefetch. */
export function prefetchData(paths: string[]): void {
  for (const path of paths) { void loadJSON(path).catch(() => {}); }
}

export function useAuthors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<Author[]>('data/itta_authors.json').then(d => { setAuthors(d); setLoading(false); });
  }, []);
  return { authors, loading };
}

export function useWorks() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<Work[]>('data/itta_works.json').then(d => { setWorks(d); setLoading(false); });
  }, []);
  return { works, loading };
}

export function useRelations() {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<Relation[]>('data/itta_relations.json').then(d => { setRelations(d); setLoading(false); });
  }, []);
  return { relations, loading };
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<Stats>('data/itta_stats.json').then(d => { setStats(d); setLoading(false); });
  }, []);
  return { stats, loading };
}

export function useCityCoords() {
  const [coords, setCoords] = useState<CityCoords>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<CityCoords>('data/city_coords.json').then(d => { setCoords(d); setLoading(false); });
  }, []);
  return { coords, loading };
}

export function useHavzaGeo() {
  const [geo, setGeo] = useState<HavzaGeoCollection | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<HavzaGeoCollection>('data/havza_geo.json').then(d => { setGeo(d); setLoading(false); });
  }, []);
  return { geo, loading };
}

export function usePeriods() {
  const [data, setData] = useState<PeriodsData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<PeriodsData>('data/periods.json').then(d => { setData(d); setLoading(false); });
  }, []);
  return { periodsData: data, loading };
}

export function useHistoriography() {
  const [data, setData] = useState<HistoriographyData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<HistoriographyData>('data/historiography.json').then(d => { setData(d); setLoading(false); });
  }, []);
  return { histData: data, loading };
}

// ---- Graph metrics (derived: public/data/graph_metrics.json) ----
export interface NodeMetric {
  teachers: number;
  students: number;
  contemporaries: number;
  degree: number;
  betweenness: number;
  pagerank: number;
  component_size: number;
}

export interface GraphMetricsSummary {
  graph_nodes: number;
  graph_edges: number;
  itta_nodes: number;
  itta_with_relations: number;
  itta_internal_edges: number;
  components: number;
  largest_component: number;
  density: number;
}

export interface GraphMetrics {
  generated_at: string;
  summary: GraphMetricsSummary;
  nodes: Record<string, NodeMetric>;
}

/** Loads precomputed network centrality metrics (degree/betweenness/pagerank). */
export function useGraphMetrics() {
  const [metrics, setMetrics] = useState<GraphMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<GraphMetrics>('data/graph_metrics.json')
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { metrics, loading };
}

// ---- Havza historiography intro texts (derived: public/data/havza_intro.json) ----
export interface HavzaIntroBlock { metin: string; baslik: boolean }
export interface HavzaIntro { baslik: string; bloklar: HavzaIntroBlock[] }

/** Loads the per-basin historiography intro texts (author-provided). */
export function useHavzaIntro() {
  const [havzaIntro, setHavzaIntro] = useState<Record<string, HavzaIntro> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<Record<string, HavzaIntro>>('data/havza_intro.json')
      .then(d => { setHavzaIntro(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { havzaIntro, loading };
}

// ---- Articles (full document-derived essays) ----
export interface ArticleTocItem {
  id: string;
  text: string;
  level: number;
}

/** Lightweight metadata (articles_index.json) — used by the article index page. */
export interface ArticleMeta {
  id: string;
  kind: 'period' | 'havza';
  key: string;
  title: string;
  abstract: string;
  reading_minutes: number;
  word_count: number;
  footnote_count: number;
}

/** Full article (articles/<id>.json) — used by the article reader. */
export interface Article extends ArticleMeta {
  abstract_html: string;
  toc: ArticleTocItem[];
  body_html: string;
  footnotes_html: string;
}

export interface ArticlesData {
  articles: ArticleMeta[];
}

/** Loads the lightweight index of all articles (no bodies). */
export function useArticles() {
  const [data, setData] = useState<ArticlesData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadJSON<ArticlesData>('data/articles_index.json').then(d => { setData(d); setLoading(false); });
  }, []);
  return { articlesData: data, loading };
}

/** Loads a single full article on demand (one ~80 KB file instead of all). */
export function useArticle(id: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) { setArticle(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    loadJSON<Article>(`data/articles/${id}.json`)
      .then(d => { if (alive) { setArticle(d); setLoading(false); } })
      .catch(() => { if (alive) { setArticle(null); setLoading(false); } });
    return () => { alive = false; };
  }, [id]);
  return { article, loading };
}
