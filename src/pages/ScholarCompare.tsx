import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthors, useWorks, useRelations, useGraphMetrics } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS } from '../utils/colors';
import Seo from '../components/Seo';

const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#8a8a8a', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.3)' };
const td: CSSProperties = { padding: '8px 10px', fontSize: 14, borderBottom: '1px solid rgba(128,128,128,0.12)', verticalAlign: 'top' };
const tdLabel: CSSProperties = { ...td, color: '#8a8a8a', width: 150, whiteSpace: 'nowrap' };
const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid rgba(128,128,128,0.35)', borderRadius: 999, fontSize: 13.5 };
const xBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', fontSize: 16, lineHeight: 1, padding: 0 };
const pickCol: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, minWidth: 240, flex: 1 };
const inputStyle: CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const tagStyle: CSSProperties = { fontSize: 11.5, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(128,128,128,0.35)', color: '#8a8a8a' };

export default function ScholarCompare() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { authors, loading: aL } = useAuthors();
  const { works, loading: wL } = useWorks();
  const { relations, loading: rL } = useRelations();
  const { metrics, loading: gL } = useGraphMetrics();

  const aId = params.get('a') || '';
  const bId = params.get('b') || '';

  const byId = useMemo(() => {
    const m = new Map<string, Author>();
    for (const a of authors) m.set(a.author_id, a);
    return m;
  }, [authors]);

  const nameToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of authors) if (!m.has(a.meshur_isim)) m.set(a.meshur_isim, a.author_id);
    return m;
  }, [authors]);

  const slugName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of relations) {
      if (!m.has(r.source)) m.set(r.source, r.source_name);
      if (!m.has(r.target)) m.set(r.target, r.target_name);
    }
    return m;
  }, [relations]);

  const slugToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of authors) if (a.dia_slug) m.set(a.dia_slug, a.author_id);
    return m;
  }, [authors]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const add = (x: string, y: string) => { if (!m.has(x)) m.set(x, new Set()); m.get(x)!.add(y); };
    for (const r of relations) { add(r.source, r.target); add(r.target, r.source); }
    return m;
  }, [relations]);

  const worksCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const w of works) m[w.author_id] = (m[w.author_id] || 0) + 1;
    return m;
  }, [works]);

  const topGenres = useMemo(() => {
    const m: Record<string, [string, number][]> = {};
    const tmp: Record<string, Record<string, number>> = {};
    for (const w of works) {
      if (!tmp[w.author_id]) tmp[w.author_id] = {};
      tmp[w.author_id][w.eser_turu] = (tmp[w.author_id][w.eser_turu] || 0) + 1;
    }
    for (const id of Object.keys(tmp)) {
      m[id] = Object.entries(tmp[id]).sort((x, y) => y[1] - x[1]).slice(0, 3);
    }
    return m;
  }, [works]);

  const A = aId ? byId.get(aId) : undefined;
  const B = bId ? byId.get(bId) : undefined;
  const aSlug = A?.dia_slug || '';
  const bSlug = B?.dia_slug || '';

  const directRels = useMemo(() => {
    if (!aSlug || !bSlug) return [] as { kind: 'teacher' | 'contemporary'; from?: string; to?: string }[];
    const out: { kind: 'teacher' | 'contemporary'; from?: string; to?: string }[] = [];
    let hasContemp = false;
    for (const r of relations) {
      const ab = r.source === aSlug && r.target === bSlug;
      const ba = r.source === bSlug && r.target === aSlug;
      if (!ab && !ba) continue;
      if (r.type === 'TEACHER_OF') out.push({ kind: 'teacher', from: r.source, to: r.target });
      else if (r.type === 'STUDENT_OF') out.push({ kind: 'teacher', from: r.target, to: r.source });
      else if (r.type === 'CONTEMPORARY_OF' && !hasContemp) { out.push({ kind: 'contemporary' }); hasContemp = true; }
    }
    return out;
  }, [relations, aSlug, bSlug]);

  const shared = useMemo(() => {
    if (!aSlug || !bSlug) return [] as string[];
    const sa = adjacency.get(aSlug);
    const sb = adjacency.get(bSlug);
    if (!sa || !sb) return [];
    const res: string[] = [];
    for (const s of sa) if (s !== bSlug && sb.has(s)) res.push(s);
    return res.sort((x, y) => (slugName.get(x) || x).localeCompare(slugName.get(y) || y, 'tr'));
  }, [adjacency, aSlug, bSlug, slugName]);

  if (aL || wL || rL || gL) return <div className="loading-screen">{t('common.loading')}</div>;

  const setSide = (side: 'a' | 'b', id: string) => {
    const p = new URLSearchParams(params);
    if (id) p.set(side, id); else p.delete(side);
    setParams(p, { replace: true });
  };
  const swap = () => {
    const p = new URLSearchParams(params);
    if (aId) p.set('b', aId); else p.delete('b');
    if (bId) p.set('a', bId); else p.delete('a');
    setParams(p, { replace: true });
  };

  const nodeOf = (slug: string) => (slug && metrics?.nodes[slug]) || null;
  const nA = nodeOf(aSlug);
  const nB = nodeOf(bSlug);

  const num = (a: number | null | undefined, b: number | null | undefined, fmt: (x: number) => string = String): [ReactNode, ReactNode] => {
    const av = a == null ? null : a;
    const bv = b == null ? null : b;
    let ba = false, bb = false;
    if (av != null && bv != null && av !== bv) { if (av > bv) ba = true; else bb = true; }
    return [
      av == null ? '—' : <span style={{ fontWeight: ba ? 700 : 400 }}>{fmt(av)}</span>,
      bv == null ? '—' : <span style={{ fontWeight: bb ? 700 : 400 }}>{fmt(bv)}</span>,
    ];
  };

  const havzaBadge = (sch?: Author): ReactNode => sch
    ? <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 6, fontSize: 12.5, color: '#fff', background: HAVZA_COLORS[sch.havza] || '#888' }}>{t(`havza_names.${sch.havza}`, { defaultValue: sch.havza })}</span>
    : '—';

  const genreChips = (sch?: Author): ReactNode => {
    if (!sch) return '—';
    const g = topGenres[sch.author_id];
    if (!g || g.length === 0) return '—';
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5 }}>
        {g.map(([k, c]) => (
          <span key={k} style={{ fontSize: 11.5, padding: '1px 7px', borderRadius: 5, border: `1px solid ${TYPE_COLORS[k] || '#888'}`, color: '#8a8a8a' }}>
            {t(`source_types.${k}`, { defaultValue: k })} · {c}
          </span>
        ))}
      </span>
    );
  };

  const txt = (v: string | number | null | undefined): ReactNode => (v == null || v === '' ? '—' : String(v));

  const [eserA, eserB] = num(A ? (worksCount[A.author_id] || A.eser_sayisi || 0) : null, B ? (worksCount[B.author_id] || B.eser_sayisi || 0) : null);
  const [scoreA, scoreB] = num(A?.importance_score, B?.importance_score, (x) => x.toFixed(1));
  const [degA, degB] = num(nA?.degree, nB?.degree);
  const [btwA, btwB] = num(nA?.betweenness, nB?.betweenness, (x) => x.toFixed(3));
  const [hocaA, hocaB] = num(nA?.teachers, nB?.teachers);
  const [talA, talB] = num(nA?.students, nB?.students);
  const [cagA, cagB] = num(nA?.contemporaries, nB?.contemporaries);

  const rows: { label: string; a: ReactNode; b: ReactNode }[] = A && B ? [
    { label: t('scholar_detail.havza', { defaultValue: 'Havza' }), a: havzaBadge(A), b: havzaBadge(B) },
    { label: t('scholar_detail.century', { defaultValue: 'Yüzyıl' }), a: txt(A.yuzyil ? `${A.yuzyil}. ${t('dashboard.century_suffix', { defaultValue: 'yy' })}` : null), b: txt(B.yuzyil ? `${B.yuzyil}. ${t('dashboard.century_suffix', { defaultValue: 'yy' })}` : null) },
    { label: t('vs.death', { defaultValue: 'Vefat (m.)' }), a: txt(A.vefat_yili_m), b: txt(B.vefat_yili_m) },
    { label: t('vs.city', { defaultValue: 'Şehir' }), a: txt(A.sehir), b: txt(B.sehir) },
    { label: t('scholar_detail.madhhab', { defaultValue: 'Mezhep' }), a: txt(A.mezhep), b: txt(B.mezhep) },
    { label: t('canon.score', { defaultValue: 'Önem' }), a: scoreA, b: scoreB },
    { label: t('scholar_detail.works', { defaultValue: 'Eser' }), a: eserA, b: eserB },
    { label: t('vs.top_genres', { defaultValue: 'Öne çıkan türler' }), a: genreChips(A), b: genreChips(B) },
    { label: t('scholar_detail.teachers', { defaultValue: 'Hoca' }), a: hocaA, b: hocaB },
    { label: t('scholar_detail.students', { defaultValue: 'Talebe' }), a: talA, b: talB },
    { label: t('scholar_detail.contemporaries', { defaultValue: 'Çağdaş' }), a: cagA, b: cagB },
    { label: t('insights.degree', { defaultValue: 'Bağlantı' }), a: degA, b: degB },
    { label: t('insights.betweenness', { defaultValue: 'Aracılık' }), a: btwA, b: btwB },
  ] : [];

  const nameOf = (slug: string) => (slug === aSlug ? A?.meshur_isim : B?.meshur_isim) || slugName.get(slug) || slug;

  const renderPicker = (side: 'a' | 'b', sch: Author | undefined, label: string) => (
    <div style={pickCol}>
      <label style={{ fontSize: 13, color: '#8a8a8a', fontWeight: 600 }}>{label}</label>
      {sch
        ? <span style={chip}>{sch.meshur_isim}<button style={xBtn} onClick={() => setSide(side, '')} aria-label={t('vs.clear', { defaultValue: 'Kaldır' })}>×</button></span>
        : <span style={{ fontSize: 13, color: '#8a8a8a' }}>—</span>}
      <input
        list="ita-scholar-names"
        aria-label={label}
        placeholder={t('vs.search_ph', { defaultValue: 'Tarihçi ara…' })}
        style={inputStyle}
        onChange={(e) => {
          const id = nameToId.get(e.target.value.trim());
          if (id) { setSide(side, id); e.target.value = ''; }
        }}
      />
    </div>
  );

  return (
    <div className="list-page">
      <Seo title={t('vs.title', { defaultValue: 'Tarihçi Karşılaştırma' })} description={t('vs.subtitle', { defaultValue: 'İki tarihçiyi yan yana karşılaştırın' })} path="/tarihci-karsilastir" />
      <header className="list-header">
        <h1>{t('vs.title', { defaultValue: 'Tarihçi Karşılaştırma' })}</h1>
        <span className="list-count">{t('vs.subtitle', { defaultValue: 'İki tarihçiyi yan yana karşılaştırın' })}</span>
      </header>

      <p style={{ maxWidth: 660, color: '#8a8a8a', lineHeight: 1.6, margin: '0 0 16px' }}>
        {t('vs.intro', { defaultValue: 'İki tarihçi seçin; künye, üretkenlik, ağ konumu ve ortak bağlantılar yan yana karşılaştırılır.' })}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 22 }}>
        {renderPicker('a', A, t('vs.pick_a', { defaultValue: 'Birinci tarihçi' }))}
        {(A || B) && (
          <button onClick={swap} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', flex: '0 0 auto' }}>{t('vs.swap', { defaultValue: 'Yer değiştir' })}</button>
        )}
        {renderPicker('b', B, t('vs.pick_b', { defaultValue: 'İkinci tarihçi' }))}
      </div>
      <datalist id="ita-scholar-names">
        {authors.map((a) => <option key={a.author_id} value={a.meshur_isim} />)}
      </datalist>

      {!(A && B) ? (
        <p style={{ color: '#8a8a8a', fontSize: 14 }}>{t('vs.both_prompt', { defaultValue: 'Karşılaştırmak için iki tarihçi seçin.' })}</p>
      ) : (
        <>
          <section className="stat-section">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 760 }}>
                <thead>
                  <tr>
                    <th scope="col" style={th}>{t('vs.attribute', { defaultValue: 'Özellik' })}</th>
                    <th scope="col" style={th}><Link to={`/scholars/${A.author_id}`} className="rel-link">{A.meshur_isim}</Link></th>
                    <th scope="col" style={th}><Link to={`/scholars/${B.author_id}`} className="rel-link">{B.meshur_isim}</Link></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td style={tdLabel}>{r.label}</td>
                      <td style={td}>{r.a}</td>
                      <td style={td}>{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stat-section">
            <h2 className="stat-section-title">{t('vs.direct', { defaultValue: 'Aralarındaki ilişki' })}</h2>
            {!aSlug || !bSlug ? (
              <p style={{ color: '#8a8a8a', fontSize: 13.5 }}>{t('vs.no_network', { defaultValue: 'Ağ verisi yok (DİA bağlantısı olmayan tarihçi)' })}</p>
            ) : directRels.length === 0 ? (
              <p style={{ color: '#8a8a8a', fontSize: 13.5 }}>{t('vs.direct_none', { defaultValue: 'Veride doğrudan bir bağ yok' })}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {directRels.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {d.kind === 'teacher' ? (
                      <span style={{ fontSize: 14 }}>{nameOf(d.from!)} <span style={{ color: '#8a8a8a' }}>→</span> {nameOf(d.to!)}</span>
                    ) : (
                      <span style={{ fontSize: 14 }}>{A.meshur_isim} <span style={{ color: '#8a8a8a' }}>—</span> {B.meshur_isim}</span>
                    )}
                    <span style={tagStyle}>{d.kind === 'teacher' ? t('vs.tag_teacher', { defaultValue: 'Hoca → talebe' }) : t('vs.tag_contemporary', { defaultValue: 'Çağdaş' })}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12.5, color: '#8a8a8a', margin: '12px 0 0', maxWidth: 600, lineHeight: 1.5 }}>{t('insights.path_hint', { defaultValue: 'İki âlim arasındaki en kısa ilmî yolu Silsile sayfasındaki araçta bulabilirsiniz.' })}</p>
          </section>

          <section className="stat-section">
            <h2 className="stat-section-title">{t('vs.shared', { defaultValue: 'Ortak bağlantılar' })} {shared.length > 0 && <span style={{ color: '#8a8a8a', fontWeight: 400 }}>({shared.length})</span>}</h2>
            {!aSlug || !bSlug ? (
              <p style={{ color: '#8a8a8a', fontSize: 13.5 }}>{t('vs.no_network', { defaultValue: 'Ağ verisi yok (DİA bağlantısı olmayan tarihçi)' })}</p>
            ) : shared.length === 0 ? (
              <p style={{ color: '#8a8a8a', fontSize: 13.5 }}>{t('vs.shared_none', { defaultValue: 'Ortak bağlantı bulunamadı' })}</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {shared.map((slug) => {
                  const id = slugToId.get(slug);
                  const name = slugName.get(slug) || slug;
                  return id
                    ? <Link key={slug} to={`/scholars/${id}`} style={chip}>{name}</Link>
                    : <span key={slug} style={{ ...chip, color: '#8a8a8a' }}>{name}</span>;
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
