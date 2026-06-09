import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import * as d3 from 'd3';
import { useAuthors, useRelations, type Author, type Relation } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';

/* ── Types ── */
interface TreeNode {
  slug: string;
  name: string;
  havza: string;
  authorId?: string;
  depth: number;
  direction: 'teacher' | 'student' | 'center';
  children: TreeNode[];
}

interface FlatNode {
  slug: string;
  name: string;
  havza: string;
  authorId?: string;
  depth: number;
  direction: 'teacher' | 'student' | 'center';
  x: number;
  y: number;
}

/* ── Build chain helper ── */
function buildChain(
  centerSlug: string,
  relations: Relation[],
  slugToAuthor: Map<string, Author>,
  maxDepth: number
): { teachers: TreeNode; students: TreeNode; center: TreeNode } {
  const centerAuthor = slugToAuthor.get(centerSlug);
  const center: TreeNode = {
    slug: centerSlug,
    name: centerAuthor?.meshur_isim || centerSlug,
    havza: centerAuthor?.havza || 'diger',
    authorId: centerAuthor?.author_id,
    depth: 0,
    direction: 'center',
    children: [],
  };

  // Index TEACHER_OF relations
  const teacherOf = new Map<string, { target: string; target_name: string }[]>();
  const studentOf = new Map<string, { source: string; source_name: string }[]>();
  for (const r of relations) {
    if (r.type !== 'TEACHER_OF') continue;
    // source teaches target => source is teacher of target
    if (!teacherOf.has(r.source)) teacherOf.set(r.source, []);
    teacherOf.get(r.source)!.push({ target: r.target, target_name: r.target_name });
    if (!studentOf.has(r.target)) studentOf.set(r.target, []);
    studentOf.get(r.target)!.push({ source: r.source, source_name: r.source_name });
  }

  function findTeachers(slug: string, depth: number, visited: Set<string>): TreeNode[] {
    if (depth >= maxDepth) return [];
    const entries = studentOf.get(slug) || [];
    const nodes: TreeNode[] = [];
    for (const e of entries) {
      if (visited.has(e.source)) continue;
      visited.add(e.source);
      const a = slugToAuthor.get(e.source);
      const node: TreeNode = {
        slug: e.source,
        name: a?.meshur_isim || e.source_name,
        havza: a?.havza || 'diger',
        authorId: a?.author_id,
        depth: depth + 1,
        direction: 'teacher',
        children: [],
      };
      node.children = findTeachers(e.source, depth + 1, visited);
      nodes.push(node);
    }
    return nodes;
  }

  function findStudents(slug: string, depth: number, visited: Set<string>): TreeNode[] {
    if (depth >= maxDepth) return [];
    const entries = teacherOf.get(slug) || [];
    const nodes: TreeNode[] = [];
    for (const e of entries) {
      if (visited.has(e.target)) continue;
      visited.add(e.target);
      const a = slugToAuthor.get(e.target);
      const node: TreeNode = {
        slug: e.target,
        name: a?.meshur_isim || e.target_name,
        havza: a?.havza || 'diger',
        authorId: a?.author_id,
        depth: depth + 1,
        direction: 'student',
        children: [],
      };
      node.children = findStudents(e.target, depth + 1, visited);
      nodes.push(node);
    }
    return nodes;
  }

  const visited = new Set([centerSlug]);
  const teacherTree: TreeNode = { ...center, direction: 'teacher', children: findTeachers(centerSlug, 0, new Set(visited)) };
  const studentTree: TreeNode = { ...center, direction: 'student', children: findStudents(centerSlug, 0, new Set(visited)) };

  return { teachers: teacherTree, students: studentTree, center };
}

/* ── Flatten tree for rendering ── */
function flattenTree(root: TreeNode, direction: 'left' | 'right', centerY: number): FlatNode[] {
  if (!root.children.length) return [];
  const nodes: FlatNode[] = [];
  const h = d3.hierarchy(root);
  const treeLayout = d3.tree<TreeNode>().nodeSize([36, 180]);
  treeLayout(h);

  h.descendants().forEach((d) => {
    if (d.depth === 0) return; // skip root (center drawn separately)
    nodes.push({
      slug: d.data.slug,
      name: d.data.name,
      havza: d.data.havza,
      authorId: d.data.authorId,
      depth: d.data.depth,
      direction: d.data.direction,
      x: direction === 'left' ? -(d.y ?? 0) : (d.y ?? 0),
      y: (d.x ?? 0) + centerY,
    });
  });
  return nodes;
}

/* ── Main Component ── */
export default function SilsileView() {
  const { t } = useTranslation();
  const { authors, loading: aLoading } = useAuthors();
  const { relations, loading: rLoading } = useRelations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [maxGen, setMaxGen] = useState(3);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSlug = searchParams.get('scholar') || '';

  const slugToAuthor = useMemo(() => {
    const m = new Map<string, Author>();
    for (const a of authors) {
      if (a.dia_slug) m.set(a.dia_slug, a);
    }
    return m;
  }, [authors]);

  // Scholars with DIA relations
  const scholarOptions = useMemo(() => {
    const slugsInRelations = new Set<string>();
    for (const r of relations) {
      if (r.type === 'TEACHER_OF') {
        slugsInRelations.add(r.source);
        slugsInRelations.add(r.target);
      }
    }
    return authors.filter(a => a.dia_slug && slugsInRelations.has(a.dia_slug));
  }, [authors, relations]);

  const fuse = useMemo(
    () => new Fuse(scholarOptions, { keys: ['meshur_isim', 'tam_isim'], threshold: 0.35 }),
    [scholarOptions]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuse.search(searchQuery).slice(0, 12).map(r => r.item);
  }, [searchQuery, fuse]);

  const selectScholar = useCallback((slug: string) => {
    setSearchParams({ scholar: slug }, { replace: true });
    setSearchQuery('');
  }, [setSearchParams]);

  const selectedAuthor = useMemo(() => {
    if (!selectedSlug) return null;
    return slugToAuthor.get(selectedSlug) || null;
  }, [selectedSlug, slugToAuthor]);

  // Build tree data
  const treeData = useMemo(() => {
    if (!selectedSlug || !relations.length) return null;
    return buildChain(selectedSlug, relations, slugToAuthor, maxGen);
  }, [selectedSlug, relations, slugToAuthor, maxGen]);

  // Count nodes
  const nodeCount = useMemo(() => {
    if (!treeData) return { teachers: 0, students: 0 };
    function count(n: TreeNode): number { return 1 + n.children.reduce((s, c) => s + count(c), 0); }
    return {
      teachers: treeData.teachers.children.reduce((s, c) => s + count(c), 0),
      students: treeData.students.children.reduce((s, c) => s + count(c), 0),
    };
  }, [treeData]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || !treeData) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current?.clientWidth || 900;
    const centerX = width / 2;
    const centerY = 300;

    // Build flat node lists
    const teacherNodes = flattenTree(treeData.teachers, 'left', centerY);
    const studentNodes = flattenTree(treeData.students, 'right', centerY);

    // Compute bounds
    const allNodes = [...teacherNodes, ...studentNodes];
    const minY = Math.min(centerY, ...allNodes.map(n => n.y)) - 60;
    const maxY = Math.max(centerY, ...allNodes.map(n => n.y)) + 60;
    const minX = Math.min(0, ...teacherNodes.map(n => n.x)) - 120;
    const maxX = Math.max(0, ...studentNodes.map(n => n.x)) + 120;
    const totalHeight = maxY - minY + 40;

    svg.attr('viewBox', `${minX + centerX - 20} ${minY} ${maxX - minX + 40} ${totalHeight}`);
    svg.attr('height', Math.max(totalHeight, 400));

    const cs = getComputedStyle(document.documentElement);
    const textColor = cs.getPropertyValue('--text-primary').trim() || '#2C1810';
    const textMuted = cs.getPropertyValue('--text-muted').trim() || '#9B8C7E';
    const borderColor = cs.getPropertyValue('--border').trim() || '#E2D9CE';
    const bgCard = cs.getPropertyValue('--bg-card').trim() || '#FFFFFF';
    const accent = cs.getPropertyValue('--accent').trim() || '#8B4513';

    // Draw links from center to teachers
    function drawLinks(nodes: FlatNode[], parentX: number, parentY: number, side: 'left' | 'right') {
      // Build parent mapping using depth
      const byDepth = new Map<number, FlatNode[]>();
      for (const n of nodes) {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth)!.push(n);
      }

      // Depth 1 connects to center
      const depth1 = byDepth.get(1) || [];
      for (const n of depth1) {
        const midX = (parentX + centerX + n.x + centerX) / 2;
        svg.append('path')
          .attr('d', `M${parentX + centerX},${parentY} C${midX},${parentY} ${midX},${n.y} ${n.x + centerX},${n.y}`)
          .attr('fill', 'none')
          .attr('stroke', borderColor)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.6);
      }

      // Deeper nodes — approximate: connect each depth d to nearest depth d-1
      for (let d = 2; d <= maxGen; d++) {
        const current = byDepth.get(d) || [];
        const parents = byDepth.get(d - 1) || [];
        if (!parents.length) continue;
        for (const n of current) {
          // Find closest parent by Y
          const parent = parents.reduce((best, p) => Math.abs(p.y - n.y) < Math.abs(best.y - n.y) ? p : best, parents[0]);
          const midX = (parent.x + centerX + n.x + centerX) / 2;
          svg.append('path')
            .attr('d', `M${parent.x + centerX},${parent.y} C${midX},${parent.y} ${midX},${n.y} ${n.x + centerX},${n.y}`)
            .attr('fill', 'none')
            .attr('stroke', borderColor)
            .attr('stroke-width', 1)
            .attr('opacity', 0.4);
        }
      }
    }

    drawLinks(teacherNodes, 0, centerY, 'left');
    drawLinks(studentNodes, 0, centerY, 'right');

    // Labels for sides
    if (teacherNodes.length > 0) {
      svg.append('text')
        .attr('x', centerX + minX + 30)
        .attr('y', minY + 20)
        .attr('fill', textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('text-transform', 'uppercase')
        .attr('letter-spacing', '0.08em')
        .text(`← ${t('scholar_detail.teachers')}`);
    }
    if (studentNodes.length > 0) {
      svg.append('text')
        .attr('x', centerX + maxX - 100)
        .attr('y', minY + 20)
        .attr('fill', textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.08em')
        .text(`${t('scholar_detail.students')} →`);
    }

    // Draw nodes (teacher side)
    function drawNode(n: FlatNode) {
      const g = svg.append('g')
        .attr('transform', `translate(${n.x + centerX}, ${n.y})`)
        .style('cursor', n.authorId ? 'pointer' : 'default');

      const color = HAVZA_COLORS[n.havza] || '#757575';

      g.append('circle')
        .attr('r', 7)
        .attr('fill', color)
        .attr('stroke', bgCard)
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', n.direction === 'teacher' ? -14 : 14)
        .attr('y', 4)
        .attr('text-anchor', n.direction === 'teacher' ? 'end' : 'start')
        .attr('fill', textColor)
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(n.name.length > 28 ? n.name.slice(0, 26) + '…' : n.name);

      if (n.authorId) {
        g.on('click', () => {
          window.location.href = `/scholars/${n.authorId}`;
        });
        g.on('mouseover', function () {
          d3.select(this).select('circle').attr('r', 9).attr('stroke', accent).attr('stroke-width', 2.5);
          d3.select(this).select('text').attr('fill', accent).attr('font-weight', '700');
        });
        g.on('mouseout', function () {
          d3.select(this).select('circle').attr('r', 7).attr('stroke', bgCard).attr('stroke-width', 2);
          d3.select(this).select('text').attr('fill', textColor).attr('font-weight', '500');
        });
      }
    }

    teacherNodes.forEach(drawNode);
    studentNodes.forEach(drawNode);

    // Center node
    const cg = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .style('cursor', selectedAuthor ? 'pointer' : 'default');

    cg.append('circle')
      .attr('r', 14)
      .attr('fill', accent)
      .attr('stroke', bgCard)
      .attr('stroke-width', 3);

    cg.append('text')
      .attr('y', -22)
      .attr('text-anchor', 'middle')
      .attr('fill', accent)
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .text(selectedAuthor?.meshur_isim || selectedSlug);

    if (selectedAuthor) {
      cg.on('click', () => { window.location.href = `/scholars/${selectedAuthor.author_id}`; });
    }

  }, [treeData, selectedSlug, selectedAuthor, maxGen, t]);

  if (aLoading || rLoading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="silsile-page">
      <header className="list-header">
        <h1>{t('silsile.title')}</h1>
        <span className="list-count">{t('silsile.subtitle')}</span>
      </header>

      {/* Search + Controls */}
      <div className="silsile-controls">
        <div className="silsile-search-wrap">
          <input
            type="text"
            className="search-input"
            placeholder={t('silsile.search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="silsile-dropdown">
              {searchResults.map(a => (
                <button
                  key={a.author_id}
                  className="silsile-option"
                  onClick={() => selectScholar(a.dia_slug)}
                >
                  <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[a.havza] }} />
                  <span className="silsile-opt-name">{a.meshur_isim}</span>
                  <span className="silsile-opt-meta">
                    {t(`havza_names.${a.havza}`)} · {a.vefat_yili_m || '?'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="silsile-gen-control">
          <label>{t('silsile.generations')}</label>
          <select value={maxGen} onChange={e => setMaxGen(Number(e.target.value))} className="filter-select">
            {[2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedSlug && selectedAuthor && (
        <div className="silsile-info-bar">
          <Link to={`/scholars/${selectedAuthor.author_id}`} className="silsile-center-link">
            <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[selectedAuthor.havza] }} />
            {selectedAuthor.meshur_isim}
          </Link>
          <span className="silsile-info-stat">
            {nodeCount.teachers} {t('scholar_detail.teachers').toLowerCase()} · {nodeCount.students} {t('scholar_detail.students').toLowerCase()}
          </span>
        </div>
      )}

      {/* Tree SVG */}
      {selectedSlug ? (
        <div className="silsile-graph-wrap" ref={containerRef}>
          <svg ref={svgRef} className="silsile-svg" />
          <p className="silsile-hint">{t('silsile.hint')}</p>
        </div>
      ) : (
        <div className="silsile-empty">
          <span className="silsile-empty-icon">🔗</span>
          <p>{t('silsile.empty')}</p>
        </div>
      )}
    </div>
  );
}
