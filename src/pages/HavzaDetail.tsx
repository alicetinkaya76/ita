import { useMemo, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthors, useWorks, useRelations, useCityCoords, useHavzaGeo, usePeriods } from '../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS, HAVZA_ORDER, PERIOD_COLORS, getPeriodId } from '../utils/colors';

const MiniCityMap = lazy(() => import('../components/MiniCityMap'));
const HavzaMiniNetwork = lazy(() => import('../components/HavzaMiniNetwork'));
const MiniTimeline = lazy(() => import('../components/MiniTimeline'));

export default function HavzaDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const { authors, loading: aLoading } = useAuthors();
  const { works, loading: wLoading } = useWorks();
  const { relations, loading: rLoading } = useRelations();
  const { coords, loading: cLoading } = useCityCoords();
  const { geo, loading: gLoading } = useHavzaGeo();
  const { periodsData, loading: pLoading } = usePeriods();

  const havzaAuthors = useMemo(() => authors.filter(a => a.havza === id), [authors, id]);
  const havzaWorks = useMemo(() => works.filter(w => w.havza === id), [works, id]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const w of havzaWorks) {
      m[w.eser_turu] = (m[w.eser_turu] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [havzaWorks]);

  const cityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of havzaAuthors) {
      const c = (a.sehir || '').trim();
      if (c) m[c] = (m[c] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [havzaAuthors]);

  const topScholars = useMemo(() => {
    return [...havzaAuthors]
      .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
      .slice(0, 12);
  }, [havzaAuthors]);

  const havzaRelations = useMemo(() => {
    const slugs = new Set(havzaAuthors.filter(a => a.dia_slug).map(a => a.dia_slug));
    return relations.filter(r => slugs.has(r.source) || slugs.has(r.target));
  }, [havzaAuthors, relations]);

  // Period breakdown
  const periodCounts = useMemo(() => {
    const counts: Record<string, number> = { formation: 0, development: 0, contraction: 0 };
    for (const a of havzaAuthors) {
      const pid = getPeriodId(a.yuzyil);
      if (pid && counts[pid] !== undefined) counts[pid]++;
    }
    return counts;
  }, [havzaAuthors]);

  // Schools relevant to this havza
  const havzaSchools = useMemo(() => {
    if (!periodsData) return [];
    const schools: { name: string; desc: string; periodId: string }[] = [];
    for (const period of periodsData.periods) {
      for (const school of period.schools) {
        const schoolAuthorIds = new Set(school.key_scholars_ids);
        const hasHavzaScholar = havzaAuthors.some(a => schoolAuthorIds.has(a.author_id));
        if (hasHavzaScholar) {
          schools.push({
            name: lang === 'en' ? school.en.name : school.tr.name,
            desc: lang === 'en' ? school.en.desc : school.tr.desc,
            periodId: period.id,
          });
        }
      }
    }
    return schools;
  }, [periodsData, havzaAuthors, lang]);

  const color = HAVZA_COLORS[id || ''] || '#666';

  if (aLoading || wLoading || rLoading || cLoading || gLoading || pLoading) return <div className="loading-screen">{t('common.loading')}</div>;
  if (!id || !HAVZA_ORDER.includes(id)) return <div className="loading-screen">{t('scholar_detail.no_data')}</div>;

  return (
    <div className="detail-page havza-detail">
      <Link to="/map" className="back-link">← {t('nav.map')}</Link>

      <header className="detail-header">
        <span className="detail-havza-badge" style={{ background: color }}>
          {t(`havza_names.${id}`)}
        </span>
        <h1 className="detail-name">{t(`havza_names.${id}`)}</h1>
      </header>

      {/* Stats Row */}
      <div className="havza-stats-row">
        <div className="havza-stat">
          <div className="havza-stat-value" style={{ color }}>{havzaAuthors.length}</div>
          <div className="havza-stat-label">{t('stats.scholars')}</div>
        </div>
        <div className="havza-stat">
          <div className="havza-stat-value" style={{ color }}>{havzaWorks.length}</div>
          <div className="havza-stat-label">{t('stats.sources')}</div>
        </div>
        <div className="havza-stat">
          <div className="havza-stat-value" style={{ color }}>{havzaRelations.length}</div>
          <div className="havza-stat-label">{t('stats.relations')}</div>
        </div>
        <div className="havza-stat">
          <div className="havza-stat-value" style={{ color }}>{cityCounts.length}</div>
          <div className="havza-stat-label">{t('map.cities')}</div>
        </div>
      </div>

      {/* Period Flow Summary */}
      <div className="havza-period-summary">
        {(['formation', 'development', 'contraction'] as const).map((pid, idx) => (
          <Link key={pid} to={`/periodization#${pid}`} className="havza-period-pill" style={{ borderColor: PERIOD_COLORS[pid] }}>
            <span className="period-pill-dot" style={{ background: PERIOD_COLORS[pid] }} />
            <span className="period-pill-name">{t(`periods.${pid}`)}</span>
            <span className="period-pill-count" style={{ color: PERIOD_COLORS[pid] }}>{periodCounts[pid]}</span>
            {idx < 2 && <span className="period-pill-arrow">→</span>}
          </Link>
        ))}
      </div>

      {/* Mini City Map */}
      <Suspense fallback={null}>
        <MiniCityMap
          havzaKey={id}
          authors={havzaAuthors}
          coords={coords}
          geo={geo}
          maxCities={15}
          height={280}
        />
      </Suspense>

      {/* Mini Timeline */}
      <Suspense fallback={null}>
        <MiniTimeline authors={havzaAuthors} color={color} />
      </Suspense>

      <div className="havza-detail-grid">
        {/* Type Distribution */}
        <section className="dash-card">
          <h2 className="card-title">{t('dashboard.type_overview')}</h2>
          <div className="havza-type-bars">
            {typeCounts.map(([type, count]) => (
              <div key={type} className="havza-bar">
                <div className="havza-bar-label">
                  <span className="havza-dot" style={{ background: TYPE_COLORS[type] || '#999' }} />
                  <span>{t(`source_types.${type}`)}</span>
                </div>
                <div className="havza-bar-track">
                  <div
                    className="havza-bar-fill"
                    style={{ width: `${(count / typeCounts[0][1]) * 100}%`, background: TYPE_COLORS[type] || '#999' }}
                  />
                </div>
                <span className="havza-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Cities */}
        <section className="dash-card">
          <h2 className="card-title">{t('map.top_cities')}</h2>
          <div className="havza-type-bars">
            {cityCounts.map(([city, count]) => (
              <div key={city} className="havza-bar">
                <div className="havza-bar-label">
                  <span className="havza-dot" style={{ background: color }} />
                  <span>{city}</span>
                </div>
                <div className="havza-bar-track">
                  <div
                    className="havza-bar-fill"
                    style={{ width: `${(count / cityCounts[0][1]) * 100}%`, background: color }}
                  />
                </div>
                <span className="havza-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Schools */}
        {havzaSchools.length > 0 && (
          <section className="dash-card">
            <h2 className="card-title">{t('periodization.schools')}</h2>
            <div className="havza-schools-list">
              {havzaSchools.map((sc, i) => (
                <div key={i} className="havza-school-item" style={{ borderLeftColor: PERIOD_COLORS[sc.periodId] }}>
                  <div className="havza-school-name">{sc.name}</div>
                  <div className="havza-school-desc">{sc.desc}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Scholars */}
        <section className="dash-card">
          <h2 className="card-title">{t('dashboard.recent_scholars')}</h2>
          <div className="featured-grid">
            {topScholars.map(s => (
              <Link key={s.author_id} to={`/scholars/${s.author_id}`} className="scholar-chip">
                <span className="chip-dot" style={{ background: color }} />
                <div className="chip-info">
                  <span className="chip-name">{s.meshur_isim}</span>
                  <span className="chip-meta">
                    {s.vefat_yili_m ? `ö. ${s.vefat_yili_m}` : ''} · {s.eser_sayisi} {t('common.work_count')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link to={`/scholars?havza=${id}`} className="show-all-link">
            {t('common.show_all')} {t('nav.scholars')} →
          </Link>
        </section>
      </div>

      {/* Havza Mini Network */}
      <Suspense fallback={null}>
        <HavzaMiniNetwork
          havzaKey={id}
          authors={authors}
          relations={relations}
          maxNodes={25}
        />
      </Suspense>

      {/* Historiography Link */}
      <div className="hist-link-card">
        <Link to={`/historiography/${id}`} className="hist-link-btn" style={{ background: color }}>
          {t('historiography.basin_writing')} →
        </Link>
      </div>
    </div>
  );
}
