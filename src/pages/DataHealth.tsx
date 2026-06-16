import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthors, useWorks, useRelations } from '../hooks/useData';
import type { Author, Work } from '../hooks/useData';
import { HAVZA_ORDER, HAVZA_COLORS } from '../utils/colors';
import Seo from '../components/Seo';
import ExportButton from '../components/ui/ExportButton';

function CoverageBar({ label, filled, total }: { label: string; filled: number; total: number }) {
  const pct = total ? (filled / total) * 100 : 0;
  const color = pct >= 75 ? '#2E7D32' : pct >= 40 ? '#B8860B' : '#C0392B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, margin: '7px 0' }}>
      <span style={{ width: 168, color: '#8a8a8a', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, background: 'rgba(128,128,128,0.18)', borderRadius: 6, height: 18, overflow: 'hidden', maxWidth: 420 }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 6 }} />
      </span>
      <span style={{ width: 104, color: '#8a8a8a', flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
        {pct.toFixed(0)}% · {filled.toLocaleString()}
      </span>
    </div>
  );
}

const th: CSSProperties = { textAlign: 'left', padding: '7px 10px', fontSize: 13, color: '#8a8a8a', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.3)', whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '7px 10px', fontSize: 14, borderBottom: '1px solid rgba(128,128,128,0.12)' };
const tdNum: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#8a8a8a' };

function pctCell(filled: number, total: number): CSSProperties {
  const pct = total ? (filled / total) * 100 : 0;
  const color = pct >= 75 ? '#2E7D32' : pct >= 40 ? '#B8860B' : '#C0392B';
  return { ...tdNum, color, fontWeight: 600 };
}

const AUTHOR_FIELDS = ['author_id', 'meshur_isim', 'tam_isim', 'arabic_name', 'havza', 'yuzyil', 'dogum_yili_h', 'dogum_yili_m', 'vefat_yili_h', 'vefat_yili_m', 'sehir', 'mezhep', 'kimlik', 'eser_sayisi', 'importance_score', 'dia_slug', 'dia_url'];
const WORK_FIELDS = ['work_id', 'author_id', 'havza', 'eser_adi', 'eser_turu', 'dil', 'hanedan', 'yazilma_sehri', 'kaynak_sayfa', 'tanitim'];
const RELATION_FIELDS = ['source', 'source_name', 'type', 'target', 'target_name', 'both_in_itta'];
const s = (v: unknown) => (v == null ? '' : String(v));

const codeStyle: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, background: 'rgba(128,128,128,0.14)', padding: '1px 6px', borderRadius: 5 };
const preStyle: CSSProperties = { background: 'rgba(128,128,128,0.1)', border: '1px solid rgba(128,128,128,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.55, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: '8px 0 0' };
const noteStyle: CSSProperties = { fontSize: 13, color: '#8a8a8a', margin: '0 0 10px', maxWidth: 620, lineHeight: 1.55 };
const subhStyle: CSSProperties = { fontSize: 14, margin: '16px 0 5px' };
const dlRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', border: '1px solid rgba(128,128,128,0.2)', borderRadius: 8 };

export default function DataHealth() {
  const { t } = useTranslation();
  const { authors, loading: aL } = useAuthors();
  const { works, loading: wL } = useWorks();
  const { relations, loading: rL } = useRelations();

  const authorCov = useMemo(() => {
    const n = authors.length;
    const str = (k: keyof Author) => authors.filter(a => a[k] != null && String(a[k]).trim() !== '').length;
    const num = (fn: (a: Author) => boolean) => authors.filter(fn).length;
    const items: [string, number][] = [
      ['Yüzyıl', num(a => a.yuzyil != null)],
      ['Vefat yılı (m.)', num(a => a.vefat_yili_m != null)],
      ['Önem skoru', num(a => typeof a.importance_score === 'number')],
      ['Eser sayısı', num(a => a.eser_sayisi > 0)],
      ['DİA bağlantısı', str('dia_slug')],
      ['Kimlik / biyografi', str('kimlik')],
      ['Şehir', str('sehir')],
      ['Mezhep', str('mezhep')],
      ['Doğum yılı (m.)', num(a => a.dogum_yili_m != null)],
    ];
    return { n, items };
  }, [authors]);

  const workCov = useMemo(() => {
    const n = works.length;
    const str = (k: keyof Work) => works.filter(w => w[k] != null && String(w[k]).trim() !== '').length;
    const items: [string, number][] = [
      ['Eser türü', str('eser_turu')],
      ['Dil', str('dil')],
      ['Tanıtım', str('tanitim')],
      ['Hanedan', str('hanedan')],
      ['Yazıldığı şehir', str('yazilma_sehri')],
    ];
    return { n, items };
  }, [works]);

  const havzaCov = useMemo(() => {
    const m: Record<string, { total: number; sehir: number; vefat: number }> = {};
    for (const h of HAVZA_ORDER) m[h] = { total: 0, sehir: 0, vefat: 0 };
    for (const a of authors) {
      const row = m[a.havza];
      if (!row) continue;
      row.total++;
      if ((a.sehir || '').trim()) row.sehir++;
      if (a.vefat_yili_m != null) row.vefat++;
    }
    return HAVZA_ORDER.map(h => ({ h, ...m[h] }));
  }, [authors]);

  const relCov = useMemo(() => {
    const byType: Record<string, number> = {};
    let both = 0;
    for (const r of relations) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.both_in_itta) both++;
    }
    return { total: relations.length, byType, both };
  }, [relations]);

  if (aL || wL || rL) return <div className="loading-screen">{t('common.loading')}</div>;

  const year = new Date().getFullYear();
  const siteUrl = 'https://alicetinkaya76.github.io/ita/';
  const citationText = `Çetinkaya, Ali. İslam Tarihyazım Atlası (İTA). Selçuk Üniversitesi, ${year}. ${siteUrl}`;
  const bibtex = `@misc{ita_${year},
  author       = {Çetinkaya, Ali},
  title        = {İslam Tarihyazım Atlası (İTA)},
  year         = {${year}},
  howpublished = {\\url{${siteUrl}}},
  institution  = {Selçuk Üniversitesi}
}`;

  return (
    <div className="list-page">
      <Seo
        title={t('health.title', { defaultValue: 'Veri Sağlığı' })}
        description={t('health.intro_short', { defaultValue: 'Alanların doluluk oranları ve tamamlama yol haritası.' })}
        path="/veri-sagligi"
      />
      <header className="list-header">
        <h1>{t('health.title', { defaultValue: 'Veri Sağlığı' })}</h1>
        <span className="list-count">{authors.length.toLocaleString()} {t('common.scholar_count')} · {works.length.toLocaleString()} {t('common.work_count')}</span>
      </header>

      <p style={{ maxWidth: 660, color: '#8a8a8a', lineHeight: 1.6, margin: '0 0 6px' }}>
        {t('health.intro', { defaultValue: 'Hangi alanların ne ölçüde dolu olduğunun şeffaf dökümü. Bu panel yeni bir iddia üretmez; mevcut verinin kapsamını gösterir ve tamamlama için bir yol haritası sunar.' })}
      </p>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.author_fields', { defaultValue: 'Tarihçi alanları' })}</h2>
        {authorCov.items.map(([l, f]) => <CoverageBar key={l} label={l} filled={f} total={authorCov.n} />)}
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.work_fields', { defaultValue: 'Eser alanları' })}</h2>
        {workCov.items.map(([l, f]) => <CoverageBar key={l} label={l} filled={f} total={workCov.n} />)}
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.by_havza', { defaultValue: 'Havzaya göre tamamlanma' })}</h2>
        <p style={{ fontSize: 13, color: '#8a8a8a', margin: '0 0 12px', maxWidth: 560, lineHeight: 1.5 }}>
          {t('health.by_havza_note', { defaultValue: 'Şehir ve vefat yılı, harita ve zaman analizlerini besleyen iki kilit alan. Tablo, hangi havzanın tamamlamaya öncelik vermesi gerektiğini gösterir.' })}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>{t('scholar_detail.havza', { defaultValue: 'Havza' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('common.scholar_count', { defaultValue: 'Tarihçi' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('health.city_pct', { defaultValue: 'Şehir %' })}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('health.death_pct', { defaultValue: 'Vefat yılı %' })}</th>
              </tr>
            </thead>
            <tbody>
              {havzaCov.map(r => (
                <tr key={r.h}>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: HAVZA_COLORS[r.h] || '#999' }} />
                      {t(`havza_names.${r.h}`, { defaultValue: r.h })}
                    </span>
                  </td>
                  <td style={tdNum}>{r.total}</td>
                  <td style={pctCell(r.sehir, r.total)}>{r.total ? Math.round((r.sehir / r.total) * 100) : 0}%</td>
                  <td style={pctCell(r.vefat, r.total)}>{r.total ? Math.round((r.vefat / r.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.relations', { defaultValue: 'İlişkiler' })}</h2>
        <div className="stat-relations-grid">
          <div className="stat-rel-card">
            <span className="stat-rel-value">{relCov.total.toLocaleString()}</span>
            <span className="stat-rel-label">{t('health.total_relations', { defaultValue: 'Toplam ilişki' })}</span>
          </div>
          <div className="stat-rel-card">
            <span className="stat-rel-value">{(relCov.byType['TEACHER_OF'] || 0).toLocaleString()}</span>
            <span className="stat-rel-label">{t('scholar_detail.teachers', { defaultValue: 'Hoca–talebe' })}</span>
          </div>
          <div className="stat-rel-card">
            <span className="stat-rel-value">{(relCov.byType['CONTEMPORARY_OF'] || 0).toLocaleString()}</span>
            <span className="stat-rel-label">{t('scholar_detail.contemporaries', { defaultValue: 'Çağdaşlık' })}</span>
          </div>
          <div className="stat-rel-card">
            <span className="stat-rel-value">{relCov.both.toLocaleString()}</span>
            <span className="stat-rel-label">{t('health.both_in_itta', { defaultValue: 'İki ucu da İTA’da' })}</span>
          </div>
        </div>
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.downloads')}</h2>
        <p style={noteStyle}>{t('health.downloads_note')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
          <div style={dlRowStyle}>
            <span><strong>{t('health.ds_authors')}</strong> · {authors.length.toLocaleString()} {t('health.records')} · <code style={codeStyle}>itta_authors.json</code></span>
            <ExportButton data={authors} filename="ita-tarihciler" csvHeaders={AUTHOR_FIELDS} csvRow={(a) => AUTHOR_FIELDS.map((k) => s((a as unknown as Record<string, unknown>)[k]))} />
          </div>
          <div style={dlRowStyle}>
            <span><strong>{t('health.ds_works')}</strong> · {works.length.toLocaleString()} {t('health.records')} · <code style={codeStyle}>itta_works.json</code></span>
            <ExportButton data={works} filename="ita-eserler" csvHeaders={WORK_FIELDS} csvRow={(w) => WORK_FIELDS.map((k) => s((w as unknown as Record<string, unknown>)[k]))} />
          </div>
          <div style={dlRowStyle}>
            <span><strong>{t('health.ds_relations')}</strong> · {relations.length.toLocaleString()} {t('health.records')} · <code style={codeStyle}>itta_relations.json</code></span>
            <ExportButton data={relations} filename="ita-iliskiler" csvHeaders={RELATION_FIELDS} csvRow={(r) => RELATION_FIELDS.map((k) => s((r as unknown as Record<string, unknown>)[k]))} />
          </div>
        </div>
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.dictionary')}</h2>
        <p style={noteStyle}>{t('health.dictionary_note')}</p>
        <h3 style={subhStyle}>{t('health.author_fields')} · <code style={codeStyle}>itta_authors.json</code></h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 640 }}>
            <thead><tr><th style={th}>{t('health.field')}</th><th style={th}>{t('health.desc')}</th></tr></thead>
            <tbody>
              {AUTHOR_FIELDS.map((k) => (
                <tr key={k}><td style={td}><code style={codeStyle}>{k}</code></td><td style={td}>{t(`health.dict.authors.${k}`)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={subhStyle}>{t('health.work_fields')} · <code style={codeStyle}>itta_works.json</code></h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 640 }}>
            <thead><tr><th style={th}>{t('health.field')}</th><th style={th}>{t('health.desc')}</th></tr></thead>
            <tbody>
              {WORK_FIELDS.map((k) => (
                <tr key={k}><td style={td}><code style={codeStyle}>{k}</code></td><td style={td}>{t(`health.dict.works.${k}`)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stat-section">
        <h2 className="stat-section-title">{t('health.citation')}</h2>
        <p style={noteStyle}>{t('health.citation_note')}</p>
        <pre style={preStyle}>{citationText}</pre>
        <pre style={preStyle}>{bibtex}</pre>
        <h3 style={subhStyle}>{t('health.doi')}</h3>
        <p style={noteStyle}>{t('health.doi_note')}</p>
        <h3 style={subhStyle}>{t('health.license')}</h3>
        <p style={noteStyle}>{t('health.license_note')}</p>
      </section>
    </div>
  );
}
