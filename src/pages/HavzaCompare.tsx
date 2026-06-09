import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import * as d3 from 'd3';
import { useAuthors, useWorks, useRelations } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, TYPE_COLORS, PERIOD_COLORS, PERIOD_RANGES, getPeriodId } from '../utils/colors';

interface HavzaStats {
  key: string;
  scholars: number;
  works: number;
  diaMatch: number;
  centuryDist: Record<number, number>;
  typeDist: Record<string, number>;
  cities: [string, number][];
  avgCentury: number;
  teachers: number;
  students: number;
}

function computeStats(
  havza: string,
  authors: { havza: string; yuzyil: number | null; dia_slug: string; sehir: string }[],
  works: { havza: string; eser_turu: string }[],
  relations: { source: string; target: string; type: string }[],
  slugToHavza: Map<string, string>
): HavzaStats {
  const hAuthors = authors.filter(a => a.havza === havza);
  const hWorks = works.filter(w => w.havza === havza);
  const hSlugs = new Set(hAuthors.filter(a => a.dia_slug).map(a => a.dia_slug));

  const centuryDist: Record<number, number> = {};
  const typeDist: Record<string, number> = {};
  const cityMap: Record<string, number> = {};
  let centurySum = 0, centuryCount = 0;

  for (const a of hAuthors) {
    if (a.yuzyil) {
      centuryDist[a.yuzyil] = (centuryDist[a.yuzyil] || 0) + 1;
      centurySum += a.yuzyil;
      centuryCount++;
    }
    if (a.sehir) cityMap[a.sehir] = (cityMap[a.sehir] || 0) + 1;
  }
  for (const w of hWorks) {
    if (w.eser_turu) typeDist[w.eser_turu] = (typeDist[w.eser_turu] || 0) + 1;
  }

  let teachers = 0, students = 0;
  for (const r of relations) {
    if (r.type !== 'TEACHER_OF') continue;
    if (hSlugs.has(r.source)) teachers++;
    if (hSlugs.has(r.target)) students++;
  }

  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][];

  return {
    key: havza,
    scholars: hAuthors.length,
    works: hWorks.length,
    diaMatch: hAuthors.filter(a => a.dia_slug).length,
    centuryDist,
    typeDist,
    cities,
    avgCentury: centuryCount ? Math.round(centurySum / centuryCount * 10) / 10 : 0,
    teachers,
    students,
  };
}

/* ── Mirror Bar Chart Component ── */
function MirrorBarChart({
  left,
  right,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
}: {
  left: [string, number][];
  right: [string, number][];
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    // Merge labels
    const labelsSet = new Set([...left.map(d => d[0]), ...right.map(d => d[0])]);
    const labels = Array.from(labelsSet).sort();
    const leftMap = new Map(left);
    const rightMap = new Map(right);

    const margin = { top: 28, right: 10, bottom: 10, left: 10 };
    const barHeight = 24;
    const gap = 100;
    const sideWidth = 220;
    const width = sideWidth * 2 + gap + margin.left + margin.right;
    const height = labels.length * (barHeight + 4) + margin.top + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const maxVal = Math.max(
      d3.max(left, d => d[1]) || 1,
      d3.max(right, d => d[1]) || 1
    );

    const cs = getComputedStyle(document.documentElement);
    const textColor = cs.getPropertyValue('--text-primary').trim() || '#2C1810';
    const textMuted = cs.getPropertyValue('--text-muted').trim() || '#9B8C7E';

    const xLeft = d3.scaleLinear().domain([0, maxVal]).range([sideWidth, 0]);
    const xRight = d3.scaleLinear().domain([0, maxVal]).range([0, sideWidth]);

    // Headers
    g.append('text').attr('x', sideWidth / 2).attr('y', -10).attr('text-anchor', 'middle')
      .attr('fill', leftColor).attr('font-size', '11px').attr('font-weight', '700').text(leftLabel);
    g.append('text').attr('x', sideWidth + gap + sideWidth / 2).attr('y', -10).attr('text-anchor', 'middle')
      .attr('fill', rightColor).attr('font-size', '11px').attr('font-weight', '700').text(rightLabel);

    labels.forEach((label, i) => {
      const y = i * (barHeight + 4);
      const lv = leftMap.get(label) || 0;
      const rv = rightMap.get(label) || 0;

      // Left bar
      if (lv > 0) {
        g.append('rect')
          .attr('x', xLeft(lv)).attr('y', y)
          .attr('width', sideWidth - xLeft(lv)).attr('height', barHeight)
          .attr('fill', leftColor).attr('opacity', 0.7).attr('rx', 3);
        g.append('text').attr('x', xLeft(lv) - 4).attr('y', y + barHeight / 2 + 4)
          .attr('text-anchor', 'end').attr('fill', textColor).attr('font-size', '10px').attr('font-weight', '600')
          .text(String(lv));
      }

      // Right bar
      if (rv > 0) {
        g.append('rect')
          .attr('x', sideWidth + gap).attr('y', y)
          .attr('width', xRight(rv)).attr('height', barHeight)
          .attr('fill', rightColor).attr('opacity', 0.7).attr('rx', 3);
        g.append('text').attr('x', sideWidth + gap + xRight(rv) + 4).attr('y', y + barHeight / 2 + 4)
          .attr('text-anchor', 'start').attr('fill', textColor).attr('font-size', '10px').attr('font-weight', '600')
          .text(String(rv));
      }

      // Center label
      g.append('text')
        .attr('x', sideWidth + gap / 2).attr('y', y + barHeight / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', textMuted).attr('font-size', '10px').attr('font-weight', '500')
        .text(label);
    });
  }, [left, right, leftLabel, rightLabel, leftColor, rightColor]);

  return <svg ref={ref} className="stat-chart-svg" />;
}

/* ── Radar Chart Compare Component ── */
function RadarCompare({
  stats1,
  stats2,
  c1,
  c2,
  h1Label,
  h2Label,
}: {
  stats1: HavzaStats;
  stats2: HavzaStats;
  c1: string;
  c2: string;
  h1Label: string;
  h2Label: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 55;

    svg.attr('viewBox', `0 0 ${size} ${size}`);
    const g = svg.append('g');

    // Axes: scholars, sources, relations (teachers+students), cities, dia match
    const axes = [
      { key: 'scholars', label: t('stats.scholars'), v1: stats1.scholars, v2: stats2.scholars },
      { key: 'sources', label: t('stats.sources'), v1: stats1.works, v2: stats2.works },
      { key: 'relations', label: t('stats.relations'), v1: stats1.teachers + stats1.students, v2: stats2.teachers + stats2.students },
      { key: 'cities', label: t('map.cities'), v1: stats1.cities.length, v2: stats2.cities.length },
      { key: 'dia', label: t('statistics.dia_ratio'), v1: stats1.diaMatch, v2: stats2.diaMatch },
    ];

    const n = axes.length;
    const angleStep = (2 * Math.PI) / n;

    // Normalize to [0, 1]
    const maxVals = axes.map(a => Math.max(a.v1, a.v2, 1));
    const norm1 = axes.map((a, i) => a.v1 / maxVals[i]);
    const norm2 = axes.map((a, i) => a.v2 / maxVals[i]);

    // Grid circles
    for (let level = 0.25; level <= 1; level += 0.25) {
      const points = Array.from({ length: n + 1 }, (_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return `${cx + Math.cos(angle) * radius * level},${cy + Math.sin(angle) * radius * level}`;
      });
      g.append('polygon')
        .attr('points', points.join(' '))
        .attr('fill', 'none')
        .attr('stroke', 'var(--border, #E2D9CE)')
        .attr('stroke-width', 0.5);
    }

    // Axis lines + labels
    axes.forEach((a, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;
      g.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', 'var(--border, #E2D9CE)')
        .attr('stroke-width', 0.5);

      const lx = cx + Math.cos(angle) * (radius + 20);
      const ly = cy + Math.sin(angle) * (radius + 20);
      g.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10)
        .attr('fill', 'var(--text-muted, #9B8C7E)')
        .attr('font-family', "'Crimson Pro', Georgia, serif")
        .text(a.label);
    });

    // Draw polygon for each dataset
    function drawPolygon(norms: number[], color: string) {
      const points = norms.map((v, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return `${cx + Math.cos(angle) * radius * v},${cy + Math.sin(angle) * radius * v}`;
      });
      g.append('polygon')
        .attr('points', points.join(' '))
        .attr('fill', color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', color)
        .attr('stroke-width', 2);

      // Dots
      norms.forEach((v, i) => {
        const angle = i * angleStep - Math.PI / 2;
        g.append('circle')
          .attr('cx', cx + Math.cos(angle) * radius * v)
          .attr('cy', cy + Math.sin(angle) * radius * v)
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      });
    }

    drawPolygon(norm1, c1);
    drawPolygon(norm2, c2);

  }, [stats1, stats2, c1, c2, t]);

  return (
    <div className="radar-chart-wrap">
      <svg ref={ref} className="radar-chart-svg" />
      <div className="radar-legend">
        <span className="radar-legend-item"><span className="radar-legend-dot" style={{ background: c1 }} />{h1Label}</span>
        <span className="radar-legend-item"><span className="radar-legend-dot" style={{ background: c2 }} />{h2Label}</span>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function HavzaCompare() {
  const { t } = useTranslation();
  const { authors, loading: aLoading } = useAuthors();
  const { works, loading: wLoading } = useWorks();
  const { relations, loading: rLoading } = useRelations();
  const [searchParams, setSearchParams] = useSearchParams();

  const h1 = searchParams.get('h1') || HAVZA_ORDER[0];
  const h2 = searchParams.get('h2') || HAVZA_ORDER[1];
  const activePeriod = searchParams.get('period') || '';

  const setH = (key: string, val: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(key, val);
      return next;
    }, { replace: true });
  };

  const setPeriod = (val: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set('period', val);
      else next.delete('period');
      return next;
    }, { replace: true });
  };

  // Filter authors by period if set
  const filteredAuthors = useMemo(() => {
    if (!activePeriod || !PERIOD_RANGES[activePeriod]) return authors;
    const [min, max] = PERIOD_RANGES[activePeriod];
    return authors.filter(a => a.yuzyil && a.yuzyil >= min && a.yuzyil <= max);
  }, [authors, activePeriod]);

  const filteredWorks = useMemo(() => {
    if (!activePeriod) return works;
    const authorIds = new Set(filteredAuthors.map(a => a.author_id));
    return works.filter(w => authorIds.has(w.author_id));
  }, [works, filteredAuthors, activePeriod]);

  const slugToHavza = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of filteredAuthors) if (a.dia_slug) m.set(a.dia_slug, a.havza);
    return m;
  }, [filteredAuthors]);

  const stats1 = useMemo(() => computeStats(h1, filteredAuthors, filteredWorks, relations, slugToHavza), [h1, filteredAuthors, filteredWorks, relations, slugToHavza]);
  const stats2 = useMemo(() => computeStats(h2, filteredAuthors, filteredWorks, relations, slugToHavza), [h2, filteredAuthors, filteredWorks, relations, slugToHavza]);

  // Century distribution for mirror chart
  const centuryLabels = useMemo(() => {
    const set = new Set<number>();
    for (const c of Object.keys(stats1.centuryDist)) set.add(Number(c));
    for (const c of Object.keys(stats2.centuryDist)) set.add(Number(c));
    return Array.from(set).filter(c => c >= 7 && c <= 20).sort((a, b) => a - b);
  }, [stats1, stats2]);

  const centuryLeft = centuryLabels.map(c => [`${c}. ${t('dashboard.century_suffix')}`, stats1.centuryDist[c] || 0] as [string, number]);
  const centuryRight = centuryLabels.map(c => [`${c}. ${t('dashboard.century_suffix')}`, stats2.centuryDist[c] || 0] as [string, number]);

  // Type distribution
  const allTypes = useMemo(() => {
    const set = new Set<string>();
    for (const k of Object.keys(stats1.typeDist)) set.add(k);
    for (const k of Object.keys(stats2.typeDist)) set.add(k);
    return Array.from(set).sort();
  }, [stats1, stats2]);

  const typeLeft = allTypes.map(tp => [t(`source_types.${tp}`), stats1.typeDist[tp] || 0] as [string, number]);
  const typeRight = allTypes.map(tp => [t(`source_types.${tp}`), stats2.typeDist[tp] || 0] as [string, number]);

  const loading = aLoading || wLoading || rLoading;
  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  const c1 = HAVZA_COLORS[h1] || '#757575';
  const c2 = HAVZA_COLORS[h2] || '#757575';

  return (
    <div className="compare-page">
      <header className="list-header">
        <h1>{t('compare.title')}</h1>
      </header>

      {/* Havza selectors */}
      <div className="compare-selectors">
        <div className="compare-select-group">
          <span className="compare-dot" style={{ background: c1 }} />
          <select value={h1} onChange={e => setH('h1', e.target.value)} className="filter-select compare-sel">
            {HAVZA_ORDER.map(h => (
              <option key={h} value={h}>{t(`havza_names.${h}`)}</option>
            ))}
          </select>
        </div>
        <span className="compare-vs">vs</span>
        <div className="compare-select-group">
          <span className="compare-dot" style={{ background: c2 }} />
          <select value={h2} onChange={e => setH('h2', e.target.value)} className="filter-select compare-sel">
            {HAVZA_ORDER.map(h => (
              <option key={h} value={h}>{t(`havza_names.${h}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Period Filter */}
      <div className="period-filter-bar" style={{ justifyContent: 'center' }}>
        <button
          className={`period-pill ${!activePeriod ? 'period-pill-active' : ''}`}
          onClick={() => setPeriod('')}
        >
          {t('common.all')}
        </button>
        {Object.entries(PERIOD_COLORS).map(([pid, color]) => (
          <button
            key={pid}
            className={`period-pill ${activePeriod === pid ? 'period-pill-active' : ''}`}
            style={activePeriod === pid ? { background: color, borderColor: color } : { borderColor: color, color }}
            onClick={() => setPeriod(activePeriod === pid ? '' : pid)}
          >
            {t(`periods.${pid}`)}
          </button>
        ))}
      </div>

      {/* Stats comparison cards */}
      <div className="compare-stats-row">
        {[
          { label: t('stats.scholars'), v1: stats1.scholars, v2: stats2.scholars },
          { label: t('stats.sources'), v1: stats1.works, v2: stats2.works },
          { label: t('statistics.dia_ratio'), v1: `${Math.round(stats1.diaMatch / Math.max(stats1.scholars, 1) * 100)}%`, v2: `${Math.round(stats2.diaMatch / Math.max(stats2.scholars, 1) * 100)}%` },
          { label: t('statistics.avg_century'), v1: stats1.avgCentury, v2: stats2.avgCentury },
        ].map((item, i) => (
          <div key={i} className="compare-stat-card">
            <span className="compare-stat-label">{item.label}</span>
            <div className="compare-stat-values">
              <span style={{ color: c1 }}>{item.v1}</span>
              <span className="compare-stat-divider">|</span>
              <span style={{ color: c2 }}>{item.v2}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Century Distribution Mirror */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.havza_century')}</h2>
        <div className="stat-chart-wrap">
          <MirrorBarChart
            left={centuryLeft}
            right={centuryRight}
            leftLabel={t(`havza_names.${h1}`)}
            rightLabel={t(`havza_names.${h2}`)}
            leftColor={c1}
            rightColor={c2}
          />
        </div>
      </section>

      {/* Type Distribution Mirror */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.type_distribution')}</h2>
        <div className="stat-chart-wrap">
          <MirrorBarChart
            left={typeLeft}
            right={typeRight}
            leftLabel={t(`havza_names.${h1}`)}
            rightLabel={t(`havza_names.${h2}`)}
            leftColor={c1}
            rightColor={c2}
          />
        </div>
      </section>

      {/* Top Cities Comparison */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.top_cities')}</h2>
        <div className="compare-cities-grid">
          <div className="compare-city-col">
            <h3 style={{ color: c1 }}>{t(`havza_names.${h1}`)}</h3>
            <div className="compare-city-list">
              {stats1.cities.map(([city, count]) => (
                <div key={city} className="compare-city-item">
                  <span className="compare-city-name">{city}</span>
                  <span className="compare-city-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="compare-city-col">
            <h3 style={{ color: c2 }}>{t(`havza_names.${h2}`)}</h3>
            <div className="compare-city-list">
              {stats2.cities.map(([city, count]) => (
                <div key={city} className="compare-city-item">
                  <span className="compare-city-name">{city}</span>
                  <span className="compare-city-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Radar Chart Comparison */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('compare.radar_title')}</h2>
        <RadarCompare stats1={stats1} stats2={stats2} c1={c1} c2={c2} h1Label={t(`havza_names.${h1}`)} h2Label={t(`havza_names.${h2}`)} />
      </section>
    </div>
  );
}
