import { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuthors, useWorks, useRelations, usePeriods } from '../hooks/useData';
import { PERIOD_COLORS, getPeriodId, HAVZA_COLORS } from '../utils/colors';
import * as d3 from 'd3';

interface PeriodStats {
  scholars: number;
  sources: number;
  relations: number;
  cities: number;
}

export default function Periodization() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const { authors, loading: aLoad } = useAuthors();
  const { works, loading: wLoad } = useWorks();
  const { relations, loading: rLoad } = useRelations();
  const { periodsData, loading: pLoad } = usePeriods();

  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const location = useLocation();
  const periodRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Hash navigation: scroll to and expand target period
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['formation', 'development', 'contraction'].includes(hash)) {
      setExpandedPeriod(hash);
      // Wait for render then scroll
      setTimeout(() => {
        periodRefs.current[hash]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash]);

  // Compute live stats per period
  const periodStats = useMemo(() => {
    const stats: Record<string, PeriodStats> = {
      formation: { scholars: 0, sources: 0, relations: 0, cities: 0 },
      development: { scholars: 0, sources: 0, relations: 0, cities: 0 },
      contraction: { scholars: 0, sources: 0, relations: 0, cities: 0 },
    };
    const cities: Record<string, Set<string>> = {
      formation: new Set(), development: new Set(), contraction: new Set(),
    };
    const slugsByPeriod: Record<string, Set<string>> = {
      formation: new Set(), development: new Set(), contraction: new Set(),
    };

    for (const a of authors) {
      const pid = getPeriodId(a.yuzyil);
      if (pid && stats[pid]) {
        stats[pid].scholars++;
        if (a.sehir) cities[pid].add(a.sehir);
        if (a.dia_slug) slugsByPeriod[pid].add(a.dia_slug);
      }
    }
    for (const w of works) {
      const a = authors.find(au => au.author_id === w.author_id);
      if (a) {
        const pid = getPeriodId(a.yuzyil);
        if (pid && stats[pid]) stats[pid].sources++;
      }
    }
    for (const r of relations) {
      for (const pid of ['formation', 'development', 'contraction']) {
        if (slugsByPeriod[pid].has(r.source) || slugsByPeriod[pid].has(r.target)) {
          stats[pid].relations++;
          break;
        }
      }
    }
    for (const pid of Object.keys(cities)) {
      stats[pid].cities = cities[pid].size;
    }
    return stats;
  }, [authors, works, relations]);

  // Genre counts per period
  const genreCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {
      formation: {}, development: {}, contraction: {},
    };
    for (const w of works) {
      const a = authors.find(au => au.author_id === w.author_id);
      if (a) {
        const pid = getPeriodId(a.yuzyil);
        if (pid && counts[pid]) {
          counts[pid][w.eser_turu] = (counts[pid][w.eser_turu] || 0) + 1;
        }
      }
    }
    return counts;
  }, [works, authors]);

  // Key scholars for each period
  const periodKeyScholars = useMemo(() => {
    const result: Record<string, typeof authors> = {
      formation: [], development: [], contraction: [],
    };
    for (const pid of Object.keys(result)) {
      result[pid] = [...authors]
        .filter(a => getPeriodId(a.yuzyil) === pid)
        .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
        .slice(0, 5);
    }
    return result;
  }, [authors]);

  if (aLoad || wLoad || rLoad || pLoad) {
    return <div className="loading-screen">{t('common.loading')}</div>;
  }

  const periods = periodsData?.periods || [];

  return (
    <div className="periodization-page">
      {/* Hero */}
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('periodization.title')}</h1>
        <p className="hero-subtitle">{t('periodization.subtitle')}</p>
      </header>

      {/* D3 Timeline Band */}
      <section className="period-timeline-section">
        <TimelineBand authors={authors} periods={periods} lang={lang} />
      </section>

      {/* Period Cards */}
      <section className="period-cards">
        {periods.map(p => {
          const s = periodStats[p.id] || { scholars: 0, sources: 0, relations: 0, cities: 0 };
          const pLang = p[lang as 'tr' | 'en'];
          const isExpanded = expandedPeriod === p.id;
          const topGenres = Object.entries(genreCounts[p.id] || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

          return (
            <div key={p.id} id={p.id} ref={el => { periodRefs.current[p.id] = el; }} className="period-card" style={{ borderColor: p.color }}>
              <div className="period-card-header" style={{ background: `${p.color}10` }}>
                <div className="period-card-dot" style={{ background: p.color }} />
                <div>
                  <h2 className="period-card-name" style={{ color: p.color }}>{pLang.name}</h2>
                  <span className="period-card-subtitle">{pLang.subtitle}</span>
                </div>
              </div>

              {/* Live Stats Row */}
              <div className="period-stat-row">
                <Link to={`/scholars?century_min=${p.century_min}&century_max=${p.century_max}`} className="period-stat">
                  <span className="period-stat-val" style={{ color: p.color }}>{s.scholars}</span>
                  <span className="period-stat-label">{t('stats.scholars')}</span>
                </Link>
                <Link to={`/sources?century_min=${p.century_min}&century_max=${p.century_max}`} className="period-stat">
                  <span className="period-stat-val" style={{ color: p.color }}>{s.sources}</span>
                  <span className="period-stat-label">{t('stats.sources')}</span>
                </Link>
                <Link to={`/network?period=${p.id}`} className="period-stat">
                  <span className="period-stat-val" style={{ color: p.color }}>{s.relations}</span>
                  <span className="period-stat-label">{t('stats.relations')}</span>
                </Link>
                <Link to={`/map?century_min=${p.century_min}&century_max=${p.century_max}`} className="period-stat">
                  <span className="period-stat-val" style={{ color: p.color }}>{s.cities}</span>
                  <span className="period-stat-label">{t('map.cities')}</span>
                </Link>
              </div>

              {/* Summary */}
              <p className="period-summary">{pLang.summary}</p>

              {/* Genres */}
              <div className="period-genres">
                <span className="period-section-label">{t('periodization.genres')}:</span>
                <div className="period-genre-badges">
                  {topGenres.map(([type, count]) => (
                    <Link
                      key={type}
                      to={`/sources?type=${type}&century_min=${p.century_min}&century_max=${p.century_max}`}
                      className="period-genre-badge"
                    >
                      {t(`source_types.${type}`)} ({count})
                    </Link>
                  ))}
                </div>
              </div>

              {/* Key Scholars */}
              <div className="period-key-scholars">
                <span className="period-section-label">{t('periodization.key_scholars')}:</span>
                <div className="period-scholar-chips">
                  {periodKeyScholars[p.id]?.map(sc => (
                    <Link key={sc.author_id} to={`/scholars/${sc.author_id}`} className="scholar-chip-mini">
                      <span className="chip-dot" style={{ background: HAVZA_COLORS[sc.havza] }} />
                      <span>{sc.meshur_isim}</span>
                      {sc.vefat_yili_m && <span className="chip-year">ö. {sc.vefat_yili_m}</span>}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && pLang.detailed && (
                <div className="period-detail-text">
                  {pLang.detailed.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}

              {/* Action Row */}
              <div className="period-action-row">
                <Link to={`/makale/${p.id}`} className="period-article-cta" style={{ background: p.color }}>
                  {t('article.read_full')} →
                </Link>
                {pLang.detailed && (
                  <button
                    className="period-action-btn"
                    onClick={() => setExpandedPeriod(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? t('periodization.less') : t('periodization.more')}
                  </button>
                )}
                <Link to={`/map?century_min=${p.century_min}&century_max=${p.century_max}`} className="period-action-link">
                  {t('periodization.show_map')} →
                </Link>
                <Link to={`/network?period=${p.id}`} className="period-action-link">
                  {t('periodization.show_network')} →
                </Link>
                <Link to={`/timeline?from=${(p.century_min - 1) * 100}&to=${p.century_max * 100}`} className="period-action-link">
                  {t('periodization.show_timeline')} →
                </Link>
              </div>

              {/* Schools (formation only) */}
              {p.schools.length > 0 && (
                <div className="period-schools">
                  <h3 className="period-section-title">{t('periodization.schools')}</h3>
                  <div className="period-school-cards">
                    {p.schools.map(school => {
                      const sl = school[lang as 'tr' | 'en'];
                      const schoolScholars = authors.filter(a =>
                        school.key_scholars_ids.includes(a.author_id)
                      );
                      return (
                        <div key={school.id} className="school-card">
                          <h4 className="school-name">{sl.name}</h4>
                          <p className="school-desc">{sl.desc}</p>
                          {schoolScholars.length > 0 && (
                            <div className="school-scholars">
                              {schoolScholars.map(sc => (
                                <Link key={sc.author_id} to={`/scholars/${sc.author_id}`} className="scholar-chip-mini">
                                  <span>{sc.meshur_isim}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Genre Overview */}
      {periodsData?.genre_details && (
        <section className="period-genre-overview">
          <h2 className="section-title">{t('periodization.genre_overview')}</h2>
          <div className="genre-detail-cards">
            {periodsData.genre_details.map(g => {
              const gl = g[lang as 'tr' | 'en'];
              const total = works.filter(w => w.eser_turu === g.id).length;
              return (
                <Link key={g.id} to={`/sources?type=${g.id}`} className="genre-detail-card">
                  <div className="genre-card-count">{total}</div>
                  <h3 className="genre-card-name">{gl.name}</h3>
                  <p className="genre-card-desc">{gl.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* References */}
      {periodsData?.references && (
        <section className="period-references">
          <h2 className="section-title">{t('periodization.references')}</h2>
          <div className="ref-list">
            {periodsData.references.map((r, i) => (
              <div key={i} className="ref-item">
                <span>{r.citation}</span>
                {r.doi && (
                  <a href={r.doi} target="_blank" rel="noreferrer" className="ref-doi">{r.doi}</a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* D3 Timeline Band Component */
function TimelineBand({ authors, periods, lang }: {
  authors: { vefat_yili_m: number | null; havza: string }[];
  periods: { id: string; century_min: number; century_max: number; color: string;
    tr: { name: string }; en: { name: string } }[];
  lang: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !periods.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 120;
    const margin = { top: 10, right: 20, bottom: 30, left: 20 };
    const iw = width - margin.left - margin.right;
    const ih = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([600, 2050]).range([0, iw]);

    // Period bands
    for (const p of periods) {
      const x0 = x((p.century_min - 1) * 100);
      const x1 = x(p.century_max * 100);
      g.append('rect')
        .attr('x', x0).attr('y', 0)
        .attr('width', x1 - x0).attr('height', ih)
        .attr('fill', p.color).attr('opacity', 0.12)
        .attr('rx', 4);

      g.append('text')
        .attr('x', (x0 + x1) / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', p.color)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(p[lang as 'tr' | 'en'].name);
    }

    // Histogram of death years
    const validAuthors = authors.filter(a => a.vefat_yili_m && a.vefat_yili_m >= 600 && a.vefat_yili_m <= 2050);
    const bins = d3.bin<typeof validAuthors[0], number>()
      .value(a => a.vefat_yili_m!)
      .domain([600, 2050])
      .thresholds(d3.range(600, 2050, 25))(validAuthors);

    const maxCount = d3.max(bins, b => b.length) || 1;
    const yScale = d3.scaleLinear().domain([0, maxCount]).range([ih, 24]);

    g.selectAll('.hist-bar')
      .data(bins)
      .join('rect')
      .attr('class', 'hist-bar')
      .attr('x', d => x(d.x0!))
      .attr('y', d => yScale(d.length))
      .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr('height', d => ih - yScale(d.length))
      .attr('fill', 'var(--text-secondary)')
      .attr('opacity', 0.3)
      .attr('rx', 1);

    // X axis
    const xAxis = d3.axisBottom(x)
      .tickValues(d3.range(700, 2100, 200))
      .tickFormat(d => `${d}`);
    g.append('g')
      .attr('transform', `translate(0,${ih})`)
      .call(xAxis)
      .attr('color', 'var(--text-secondary)')
      .selectAll('text')
      .attr('font-size', '10px');

  }, [authors, periods, lang]);

  return (
    <svg ref={svgRef} className="period-timeline-svg" />
  );
}
