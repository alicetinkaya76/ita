import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type Author, type Relation } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import * as d3 from 'd3';

interface MiniNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  havza: string;
  authorId: string | null;
  isCenter: boolean;
  importance: number;
}

interface MiniLink extends d3.SimulationLinkDatum<MiniNode> {
  type: string;
}

const REL_COLORS: Record<string, string> = {
  TEACHER_OF: '#8B4513',
  STUDENT_OF: '#1565C0',
  CONTEMPORARY_OF: '#9B8C7E',
};

interface Props {
  /** The dia_slug of the central scholar */
  centerSlug: string;
  relations: Relation[];
  authors: Author[];
  /** Max number of connected nodes to show */
  maxNodes?: number;
}

export default function MiniNetwork({ centerSlug, relations, authors, maxNodes = 20 }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slugMap = useMemo(() => {
    const m = new Map<string, Author>();
    for (const a of authors) {
      if (a.dia_slug) m.set(a.dia_slug, a);
    }
    return m;
  }, [authors]);

  const { nodes, links } = useMemo(() => {
    const center = slugMap.get(centerSlug);
    if (!center) return { nodes: [], links: [] };

    // Get all relations involving this slug
    const rels = relations.filter(r => r.source === centerSlug || r.target === centerSlug);

    const nodeMap = new Map<string, MiniNode>();
    nodeMap.set(centerSlug, {
      id: centerSlug,
      name: center.meshur_isim,
      havza: center.havza,
      authorId: center.author_id,
      isCenter: true,
      importance: center.importance_score || 20,
    });

    const graphLinks: MiniLink[] = [];

    for (const r of rels.slice(0, maxNodes)) {
      const otherSlug = r.source === centerSlug ? r.target : r.source;
      const otherAuthor = slugMap.get(otherSlug);

      if (!nodeMap.has(otherSlug)) {
        nodeMap.set(otherSlug, {
          id: otherSlug,
          name: otherAuthor?.meshur_isim || (r.source === centerSlug ? r.target_name : r.source_name),
          havza: otherAuthor?.havza || 'diger',
          authorId: otherAuthor?.author_id || null,
          isCenter: false,
          importance: otherAuthor?.importance_score || 10,
        });
      }

      graphLinks.push({
        source: r.source,
        target: r.target,
        type: r.type,
      });
    }

    return { nodes: [...nodeMap.values()], links: graphLinks };
  }, [centerSlug, relations, slugMap, maxNodes]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 280;
    const height = 220;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');

    const simulation = d3.forceSimulation<MiniNode>(nodes)
      .force('link', d3.forceLink<MiniNode, MiniLink>(links).id(d => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<MiniNode>().radius(d => (d.isCenter ? 12 : 7) + 3));

    // Links
    g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => REL_COLORS[d.type] || '#ccc')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', d => d.type === 'CONTEMPORARY_OF' ? '2,2' : 'none');

    // Nodes
    const nodeG = g.append('g')
      .selectAll<SVGCircleElement, MiniNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.isCenter ? 10 : Math.max(4, Math.sqrt(d.importance) * 0.5))
      .attr('fill', d => HAVZA_COLORS[d.havza] || '#999')
      .attr('stroke', d => d.isCenter ? '#2C1810' : '#fff')
      .attr('stroke-width', d => d.isCenter ? 2 : 1)
      .attr('cursor', d => d.authorId ? 'pointer' : 'default')
      .attr('opacity', d => d.isCenter ? 1 : 0.75)
      .on('click', (_event, d) => {
        if (d.authorId) navigate(`/scholars/${d.authorId}`);
      });

    // Labels
    g.append('g')
      .selectAll<SVGTextElement, MiniNode>('text')
      .data(nodes.filter(n => n.isCenter || n.importance > 30))
      .join('text')
      .text(d => d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name)
      .attr('font-size', d => d.isCenter ? 9 : 7.5)
      .attr('font-family', "'Crimson Pro', serif")
      .attr('fill', '#2C1810')
      .attr('text-anchor', 'middle')
      .attr('dy', d => -(d.isCenter ? 14 : 8))
      .attr('pointer-events', 'none')
      .attr('opacity', 0.7);

    simulation.on('tick', () => {
      g.selectAll<SVGLineElement, MiniLink>('line')
        .attr('x1', d => (d.source as MiniNode).x!)
        .attr('y1', d => (d.source as MiniNode).y!)
        .attr('x2', d => (d.target as MiniNode).x!)
        .attr('y2', d => (d.target as MiniNode).y!);
      nodeG
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
      g.selectAll<SVGTextElement, MiniNode>('text')
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    return () => { simulation.stop(); };
  }, [nodes, links, navigate]);

  if (nodes.length < 2) return null;

  return (
    <div className="mini-network" ref={containerRef}>
      <h3>{t('network.mini_title')}</h3>
      <svg ref={svgRef} className="mini-network-svg" />
      <button
        className="mini-network-expand"
        onClick={() => navigate(`/network?havza=${slugMap.get(centerSlug)?.havza || ''}`)}
      >
        {t('network.expand')} →
      </button>
    </div>
  );
}
