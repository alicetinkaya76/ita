import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import type { Author, Relation } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';

interface Props {
  relations: Relation[];
  slugToAuthor: Map<string, Author>;
  scholarOptions: Author[];
}

type RelKind = 'teacher' | 'student' | 'contemporary';
/** A node on the path; `rel` is this node's relationship to the PREVIOUS node. */
interface Hop { slug: string; name: string; rel: RelKind | null }

export default function IsnadPath({ relations, slugToAuthor, scholarOptions }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fromSlug, setFromSlug] = useState('');
  const [toSlug, setToSlug] = useState('');
  const [tsOnly, setTsOnly] = useState(false);

  // Adjacency on the FULL relation graph. rel = neighbour's relationship to the key node.
  const adj = useMemo(() => {
    const m = new Map<string, { to: string; rel: RelKind }[]>();
    const push = (a: string, b: string, rel: RelKind) => {
      const arr = m.get(a);
      if (arr) arr.push({ to: b, rel }); else m.set(a, [{ to: b, rel }]);
    };
    for (const r of relations) {
      if (r.source === r.target) continue;
      if (r.type === 'TEACHER_OF') { push(r.source, r.target, 'student'); push(r.target, r.source, 'teacher'); }
      else if (r.type === 'STUDENT_OF') { push(r.source, r.target, 'teacher'); push(r.target, r.source, 'student'); }
      else if (r.type === 'CONTEMPORARY_OF') { push(r.source, r.target, 'contemporary'); push(r.target, r.source, 'contemporary'); }
    }
    return m;
  }, [relations]);

  // Display name for any slug (İTA author name, else the DİA name from relations).
  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of relations) {
      if (!m.has(r.source)) m.set(r.source, r.source_name);
      if (!m.has(r.target)) m.set(r.target, r.target_name);
    }
    for (const [slug, a] of slugToAuthor) m.set(slug, a.meshur_isim);
    return m;
  }, [relations, slugToAuthor]);

  // BFS shortest path (fewest hops). Skips contemporary edges when tsOnly.
  const path = useMemo<Hop[] | null>(() => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return null;
    const prev = new Map<string, { from: string; rel: RelKind }>();
    const visited = new Set<string>([fromSlug]);
    const queue: string[] = [fromSlug];
    let found = false;
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === toSlug) { found = true; break; }
      for (const { to, rel } of adj.get(cur) || []) {
        if (tsOnly && rel === 'contemporary') continue;
        if (!visited.has(to)) {
          visited.add(to);
          prev.set(to, { from: cur, rel });
          queue.push(to);
        }
      }
    }
    if (!found) return null;
    const hops: Hop[] = [];
    let cur = toSlug;
    while (cur !== fromSlug) {
      const p = prev.get(cur)!;
      hops.unshift({ slug: cur, name: nameOf.get(cur) || cur, rel: p.rel });
      cur = p.from;
    }
    hops.unshift({ slug: fromSlug, name: nameOf.get(fromSlug) || fromSlug, rel: null });
    return hops;
  }, [fromSlug, toSlug, adj, nameOf, tsOnly]);

  const bothChosen = Boolean(fromSlug && toSlug);

  return (
    <div className="isnad-path">
      <h2 className="isnad-path-title">{t('silsile.path_title')}</h2>

      <div className="isnad-path-pickers">
        <ScholarPicker label={t('silsile.path_from')} value={fromSlug} onSelect={setFromSlug} options={scholarOptions} slugToAuthor={slugToAuthor} />
        <span className="isnad-path-arrow" aria-hidden="true">→</span>
        <ScholarPicker label={t('silsile.path_to')} value={toSlug} onSelect={setToSlug} options={scholarOptions} slugToAuthor={slugToAuthor} />
      </div>

      <label className="isnad-path-toggle">
        <input type="checkbox" checked={tsOnly} onChange={e => setTsOnly(e.target.checked)} />
        <span>{t('silsile.path_ts_only')}</span>
      </label>

      {bothChosen && (
        fromSlug === toSlug ? (
          <p className="isnad-path-note">{t('silsile.path_same')}</p>
        ) : path ? (
          <div className="isnad-path-result">
            <div className="isnad-path-count">{path.length - 1} {t('silsile.path_steps')}</div>
            <ol className="isnad-chain">
              {path.map((hop, i) => {
                const a = slugToAuthor.get(hop.slug);
                return (
                  <li key={hop.slug + i} className="isnad-chain-item">
                    {hop.rel && <span className="isnad-chain-rel">{t(hop.rel === 'contemporary' ? 'silsile.rel_contemporary' : 'silsile.rel_ts')}</span>}
                    {a ? (
                      <button className="isnad-chain-node isnad-chain-link" onClick={() => navigate(`/scholars/${a.author_id}`, { viewTransition: true })}>
                        <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[a.havza] }} />
                        {hop.name}
                      </button>
                    ) : (
                      <span className="isnad-chain-node isnad-chain-ext">
                        <span className="chip-dot-sm" style={{ background: '#B0A29A' }} />
                        {hop.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="isnad-path-note">{t('silsile.path_none')}</p>
        )
      )}
    </div>
  );
}

function ScholarPicker({ label, value, onSelect, options, slugToAuthor }: {
  label: string;
  value: string;
  onSelect: (slug: string) => void;
  options: Author[];
  slugToAuthor: Map<string, Author>;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const fuse = useMemo(() => new Fuse(options, { keys: ['meshur_isim', 'tam_isim'], threshold: 0.35 }), [options]);
  const results = useMemo(() => (q.trim() ? fuse.search(q).slice(0, 8).map(r => r.item) : []), [q, fuse]);
  const selected = value ? slugToAuthor.get(value) : null;

  return (
    <div className="isnad-picker">
      <span className="isnad-picker-label">{label}</span>
      {selected ? (
        <div className="isnad-picker-chip">
          <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[selected.havza] }} />
          <span className="isnad-picker-chip-name">{selected.meshur_isim}</span>
          <button className="isnad-picker-clear" onClick={() => onSelect('')} aria-label="×">×</button>
        </div>
      ) : (
        <div className="isnad-picker-search">
          <input
            className="isnad-picker-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('silsile.search_placeholder')}
          />
          {results.length > 0 && (
            <div className="isnad-picker-dropdown">
              {results.map(a => (
                <button key={a.author_id} className="isnad-picker-option" onClick={() => { onSelect(a.dia_slug!); setQ(''); }}>
                  <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[a.havza] }} />
                  <span className="isnad-picker-option-name">{a.meshur_isim}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
