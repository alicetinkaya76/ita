import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { useAuthors, useWorks, useRelations, useStats } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, TYPE_COLORS, PERIOD_COLORS, PERIOD_RANGES } from '../utils/colors';

/* ─── Havza Stacked Bar Chart ─── */
function HavzaCenturyChart({ authors }: { authors: { havza: string; yuzyil: number | null }[] }) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const centuries = Array.from(new Set(authors.map(a => a.yuzyil).filter(Boolean) as number[]))
      .filter(c => c >= 7 && c <= 20).sort((a, b) => a - b);
    const havzas = HAVZA_ORDER;
    return centuries.map(c => {
      const row: Record<string, number> = { century: c };
      for (const h of havzas) row[h] = authors.filter(a => a.yuzyil === c && a.havza === h).length;
      return row;
    });
  }, [authors]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const centuries = data.map(d => d.century);
    const havzas = HAVZA_ORDER;
    const stack = d3.stack<Record<string, number>>().keys(havzas)(data);

    const x = d3.scaleBand().domain(centuries.map(String)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear()
      .domain([0, d3.max(stack[stack.length - 1], d => d[1]) || 0])
      .nice().range([height, 0]);

    // Axes
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9B8C7E';
    g.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}.`))
      .selectAll('text').attr('fill', textColor).style('font-size', '0.72rem');
    g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text').attr('fill', textColor).style('font-size', '0.72rem');

    // Bars
    g.selectAll('g.layer')
      .data(stack).join('g').attr('class', 'layer')
      .attr('fill', d => HAVZA_COLORS[d.key] || '#999')
      .selectAll('rect')
      .data(d => d).join('rect')
      .attr('x', d => x(String(d.data.century)) || 0)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 2)
      .attr('opacity', 0.85)
      .append('title')
      .text(d => {
        const century = d.data.century;
        const total = HAVZA_ORDER.reduce((s, h) => s + (d.data[h] || 0), 0);
        return `${century}. yy — ${total}`;
      });

    // Grid
    g.selectAll('.grid-line')
      .data(y.ticks(6)).join('line').attr('class', 'grid-line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', textColor).attr('stroke-opacity', 0.12);
  }, [data, t]);

  return <svg ref={ref} viewBox="0 0 700 360" className="stat-chart-svg" />;
}

/* ─── Type Distribution Horizontal Bars ─── */
function TypeBarChart({ works }: { works: { eser_turu: string }[] }) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of works) counts[w.eser_turu] = (counts[w.eser_turu] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [works]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const margin = { top: 10, right: 50, bottom: 10, left: 160 };
    const barH = 24;
    const height = data.length * barH + margin.top + margin.bottom;
    svg.attr('viewBox', `0 0 700 ${height}`);
    const width = 700 - margin.left - margin.right;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9B8C7E';
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#2C1810';

    const x = d3.scaleLinear().domain([0, data[0][1]]).nice().range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => d[0])).range([0, data.length * barH]).padding(0.25);

    g.selectAll('rect').data(data).join('rect')
      .attr('x', 0).attr('y', d => y(d[0]) || 0)
      .attr('width', d => x(d[1])).attr('height', y.bandwidth())
      .attr('fill', d => TYPE_COLORS[d[0]] || '#999').attr('rx', 3).attr('opacity', 0.8);

    g.selectAll('.bar-label').data(data).join('text').attr('class', 'bar-label')
      .attr('x', -8).attr('y', d => (y(d[0]) || 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('fill', textColor).style('font-size', '0.75rem')
      .text(d => t(`source_types.${d[0]}`));

    g.selectAll('.bar-value').data(data).join('text').attr('class', 'bar-value')
      .attr('x', d => x(d[1]) + 6).attr('y', d => (y(d[0]) || 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em').attr('text-anchor', 'start')
      .attr('fill', textPrimary).style('font-size', '0.78rem').style('font-weight', '600')
      .text(d => d[1]);
  }, [data, t]);

  return <svg ref={ref} viewBox="0 0 700 500" className="stat-chart-svg" />;
}

/* ─── Top Cities Chart ─── */
function TopCitiesChart({ authors }: { authors: { sehir: string; havza: string }[] }) {
  const ref = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const counts: Record<string, { count: number; havza: string }> = {};
    for (const a of authors) {
      if (!a.sehir) continue;
      if (!counts[a.sehir]) counts[a.sehir] = { count: 0, havza: a.havza };
      counts[a.sehir].count++;
    }
    return Object.entries(counts)
      .map(([city, v]) => ({ city, count: v.count, havza: v.havza }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
  }, [authors]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const margin = { top: 10, right: 50, bottom: 10, left: 130 };
    const barH = 24;
    const height = data.length * barH + margin.top + margin.bottom;
    svg.attr('viewBox', `0 0 650 ${height}`);
    const width = 650 - margin.left - margin.right;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9B8C7E';
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#2C1810';

    const x = d3.scaleLinear().domain([0, data[0].count]).nice().range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => d.city)).range([0, data.length * barH]).padding(0.25);

    g.selectAll('rect').data(data).join('rect')
      .attr('x', 0).attr('y', d => y(d.city) || 0)
      .attr('width', d => x(d.count)).attr('height', y.bandwidth())
      .attr('fill', d => HAVZA_COLORS[d.havza] || '#999').attr('rx', 3).attr('opacity', 0.8);

    g.selectAll('.city-label').data(data).join('text').attr('class', 'city-label')
      .attr('x', -8).attr('y', d => (y(d.city) || 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('fill', textColor).style('font-size', '0.75rem')
      .text(d => d.city);

    g.selectAll('.city-value').data(data).join('text').attr('class', 'city-value')
      .attr('x', d => x(d.count) + 6).attr('y', d => (y(d.city) || 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em').attr('text-anchor', 'start')
      .attr('fill', textPrimary).style('font-size', '0.78rem').style('font-weight', '600')
      .text(d => d.count);
  }, [data]);

  return <svg ref={ref} viewBox="0 0 650 500" className="stat-chart-svg" />;
}

/* ─── Relations Summary ─── */
function RelationsSummary({ relations }: { relations: { type: string; both_in_itta: boolean }[] }) {
  const { t } = useTranslation();

  const counts = useMemo(() => {
    const c = { TEACHER_OF: 0, STUDENT_OF: 0, CONTEMPORARY_OF: 0, total: relations.length, internal: 0 };
    for (const r of relations) {
      if (r.type === 'TEACHER_OF') c.TEACHER_OF++;
      else if (r.type === 'STUDENT_OF') c.STUDENT_OF++;
      else if (r.type === 'CONTEMPORARY_OF') c.CONTEMPORARY_OF++;
      if (r.both_in_itta) c.internal++;
    }
    return c;
  }, [relations]);

  return (
    <div className="stat-relations-grid">
      <div className="stat-rel-card">
        <span className="stat-rel-value">{counts.TEACHER_OF.toLocaleString()}</span>
        <span className="stat-rel-label">{t('scholar_detail.teachers')}</span>
      </div>
      <div className="stat-rel-card">
        <span className="stat-rel-value">{counts.STUDENT_OF.toLocaleString()}</span>
        <span className="stat-rel-label">{t('scholar_detail.students')}</span>
      </div>
      <div className="stat-rel-card">
        <span className="stat-rel-value">{counts.CONTEMPORARY_OF.toLocaleString()}</span>
        <span className="stat-rel-label">{t('scholar_detail.contemporaries')}</span>
      </div>
      <div className="stat-rel-card">
        <span className="stat-rel-value">{counts.internal.toLocaleString()}</span>
        <span className="stat-rel-label">{t('statistics.internal_links')}</span>
      </div>
    </div>
  );
}

/* ─── Havza Comparison Table ─── */
/* ─── Period × Havza Heatmap ─── */
const PERIOD_KEYS_STAT = ['formation', 'development', 'contraction'] as const;

function PeriodHavzaHeatmap({ authors }: { authors: { havza: string; yuzyil: number | null; vefat_yili_m?: number | null }[] }) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const matrix = useMemo(() => {
    const rows: { havza: string; period: string; count: number }[] = [];
    for (const h of HAVZA_ORDER) {
      for (const pk of PERIOD_KEYS_STAT) {
        const [cMin, cMax] = PERIOD_RANGES[pk];
        const count = authors.filter(a => {
          if (a.havza !== h) return false;
          const c = a.yuzyil ?? (a.vefat_yili_m ? Math.ceil(a.vefat_yili_m / 100) : null);
          return c !== null && c >= cMin && c <= cMax;
        }).length;
        rows.push({ havza: h, period: pk, count });
      }
    }
    return rows;
  }, [authors]);

  useEffect(() => {
    if (!ref.current || !matrix.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const margin = { top: 50, right: 30, bottom: 20, left: 110 };
    const cellW = 140;
    const cellH = 36;
    const width = margin.left + PERIOD_KEYS_STAT.length * cellW + margin.right;
    const height = margin.top + HAVZA_ORDER.length * cellH + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCount = Math.max(...matrix.map(m => m.count), 1);
    const colorScale = d3.scaleSequential(d3.interpolateYlOrBr).domain([0, maxCount]);

    // Column headers (periods)
    PERIOD_KEYS_STAT.forEach((pk, i) => {
      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', -12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('fill', PERIOD_COLORS[pk])
        .attr('font-family', "'Crimson Pro', Georgia, serif")
        .text(t(`periods.${pk}`));

      // Period century range
      const [cMin, cMax] = PERIOD_RANGES[pk];
      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', -28)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('fill', '#9B8C7E')
        .text(`${cMin}.–${cMax}. ${t('dashboard.century_suffix')}`);
    });

    // Row labels (havzas)
    HAVZA_ORDER.forEach((h, j) => {
      g.append('text')
        .attr('x', -8)
        .attr('y', j * cellH + cellH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('fill', HAVZA_COLORS[h])
        .attr('font-weight', 600)
        .text(t(`havza_names.${h}`));
    });

    // Cells
    for (const m of matrix) {
      const i = PERIOD_KEYS_STAT.indexOf(m.period as any);
      const j = HAVZA_ORDER.indexOf(m.havza);
      if (i < 0 || j < 0) continue;

      g.append('rect')
        .attr('x', i * cellW + 2)
        .attr('y', j * cellH + 2)
        .attr('width', cellW - 4)
        .attr('height', cellH - 4)
        .attr('rx', 4)
        .attr('fill', m.count > 0 ? colorScale(m.count) : 'var(--bg-secondary, #F5F0EB)')
        .attr('stroke', 'var(--border, #E2D9CE)')
        .attr('stroke-width', 0.5);

      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', j * cellH + cellH / 2 + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', m.count > 0 ? 700 : 400)
        .attr('fill', m.count > maxCount * 0.5 ? '#fff' : m.count > 0 ? '#3E2F1C' : '#BCAB99')
        .text(m.count > 0 ? m.count.toLocaleString() : '—');
    }
  }, [matrix, t]);

  return (
    <div className="stat-chart-wrap" style={{ overflowX: 'auto' }}>
      <svg ref={ref} />
    </div>
  );
}

function HavzaTable({ authors, works }: { authors: { havza: string; yuzyil: number | null; dia_slug: string }[]; works: { havza: string }[] }) {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    return HAVZA_ORDER.map(h => {
      const hAuthors = authors.filter(a => a.havza === h);
      const hWorks = works.filter(w => w.havza === h);
      const centuries = hAuthors.map(a => a.yuzyil).filter(Boolean) as number[];
      const diaCount = hAuthors.filter(a => a.dia_slug).length;
      return {
        id: h,
        scholars: hAuthors.length,
        works: hWorks.length,
        diaMatch: diaCount,
        diaRatio: hAuthors.length ? Math.round((diaCount / hAuthors.length) * 100) : 0,
        avgCentury: centuries.length ? (centuries.reduce((s, c) => s + c, 0) / centuries.length).toFixed(1) : '—',
        earliestCentury: centuries.length ? Math.min(...centuries) : null,
        latestCentury: centuries.length ? Math.max(...centuries) : null,
      };
    });
  }, [authors, works]);

  return (
    <div className="scholar-table-wrap">
      <table className="scholar-table stat-havza-table">
        <thead>
          <tr>
            <th>{t('scholar_detail.havza')}</th>
            <th>{t('stats.scholars')}</th>
            <th>{t('stats.sources')}</th>
            <th>{t('statistics.dia_ratio')}</th>
            <th>{t('statistics.avg_century')}</th>
            <th>{t('statistics.century_range')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>
                <Link to={`/havza/${r.id}`} className="scholar-link">
                  <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[r.id] }} />
                  {t(`havza_names.${r.id}`)}
                </Link>
              </td>
              <td className="num">{r.scholars.toLocaleString()}</td>
              <td className="num">{r.works.toLocaleString()}</td>
              <td className="num">{r.diaRatio}%</td>
              <td className="num">{r.avgCentury}</td>
              <td className="num">{r.earliestCentury && r.latestCentury ? `${r.earliestCentury}–${r.latestCentury}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Period × Type Heatmap ─── */
function PeriodTypeHeatmap({ authors, works }: { authors: { author_id: string; yuzyil: number | null }[]; works: { author_id: string; eser_turu: string }[] }) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const { matrix, typeKeys } = useMemo(() => {
    // Map author → period
    const authorPeriod = new Map<string, string>();
    for (const a of authors) {
      const c = a.yuzyil;
      if (!c) continue;
      let pid = '';
      if (c >= 7 && c <= 10) pid = 'formation';
      else if (c >= 11 && c <= 18) pid = 'development';
      else if (c >= 19) pid = 'contraction';
      if (pid) authorPeriod.set(a.author_id, pid);
    }

    // Count works per period × type
    const counts: Record<string, Record<string, number>> = {};
    const typeSet = new Set<string>();
    for (const w of works) {
      const pid = authorPeriod.get(w.author_id);
      if (!pid) continue;
      typeSet.add(w.eser_turu);
      if (!counts[pid]) counts[pid] = {};
      counts[pid][w.eser_turu] = (counts[pid][w.eser_turu] || 0) + 1;
    }

    // Sort types by total count desc, top 12
    const typeTotals = Array.from(typeSet).map(tp => ({
      type: tp,
      total: PERIOD_KEYS_STAT.reduce((s, pid) => s + (counts[pid]?.[tp] || 0), 0),
    })).sort((a, b) => b.total - a.total).slice(0, 12);

    const tk = typeTotals.map(t => t.type);
    const rows: { period: string; type: string; count: number }[] = [];
    for (const pid of PERIOD_KEYS_STAT) {
      for (const tp of tk) {
        rows.push({ period: pid, type: tp, count: counts[pid]?.[tp] || 0 });
      }
    }
    return { matrix: rows, typeKeys: tk };
  }, [authors, works]);

  useEffect(() => {
    if (!ref.current || !matrix.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const margin = { top: 50, right: 30, bottom: 20, left: 160 };
    const cellW = 140;
    const cellH = 32;
    const width = margin.left + PERIOD_KEYS_STAT.length * cellW + margin.right;
    const height = margin.top + typeKeys.length * cellH + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCount = Math.max(...matrix.map(m => m.count), 1);
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount]);

    // Column headers (periods)
    PERIOD_KEYS_STAT.forEach((pk, i) => {
      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', -12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('fill', PERIOD_COLORS[pk])
        .attr('font-family', "'Crimson Pro', Georgia, serif")
        .text(t(`periods.${pk}`));
    });

    // Row labels (types)
    typeKeys.forEach((tp, j) => {
      g.append('text')
        .attr('x', -8)
        .attr('y', j * cellH + cellH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10.5)
        .attr('fill', TYPE_COLORS[tp] || '#666')
        .attr('font-weight', 600)
        .text(t(`source_types.${tp}`));
    });

    // Cells
    for (const m of matrix) {
      const i = PERIOD_KEYS_STAT.indexOf(m.period as typeof PERIOD_KEYS_STAT[number]);
      const j = typeKeys.indexOf(m.type);
      if (i < 0 || j < 0) continue;

      g.append('rect')
        .attr('x', i * cellW + 2)
        .attr('y', j * cellH + 2)
        .attr('width', cellW - 4)
        .attr('height', cellH - 4)
        .attr('rx', 4)
        .attr('fill', m.count > 0 ? colorScale(m.count) : 'var(--bg-secondary, #F5F0EB)')
        .attr('stroke', 'var(--border, #E2D9CE)')
        .attr('stroke-width', 0.5);

      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', j * cellH + cellH / 2 + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', m.count > 0 ? 700 : 400)
        .attr('fill', m.count > maxCount * 0.5 ? '#fff' : m.count > 0 ? '#3E2F1C' : '#BCAB99')
        .text(m.count > 0 ? m.count.toLocaleString() : '—');
    }
  }, [matrix, typeKeys, t]);

  return (
    <div className="stat-chart-wrap" style={{ overflowX: 'auto' }}>
      <svg ref={ref} />
    </div>
  );
}

/* ─── Main Statistics Page ─── */
export default function Statistics() {
  const { t } = useTranslation();
  const { authors, loading: aLoading } = useAuthors();
  const { works, loading: wLoading } = useWorks();
  const { relations, loading: rLoading } = useRelations();
  const { stats, loading: sLoading } = useStats();

  if (aLoading || wLoading || rLoading || sLoading) {
    return <div className="loading-screen">{t('common.loading')}</div>;
  }

  return (
    <div className="statistics-page">
      <header className="list-header">
        <h1>{t('nav.statistics')}</h1>
        <span className="list-count">
          {stats?.total_scholars?.toLocaleString()} {t('common.scholar_count')} · {stats?.total_works?.toLocaleString()} {t('common.work_count')}
        </span>
      </header>

      {/* Havza Comparison Table */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.havza_comparison')}</h2>
        <HavzaTable authors={authors} works={works} />
      </section>

      {/* Stacked Bar: Havza × Century */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.havza_century')}</h2>
        <div className="stat-chart-wrap">
          <HavzaCenturyChart authors={authors} />
          {/* Legend */}
          <div className="stat-chart-legend">
            {HAVZA_ORDER.map(h => (
              <span key={h} className="stat-legend-item">
                <span className="stat-legend-dot" style={{ background: HAVZA_COLORS[h] }} />
                {t(`havza_names.${h}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Type Distribution */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.type_distribution')}</h2>
        <div className="stat-chart-wrap">
          <TypeBarChart works={works} />
        </div>
      </section>

      {/* Relations Summary */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.relations_overview')}</h2>
        <RelationsSummary relations={relations} />
      </section>

      {/* Period × Havza Heatmap */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.period_havza_heatmap')}</h2>
        <PeriodHavzaHeatmap authors={authors} />
      </section>

      {/* Period × Type Heatmap */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.period_type_heatmap')}</h2>
        <PeriodTypeHeatmap authors={authors} works={works} />
      </section>

      {/* Top Cities */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('statistics.top_cities')}</h2>
        <div className="stat-chart-wrap">
          <TopCitiesChart authors={authors} />
        </div>
      </section>
    </div>
  );
}
