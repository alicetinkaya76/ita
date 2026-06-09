import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import type { Author, CityCoords, HavzaGeoCollection } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';

interface Props {
  havzaKey: string;
  authors: Author[];
  coords: CityCoords;
  /** If provided, draw the havza boundary polygon */
  geo?: HavzaGeoCollection | null;
  /** Max cities to show */
  maxCities?: number;
  /** Height of the map */
  height?: number;
}

export default function MiniCityMap({
  havzaKey,
  authors,
  coords,
  geo,
  maxCities = 15,
  height = 280,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    // Count scholars per city
    const cityCounts: Record<string, number> = {};
    for (const a of authors) {
      const c = (a.sehir || '').trim();
      if (c) cityCounts[c] = (cityCounts[c] || 0) + 1;
    }

    // Get top cities with coords
    const topCities = Object.entries(cityCounts)
      .filter(([city]) => coords[city])
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxCities);

    if (topCities.length === 0) return;

    const color = HAVZA_COLORS[havzaKey] || '#666';

    // Calculate bounds
    const lats = topCities.map(([c]) => coords[c][0]);
    const lngs = topCities.map(([c]) => coords[c][1]);
    const bounds = L.latLngBounds(
      [Math.min(...lats) - 3, Math.min(...lngs) - 5],
      [Math.max(...lats) + 3, Math.max(...lngs) + 5]
    );

    const map = L.map(mapRef.current, {
      center: bounds.getCenter(),
      zoom: 4,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
    }).addTo(map);

    map.fitBounds(bounds, { padding: [20, 20] });

    // Draw havza boundary if geo provided
    if (geo) {
      const feature = geo.features.find(f => f.properties.id === havzaKey);
      if (feature) {
        const latlngs = feature.geometry.coordinates[0].map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );
        L.polygon(latlngs, {
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.06,
          dashArray: '4,4',
        }).addTo(map);
      }
    }

    // Draw city bubbles
    const maxCount = topCities[0]?.[1] || 1;
    for (const [city, count] of topCities) {
      const [lat, lng] = coords[city];
      const radius = Math.max(5, Math.sqrt(count / maxCount) * 18);

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.55,
        color,
        weight: 1.5,
        opacity: 0.8,
      }).addTo(map);

      circle.bindTooltip(
        `<strong>${city}</strong><br/>${count} ${t('common.scholar_count')}`,
        { direction: 'top', className: 'mini-city-tooltip' }
      );
    }

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, [havzaKey, authors, coords, geo, maxCities, t, navigate]);

  return (
    <div className="mini-city-map">
      <h3>{t('map.top_cities')}</h3>
      <div
        ref={mapRef}
        style={{ width: '100%', height: `${height}px`, borderRadius: '10px' }}
      />
    </div>
  );
}
