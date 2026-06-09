import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useAuthors, useWorks, useHistoriography } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';

export default function Havzalar() {
  const { t } = useTranslation();
  const { authors, loading: aLoad } = useAuthors();
  const { works, loading: wLoad } = useWorks();
  const { histData, loading: hLoad } = useHistoriography();

  const counts = useMemo(() => {
    const sc: Record<string, number> = {};
    const wc: Record<string, number> = {};
    for (const a of authors) sc[a.havza] = (sc[a.havza] || 0) + 1;
    for (const w of works) wc[w.havza] = (wc[w.havza] || 0) + 1;
    return { sc, wc };
  }, [authors, works]);

  if (aLoad || wLoad || hLoad) return <div className="loading-screen">{t('common.loading')}</div>;
  const basins = histData?.basins || [];

  return (
    <div className="havzalar-page">
      <Seo title={t('havzalar.title')} description={t('havzalar.subtitle')} path="/havzalar" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('havzalar.title')}</h1>
        <p className="hero-subtitle">{t('havzalar.subtitle')}</p>
      </header>

      <div className="havzalar-grid">
        {basins.map(b => {
          const key = b.havza_key;
          const color = HAVZA_COLORS[key] || '#8B4513';
          return (
            <div key={b.id} className="havza-hub-card" style={{ borderTopColor: color }}>
              <h2 className="havza-hub-name" style={{ color }}>{t(`havza_names.${key}`)}</h2>
              <div className="havza-hub-stats">
                <span><strong>{counts.sc[key] || 0}</strong> {t('stats.scholars')}</span>
                <span><strong>{counts.wc[key] || 0}</strong> {t('stats.sources')}</span>
                <span><strong>{b.dynasties?.length || 0}</strong> {t('historiography.dynasties')}</span>
              </div>
              <div className="havza-hub-links">
                <Link to={`/historiography/${b.id}`} className="havza-hub-primary" style={{ background: color }}>
                  {t('historiography.detail')} →
                </Link>
                <Link to={`/scholars?havza=${key}`} className="havza-hub-link">{t('nav.scholars')}</Link>
                <Link to={`/sources?havza=${key}`} className="havza-hub-link">{t('nav.sources')}</Link>
                <Link to={`/hanedanlar#${key}`} className="havza-hub-link">{t('nav.hanedanlar')}</Link>
                {b.has_article && (
                  <Link to={`/makale/${key}`} className="havza-hub-link havza-hub-article">{t('article.read_full')}</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
