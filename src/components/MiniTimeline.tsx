import { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Author } from '../hooks/useData';
import { PERIOD_COLORS, getPeriodId } from '../utils/colors';
import * as d3 from 'd3';

interface Props {
  authors: Author[];
  color: string;
}

export default function MiniTimeline({ authors, color }: Props) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const centuryCounts = useMemo(() => {
    const m: Record<number, number> = {};
    for (const a of authors) {
      if (a.yuzyil && a.yuzyil >= 7 && a.yuzyil <= 20) {
        m[a.yuzyil] = (m[a.yuzyil] || 0) + 1;
      }
    }
    return Object.entries(m)
      .map(([c, n]) => ({ century: parseInt(c), count: n }))
      .sort((a, b) => a.century - b.century);
  }, [authors]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || centuryCounts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 320;
    const height = 80;
    const margin = { top: 8, right: 12, bottom: 22, left: 12 };
    const iw = width - margin.left - margin.right;
    const ih = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // All centuries 7-20
    const allCenturies = Array.from({ length: 14 }, (_, i) => i + 7);
    const countMap = new Map(centuryCounts.map(c => [c.century, c.count]));
    const maxCount = Math.max(...centuryCounts.map(c => c.count), 1);

    const x = d3.scaleBand()
      .domain(allCenturies.map(String))
      .range([0, iw])
      .padding(0.15);

    const y = d3.scaleLinear()
      .domain([0, maxCount])
      .range([ih, 0]);

    // Period background bands
    const periodRanges = [
      { id: 'formation', start: 7, end: 10 },
      { id: 'development', start: 11, end: 18 },
      { id: 'contraction', start: 19, end: 20 },
    ];

    for (const pr of periodRanges) {
      const x0 = x(String(pr.start))! - x.step() * x.paddingOuter();
      const x1 = x(String(pr.end))! + x.bandwidth() + x.step() * x.paddingOuter();
      g.append('rect')
        .attr('x', Math.max(0, x0))
        .attr('y', 0)
        .attr('width', Math.min(iw, x1) - Math.max(0, x0))
        .attr('height', ih)
        .attr('fill', PERIOD_COLORS[pr.id])
        .attr('opacity', 0.06)
        .attr('rx', 3);
    }

    // Bars
    g.selectAll('.bar')
      .data(allCenturies)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(String(d))!)
      .attr('y', d => y(countMap.get(d) || 0))
      .attr('width', x.bandwidth())
      .attr('height', d => ih - y(countMap.get(d) || 0))
      .attr('fill', d => {
        const pid = getPeriodId(d);
        return pid ? PERIOD_COLORS[pid] : color;
      })
      .attr('rx', 2)
      .attr('opacity', d => (countMap.get(d) || 0) > 0 ? 0.75 : 0.1);

    // Count labels on top of bars
    g.selectAll('.count-label')
      .data(allCenturies.filter(c => (countMap.get(c) || 0) > 0))
      .join('text')
      .attr('class', 'count-label')
      .attr('x', d => x(String(d))! + x.bandwidth() / 2)
      .attr('y', d => y(countMap.get(d) || 0) - 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 7)
      .attr('fill', 'var(--text-muted)')
      .text(d => countMap.get(d) || '');

    // X axis labels
    g.selectAll('.century-label')
      .data(allCenturies)
      .join('text')
      .attr('class', 'century-label')
      .attr('x', d => x(String(d))! + x.bandwidth() / 2)
      .attr('y', ih + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 7.5)
      .attr('fill', 'var(--text-muted)')
      .text(d => `${d}`);

    return () => {};
  }, [centuryCounts, color]);

  if (centuryCounts.length === 0) return null;

  return (
    <div className="mini-timeline" ref={containerRef}>
      <h3>{t('dashboard.century_overview')}</h3>
      <svg ref={svgRef} className="mini-timeline-svg" />
    </div>
  );
}
