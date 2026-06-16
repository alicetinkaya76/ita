import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthors, useCityCoords } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import Seo from '../components/Seo';

export default function City() {
  const { name } = useParams<{ name: string }>();
  const city = name ? decodeURIComponent(name) : '';
  const { t } = useTranslation();
  const { authors, loading: aL } = useAuthors();
  const { coords, loading: cL } = useCityCoords();

  const scholars = useMemo(
    () => authors.filter(a => (a.sehir || '').trim() === city),
    [authors, city]
  );

  const byCentury = useMemo(() => {
    const m: Record<number, Author[]> = {};
    const noCentury: Author[] = [];
    for (const a of scholars) {
      if (a.yuzyil != null) (m[a.yuzyil] = m[a.yuzyil] || []).push(a);
      else noCentury.push(a);
    }
    const rows = Object.keys(m).map(Number).sort((a, b) => a - b)
      .map(c => ({ century: c, list: m[c].sort((x, y) => (y.importance_score || 0) - (x.importance_score || 0)) }));
    return { rows, noCentury };
  }, [scholars]);

  const havzaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of scholars) c[a.havza] = (c[a.havza] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [scholars]);

  if (aL || cL) return <div className="loading-screen">{t('common.loading')}</div>;

  const pos = coords[city];

  const q = encodeURIComponent(city);
  const extLinks: { label: string; url: string }[] = [
    { label: 'Vikipedi', url: `https://tr.wikipedia.org/w/index.php?search=${q}` },
    { label: 'Wikidata', url: `https://www.wikidata.org/w/index.php?search=${q}` },
    { label: 'GeoNames', url: `https://www.geonames.org/search.html?q=${q}` },
    { label: 'Pleiades', url: `https://pleiades.stoa.org/search?SearchableText=${q}` },
    { label: 'al-Ṯurayyā (İslam coğrafya sözlüğü)', url: 'https://althurayya.github.io/' },
  ];

  return (
    <div className="detail-page">
      <Seo
        title={city}
        description={`${city} — ${scholars.length} ${t('kunye.scholar', { defaultValue: 'tarihçi' })}.`}
        path={`/sehir/${q}`}
      />
      <Link to="/map" className="back-link">← {t('nav.map', { defaultValue: 'Harita' })}</Link>

      <header className="detail-header">
        <h1 className="detail-name">{city}</h1>
        <p className="detail-full-name">
          {scholars.length} {t('common.scholar_count')}
          {havzaCounts.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              {havzaCounts.map(([h]) => (
                <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 10, fontSize: 13.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: HAVZA_COLORS[h] || '#999' }} />
                  {t(`havza_names.${h}`, { defaultValue: h })}
                </span>
              ))}
            </span>
          )}
        </p>
      </header>

      {pos && (
        <section className="stat-section">
          <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(128,128,128,0.2)' }}>
            <MapContainer center={[pos[0], pos[1]]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/">CARTO</a>'
              />
              <CircleMarker
                center={[pos[0], pos[1]] as [number, number]}
                radius={Math.min(28, 6 + Math.sqrt(scholars.length) * 3)}
                pathOptions={{ color: HAVZA_COLORS[havzaCounts[0]?.[0] || ''] || '#8B4513', fillColor: HAVZA_COLORS[havzaCounts[0]?.[0] || ''] || '#8B4513', fillOpacity: 0.55, weight: 1.5 }}
              >
                <Popup><strong>{city}</strong><br />{scholars.length} {t('common.scholar_count')}</Popup>
              </CircleMarker>
            </MapContainer>
          </div>
        </section>
      )}

      <section className="stat-section">
        <h2 className="stat-section-title">{t('city.scholars_by_century', { defaultValue: 'Yüzyıla göre tarihçiler' })}</h2>
        {scholars.length === 0 ? (
          <p style={{ color: '#8a8a8a' }}>{t('city.empty', { defaultValue: 'Bu şehirle ilişkili tarihçi bulunamadı.' })}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byCentury.rows.map(({ century, list }) => (
              <div key={century}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8a8a8a', marginBottom: 6 }}>{century}. {t('dashboard.century_suffix', { defaultValue: 'yy' })} <span style={{ fontWeight: 400 }}>· {list.length}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
                  {list.map(a => (
                    <span key={a.author_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />
                      <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {byCentury.noCentury.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8a8a8a', marginBottom: 6 }}>{t('common.unknown', { defaultValue: 'Bilinmeyen' })} <span style={{ fontWeight: 400 }}>· {byCentury.noCentury.length}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
                  {byCentury.noCentury.map(a => (
                    <span key={a.author_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />
                      <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('city.external', { defaultValue: 'Dış kaynaklar' })}</h2>
        <p style={{ fontSize: 13, color: '#8a8a8a', margin: '0 0 12px', maxWidth: 560, lineHeight: 1.5 }}>
          {t('city.external_note', { defaultValue: 'Bu yer adıyla harici coğrafya sözlüklerinde ve otorite kayıtlarında arama yapın.' })}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {extLinks.map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '7px 13px', border: '1px solid rgba(128,128,128,0.35)', borderRadius: 8, fontSize: 13.5, textDecoration: 'none', color: 'inherit' }}>
              {l.label} <span style={{ opacity: 0.6 }}>↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
