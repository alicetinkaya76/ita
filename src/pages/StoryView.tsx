import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { usePeriods, useAuthors, type Author } from '../hooks/useData';
import { PERIOD_COLORS } from '../utils/colors';

// Representative center for each school (school names are historical centers)
const SCHOOL_COORDS: Record<string, [number, number]> = {
  medina: [24.4672, 39.6112],
  kufa: [32.03, 44.4],
  kahire_school: [30.0444, 31.2357],
  istanbul_school: [41.0082, 28.9784],
  delhi_school: [28.7041, 77.1025],
  isfahan_school: [32.6546, 51.668],
  ottoman_modernist: [41.0082, 28.9784],
  indian_revivalist: [28.7041, 77.1025],
  maghreb_nationalist: [34.0209, -6.8417],
};

type Step =
  | { type: 'intro' }
  | { type: 'period'; periodId: string; color: string; period: any }
  | { type: 'school'; periodId: string; color: string; school: any }
  | { type: 'outro' };

// Programmatically flies the (passive) map to the active focus
function MapFocus({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function StoryView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const { periodsData } = usePeriods();
  const { authors } = useAuthors();
  const periods: any[] = periodsData?.periods || [];

  const byId = useMemo(() => {
    const m: Record<string, Author> = {};
    for (const a of authors) m[a.author_id] = a;
    return m;
  }, [authors]);

  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [{ type: 'intro' }];
    for (const p of periods) {
      const color = p.color || PERIOD_COLORS[p.id] || '#8B4513';
      out.push({ type: 'period', periodId: p.id, color, period: p });
      for (const s of (p.schools || []) as any[]) {
        out.push({ type: 'school', periodId: p.id, color, school: s });
      }
    }
    out.push({ type: 'outro' });
    return out;
  }, [periods]);

  const [activeIdx, setActiveIdx] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveIdx(Number((e.target as HTMLElement).dataset.idx));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    stepRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [steps]);

  const active = steps[activeIdx] || steps[0];
  const activeSchoolId = active.type === 'school' ? active.school.id : null;

  const focus = useMemo<{ center: LatLngExpression; zoom: number }>(() => {
    if (active.type === 'school') {
      const c = SCHOOL_COORDS[active.school.id];
      if (c) return { center: c, zoom: 5 };
    }
    if (active.type === 'period') {
      const cs = ((active.period.schools || []) as any[]).map(s => SCHOOL_COORDS[s.id]).filter(Boolean) as [number, number][];
      if (cs.length) {
        const lat = cs.reduce((sum, c) => sum + c[0], 0) / cs.length;
        const lng = cs.reduce((sum, c) => sum + c[1], 0) / cs.length;
        return { center: [lat, lng], zoom: cs.length > 1 ? 4 : 5 };
      }
    }
    return { center: [29, 42], zoom: 3 };
  }, [active]);

  const markers = useMemo(() => {
    const arr: { id: string; coord: [number, number]; color: string }[] = [];
    for (const p of periods) {
      const color = p.color || PERIOD_COLORS[p.id] || '#8B4513';
      for (const s of (p.schools || []) as any[]) {
        const c = SCHOOL_COORDS[s.id];
        if (c) arr.push({ id: s.id, coord: c, color });
      }
    }
    return arr;
  }, [periods]);

  const content = (s: any) => (s[lang] || s.en || s.tr || {});

  return (
    <div className="story-page">
      {/* Sticky cinematic map */}
      <div className="story-visual">
        <MapContainer
          center={[29, 42]}
          zoom={3}
          className="story-map"
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
          {markers.map(m => {
            const isActive = m.id === activeSchoolId;
            return (
              <CircleMarker
                key={m.id}
                center={m.coord}
                radius={isActive ? 13 : 6}
                pathOptions={{
                  color: '#fff',
                  weight: isActive ? 2.5 : 1,
                  fillColor: m.color,
                  fillOpacity: isActive ? 0.95 : 0.4,
                }}
              />
            );
          })}
          <MapFocus center={focus.center} zoom={focus.zoom} />
        </MapContainer>
        <div className="story-visual-caption">{t('story.map_caption')}</div>
      </div>

      {/* Scrolling narrative */}
      <div className="story-steps">
        {steps.map((st, idx) => (
          <div
            key={idx}
            data-idx={idx}
            ref={el => { stepRefs.current[idx] = el; }}
            className={`story-step story-step-${st.type} ${activeIdx === idx ? 'active' : ''}`}
          >
            {st.type === 'intro' && (
              <div className="story-intro">
                <h1 className="story-title">{t('story.title')}</h1>
                <p className="story-lead">{t('story.lead')}</p>
                <div className="story-scroll-hint">{t('story.scroll_hint')} ↓</div>
              </div>
            )}

            {st.type === 'period' && (
              <div className="story-period" style={{ borderColor: st.color }}>
                <span className="story-period-kicker" style={{ color: st.color }}>
                  {st.period.century_min}–{st.period.century_max}. yy
                </span>
                <h2 className="story-period-title" style={{ color: st.color }}>{t(`periods.${st.periodId}`)}</h2>
              </div>
            )}

            {st.type === 'school' && (
              <div className="story-school">
                <span className="story-school-dot" style={{ background: st.color }} />
                <h3 className="story-school-name">{content(st.school).name}</h3>
                <p className="story-school-desc">{content(st.school).desc}</p>
                {(st.school.key_scholars_ids || []).some((id: string) => byId[id]) && (
                  <div className="story-school-scholars">
                    {(st.school.key_scholars_ids || []).map((id: string) => {
                      const a = byId[id];
                      return a ? (
                        <Link key={id} to={`/scholars/${id}`} className="story-scholar-chip">{a.meshur_isim}</Link>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {st.type === 'outro' && (
              <div className="story-outro">
                <h2 className="story-outro-title">{t('story.outro_title')}</h2>
                <p className="story-lead">{t('story.outro_lead')}</p>
                <div className="story-outro-links">
                  <Link to="/map" className="story-cta">{t('nav.map')} →</Link>
                  <Link to="/network" className="story-cta">{t('nav.network')} →</Link>
                  <Link to="/periodization" className="story-cta">{t('nav.periodization')} →</Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
