import { prefetchData } from '../hooks/useData';

/* Data file paths (mirror of useData loaders). */
const D = {
  authors: 'data/itta_authors.json',
  works: 'data/itta_works.json',
  relations: 'data/itta_relations.json',
  stats: 'data/itta_stats.json',
  coords: 'data/city_coords.json',
  geo: 'data/havza_geo.json',
  periods: 'data/periods.json',
  histo: 'data/historiography.json',
  articles: 'data/articles_index.json',
} as const;

/*
 * Route chunk loaders — same dynamic imports as router.tsx, so Vite resolves
 * them to the SAME chunk; calling these on intent warms exactly the chunk the
 * router will lazy-load on navigation.
 */
const CHUNK = {
  scholars: () => import('../pages/ScholarList'),
  scholarDetail: () => import('../pages/ScholarDetail'),
  sources: () => import('../pages/SourceList'),
  sourceDetail: () => import('../pages/SourceDetail'),
  map: () => import('../pages/MapView'),
  network: () => import('../pages/NetworkView'),
  timeline: () => import('../pages/TimelineView'),
  about: () => import('../pages/About'),
  statistics: () => import('../pages/Statistics'),
  silsile: () => import('../pages/SilsileView'),
  compare: () => import('../pages/HavzaCompare'),
  periodization: () => import('../pages/Periodization'),
  historiography: () => import('../pages/Historiography'),
  historiographyDetail: () => import('../pages/HistoriographyDetail'),
  genres: () => import('../pages/Genres'),
  media: () => import('../pages/MediaGallery'),
  havzalar: () => import('../pages/Havzalar'),
  veritabani: () => import('../pages/Veritabani'),
  hanedanlar: () => import('../pages/Hanedanlar'),
  makaleler: () => import('../pages/Makaleler'),
} as const;

export type ChunkKey = keyof typeof CHUNK;

interface RouteSpec { chunk?: ChunkKey; data?: readonly string[] }

/* path -> { chunk, data files it needs }. '/' (Dashboard) is eager → no chunk. */
const ROUTES: Record<string, RouteSpec> = {
  '/': { data: [D.stats, D.authors, D.works] },
  '/scholars': { chunk: 'scholars', data: [D.authors] },
  '/sources': { chunk: 'sources', data: [D.authors, D.works] },
  '/map': { chunk: 'map', data: [D.authors, D.coords, D.geo] },
  '/network': { chunk: 'network', data: [D.authors, D.relations] },
  '/silsile': { chunk: 'silsile', data: [D.authors, D.relations] },
  '/timeline': { chunk: 'timeline', data: [D.authors] },
  '/statistics': { chunk: 'statistics', data: [D.authors, D.relations, D.stats, D.works] },
  '/compare': { chunk: 'compare', data: [D.authors, D.relations, D.works] },
  '/periodization': { chunk: 'periodization', data: [D.authors, D.periods, D.relations, D.works] },
  '/historiography': { chunk: 'historiography', data: [D.authors, D.geo, D.histo, D.works] },
  '/havzalar': { chunk: 'havzalar', data: [D.authors, D.histo, D.works] },
  '/veritabani': { chunk: 'veritabani', data: [D.authors, D.stats, D.works] },
  '/hanedanlar': { chunk: 'hanedanlar', data: [D.histo, D.works] },
  '/turler': { chunk: 'genres', data: [D.works] },
  '/makaleler': { chunk: 'makaleler', data: [D.articles] },
  '/videolar': { chunk: 'media' },
  '/about': { chunk: 'about', data: [D.stats] },
};

const warmed = new Set<string>();

function warmChunk(key?: ChunkKey): void {
  if (!key) return;
  const id = `c:${key}`;
  if (warmed.has(id)) return;
  warmed.add(id);
  CHUNK[key]().catch(() => warmed.delete(id));
}

/** Prefetch a route's JS chunk + its data files (deduped). Call on hover/focus. */
export function prefetchRoute(path: string): void {
  const spec = ROUTES[path];
  if (!spec) return;
  warmChunk(spec.chunk);
  if (spec.data) prefetchData([...spec.data]);
}

/** Prefetch a single named chunk (e.g. detail pages highlighted in the command palette). */
export function prefetchChunk(key: ChunkKey): void {
  warmChunk(key);
}
