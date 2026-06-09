import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useAuthors, useWorks, useStats } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER } from '../utils/colors';

export default function Veritabani() {
  const { t } = useTranslation();
  const { authors, loading: aLoad } = useAuthors();
  const { works, loading: wLoad } = useWorks();
  const { stats } = useStats();

  const counts = useMemo(() => {
    const sc: Record<string, number> = {};
    const wc: Record<string, number> = {};
    for (const a of authors) sc[a.havza] = (sc[a.havza] || 0) + 1;
    for (const w of works) wc[w.havza] = (wc[w.havza] || 0) + 1;
    return { sc, wc };
  }, [authors, works]);

  if (aLoad || wLoad) return <div className="loading-screen">{t('common.loading')}</div>;

  // basins present in the data, in canonical order
  const present = HAVZA_ORDER.filter(h => counts.sc[h] || counts.wc[h]);

  return (
    <div className="veritabani-page">
      <Seo title={t('veritabani.title')} description={t('veritabani.subtitle')} path="/veritabani" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('veritabani.title')}</h1>
        <p className="hero-subtitle">{t('veritabani.subtitle')}</p>
      </header>

      {/* whole-database shortcuts */}
      <div className="vt-global">
        <Link to="/scholars" className="vt-global-btn">
          <span className="vt-global-num">{stats?.total_scholars?.toLocaleString() || authors.length}</span>
          <span className="vt-global-label">{t('veritabani.all_scholars')} →</span>
        </Link>
        <Link to="/sources" className="vt-global-btn">
          <span className="vt-global-num">{stats?.total_works?.toLocaleString() || works.length}</span>
          <span className="vt-global-label">{t('veritabani.all_sources')} →</span>
        </Link>
      </div>

      <h2 className="vt-section-title">{t('veritabani.by_basin')}</h2>
      <div className="vt-grid">
        {present.map(key => {
          const color = HAVZA_COLORS[key] || '#8B4513';
          return (
            <div key={key} className="vt-card" style={{ borderLeftColor: color }}>
              <h3 className="vt-card-name" style={{ color }}>{t(`havza_names.${key}`)}</h3>
              <div className="vt-card-counts">
                <span>{counts.sc[key] || 0} {t('stats.scholars')}</span>
                <span className="vt-dot">·</span>
                <span>{counts.wc[key] || 0} {t('stats.sources')}</span>
              </div>
              <div className="vt-card-links">
                <Link to={`/scholars?havza=${key}`} className="vt-link" style={{ borderColor: color }}>
                  {t('nav.scholars')} →
                </Link>
                <Link to={`/sources?havza=${key}`} className="vt-link" style={{ borderColor: color }}>
                  {t('nav.sources')} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
