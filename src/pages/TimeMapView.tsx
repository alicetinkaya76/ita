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
const WINDOW = 30;          // ± years around the playhead = "active generation"
const VB_W = 1000;
const toHijri = (ce: number) => Math.max(1, Math.round((ce - 622) * 1.030684));

interface Placed { a: Author; year: number; lat: number; lng: number; havza: string; }

export default function TimeMapView() {
  const { t } = useTranslation();
  const { authors } = useAuthors();
  const { coords } = useCityCoords();

  const [year, setYear] = useState(1300);
  const [playing, setPlaying] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Scholars with a CE death year in range (for the density curve)
  const dated = useMemo(() => {
    const out: { year: number }[] = [];
    for (const a of authors) {
      const y = a.vefat_yili_m;
      if (y && y >= YEAR_MIN && y <= YEAR_MAX) out.push({ year: y });
    }
    return out;
  }, [authors]);

  // Scholars with BOTH death year and a mappable city (shown on the map)
  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = [];
    for (const a of authors) {
      const y = a.vefat_yili_m;
      const city = (a.sehir || '').trim();
      if (!y || y < YEAR_MIN || y > YEAR_MAX || !city || !coords[city]) continue;
      const [lat, lng] = coords[city];
      out.push({ a, year: y, lat, lng, havza: a.havza });
    }
    return out;
  }, [authors, coords]);

  // Active generation around the playhead
  const active = useMemo(
    () => placed.filter(p => p.year >= year - WINDOW && p.year <= year + WINDOW)
      .sort((x, y2) => x.year - y2.year),
    [placed, year]
  );

  // Cluster active scholars by city
  const clusters = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; items: Placed[]; havzaCount: Record<string, number> }>();
    for (const p of active) {
      const key = `${p.lat},${p.lng}`;
      let c = map.get(key);
      if (!c) { c = { lat: p.lat, lng: p.lng, items: [], havzaCount: {} }; map.set(key, c); }
      c.items.push(p);
      c.havzaCount[p.havza] = (c.havzaCount[p.havza] || 0) + 1;
    }
    return [...map.values()].map(c => ({
      ...c,
      havza: Object.entries(c.havzaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    }));
  }, [active]);

  // Period of the current year
  const century = Math.ceil(year / 100);
  const periodId = century <= 10 ? 'formation' : century <= 18 ? 'development' : 'contraction';
  const periodColor = periodId === 'formation' ? '#1565C0' : periodId === 'development' ? '#2E7D32' : '#C62828';

  // Density curve (all dated scholars, 20-year bins)
  const densityPath = useMemo(() => {
    const bin = 20;
    const counts: Record<number, number> = {};
    for (const d of dated) { const b = Math.floor(d.year / bin) * bin; counts[b] = (counts[b] || 0) + 1; }
    const pts: { year: number; count: number }[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y += bin) pts.push({ year: y + bin / 2, count: counts[y] || 0 });
    const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([0, VB_W]);
    const maxC = d3.max(pts, p => p.count) || 1;
    const ys = d3.scaleLinear().domain([0, maxC]).range([72, 10]);
    const area = d3.area<{ year: number; count: number }>().x(p => x(p.year)).y0(72).y1(p => ys(p.count)).curve(d3.curveBasis);
    return area(pts) || '';
  }, [dated]);

  const xPct = ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

  // Ruler interaction
  const setYearFromClientX = useCallback((clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setYear(Math.round(YEAR_MIN + frac * (YEAR_MAX - YEAR_MIN)));
  }, []);
  const draggingRef = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setPlaying(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setYearFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (draggingRef.current) setYearFromClientX(e.clientX); };
  const onPointerUp = () => { draggingRef.current = false; };

  // Play
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear(prev => {
        if (prev >= YEAR_MAX) { setPlaying(false); return YEAR_MAX; }
        return prev + 5;
      });
    }, 110);
    return () => clearInterval(id);
  }, [playing]);
  const togglePlay = () => {
    if (!playing && year >= YEAR_MAX) setYear(YEAR_MIN);
    setPlaying(p => !p);
  };

  // Century ticks (CE) with approx Hijri
  const ticks: number[] = [];
  for (let y = 600; y <= 2000; y += 100) ticks.push(y);

  return (
    <div className="timemap-page">
      <div className="timemap-main">
        {/* Panel */}
        <aside className="timemap-panel">
          <div className="timemap-year" style={{ color: periodColor }}>{year}</div>
          <div className="timemap-year-sub">h. ~{toHijri(year)} · {t(`periods.${periodId}`)}</div>
          <div className="timemap-count">
            {active.length} {t('timemap.active_scholars')}
            <span className="timemap-window">≈ {year}±{WINDOW}</span>
          </div>
          <div className="timemap-list">
            {active.length === 0 && <div className="timemap-empty">{t('timemap.no_scholars')}</div>}
            {active.map(p => (
              <Link key={p.a.author_id} to={`/scholars/${p.a.author_id}`} className="timemap-scholar">
                <span className="timemap-scholar-dot" style={{ background: HAVZA_COLORS[p.havza] || '#999' }} />
                <span className="timemap-scholar-name">{p.a.meshur_isim}</span>
                <span className="timemap-scholar-meta">{deathYears(p.a, t)} · {p.a.sehir}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Map */}
        <div className="timemap-map">
          <MapContainer center={[33, 40]} zoom={4} className="timemap-leaflet" attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {clusters.map(c => (
              <CircleMarker
                key={`${c.lat},${c.lng}`}
                center={[c.lat, c.lng]}
                radius={Math.min(5 + Math.sqrt(c.items.length) * 3.2, 24)}
                pathOptions={{ color: '#fff', weight: 1.2, fillColor: HAVZA_COLORS[c.havza] || '#999', fillOpacity: 0.8 }}
              >
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
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Timeline ruler */}
      <div className="timemap-ruler-wrap">
        <button className={`timemap-play ${playing ? 'playing' : ''}`} onClick={togglePlay} aria-label={t('timemap.play')}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div
          className="timemap-ruler"
          ref={rulerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <svg viewBox={`0 0 ${VB_W} 100`} preserveAspectRatio="none" className="timemap-density">
            <path d={densityPath} fill={periodColor} fillOpacity={0.2} />
          </svg>
          {ticks.map(ty => (
            <div key={ty} className="timemap-tick" style={{ left: `${((ty - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}>
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
