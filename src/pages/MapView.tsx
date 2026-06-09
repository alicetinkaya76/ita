import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthors, useCityCoords, useHavzaGeo, type Author, type CityCoords } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_COLORS_LIGHT, HAVZA_ORDER, PERIOD_COLORS, PERIOD_RANGES } from '../utils/colors';

const MAP_CENTER: LatLngExpression = [30, 45];
const MAP_ZOOM = 4;

const PERIOD_KEYS = ['formation', 'development', 'contraction'] as const;
type PeriodKey = typeof PERIOD_KEYS[number];

interface CityCluster {
  city: string;
  havza: string;
  lat: number;
  lng: number;
  authors: Author[];
  workCount: number;
}

function HavzaLegend({ counts, onHavzaClick, activeHavza }: {
  counts: Record<string, number>;
  onHavzaClick: (h: string) => void;
  activeHavza: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="map-legend">
      <h4 className="map-legend-title">{t('stats.havzas')}</h4>
      {HAVZA_ORDER.map(h => (
        <button
          key={h}
          className={`map-legend-item ${activeHavza === h ? 'map-legend-active' : ''}`}
          onClick={() => onHavzaClick(activeHavza === h ? '' : h)}
        >
          <span className="map-legend-dot" style={{ background: HAVZA_COLORS[h] }} />
          <span className="map-legend-name">{t(`havza_names.${h}`)}</span>
          <span className="map-legend-count">{counts[h] || 0}</span>
        </button>
      ))}
    </div>
  );
}

function buildClusters(authors: Author[], coords: CityCoords, havzaFilter: string): CityCluster[] {
  const filtered = havzaFilter ? authors.filter(a => a.havza === havzaFilter) : authors;
  const map = new Map<string, { authors: Author[]; workCount: number }>();

  for (const a of filtered) {
    const city = (a.sehir || '').trim();
    if (!city || !coords[city]) continue;
    const key = `${city}|${a.havza}`;
    if (!map.has(key)) map.set(key, { authors: [], workCount: 0 });
    const c = map.get(key)!;
    c.authors.push(a);
    c.workCount += a.eser_sayisi;
  }

  return Array.from(map.entries()).map(([key, { authors, workCount }]) => {
    const [city, havza] = key.split('|');
    const [lat, lng] = coords[city];
    return { city, havza, lat, lng, authors, workCount };
  });
}

export default function MapView() {
  const { t } = useTranslation();
  const { authors, loading: aLoading } = useAuthors();
  const { coords, loading: cLoading } = useCityCoords();
  const { geo, loading: gLoading } = useHavzaGeo();
  const [activeHavza, setActiveHavza] = useState('');
  const [activePeriod, setActivePeriod] = useState<PeriodKey | ''>('');
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null);

  // Period-filtered authors
  const filteredAuthors = useMemo(() => {
    if (!activePeriod) return authors;
    const [cMin, cMax] = PERIOD_RANGES[activePeriod];
    return authors.filter(a => {
      const c = a.yuzyil ?? (a.vefat_yili_m ? Math.ceil(a.vefat_yili_m / 100) : null);
      return c !== null && c >= cMin && c <= cMax;
    });
  }, [authors, activePeriod]);

  const havzaCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of filteredAuthors) m[a.havza] = (m[a.havza] || 0) + 1;
    return m;
  }, [filteredAuthors]);

  const clusters = useMemo(
    () => buildClusters(filteredAuthors, coords, activeHavza),
    [filteredAuthors, coords, activeHavza]
  );

  const geocodedCount = useMemo(() => {
    return clusters.reduce((s, c) => s + c.authors.length, 0);
  }, [clusters]);

  const loading = aLoading || cLoading || gLoading;
  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="map-page">
      <header className="list-header">
        <h1>{t('nav.map')}</h1>
        <span className="list-count">
          {geocodedCount} / {filteredAuthors.length} {t('common.scholar_count')} {t('map.geocoded')}
        </span>
      </header>

      {/* Period filter pills */}
      <div className="period-filter-bar">
        <button
          className={`period-pill ${activePeriod === '' ? 'period-pill-active' : ''}`}
          onClick={() => setActivePeriod('')}
        >
          {t('common.all')}
        </button>
        {PERIOD_KEYS.map(pk => (
          <button
            key={pk}
            className={`period-pill ${activePeriod === pk ? 'period-pill-active' : ''}`}
            style={{
              borderColor: PERIOD_COLORS[pk],
              ...(activePeriod === pk ? { background: PERIOD_COLORS[pk], color: '#fff' } : { color: PERIOD_COLORS[pk] }),
            }}
            onClick={() => setActivePeriod(prev => prev === pk ? '' : pk)}
          >
            {t(`periods.${pk}`)}
          </button>
        ))}
      </div>

      <div className="map-layout">
        <HavzaLegend
          counts={havzaCounts}
          onHavzaClick={setActiveHavza}
          activeHavza={activeHavza}
        />

        <div className="map-container-wrap">
          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            scrollWheelZoom={true}
            className="itta-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* Havza GeoJSON boundaries */}
            {geo && (
              <GeoJSON
                data={geo as any}
                style={(feature) => {
                  const id = feature?.properties?.id || '';
                  const isActive = !activeHavza || activeHavza === id;
                  return {
                    color: HAVZA_COLORS[id] || '#999',
                    weight: isActive ? 2 : 1,
                    opacity: isActive ? 0.7 : 0.2,
                    fillColor: HAVZA_COLORS_LIGHT[id] || '#eee',
                    fillOpacity: isActive ? 0.15 : 0.03,
                    dashArray: '4 4',
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on('click', () => {
                    const id = feature.properties?.id;
                    if (id) setActiveHavza(prev => prev === id ? '' : id);
                  });
                }}
              />
            )}

            {/* City markers */}
            {clusters.map((c) => {
              const radius = Math.min(4 + Math.sqrt(c.authors.length) * 3, 20);
              return (
                <CircleMarker
                  key={`${c.city}-${c.havza}`}
                  center={[c.lat, c.lng]}
                  radius={radius}
                  pathOptions={{
                    color: HAVZA_COLORS[c.havza],
                    fillColor: HAVZA_COLORS[c.havza],
                    fillOpacity: 0.6,
                    weight: 1.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedCluster(c),
                  }}
                >
                  <Popup maxWidth={320} className="itta-popup">
                    <div className="popup-header">
                      <span className="popup-city">{c.city}</span>
                      <span className="popup-havza" style={{ color: HAVZA_COLORS[c.havza] }}>
                        {t(`havza_names.${c.havza}`)}
                      </span>
                    </div>
                    <div className="popup-stats">
                      {c.authors.length} {t('common.scholar_count')} · {c.workCount} {t('common.work_count')}
                    </div>
                    <div className="popup-scholars">
                      {c.authors.slice(0, 6).map(a => (
                        <Link key={a.author_id} to={`/scholars/${a.author_id}`} className="popup-scholar-link">
                          {a.meshur_isim}
                          {a.vefat_yili_m ? <span className="popup-death"> (ö. {a.vefat_yili_m})</span> : ''}
                        </Link>
                      ))}
                      {c.authors.length > 6 && (
                        <span className="popup-more">+{c.authors.length - 6} {t('common.more')}</span>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Sidebar detail when cluster selected */}
      {selectedCluster && (
        <div className="map-sidebar">
          <div className="map-sidebar-header">
            <h3>{selectedCluster.city}</h3>
            <button className="map-sidebar-close" onClick={() => setSelectedCluster(null)}>×</button>
          </div>
          <p className="map-sidebar-meta">
            {t(`havza_names.${selectedCluster.havza}`)} · {selectedCluster.authors.length} {t('common.scholar_count')}
          </p>
          <div className="map-sidebar-list">
            {selectedCluster.authors.map(a => (
              <Link key={a.author_id} to={`/scholars/${a.author_id}`} className="map-sidebar-item">
                <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[a.havza] }} />
                <div>
                  <div className="map-sidebar-name">{a.meshur_isim}</div>
                  <div className="map-sidebar-sub">
                    {a.vefat_yili_m ? `ö. ${a.vefat_yili_m}` : ''} · {a.eser_sayisi} {t('common.work_count')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
