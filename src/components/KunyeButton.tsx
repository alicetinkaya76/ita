import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { deathYears } from '../utils/dates';
import type { Author } from '../hooks/useData';

interface RelItem { source: string; source_name: string; target: string; target_name: string; type: string; }
interface WorkItem { eser_adi: string; dil?: string; eser_turu?: string; hanedan?: string; }
interface Props {
  scholar: Author;
  works: WorkItem[];
  relations: { teachers: RelItem[]; students: RelItem[]; contemporaries: RelItem[] };
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildKunye(scholar: Author, works: WorkItem[], rel: Props['relations'], t: TFunction, lang: string): string {
  const s: any = scholar;
  const rtl = lang === 'ar' || lang === 'fa';
  const havza = t(`havza_names.${s.havza}`, { defaultValue: s.havza }) as string;
  const death = deathYears(scholar, t);
  const birth = s.dogum_yili_h || s.dogum_yili_m ? `${s.dogum_yili_h || '?'}/${s.dogum_yili_m || '?'}` : null;
  const centSuffix = lang === 'en' ? 'c.' : lang === 'ar' ? 'م' : lang === 'fa' ? 'ق' : 'yy';
  const meta = [havza, s.sehir, s.mezhep, s.yuzyil ? `${s.yuzyil}. ${centSuffix}` : null]
    .filter(Boolean).map(esc).join(' &middot; ');

  const relRow = (label: string, items: RelItem[], pick: 'source_name' | 'target_name' | 'other') => {
    if (!items.length) return '';
    const names = items
      .map(r => (pick === 'other' ? (r.source === s.dia_slug ? r.target_name : r.source_name) : r[pick]))
      .filter(Boolean).map(esc).join(', ');
    return `<tr><th>${esc(label)}</th><td>${names}</td></tr>`;
  };

  const worksRows = works.length
    ? works.map(w => {
        const tags = [w.eser_turu, w.dil, w.hanedan].filter(Boolean).map(esc).join(' &middot; ');
        return `<li><span class="w-title">${esc(w.eser_adi)}</span>${tags ? `<span class="w-meta">${tags}</span>` : ''}</li>`;
      }).join('')
    : `<li class="muted">${esc(t('kunye.no_works'))}</li>`;

  const hasRel = rel.teachers.length || rel.students.length || rel.contemporaries.length;

  return `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<title>${esc(s.meshur_isim)} — ${esc(t('kunye.title'))}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: ${rtl ? "'Noto Naskh Arabic','Amiri',serif" : "Georgia,'Times New Roman',serif"}; color: #2A2118; line-height: 1.55; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .brand { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8A6D3B; border-bottom: 2px solid #8A6D3B; padding-bottom: 6px; margin-bottom: 18px; }
  h1 { font-size: 26px; margin: 0 0 2px; font-weight: 600; }
  .tam { font-size: 14px; color: #6B5B45; margin: 0 0 8px; }
  .years { font-size: 15px; color: #8A6D3B; font-weight: 600; margin-bottom: 4px; }
  .meta { font-size: 12.5px; color: #5A4A35; margin-bottom: 14px; }
  h2 { font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.07em; color: #8A6D3B; border-bottom: 1px solid #D8CBB8; padding-bottom: 4px; margin: 20px 0 8px; }
  .bio { font-size: 13px; text-align: justify; margin: 0; }
  table.rel { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.rel th { text-align: ${rtl ? 'right' : 'left'}; width: 130px; vertical-align: top; color: #6B5B45; font-weight: 600; padding: 3px 10px 3px 0; }
  table.rel td { padding: 3px 0; }
  ul.works { list-style: none; padding: 0; margin: 0; font-size: 12.5px; }
  ul.works li { padding: 4px 0; border-bottom: 1px dotted #D8CBB8; }
  .w-title { font-weight: 600; }
  .w-meta { display: block; font-size: 11px; color: #8A7A60; }
  .muted { color: #999; }
  footer { margin-top: 26px; padding-top: 8px; border-top: 1px solid #D8CBB8; font-size: 10.5px; color: #8A7A60; display: flex; justify-content: space-between; gap: 12px; }
</style></head><body>
  <div class="brand">İslam Tarihyazım Atlası</div>
  <h1>${esc(s.meshur_isim)}</h1>
  ${s.tam_isim && s.tam_isim !== s.meshur_isim ? `<p class="tam">${esc(s.tam_isim)}</p>` : ''}
  ${death && death !== '?' ? `<div class="years">${esc(t('kunye.died'))} ${esc(death)}${birth ? ` &middot; ${esc(t('kunye.born'))} ${esc(birth)}` : ''}</div>` : ''}
  <div class="meta">${meta}</div>
  ${s.kimlik ? `<h2>${esc(t('kunye.bio'))}</h2><p class="bio">${esc(s.kimlik)}</p>` : ''}
  <h2>${esc(t('kunye.works'))} (${works.length})</h2>
  <ul class="works">${worksRows}</ul>
  ${hasRel ? `<h2>${esc(t('kunye.relations'))}</h2><table class="rel">${relRow(t('kunye.teachers'), rel.teachers, 'source_name')}${relRow(t('kunye.students'), rel.students, 'target_name')}${relRow(t('kunye.contemporaries'), rel.contemporaries, 'other')}</table>` : ''}
  <footer>
    <span>alicetinkaya76.github.io/ita${s.dia_slug ? ` &middot; DİA: ${esc(s.dia_slug)}` : ''}</span>
    <span>${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR')}</span>
  </footer>
</body></html>`;
}

export default function KunyeButton({ scholar, works, relations }: Props) {
  const { t, i18n } = useTranslation();

  const handlePrint = () => {
    const html = buildKunye(scholar, works, relations, t, i18n.language);
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) { document.body.removeChild(iframe); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Text-only document: ready right after close. Small delay lets layout settle.
    setTimeout(() => {
      try { win.focus(); win.print(); } catch { /* noop */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* noop */ } }, 1000);
    }, 300);
  };

  return (
    <button className="kunye-btn" onClick={handlePrint} title={t('kunye.hint')}>
      <span aria-hidden="true">⤓</span> {t('kunye.download')}
    </button>
  );
}
