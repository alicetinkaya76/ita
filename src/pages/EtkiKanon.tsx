import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthors } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, PERIOD_COLORS, getPeriodId } from '../utils/colors';
import Seo from '../components/Seo';

const th: CSSProperties = { textAlign: 'left', padding: '7px 10px', fontSize: 13, color: '#8a8a8a', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.3)', whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '7px 10px', fontSize: 14, borderBottom: '1px solid rgba(128,128,128,0.12)', verticalAlign: 'middle' };
const tdNum: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#8a8a8a' };

// dedupe by display name (some figures appear under more than one havza record)
function dedupe(list: Author[]): Author[] {
  const seen = new Set<string>();
  const out: Author[] = [];
  for (const a of list) {
    const k = (a.meshur_isim || '').trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

export default function EtkiKanon() {
  const { t } = useTranslation();
  const { authors, loading } = useAuthors();

  const ranked = useMemo(
    () => [...authors].filter(a => typeof a.importance_score === 'number').sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0)),
    [authors]
  );

  const topOverall = useMemo(() => dedupe(ranked).slice(0, 20), [ranked]);

  const byPeriod = useMemo(() => {
    const periods = ['formation', 'development', 'contraction'];
    const m: Record<string, Author[]> = { formation: [], development: [], contraction: [] };
    for (const a of ranked) { const pid = getPeriodId(a.yuzyil); if (pid && m[pid]) m[pid].push(a); }
    return periods.map(p => ({ p, list: dedupe(m[p]).slice(0, 6) }));
  }, [ranked]);

  const byHavza = useMemo(() => {
    const m: Record<string, Author[]> = {};
    for (const h of HAVZA_ORDER) m[h] = [];
    for (const a of ranked) { if (m[a.havza]) m[a.havza].push(a); }
    return HAVZA_ORDER.filter(h => m[h].length).map(h => ({ h, list: dedupe(m[h]).slice(0, 3) }));
  }, [ranked]);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="list-page">
      <Seo
        title={t('canon.title', { defaultValue: 'Etki ve Kanon' })}
        description={t('canon.subtitle', { defaultValue: 'Önem skoruna göre öne çıkan tarihçiler' })}
        path="/etki-kanon"
      />
      <header className="list-header">
        <h1>{t('canon.title', { defaultValue: 'Etki ve Kanon' })}</h1>
        <span className="list-count">{t('canon.subtitle', { defaultValue: 'Önem skoruna göre öne çıkan tarihçiler' })}</span>
      </header>

      <p style={{ maxWidth: 660, color: '#8a8a8a', lineHeight: 1.6, margin: '0 0 6px' }}>
        {t('canon.intro', { defaultValue: 'İTA’nın her tarihçi için tanımladığı önem skoruna göre düzenlenmiş bir kanon görünümü. Sıralamalar; dönemlere ve havzalara göre öne çıkan isimleri ortaya koyar. Skor bileşik bir göstergedir ve mutlak bir değer değil, göreli bir öne çıkma ölçüsüdür.' })}
      </p>

      {/* Overall canon */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('canon.overall', { defaultValue: 'Genel kanon (ilk 20)' })}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 760 }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, textAlign: 'right', width: 36 }}>#</th>
                <th scope="col" style={th}>{t('scholar_detail.full_name', { defaultValue: 'Tarihçi' })}</th>
                <th scope="col" style={th}>{t('scholar_detail.havza', { defaultValue: 'Havza' })}</th>
                <th scope="col" style={{ ...th, textAlign: 'right' }}>{t('scholar_detail.century', { defaultValue: 'Yüzyıl' })}</th>
                <th scope="col" style={{ ...th, textAlign: 'right' }}>{t('canon.score', { defaultValue: 'Önem' })}</th>
                <th scope="col" style={{ ...th, textAlign: 'right' }}>{t('scholar_detail.works', { defaultValue: 'Eser' })}</th>
              </tr>
            </thead>
            <tbody>
              {topOverall.map((a, i) => (
                <tr key={a.author_id}>
                  <td style={{ ...tdNum, width: 36 }}>{i + 1}</td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />
                      <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                    </span>
                  </td>
                  <td style={{ ...td, color: '#8a8a8a' }}>{t(`havza_names.${a.havza}`, { defaultValue: a.havza })}</td>
                  <td style={tdNum}>{a.yuzyil ? `${a.yuzyil}.` : '—'}</td>
                  <td style={{ ...tdNum, color: '#8B4513', fontWeight: 600 }}>{Math.round(a.importance_score || 0)}</td>
                  <td style={tdNum}>{a.eser_sayisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By period */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('canon.by_period', { defaultValue: 'Döneme göre öne çıkanlar' })}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {byPeriod.map(({ p, list }) => (
            <div key={p} style={{ border: '1px solid rgba(128,128,128,0.2)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: PERIOD_COLORS[p] || '#999' }} />
                <strong style={{ fontSize: 15 }}>{t(`periods.${p}`, { defaultValue: p })}</strong>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
                {list.map(a => (
                  <li key={a.author_id}>
                    <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                    <span style={{ color: '#aaa', fontSize: 12.5 }}> · {a.yuzyil}.</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* By havza */}
      <section className="stat-section">
        <h2 className="stat-section-title">{t('canon.by_havza', { defaultValue: 'Havzaya göre öne çıkanlar' })}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {byHavza.map(({ h, list }) => (
            <div key={h} style={{ border: '1px solid rgba(128,128,128,0.18)', borderRadius: 12, padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: HAVZA_COLORS[h] || '#999' }} />
                <strong style={{ fontSize: 14 }}>{t(`havza_names.${h}`, { defaultValue: h })}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13.5 }}>
                {list.map(a => (
                  <Link key={a.author_id} to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
