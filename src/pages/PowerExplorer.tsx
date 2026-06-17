import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthors, useWorks, useCityCoords } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER } from '../utils/colors';
import Seo from '../components/Seo';

function langBucket(dil: string | null | undefined): string | null {
  const s = (dil || '').trim();
  if (!s) return null;
  if (s === 'Arapça') return 'Arapça';
  if (s === 'Farsça') return 'Farsça';
  if (/türk|osmanl|çağatay/i.test(s)) return 'Türkçe';
  return 'Diğer';
}
const LANGS = ['Arapça', 'Farsça', 'Türkçe', 'Diğer'];

export default function PowerExplorer() {
  const { t } = useTranslation();
  const { authors, loading: aL } = useAuthors();
  const { works, loading: wL } = useWorks();
  const { coords } = useCityCoords();
  const [sp, setSp] = useSearchParams();

  const havza = sp.get('havza') || '';
  const century = sp.get('century') || '';
  const mezhep = sp.get('mezhep') || '';
  const genre = sp.get('genre') || '';
  const lang = sp.get('lang') || '';
  const anyFilter = !!(havza || century || mezhep || genre || lang);

  const set = useCallback((k: string, v: string) => {
    setSp(prev => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  }, [setSp]);
  const clear = useCallback(() => setSp({}, { replace: true }), [setSp]);

  // option lists from data
  const opts = useMemo(() => {
    const centuries = new Set<number>(); const mezhepC: Record<string, number> = {};
    for (const a of authors) { if (a.yuzyil) centuries.add(a.yuzyil); const m = (a.mezhep || '').trim(); if (m) mezhepC[m] = (mezhepC[m] || 0) + 1; }
    const genreC: Record<string, number> = {};
    for (const w of works) { const g = (w.eser_turu || '').trim(); if (g) genreC[g] = (genreC[g] || 0) + 1; }
    return {
      centuries: [...centuries].sort((a, b) => a - b),
      mezheps: Object.entries(mezhepC).sort((a, b) => b[1] - a[1]).map(([m]) => m),
      genres: Object.entries(genreC).sort((a, b) => b[1] - a[1]).map(([g]) => g),
    };
  }, [authors, works]);

  // author_id -> sets of genres & language buckets
  const workIndex = useMemo(() => {
    const g = new Map<string, Set<string>>(); const l = new Map<string, Set<string>>();
    for (const w of works) {
      const id = w.author_id;
      const gt = (w.eser_turu || '').trim();
      if (gt) { let s = g.get(id); if (!s) { s = new Set(); g.set(id, s); } s.add(gt); }
      const lb = langBucket(w.dil);
      if (lb) { let s = l.get(id); if (!s) { s = new Set(); l.set(id, s); } s.add(lb); }
    }
    return { g, l };
  }, [works]);

  const matched = useMemo(() => {
    const cy = century ? parseInt(century) : null;
    return authors.filter(a => {
      if (havza && a.havza !== havza) return false;
      if (cy != null && a.yuzyil !== cy) return false;
      if (mezhep && (a.mezhep || '').trim() !== mezhep) return false;
      if (genre && !workIndex.g.get(a.author_id)?.has(genre)) return false;
      if (lang && !workIndex.l.get(a.author_id)?.has(lang)) return false;
      return true;
    });
  }, [authors, havza, century, mezhep, genre, lang, workIndex]);

  const timeline = useMemo(() => {
    const c: Record<number, number> = {};
    for (const a of matched) if (a.yuzyil) c[a.yuzyil] = (c[a.yuzyil] || 0) + 1;
    const arr: [number, number][] = [];
    for (let y = 7; y <= 21; y++) arr.push([y, c[y] || 0]);
    const max = Math.max(1, ...arr.map(d => d[1]));
    return { arr, max };
  }, [matched]);

  const cityMarkers = useMemo(() => {
    const m = new Map<string, { count: number; havzas: Record<string, number> }>();
    for (const a of matched) {
      const city = (a.sehir || '').trim();
      if (!city || !coords[city]) continue;
      let e = m.get(city);
      if (!e) { e = { count: 0, havzas: {} }; m.set(city, e); }
      e.count++; e.havzas[a.havza] = (e.havzas[a.havza] || 0) + 1;
    }
    return Array.from(m.entries()).map(([city, { count, havzas }]) => {
      const dom = Object.entries(havzas).sort((a, b) => b[1] - a[1])[0][0];
      const [lat, lng] = coords[city];
      return { city, count, lat, lng, color: HAVZA_COLORS[dom] || '#8B4513' };
    });
  }, [matched, coords]);

  if (aL || wL) return <div className="loading-screen">{t('common.loading')}</div>;

  const selStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit', fontSize: 14 };
  const geocoded = cityMarkers.reduce((s, m) => s + m.count, 0);

  return (
    <div className="list-page">
      <Seo
        title={t('explorer.title', { defaultValue: 'Güç-Keşfi' })}
        description={t('explorer.subtitle', { defaultValue: 'Havza, yüzyıl, mezhep, tür ve dili aynı anda filtreleyin' })}
        path="/kesif"
      />
      <header className="list-header">
        <h1>{t('explorer.title', { defaultValue: 'Güç-Keşfi' })}</h1>
        <span className="list-count">{matched.length} {t('common.scholar_count')}</span>
      </header>

      <p style={{ maxWidth: 640, color: '#8a8a8a', lineHeight: 1.55, margin: '0 0 14px' }}>
        {t('explorer.intro', { defaultValue: 'Beş boyutu aynı anda süzün; sonuç eş zamanlı olarak zaman çizelgesi, harita ve liste hâlinde güncellenir. Tür ve dil filtreleri, o türde/dilde eseri olan tarihçileri getirir.' })}
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <select value={havza} aria-label={t('scholar_detail.havza', { defaultValue: 'Havza' })} onChange={e => set('havza', e.target.value)} style={selStyle}>
          <option value="">{t('scholar_detail.havza', { defaultValue: 'Havza' })}: {t('common.all', { defaultValue: 'Tümü' })}</option>
          {HAVZA_ORDER.map(h => <option key={h} value={h}>{t(`havza_names.${h}`, { defaultValue: h })}</option>)}
        </select>
        <select value={century} aria-label={t('scholar_detail.century', { defaultValue: 'Yüzyıl' })} onChange={e => set('century', e.target.value)} style={selStyle}>
          <option value="">{t('scholar_detail.century', { defaultValue: 'Yüzyıl' })}: {t('common.all', { defaultValue: 'Tümü' })}</option>
          {opts.centuries.map(c => <option key={c} value={String(c)}>{c}. {t('dashboard.century_suffix', { defaultValue: 'yy' })}</option>)}
        </select>
        <select value={mezhep} aria-label={t('scholar_detail.madhhab', { defaultValue: 'Mezhep' })} onChange={e => set('mezhep', e.target.value)} style={selStyle}>
          <option value="">{t('scholar_detail.madhhab', { defaultValue: 'Mezhep' })}: {t('common.all', { defaultValue: 'Tümü' })}</option>
          {opts.mezheps.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={genre} aria-label={t('explorer.genre', { defaultValue: 'Tür' })} onChange={e => set('genre', e.target.value)} style={selStyle}>
          <option value="">{t('explorer.genre', { defaultValue: 'Tür' })}: {t('common.all', { defaultValue: 'Tümü' })}</option>
          {opts.genres.map(g => <option key={g} value={g}>{t(`source_types.${g}`, { defaultValue: g })}</option>)}
        </select>
        <select value={lang} aria-label={t('explorer.language', { defaultValue: 'Dil' })} onChange={e => set('lang', e.target.value)} style={selStyle}>
          <option value="">{t('explorer.language', { defaultValue: 'Dil' })}: {t('common.all', { defaultValue: 'Tümü' })}</option>
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        {anyFilter && (
          <button onClick={clear} style={{ ...selStyle, cursor: 'pointer' }}>{t('common.clear', { defaultValue: 'Temizle' })}</button>
        )}
      </div>

      {/* Timeline */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('explorer.timeline', { defaultValue: 'Zaman çizelgesi' })}</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130, maxWidth: 640 }}>
          {timeline.arr.map(([y, n]) => (
            <div key={y} title={`${y}. yy — ${n}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <span style={{ fontSize: 10, color: '#8a8a8a', marginBottom: 3, fontVariantNumeric: 'tabular-nums' }}>{n || ''}</span>
              <div style={{ width: '100%', height: `${(n / timeline.max) * 100}%`, minHeight: n ? 2 : 0, background: '#8B4513', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              <span style={{ fontSize: 10, color: '#8a8a8a', marginTop: 4 }}>{y}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('explorer.map', { defaultValue: 'Harita' })}</h2>
        <p style={{ fontSize: 12.5, color: '#8a8a8a', margin: '0 0 10px' }}>
          {geocoded} {t('common.scholar_count')} {t('map.geocoded', { defaultValue: 'haritalandı' })}
        </p>
        <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(128,128,128,0.2)' }}>
          <MapContainer center={[30, 35]} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/">CARTO</a>'
            />
            {cityMarkers.map(m => (
              <CircleMarker
                key={m.city}
                center={[m.lat, m.lng] as [number, number]}
                radius={Math.min(26, 4 + Math.sqrt(m.count) * 3)}
                pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.55, weight: 1.5 }}
              >
                <Popup>
                  <strong>{m.city}</strong><br />{m.count} {t('common.scholar_count')}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* List */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('explorer.results', { defaultValue: 'Sonuçlar' })}</h2>
        {matched.length === 0 ? (
          <p style={{ color: '#8a8a8a' }}>{t('explorer.empty', { defaultValue: 'Bu ölçütlere uyan tarihçi yok.' })}</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '4px 16px' }}>
              {matched.slice(0, 120).map(a => (
                <span key={a.author_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, padding: '2px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />
                  <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                  <span style={{ color: '#aaa', fontSize: 12 }}>{a.yuzyil ? `${a.yuzyil}.` : ''}</span>
                </span>
              ))}
            </div>
            {matched.length > 120 && (
              <p style={{ color: '#8a8a8a', marginTop: 10, fontSize: 13 }}>+{matched.length - 120} {t('common.more', { defaultValue: 'daha' })}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
