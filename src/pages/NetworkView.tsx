import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthors, useRelations, type Author, type Relation } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, PERIOD_COLORS, PERIOD_RANGES } from '../utils/colors';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  slug: string;
  name: string;
  havza: string;
  century: number | null;
  deathYear: number | null;
  importance: number;
  workCount: number;
  authorId: string;
  degree: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
  sourceSlug: string;
  targetSlug: string;
}

const REL_COLORS: Record<string, string> = {
  TEACHER_OF: '#8B4513',
  STUDENT_OF: '#1565C0',
  CONTEMPORARY_OF: '#6B5A4E',
};

const REL_LABELS: Record<string, Record<string, string>> = {
  TEACHER_OF: { tr: 'Hoca-Talebe', en: 'Teacher-Student', ar: 'شيخ-تلميذ' },
  STUDENT_OF: { tr: 'Talebe-Hoca', en: 'Student-Teacher', ar: 'تلميذ-شيخ' },
  CONTEMPORARY_OF: { tr: 'Çağdaş', en: 'Contemporary', ar: 'معاصر' },
};

export default function NetworkView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authors, loading: aLoading } = useAuthors();
  const { relations, loading: rLoading } = useRelations();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedHavza, setSelectedHavza] = useState<string>(searchParams.get('havza') || '');
  const [selectedCentury, setSelectedCentury] = useState<string>(searchParams.get('century') || '');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(searchParams.get('period') || '');
  const [selectedRelType, setSelectedRelType] = useState<string>(searchParams.get('rel') || '');
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build slug → author lookup
  const slugMap = useMemo(() => {
    const m = new Map<string, Author>();
    for (const a of authors) {
      if (a.dia_slug) m.set(a.dia_slug, a);
    }
    return m;
  }, [authors]);

  // Centuries available
  const centuries = useMemo(() => {
    const s = new Set<number>();
    for (const a of authors) {
      if (a.yuzyil && a.yuzyil >= 7 && a.yuzyil <= 20) s.add(a.yuzyil);
    }
    return [...s].sort((a, b) => a - b);
  }, [authors]);

  // Build graph data
  const { nodes, links } = useMemo(() => {
    // Filter relations
    let filteredRels = relations;
    if (selectedRelType) {
      filteredRels = filteredRels.filter(r => r.type === selectedRelType);
    }

    // Only use relations where at least one node is in ITTA (has slug)
    const relevantRels = showAllEdges
      ? filteredRels
      : filteredRels.filter(r => r.both_in_itta);

    // Collect unique slugs
    const slugSet = new Set<string>();
    for (const r of relevantRels) {
      slugSet.add(r.source);
      slugSet.add(r.target);
    }

    // Build nodes from slugs that map to authors
    const nodeMap = new Map<string, GraphNode>();
    for (const slug of slugSet) {
      const author = slugMap.get(slug);
      if (author) {
        // Apply filters
        if (selectedHavza && author.havza !== selectedHavza) continue;
        if (selectedCentury && author.yuzyil !== parseInt(selectedCentury)) continue;
        if (selectedPeriod) {
          const [pMin, pMax] = PERIOD_RANGES[selectedPeriod as keyof typeof PERIOD_RANGES] || [0, 99];
          const c = author.yuzyil ?? (author.vefat_yili_m ? Math.ceil(author.vefat_yili_m / 100) : null);
          if (c === null || c < pMin || c > pMax) continue;
        }
        nodeMap.set(slug, {
          id: slug,
          slug,
          name: author.meshur_isim,
          havza: author.havza,
          century: author.yuzyil,
          deathYear: author.vefat_yili_m,
          importance: author.importance_score || 10,
          workCount: author.eser_sayisi,
          authorId: author.author_id,
          degree: 0,
        });
      }
    }

    // Build links where both endpoints exist in nodeMap
    const graphLinks: GraphLink[] = [];
    for (const r of relevantRels) {
      if (nodeMap.has(r.source) && nodeMap.has(r.target)) {
        graphLinks.push({
          source: r.source,
          target: r.target,
          type: r.type,
          sourceSlug: r.source,
          targetSlug: r.target,
        });
        const sn = nodeMap.get(r.source)!;
        const tn = nodeMap.get(r.target)!;
        sn.degree++;
        tn.degree++;
      }
    }

    return { nodes: [...nodeMap.values()], links: graphLinks };
  }, [relations, slugMap, selectedHavza, selectedCentury, selectedPeriod, selectedRelType, showAllEdges]);

  // Stats
  const graphStats = useMemo(() => {
    const havzaCounts: Record<string, number> = {};
    for (const n of nodes) {
      havzaCounts[n.havza] = (havzaCounts[n.havza] || 0) + 1;
    }
    const typeCounts: Record<string, number> = {};
    for (const l of links) {
      typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
    }
    return { havzaCounts, typeCounts };
  }, [nodes, links]);

  // D3 simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height || 560;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create groups
    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Arrow markers
    const defs = svg.append('defs');
    ['TEACHER_OF', 'STUDENT_OF'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', REL_COLORS[type]);
    });

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => nodeRadius(d) + 4))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => REL_COLORS[d.type] || '#999')
      .attr('stroke-width', d => d.type === 'CONTEMPORARY_OF' ? 0.8 : 1.2)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', d => d.type === 'CONTEMPORARY_OF' ? '3,3' : 'none')
      .attr('marker-end', d => d.type !== 'CONTEMPORARY_OF' ? `url(#arrow-${d.type})` : '');

    // Nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => HAVZA_COLORS[d.havza] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.85)
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5);
        // Highlight connected
        link
          .attr('stroke-opacity', l =>
            (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id ? 0.8 : 0.08
          )
          .attr('stroke-width', l =>
            (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id ? 2 : 0.5
          );
        node.attr('opacity', n => {
          if (n.id === d.id) return 1;
          const connected = links.some(l =>
            ((l.source as GraphNode).id === d.id && (l.target as GraphNode).id === n.id) ||
            ((l.target as GraphNode).id === d.id && (l.source as GraphNode).id === n.id)
          );
          return connected ? 0.9 : 0.15;
        });
        setHoveredNode(d);
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltipPos({ x: _event.clientX - svgRect.left, y: _event.clientY - svgRect.top - 12 });
      })
      .on('mouseout', function () {
        node.attr('opacity', 0.85).attr('stroke-width', 1.5);
        link.attr('stroke-opacity', 0.4).attr('stroke-width', d => d.type === 'CONTEMPORARY_OF' ? 0.8 : 1.2);
        setHoveredNode(null);
      })
      .on('click', (_event, d) => {
        setSelectedNode(prev => prev?.id === d.id ? null : d);
      })
      .on('dblclick', (_event, d) => {
        navigate(`/scholars/${d.authorId}`);
      });

    // Labels for important nodes
    g.append('g')
      .attr('class', 'labels')
      .selectAll<SVGTextElement, GraphNode>('text')
      .data(nodes.filter(n => n.importance > 40 || n.degree > 4))
      .join('text')
      .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name)
      .attr('font-size', 9)
      .attr('font-family', "'Crimson Pro', Georgia, serif")
      .attr('fill', '#2C1810')
      .attr('text-anchor', 'middle')
      .attr('dy', d => -nodeRadius(d) - 4)
      .attr('pointer-events', 'none')
      .attr('opacity', 0.8);

    // Drag
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);
      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
      g.selectAll<SVGTextElement, GraphNode>('.labels text')
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Initial zoom to fit
    setTimeout(() => {
      if (nodes.length > 1) {
        const xs = nodes.map(n => n.x || width / 2);
        const ys = nodes.map(n => n.y || height / 2);
        const x0 = Math.min(...xs) - 50;
        const x1 = Math.max(...xs) + 50;
        const y0 = Math.min(...ys) - 50;
        const y1 = Math.max(...ys) + 50;
        const scale = Math.min(0.9, Math.min(width / (x1 - x0), height / (y1 - y0)));
        const tx = (width - scale * (x0 + x1)) / 2;
        const ty = (height - scale * (y0 + y1)) / 2;
        svg.transition().duration(600).call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }, 1500);

    return () => { simulation.stop(); };
  }, [nodes, links, navigate]);

  // Update URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedHavza) params.havza = selectedHavza;
    if (selectedCentury) params.century = selectedCentury;
    if (selectedPeriod) params.period = selectedPeriod;
    if (selectedRelType) params.rel = selectedRelType;
    setSearchParams(params, { replace: true });
  }, [selectedHavza, selectedCentury, selectedPeriod, selectedRelType, setSearchParams]);

  const handleSelectNode = useCallback((node: GraphNode) => {
    navigate(`/scholars/${node.authorId}`);
  }, [navigate]);

  if (aLoading || rLoading) return <div className="loading-screen">{t('common.loading')}</div>;

  const lang = i18n.language as 'tr' | 'en' | 'ar';

  return (
    <div className="network-page">
      <div className="list-header">
        <h1>{t('nav.network')}</h1>
        <span className="list-count">
          {nodes.length} {t('common.scholar_count')} · {links.length} {t('network.edges')}
        </span>
      </div>

      {/* Controls */}
      <div className="network-controls">
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

        <select
          className="filter-select"
          value={selectedCentury}
          onChange={e => setSelectedCentury(e.target.value)}
        >
          <option value="">{t('common.all')} — {t('scholar_detail.century')}</option>
          {centuries.map(c => (
            <option key={c} value={c}>{c}{t('dashboard.century_suffix')}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedPeriod}
          onChange={e => { setSelectedPeriod(e.target.value); setSelectedCentury(''); }}
          style={selectedPeriod ? { borderColor: PERIOD_COLORS[selectedPeriod as keyof typeof PERIOD_COLORS] } : {}}
        >
          <option value="">{t('common.all')} — {t('nav.periodization')}</option>
          {(['formation', 'development', 'contraction'] as const).map(pk => (
            <option key={pk} value={pk}>{t(`periods.${pk}`)}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedRelType}
          onChange={e => setSelectedRelType(e.target.value)}
        >
          <option value="">{t('common.all')} — {t('network.rel_type')}</option>
          {Object.entries(REL_LABELS).map(([key, labels]) => (
            <option key={key} value={key}>{labels[lang] || labels.en}</option>
          ))}
        </select>

        <label className="network-toggle">
          <input
            type="checkbox"
            checked={showAllEdges}
            onChange={e => setShowAllEdges(e.target.checked)}
          />
          <span>{t('network.show_all')}</span>
        </label>
      </div>

      <div className="network-layout">
        {/* Legend sidebar */}
        <div className="network-legend">
          {/* Havza legend */}
          <div className="network-legend-section">
            <div className="network-legend-title">{t('stats.havzas')}</div>
            {HAVZA_ORDER.filter(h => graphStats.havzaCounts[h]).map(h => (
              <button
                key={h}
                className={`map-legend-item ${selectedHavza === h ? 'map-legend-active' : ''}`}
                onClick={() => setSelectedHavza(prev => prev === h ? '' : h)}
              >
                <span className="map-legend-dot" style={{ background: HAVZA_COLORS[h] }} />
                <span className="map-legend-name">{t(`havza_names.${h}`)}</span>
                <span className="map-legend-count">{graphStats.havzaCounts[h] || 0}</span>
              </button>
            ))}
          </div>

          {/* Relation type legend */}
          <div className="network-legend-section">
            <div className="network-legend-title">{t('network.rel_type')}</div>
            {Object.entries(REL_LABELS).map(([key, labels]) => (
              <div key={key} className="network-rel-legend-item">
                <span className="network-rel-line" style={{
                  background: REL_COLORS[key],
                  borderStyle: key === 'CONTEMPORARY_OF' ? 'dashed' : 'solid',
                }} />
                <span className="map-legend-name">{labels[lang] || labels.en}</span>
                <span className="map-legend-count">{graphStats.typeCounts[key] || 0}</span>
              </div>
            ))}
          </div>

          <div className="network-legend-hint">
            {t('network.hint')}
          </div>
        </div>

        {/* Graph */}
        <div className="network-graph-wrap" ref={containerRef}>
          {nodes.length === 0 ? (
            <div className="network-empty">
              <div className="placeholder-icon">🕸️</div>
              <p>{t('common.no_results')}</p>
            </div>
          ) : (
            <>
              <svg ref={svgRef} className="network-svg" />
              {/* Tooltip */}
              {hoveredNode && (
                <div
                  className="network-tooltip"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <div className="network-tooltip-name">{hoveredNode.name}</div>
                  <div className="network-tooltip-meta">
                    <span style={{ color: HAVZA_COLORS[hoveredNode.havza] }}>
                      {t(`havza_names.${hoveredNode.havza}`)}
                    </span>
                    {hoveredNode.deathYear && ` · ö. ${hoveredNode.deathYear}`}
                    {` · ${hoveredNode.workCount} ${t('common.work_count')}`}
                    {` · ${hoveredNode.degree} ${t('network.edges')}`}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Selected node detail */}
        {selectedNode && (
          <div className="network-detail-panel">
            <div className="map-sidebar-header">
              <h3>{selectedNode.name}</h3>
              <button className="map-sidebar-close" onClick={() => setSelectedNode(null)}>×</button>
            </div>
            <div className="network-detail-body">
              <div className="meta-row">
                <span className="meta-key">{t('scholar_detail.havza')}</span>
                <span className="meta-val" style={{ color: HAVZA_COLORS[selectedNode.havza] }}>
                  {t(`havza_names.${selectedNode.havza}`)}
                </span>
              </div>
              {selectedNode.deathYear && (
                <div className="meta-row">
                  <span className="meta-key">{t('scholar_detail.death')}</span>
                  <span className="meta-val">{selectedNode.deathYear} {t('common.ce')}</span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-key">{t('scholar_detail.works')}</span>
                <span className="meta-val">{selectedNode.workCount}</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">{t('network.edges')}</span>
                <span className="meta-val">{selectedNode.degree}</span>
              </div>

              {/* Connected scholars */}
              <div className="network-connected">
                <h4>{t('network.connected')}</h4>
                {links
                  .filter(l => (l.source as GraphNode).id === selectedNode.id || (l.target as GraphNode).id === selectedNode.id)
                  .slice(0, 15)
                  .map((l, i) => {
                    const other = (l.source as GraphNode).id === selectedNode.id
                      ? (l.target as GraphNode) : (l.source as GraphNode);
                    return (
                      <button
                        key={i}
                        className="network-connected-item"
                        onClick={() => handleSelectNode(other)}
                      >
                        <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[other.havza] }} />
                        <span className="network-connected-name">{other.name}</span>
                        <span className="network-connected-type" style={{ color: REL_COLORS[l.type] }}>
                          {(REL_LABELS[l.type] || {})[lang] || l.type}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <button className="network-goto-btn" onClick={() => handleSelectNode(selectedNode)}>
                {t('network.go_to_scholar')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function nodeRadius(d: GraphNode): number {
  const base = Math.sqrt(d.importance || 10) * 0.8;
  return Math.max(4, Math.min(18, base + d.degree * 0.5));
}
