import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useWorks, useHistoriography } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';

const PERIOD_DOT: Record<string, string> = {
  formation: '#1565C0', development: '#2E7D32', contraction: '#E65100',
};

export default function Hanedanlar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const { works, loading: wLoad } = useWorks();
  const { histData, loading: hLoad } = useHistoriography();

  // count works per (havza, hanedan) for exact-match badges
  const hanedanCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const w of works) {
      const h = (w.hanedan || '').trim();
      if (!h) continue;
      (m[w.havza] ||= {})[h] = (m[w.havza]?.[h] || 0) + 1;
    }
    return m;
  }, [works]);

  if (wLoad || hLoad) return <div className="loading-screen">{t('common.loading')}</div>;
  const basins = histData?.basins || [];

  return (
    <div className="hanedanlar-page">
      <Seo title={t('hanedanlar.title')} description={t('hanedanlar.subtitle')} path="/hanedanlar" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('hanedanlar.title')}</h1>
        <p className="hero-subtitle">{t('hanedanlar.subtitle')}</p>
      </header>

      <div className="hanedanlar-content">
        {basins.map(b => {
          const key = b.havza_key;
          const color = HAVZA_COLORS[key] || '#8B4513';
          const counts = hanedanCounts[key] || {};
          return (
            <section key={b.id} id={key} className="dyn-basin" style={{ borderColor: color }}>
              <div className="dyn-basin-header" style={{ background: `${color}12` }}>
                <span className="dyn-basin-dot" style={{ background: color }} />
                <h2 className="dyn-basin-name" style={{ color }}>{t(`havza_names.${key}`)}</h2>
                <Link to={`/historiography/${b.id}`} className="dyn-basin-detail">{t('historiography.detail')} →</Link>
              </div>
              <div className="dyn-list">
                {(b.dynasties || []).map((d, i) => {
                  const name = lang === 'en' && d.name_en ? d.name_en : d.name_tr;
                  const c = counts[d.name_tr] || 0;
                  const dot = PERIOD_DOT[d.period] || '#888';
                  const inner = (
                    <>
                      <span className="dyn-period-dot" style={{ background: dot }} title={t(`periods.${d.period}`)} />
                      <span className="dyn-name">{name}</span>
                      {d.years && <span className="dyn-years">{d.years}</span>}
                      {c > 0 && <span className="dyn-count" style={{ background: color }}>{c}</span>}
                    </>
                  );
                  return c > 0 ? (
                    <Link key={i} to={`/sources?havza=${key}&hanedan=${encodeURIComponent(d.name_tr)}`} className="dyn-chip dyn-chip-active" style={{ borderColor: color }}>
                      {inner}
                    </Link>
                  ) : (
                    <span key={i} className="dyn-chip dyn-chip-static">{inner}</span>
                  );
                })}
              </div>
            </section>
          );
        })}
        <div className="dyn-legend">
          <span><span className="dyn-period-dot" style={{ background: PERIOD_DOT.formation }} /> {t('periods.formation')}</span>
          <span><span className="dyn-period-dot" style={{ background: PERIOD_DOT.development }} /> {t('periods.development')}</span>
          <span><span className="dyn-period-dot" style={{ background: PERIOD_DOT.contraction }} /> {t('periods.contraction')}</span>
        </div>
      </div>
    </div>
  );
}
