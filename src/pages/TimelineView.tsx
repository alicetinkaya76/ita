import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthors, type Author } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, PERIOD_COLORS } from '../utils/colors';
import * as d3 from 'd3';

interface TimelineItem {
  author: Author;
  year: number;
  havza: string;
}

// Periods with real colors from PERIOD_COLORS
const PERIODS = [
  { key: 'formation', start: 600, end: 1000, color: PERIOD_COLORS.formation, bg: 'rgba(21,101,192,0.06)' },
  { key: 'development', start: 1000, end: 1800, color: PERIOD_COLORS.development, bg: 'rgba(46,125,50,0.04)' },
  { key: 'contraction', start: 1800, end: 2000, color: PERIOD_COLORS.contraction, bg: 'rgba(230,81,0,0.06)' },
];

export default function TimelineView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authors, loading } = useAuthors();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedHavza, setSelectedHavza] = useState<string>(searchParams.get('havza') || '');
  const [brushRange, setBrushRange] = useState<[number, number] | null>(null);
  const [hoveredItem, setHoveredItem] = useState<TimelineItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter authors with death year
  const items = useMemo(() => {
    let filtered = authors.filter(a => a.vefat_yili_m && a.vefat_yili_m >= 600 && a.vefat_yili_m <= 2000);
    if (selectedHavza) filtered = filtered.filter(a => a.havza === selectedHavza);
    return filtered.map(a => ({
      author: a,
      year: a.vefat_yili_m!,
      havza: a.havza,
    }));
  }, [authors, selectedHavza]);

  // Havza band indices
  const havzaBands = useMemo(() => {
    const active = selectedHavza
      ? [selectedHavza]
      : HAVZA_ORDER.filter(h => items.some(it => it.havza === h));
    return active;
  }, [items, selectedHavza]);

  // Stats per century bin
  const centuryBins = useMemo(() => {
    const bins: Record<number, number> = {};
    for (const it of items) {
      const century = Math.floor(it.year / 100) * 100;
      bins[century] = (bins[century] || 0) + 1;
    }
    return bins;
  }, [items]);

  // Brush-filtered items
  const displayItems = useMemo(() => {
    if (!brushRange) return items;
    return items.filter(it => it.year >= brushRange[0] && it.year <= brushRange[1]);
  }, [items, brushRange]);

  // Draw timeline
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || items.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const margin = { top: 40, right: 30, bottom: 80, left: 50 };
    const bandHeight = selectedHavza ? 300 : Math.max(50, Math.min(70, 400 / havzaBands.length));
    const chartHeight = havzaBands.length * bandHeight;
    const height = chartHeight + margin.top + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;

    // X Scale: years
    const xScale = d3.scaleLinear().domain([600, 2000]).range([0, innerWidth]);

    // Y Scale: havza bands
    const yScale = d3.scaleBand<string>()
      .domain(havzaBands)
      .range([0, chartHeight])
      .paddingInner(0.15)
      .paddingOuter(0.1);

    // Period backgrounds with colored top stripe
    const periodsG = g.append('g').attr('class', 'periods');
    periodsG.selectAll('rect.period-bg')
      .data(PERIODS)
      .join('rect')
      .attr('class', 'period-bg')
      .attr('x', d => xScale(d.start))
      .attr('y', 0)
      .attr('width', d => xScale(d.end) - xScale(d.start))
      .attr('height', chartHeight)
      .attr('fill', d => d.bg)
      .attr('rx', 4);

    // Colored top stripe for each period
    periodsG.selectAll('rect.period-stripe')
      .data(PERIODS)
      .join('rect')
      .attr('class', 'period-stripe')
      .attr('x', d => xScale(d.start))
      .attr('y', -2)
      .attr('width', d => xScale(d.end) - xScale(d.start))
      .attr('height', 3)
      .attr('fill', d => d.color)
      .attr('rx', 1.5)
      .attr('opacity', 0.7);

    // Period labels at top — clickable
    g.append('g').attr('class', 'period-labels')
      .selectAll('text')
      .data(PERIODS)
      .join('text')
      .attr('x', d => (xScale(d.start) + xScale(d.end)) / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', d => d.color)
      .attr('font-family', "'Crimson Pro', Georgia, serif")
      .attr('font-style', 'italic')
      .attr('font-weight', 600)
      .attr('cursor', 'pointer')
      .text(d => t(`periods.${d.key}`))
      .on('click', (_event, d) => {
        navigate(`/periodization#${d.key}`);
      })
      .on('mouseover', function () { d3.select(this).attr('text-decoration', 'underline'); })
      .on('mouseout', function () { d3.select(this).attr('text-decoration', 'none'); });

    // Havza band separators
    g.append('g').attr('class', 'band-lines')
      .selectAll('line')
      .data(havzaBands.slice(1))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d)! - yScale.step() * yScale.paddingInner() / 2)
      .attr('y2', d => yScale(d)! - yScale.step() * yScale.paddingInner() / 2)
      .attr('stroke', '#E2D9CE')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '4,4');

    // Havza labels (left side)
    g.append('g').attr('class', 'band-labels')
      .selectAll('text')
      .data(havzaBands)
      .join('text')
      .attr('x', -8)
      .attr('y', d => yScale(d)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 10)
      .attr('fill', d => HAVZA_COLORS[d])
      .attr('font-weight', 600)
      .attr('font-family', "'Source Sans 3', sans-serif")
      .text(d => t(`havza_names.${d}`));

    // Jitter within band
    const jitter = (havza: string, idx: number) => {
      const bw = yScale.bandwidth();
      const y0 = yScale(havza)!;
      // Pseudo-random spread within band
      const seed = (idx * 2654435761) >>> 0;
      const rand = (seed % 1000) / 1000;
      return y0 + bw * 0.15 + rand * bw * 0.7;
    };

    // Items as circles
    const dotG = g.append('g').attr('class', 'dots');
    const dots = dotG.selectAll<SVGCircleElement, TimelineItem>('circle')
      .data(items)
      .join('circle')
      .attr('cx', d => xScale(d.year))
      .attr('cy', (d, i) => jitter(d.havza, i))
      .attr('r', d => {
        const imp = d.author.importance_score || 10;
        return Math.max(2.5, Math.min(7, Math.sqrt(imp) * 0.5));
      })
      .attr('fill', d => HAVZA_COLORS[d.havza] || '#999')
      .attr('opacity', 0.55)
      .attr('cursor', 'pointer')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 0)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('r', 8).attr('stroke', '#fff').attr('stroke-width', 2);
        setHoveredItem(d);
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltipPos({ x: event.clientX - svgRect.left, y: event.clientY - svgRect.top - 12 });
      })
      .on('mouseout', function (_event, d) {
        const imp = d.author.importance_score || 10;
        d3.select(this)
          .attr('opacity', 0.55)
          .attr('r', Math.max(2.5, Math.min(7, Math.sqrt(imp) * 0.5)))
          .attr('stroke', 'transparent')
          .attr('stroke-width', 0);
        setHoveredItem(null);
      })
      .on('click', (_event, d) => {
        navigate(`/scholars/${d.author.author_id}`);
      });

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickValues(d3.range(700, 2100, 100))
      .tickFormat(d => `${d}`);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', '#E2D9CE'))
      .call(g => g.selectAll('.tick line').attr('stroke', '#E2D9CE').attr('stroke-dasharray', '2,2').attr('y1', -chartHeight))
      .call(g => g.selectAll('.tick text').attr('fill', '#9B8C7E').attr('font-size', 10).attr('font-family', "'Crimson Pro', serif"));

    // Brush for range selection
    const brush = d3.brushX()
      .extent([[0, chartHeight + 10], [innerWidth, chartHeight + 44]])
      .on('end', (event) => {
        if (event.selection) {
          const [x0, x1] = event.selection as [number, number];
          const year0 = Math.round(xScale.invert(x0));
          const year1 = Math.round(xScale.invert(x1));
          setBrushRange([year0, year1]);
          // Highlight dots in range
          dots.attr('opacity', d => (d.year >= year0 && d.year <= year1) ? 0.85 : 0.1);
        } else {
          setBrushRange(null);
          dots.attr('opacity', 0.55);
        }
      });

    const brushG = g.append('g').attr('class', 'brush');
    brushG.call(brush);

    // Brush hint bar background
    g.append('rect')
      .attr('x', 0)
      .attr('y', chartHeight + 10)
      .attr('width', innerWidth)
      .attr('height', 34)
      .attr('fill', '#F2EDE6')
      .attr('rx', 4)
      .lower();

    // Mini histogram in brush area
    const binWidth = innerWidth / 14;
    const centuryEntries = Object.entries(centuryBins).map(([c, n]) => ({ century: +c, count: n }));
    const maxBin = Math.max(...centuryEntries.map(e => e.count), 1);
    g.append('g').attr('class', 'mini-hist')
      .selectAll('rect')
      .data(centuryEntries)
      .join('rect')
      .attr('x', d => xScale(d.century))
      .attr('y', d => chartHeight + 44 - (d.count / maxBin) * 30)
      .attr('width', d => xScale(d.century + 100) - xScale(d.century) - 1)
      .attr('height', d => (d.count / maxBin) * 30)
      .attr('fill', 'rgba(139,69,19,0.15)')
      .attr('rx', 2)
      .lower();

    // Brush label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', chartHeight + 62)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('fill', '#9B8C7E')
      .attr('font-style', 'italic')
      .text(t('timeline.brush_hint'));

    return () => {};
  }, [items, havzaBands, centuryBins, selectedHavza, navigate, t]);

  // Update URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedHavza) params.havza = selectedHavza;
    setSearchParams(params, { replace: true });
  }, [selectedHavza, setSearchParams]);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="timeline-page">
      <div className="list-header">
        <h1>{t('nav.timeline')}</h1>
        <span className="list-count">
          {displayItems.length} {t('common.scholar_count')}
          {brushRange && ` · ${brushRange[0]}–${brushRange[1]} ${t('common.ce')}`}
        </span>
      </div>

      {/* Controls */}
      <div className="timeline-controls">
        <select
          className="filter-select"
          value={selectedHavza}
          onChange={e => setSelectedHavza(e.target.value)}
        >
          <option value="">{t('common.all')} — {t('stats.havzas')}</option>
          {HAVZA_ORDER.map(h => (
            <option key={h} value={h}>{t(`havza_names.${h}`)}</option>
          ))}
        </select>

        {brushRange && (
          <button
            className="timeline-clear-btn"
            onClick={() => setBrushRange(null)}
          >
            ✕ {t('timeline.clear_brush')}
          </button>
        )}

        {/* Havza chips */}
        <div className="timeline-havza-chips">
          {HAVZA_ORDER.map(h => {
            const count = items.filter(it => it.havza === h).length;
            if (!count) return null;
            return (
              <button
                key={h}
                className={`timeline-chip ${selectedHavza === h ? 'timeline-chip-active' : ''}`}
                onClick={() => setSelectedHavza(prev => prev === h ? '' : h)}
                style={{
                  borderColor: HAVZA_COLORS[h],
                  ...(selectedHavza === h ? { background: HAVZA_COLORS[h], color: '#fff' } : {}),
                }}
              >
                <span className="chip-dot-sm" style={{
                  background: selectedHavza === h ? '#fff' : HAVZA_COLORS[h],
                }} />
                {t(`havza_names.${h}`)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline chart */}
      <div className="timeline-chart-wrap" ref={containerRef}>
        {items.length === 0 ? (
          <div className="network-empty">
            <div className="placeholder-icon">📅</div>
            <p>{t('common.no_results')}</p>
          </div>
        ) : (
          <>
            <svg ref={svgRef} className="timeline-svg" />
            {hoveredItem && (
              <div
                className="network-tooltip"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
              >
                <div className="network-tooltip-name">{hoveredItem.author.meshur_isim}</div>
                <div className="network-tooltip-meta">
                  <span style={{ color: HAVZA_COLORS[hoveredItem.havza] }}>
                    {t(`havza_names.${hoveredItem.havza}`)}
                  </span>
                  {` · ${t('scholar_detail.death')}: ${hoveredItem.year} ${t('common.ce')}`}
                  {hoveredItem.author.eser_sayisi > 0 && ` · ${hoveredItem.author.eser_sayisi} ${t('common.work_count')}`}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Brush-filtered list */}
      {brushRange && displayItems.length > 0 && (
        <div className="timeline-filtered-list">
          <h3>
            {brushRange[0]}–{brushRange[1]} {t('common.ce')}
            <span className="list-count"> — {displayItems.length} {t('common.scholar_count')}</span>
          </h3>
          <div className="timeline-filtered-grid">
            {displayItems
              .sort((a, b) => a.year - b.year)
              .slice(0, 40)
              .map(it => (
                <button
                  key={it.author.author_id}
                  className="scholar-chip"
                  onClick={() => navigate(`/scholars/${it.author.author_id}`)}
                >
                  <span className="chip-dot" style={{ background: HAVZA_COLORS[it.havza] }} />
                  <div className="chip-info">
                    <span className="chip-name">{it.author.meshur_isim}</span>
                    <span className="chip-meta">
                      ö. {it.year} · {it.author.eser_sayisi} {t('common.work_count')}
                    </span>
                  </div>
                </button>
              ))}
          </div>
          {displayItems.length > 40 && (
            <p className="timeline-more-note">
              +{displayItems.length - 40} {t('common.more')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
