import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type Author, type Relation } from '../hooks/useData';
import { HAVZA_COLORS, PERIOD_COLORS, getPeriodId } from '../utils/colors';
import * as d3 from 'd3';

interface HNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  authorId: string;
  importance: number;
  periodId: string | null;
}

interface HLink extends d3.SimulationLinkDatum<HNode> {
  type: string;
}

const REL_COLORS: Record<string, string> = {
  TEACHER_OF: '#8B4513',
  STUDENT_OF: '#1565C0',
  CONTEMPORARY_OF: '#9B8C7E',
};

interface Props {
  havzaKey: string;
  authors: Author[];
  relations: Relation[];
  maxNodes?: number;
}

export default function HavzaMiniNetwork({ havzaKey, authors, relations, maxNodes = 25 }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, links } = useMemo(() => {
    // Top scholars by importance
    const havzaAuthors = authors
      .filter(a => a.havza === havzaKey && a.dia_slug)
      .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
      .slice(0, maxNodes);

    const slugSet = new Set(havzaAuthors.map(a => a.dia_slug));

    const nodeMap = new Map<string, HNode>();
    for (const a of havzaAuthors) {
      nodeMap.set(a.dia_slug, {
        id: a.dia_slug,
        name: a.meshur_isim,
        authorId: a.author_id,
        importance: a.importance_score || 10,
        periodId: getPeriodId(a.yuzyil),
      });
    }

    // Internal edges only
    const graphLinks: HLink[] = [];
    const seen = new Set<string>();
    for (const r of relations) {
      if (!slugSet.has(r.source) || !slugSet.has(r.target)) continue;
      const key = `${r.source}-${r.target}-${r.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      graphLinks.push({ source: r.source, target: r.target, type: r.type });
    }

    return { nodes: [...nodeMap.values()], links: graphLinks };
  }, [havzaKey, authors, relations, maxNodes]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 320;
    const height = 260;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');
    const color = HAVZA_COLORS[havzaKey] || '#666';

    const simulation = d3.forceSimulation<HNode>(nodes)
      .force('link', d3.forceLink<HNode, HLink>(links).id(d => d.id).distance(45))
      .force('charge', d3.forceManyBody().strength(-90))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<HNode>().radius(d => Math.max(4, Math.sqrt(d.importance) * 0.6) + 4));

    // Links
    g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => REL_COLORS[d.type] || '#ccc')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', d => d.type === 'CONTEMPORARY_OF' ? '2,2' : 'none');

    // Nodes
    const nodeG = g.append('g')
      .selectAll<SVGCircleElement, HNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => Math.max(4, Math.sqrt(d.importance) * 0.6))
      .attr('fill', d => d.periodId ? PERIOD_COLORS[d.periodId] : color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.8)
      .on('click', (_event, d) => {
        navigate(`/scholars/${d.authorId}`);
      });

    // Tooltip on hover
    nodeG.append('title').text(d => d.name);

    // Labels for top nodes
    const topNodes = [...nodes].sort((a, b) => b.importance - a.importance).slice(0, 8);
    g.append('g')
      .selectAll<SVGTextElement, HNode>('text')
      .data(topNodes)
      .join('text')
      .text(d => d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name)
      .attr('font-size', 7)
      .attr('font-family', "'Crimson Pro', serif")
      .attr('fill', 'var(--text-secondary)')
      .attr('text-anchor', 'middle')
      .attr('dy', d => -(Math.max(4, Math.sqrt(d.importance) * 0.6) + 3))
      .attr('pointer-events', 'none')
      .attr('opacity', 0.7);

    simulation.on('tick', () => {
      g.selectAll<SVGLineElement, HLink>('line')
        .attr('x1', d => (d.source as HNode).x!)
        .attr('y1', d => (d.source as HNode).y!)
        .attr('x2', d => (d.target as HNode).x!)
        .attr('y2', d => (d.target as HNode).y!);
      nodeG
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
      g.selectAll<SVGTextElement, HNode>('text')
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    return () => { simulation.stop(); };
  }, [nodes, links, havzaKey, navigate]);

  if (nodes.length < 3) return null;

  return (
    <div className="mini-network havza-mini-network" ref={containerRef}>
      <h3>{t('network.mini_title')}</h3>
      <svg ref={svgRef} className="mini-network-svg" style={{ height: 260 }} />
      {/* Period legend */}
      <div className="havza-net-legend">
        {['formation', 'development', 'contraction'].map(pid => (
          <span key={pid} className="havza-net-legend-item">
            <span className="havza-net-legend-dot" style={{ background: PERIOD_COLORS[pid] }} />
            <span>{t(`periods.${pid}`)}</span>
          </span>
        ))}
      </div>
      <button
        className="mini-network-expand"
        onClick={() => navigate(`/network?havza=${havzaKey}`)}
      >
        {t('network.expand')} →
      </button>
    </div>
  );
}
