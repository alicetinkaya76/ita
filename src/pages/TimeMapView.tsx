import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { useAuthors, useCityCoords, type Author } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import { deathYears } from '../utils/dates';

const YEAR_MIN = 570;
const YEAR_MAX = 2025;
const WINDOW = 30;
const VB_W = 1000;
const toHijri = (ce: number) => Math.max(1, Math.round((ce - 622) * 1.030684));
const periodIdOf = (y: number) => { const c = Math.ceil(y / 100); return c <= 10 ? 'formation' : c <= 18 ? 'development' : 'contraction'; };
const periodColorOf = (y: number) => { const c = Math.ceil(y / 100); return c <= 10 ? '#1565C0' : c <= 18 ? '#2E7D32' : '#C62828'; };

const BANDS = [
  { id: 'formation', from: YEAR_MIN, to: 1000, color: '#1565C0' },
  { id: 'development', from: 1000, to: 1800, color: '#2E7D32' },
  { id: 'contraction', from: 1800, to: YEAR_MAX, color: '#C62828' },
];

interface Placed { a: Author; year: number; lat: number; lng: number; havza: string; city: string; }

export default function TimeMapView() {
  const { t } = useTranslation();
  const { authors } = useAuthors();
  const { coords } = useCityCoords();

  const [year, setYear] = useState(1300);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const rulerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const dated = useMemo(() => {
    const out: { year: number }[] = [];
    for (const a of authors) { const y = a.vefat_yili_m; if (y && y >= YEAR_MIN && y <= YEAR_MAX) out.push({ year: y }); }
    return out;
  }, [authors]);

  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = [];
    for (const a of authors) {
      const y = a.vefat_yili_m; const city = (a.sehir || '').trim();
      if (!y || y < YEAR_MIN || y > YEAR_MAX || !city || !coords[city]) continue;
      const [lat, lng] = coords[city];
      out.push({ a, year: y, lat, lng, havza: a.havza, city });
    }
    return out;
  }, [authors, coords]);

  const active = useMemo(
    () => placed
      .filter(p => p.year >= year - WINDOW && p.year <= year + WINDOW)
      .sort((x, z) => (((z.a as any).importance_score || 0) - ((x.a as any).importance_score || 0)) || (x.year - z.year)),
    [placed, year]
  );

  const featured = active[0] || null;
  const featuredId = featured?.a.author_id;

  const clusters = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; city: string; items: Placed[]; havzaCount: Record<string, number> }>();
    for (const p of active) {
      const key = `${p.lat},${p.lng}`;
      let c = map.get(key);
      if (!c) { c = { lat: p.lat, lng: p.lng, city: p.city, items: [], havzaCount: {} }; map.set(key, c); }
      c.items.push(p); c.havzaCount[p.havza] = (c.havzaCount[p.havza] || 0) + 1;
    }
    return [...map.values()].map(c => ({ ...c, havza: Object.entries(c.havzaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '' }));
  }, [active]);

  const topCenter = useMemo(
    () => clusters.reduce<(typeof clusters)[number] | null>((best, c) => (c.items.length > (best?.items.length || 0) ? c : best), null),
    [clusters]
  );

  const havzaBars = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of active) c[p.havza] = (c[p.havza] || 0) + 1;
    const max = Math.max(1, ...Object.values(c));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([h, n]) => ({ h, n, pct: (n / max) * 100 }));
  }, [active]);

  const milestones = useMemo(() => {
    return authors
      .filter(a => a.vefat_yili_m && a.vefat_yili_m >= YEAR_MIN && a.vefat_yili_m <= YEAR_MAX && ((a as any).importance_score || 0) > 0)
      .sort((a, b) => ((b as any).importance_score || 0) - ((a as any).importance_score || 0))
      .slice(0, 12)
      .map(a => ({ id: a.author_id, name: a.meshur_isim, year: a.vefat_yili_m as number }));
  }, [authors]);

  const periodId = periodIdOf(year);
  const periodColor = periodColorOf(year);

  const densityPath = useMemo(() => {
    const bin = 20; const counts: Record<number, number> = {};
    for (const d of dated) { const b = Math.floor(d.year / bin) * bin; counts[b] = (counts[b] || 0) + 1; }
    const pts: { year: number; count: number }[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y += bin) pts.push({ year: y + bin / 2, count: counts[y] || 0 });
    const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([0, VB_W]);
    const maxC = d3.max(pts, p => p.count) || 1;
    const ys = d3.scaleLinear().domain([0, maxC]).range([72, 22]);
    const area = d3.area<{ year: number; count: number }>().x(p => x(p.year)).y0(72).y1(p => ys(p.count)).curve(d3.curveBasis);
    return area(pts) || '';
  }, [dated]);

  const pct = (y: number) => ((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
  const xPct = pct(year);

  const setYearFromClientX = useCallback((clientX: number) => {
    const el = rulerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setYear(Math.round(YEAR_MIN + frac * (YEAR_MAX - YEAR_MIN)));
  }, []);
  const onPointerDown = (e: React.PointerEvent) => { draggingRef.current = true; setPlaying(false); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setYearFromClientX(e.clientX); };
  const onPointerMove = (e: React.PointerEvent) => { if (draggingRef.current) setYearFromClientX(e.clientX); };
  const onPointerUp = () => { draggingRef.current = false; };

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => { setYear(prev => { if (prev >= YEAR_MAX) { setPlaying(false); return YEAR_MAX; } return prev + speed; }); }, 110);
    return () => clearInterval(id);
  }, [playing, speed]);
  const togglePlay = () => { if (!playing && year >= YEAR_MAX) setYear(YEAR_MIN); setPlaying(p => !p); };
  const jumpTo = (y: number) => { setPlaying(false); setYear(y); };

  const ticks: number[] = [];
  for (let y = 600; y <= 2000; y += 100) ticks.push(y);

  return (
    <div className="timemap-page">
      <div className="timemap-main">
        <aside className="timemap-panel">
          <div className="timemap-year" style={{ color: periodColor }}>{year}</div>
          <div className="timemap-year-sub">h. ~{toHijri(year)} · {t(`periods.${periodId}`)}</div>
          <div className="timemap-count">{active.length} {t('timemap.active_scholars')}<span className="timemap-window">≈ {year}±{WINDOW}</span></div>

          {(featured || topCenter) && (
            <div className="timemap-facts">
              {featured && (
                <Link to={`/scholars/${featured.a.author_id}`} className="timemap-fact">
                  <span className="timemap-fact-label">{t('timemap.featured')}</span>
                  <span className="timemap-fact-value">{featured.a.meshur_isim}</span>
                </Link>
              )}
              {topCenter && (
                <div className="timemap-fact">
                  <span className="timemap-fact-label">{t('timemap.top_center')}</span>
                  <span className="timemap-fact-value">{topCenter.city} · {topCenter.items.length}</span>
                </div>
              )}
            </div>
          )}

          {havzaBars.length > 0 && (
            <div className="timemap-havzabars">
              <div className="timemap-subhead">{t('timemap.by_havza')}</div>
              {havzaBars.map(b => (
                <div key={b.h} className="timemap-hbar">
                  <span className="timemap-hbar-label">{t(`havza_names.${b.h}`, { defaultValue: b.h })}</span>
                  <span className="timemap-hbar-track"><span className="timemap-hbar-fill" style={{ width: `${b.pct}%`, background: HAVZA_COLORS[b.h] || '#999' }} /></span>
                  <span className="timemap-hbar-n">{b.n}</span>
                </div>
              ))}
            </div>
          )}

          <div className="timemap-list">
            {active.length === 0 && <div className="timemap-empty">{t('timemap.no_scholars')}</div>}
            {active.map(p => (
              <Link key={p.a.author_id} to={`/scholars/${p.a.author_id}`} className={`timemap-scholar ${p.a.author_id === featuredId ? 'is-featured' : ''}`}>
                <span className="timemap-scholar-dot" style={{ background: HAVZA_COLORS[p.havza] || '#999' }} />
                <span className="timemap-scholar-name">{p.a.meshur_isim}</span>
                <span className="timemap-scholar-meta">{deathYears(p.a, t)} · {p.a.sehir}</span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="timemap-map">
          <MapContainer center={[33, 40]} zoom={4} className="timemap-leaflet" attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {clusters.map(c => {
              const isFeat = Boolean(featuredId && c.items.some(p => p.a.author_id === featuredId));
              return (
                <CircleMarker key={`${c.lat},${c.lng}`} center={[c.lat, c.lng]}
                  radius={Math.min(5 + Math.sqrt(c.items.length) * 3.2, 24)}
                  pathOptions={{ color: isFeat ? '#B8860B' : '#fff', weight: isFeat ? 3 : 1.2, fillColor: HAVZA_COLORS[c.havza] || '#999', fillOpacity: 0.82 }}>
                  <Popup>
                    <div className="timemap-popup">
                      {c.items.slice(0, 12).map(p => (
                        <Link key={p.a.author_id} to={`/scholars/${p.a.author_id}`} className="timemap-popup-link">
                          {p.a.meshur_isim} <span className="timemap-popup-year">({deathYears(p.a, t)})</span>
                        </Link>
                      ))}
                      {c.items.length > 12 && <div className="timemap-popup-more">+{c.items.length - 12}</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      <div className="timemap-ruler-wrap">
        <div className="timemap-controls">
          <button className={`timemap-play ${playing ? 'playing' : ''}`} onClick={togglePlay} aria-label={t('timemap.play')}>{playing ? '❚❚' : '▶'}</button>
          <button className="timemap-speed" onClick={() => setSpeed(s => (s === 5 ? 10 : 5))} aria-label="speed">{speed === 5 ? '1×' : '2×'}</button>
        </div>
        <div className="timemap-ruler" ref={rulerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          {BANDS.map(b => {
            const left = pct(Math.max(b.from, YEAR_MIN)); const right = pct(Math.min(b.to, YEAR_MAX));
            return <div key={b.id} className="timemap-band" style={{ left: `${left}%`, width: `${right - left}%`, background: `color-mix(in srgb, ${b.color} 9%, transparent)` }} />;
          })}
          {BANDS.map(b => (
            <span key={`${b.id}-l`} className="timemap-band-label" style={{ left: `${pct(Math.max(b.from, YEAR_MIN))}%`, color: b.color }}>{t(`periods.${b.id}`)}</span>
          ))}
          <svg viewBox={`0 0 ${VB_W} 100`} preserveAspectRatio="none" className="timemap-density">
            <path d={densityPath} fill={periodColor} fillOpacity={0.22} />
          </svg>
          {milestones.map(m => (
            <button key={m.id} className="timemap-milestone" style={{ left: `${pct(m.year)}%` }}
              onPointerDown={e => e.stopPropagation()} onClick={() => jumpTo(m.year)} title={`${m.name} — ${m.year}`}>
              <span className="timemap-milestone-dot" style={{ background: periodColorOf(m.year) }} />
              <span className="timemap-milestone-tip">{m.name} · {m.year}</span>
            </button>
          ))}
          {ticks.map(ty => (
            <div key={ty} className="timemap-tick" style={{ left: `${pct(ty)}%` }}>
              <span className="timemap-tick-line" />
              <span className="timemap-tick-ce">{ty}</span>
              <span className="timemap-tick-ah">h.{toHijri(ty)}</span>
            </div>
          ))}
          <div className="timemap-playhead" style={{ left: `${xPct}%`, background: periodColor }}>
            <span className="timemap-playhead-badge" style={{ background: periodColor }}>{year}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
