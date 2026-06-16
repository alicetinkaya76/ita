import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthors, useRelations, useGraphMetrics } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import Seo from '../components/Seo';

const th: CSSProperties = { textAlign: 'left', padding: '7px 10px', fontSize: 13, color: '#8a8a8a', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.3)', whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '7px 10px', fontSize: 14, borderBottom: '1px solid rgba(128,128,128,0.12)', verticalAlign: 'middle' };
const tdNum: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#8a8a8a' };

export default function NetworkInsights() {
  const { t } = useTranslation();
  const { authors, loading: aL } = useAuthors();
  const { relations, loading: rL } = useRelations();
  const { metrics, loading: mL } = useGraphMetrics();

  const bySlug = useMemo(() => {
    const m = new Map<string, Author>();
    for (const a of authors) { if (a.dia_slug && !m.has(a.dia_slug)) m.set(a.dia_slug, a); }
    return m;
  }, [authors]);

  // Bridge figures: top scholars by betweenness centrality (connectors between circles)
  const bridges = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.nodes)
      .map(([slug, n]) => ({ slug, ...n }))
      .filter(n => (n.betweenness || 0) > 0)
      .sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0))
      .slice(0, 15);
  }, [metrics]);

  // Longest uninterrupted teacher -> student chains (cycle-guarded longest path)
  const chains = useMemo(() => {
    const T = relations.filter(r => r.type === 'TEACHER_OF' && r.source && r.target);
    const adj = new Map<string, Set<string>>();
    const name = new Map<string, string>();
    const nodes = new Set<string>();
    for (const r of T) {
      nodes.add(r.source); nodes.add(r.target);
      name.set(r.source, r.source_name || r.source);
      name.set(r.target, r.target_name || r.target);
      let s = adj.get(r.source); if (!s) { s = new Set(); adj.set(r.source, s); } s.add(r.target);
    }
    const memo = new Map<string, string[]>();
    const longest = (u: string, stack: Set<string>): string[] => {
      const cached = memo.get(u); if (cached) return cached;
      stack.add(u);
      let best: string[] = [u];
      for (const v of (adj.get(u) || [])) {
        if (stack.has(v)) continue; // skip back-edge → break cycles
        const sub = longest(v, stack);
        if (sub.length + 1 > best.length) best = [u, ...sub];
      }
      stack.delete(u);
      memo.set(u, best);
      return best;
    };
    const all: string[][] = [];
    for (const u of nodes) all.push(longest(u, new Set<string>()));
    all.sort((a, b) => b.length - a.length);
    const longestLen = all.length ? all[0].length : 0;
    // overlap-based dedupe: skip a chain if >50% of its nodes are already shown
    const picked: string[][] = [];
    const used = new Set<string>();
    for (const c of all) {
      if (c.length < 5) break;
      let ov = 0;
      for (const x of c) if (used.has(x)) ov++;
      if (ov / c.length > 0.5) continue;
      picked.push(c);
      for (const x of c) used.add(x);
      if (picked.length >= 4) break;
    }
    return { picked, name, longestLen };
  }, [relations]);

  if (aL || rL || mL) return <div className="loading-screen">{t('common.loading')}</div>;

  const node = (slug: string, nm: string) => {
    const a = bySlug.get(slug);
    return a
      ? <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
      : <span className="rel-external">{nm}</span>;
  };

  return (
    <div className="list-page">
      <Seo
        title={t('insights.title', { defaultValue: 'İlmî Ağın Yapısı' })}
        description={t('insights.subtitle', { defaultValue: 'Köprü figürler ve en uzun hoca–talebe silsileleri' })}
        path="/network-insights"
      />
      <header className="list-header">
        <h1>{t('insights.title', { defaultValue: 'İlmî Ağın Yapısı' })}</h1>
        <span className="list-count">{t('insights.subtitle', { defaultValue: 'Köprü figürler ve en uzun silsileler' })}</span>
      </header>

      {/* Bridge figures */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('insights.bridges', { defaultValue: 'Köprü figürler' })}</h2>
        <p style={{ fontSize: 13.5, color: '#8a8a8a', margin: '0 0 14px', maxWidth: 640, lineHeight: 1.55 }}>
          {t('insights.bridges_note', { defaultValue: 'Farklı ilim çevrelerini birbirine bağlayan, ağda en çok “köprü” konumundaki tarihçiler — aracılık (betweenness) merkeziliğine göre. Yüksek değer, kişinin farklı gelenekler arasında bilgi akışını sağlayan kilit bir aktarıcı olduğunu gösterir.' })}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'right', width: 36 }}>#</th>
                <th style={th}>{t('scholar_detail.full_name', { defaultValue: 'Tarihçi' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('insights.betweenness', { defaultValue: 'Aracılık' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('insights.degree', { defaultValue: 'Bağlantı' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('scholar_detail.teachers', { defaultValue: 'Hoca' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('scholar_detail.students', { defaultValue: 'Talebe' })}</th>
              </tr>
            </thead>
            <tbody>
              {bridges.map((b, i) => {
                const a = bySlug.get(b.slug);
                return (
                  <tr key={b.slug}>
                    <td style={{ ...tdNum, width: 36 }}>{i + 1}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {a && <span style={{ width: 9, height: 9, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />}
                        {node(b.slug, b.slug)}
                      </span>
                    </td>
                    <td style={tdNum}>{(b.betweenness || 0).toFixed(3)}</td>
                    <td style={tdNum}>{b.degree}</td>
                    <td style={tdNum}>{b.teachers}</td>
                    <td style={tdNum}>{b.students}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Longest chains */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('insights.chains', { defaultValue: 'En uzun hoca–talebe silsileleri' })}</h2>
        <p style={{ fontSize: 13.5, color: '#8a8a8a', margin: '0 0 14px', maxWidth: 640, lineHeight: 1.55 }}>
          {t('insights.chains_note', { defaultValue: 'Veride yer alan kesintisiz hoca→talebe zincirleri. Bağlı isimler İTA tarihçilerine gider; gri isimler İTA dışı aktarıcılardır. En uzun kesintisiz zincir' })} <strong style={{ color: '#8B4513' }}>{chains.longestLen} {t('insights.generations', { defaultValue: 'nesil' })}</strong>.
        </p>
        {chains.picked.map((c, i) => (
          <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, margin: '10px 0', padding: '11px 13px', background: 'rgba(128,128,128,0.06)', borderRadius: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a8a8a', marginRight: 4, whiteSpace: 'nowrap' }}>{c.length} {t('insights.generations', { defaultValue: 'nesil' })}</span>
            {c.map((slug, j) => (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14.5 }}>
                {node(slug, chains.name.get(slug) || slug)}
                {j < c.length - 1 && <span style={{ color: '#c0a98f' }}>→</span>}
              </span>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
