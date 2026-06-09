import { useMemo, useCallback, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useAuthors } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER } from '../utils/colors';
import ExportButton from '../components/ui/ExportButton';
import VirtualTable from '../components/ui/VirtualTable';
import FilterChips from '../components/ui/FilterChips';
import { useMobile } from '../hooks/useMobile';
import type { Author } from '../hooks/useData';

export default function ScholarList() {
  const { t } = useTranslation();
  const { authors, loading } = useAuthors();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useMobile();

  const havzaFilter = searchParams.get('havza') || '';
  const centuryFilter = searchParams.get('century') || '';
  const query = searchParams.get('q') || '';

  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('havza');
      next.delete('century');
      next.delete('q');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (havzaFilter) chips.push({ key: 'havza', label: t('scholar_detail.havza'), value: t(`havza_names.${havzaFilter}`) });
    if (centuryFilter) chips.push({ key: 'century', label: t('scholar_detail.century'), value: `${centuryFilter}${t('dashboard.century_suffix')}` });
    if (query) chips.push({ key: 'q', label: t('common.search'), value: query });
    return chips;
  }, [havzaFilter, centuryFilter, query, t]);

  const filtered = useMemo(() => {
    let list = authors;
    if (havzaFilter) list = list.filter(a => a.havza === havzaFilter);
    if (centuryFilter) list = list.filter(a => a.yuzyil === parseInt(centuryFilter));
    return list;
  }, [authors, havzaFilter, centuryFilter]);

  const fuse = useMemo(
    () => new Fuse(filtered, { keys: ['meshur_isim', 'tam_isim', 'sehir', 'kimlik'], threshold: 0.35 }),
    [filtered]
  );

  const results = useMemo(() => {
    if (!query.trim()) return filtered;
    return fuse.search(query).map(r => r.item);
  }, [query, fuse, filtered]);

  const centuries = useMemo(() => {
    const set = new Set(authors.map(a => a.yuzyil).filter(Boolean) as number[]);
    return [...set].sort((a, b) => a - b);
  }, [authors]);

  const renderRow = useCallback((a: Author, _index: number, style: CSSProperties) => (
    <div key={a.author_id} className="vtable-row" style={style}>
      <div className="vtable-cell vtable-cell-name">
        <Link to={`/scholars/${a.author_id}`} className="scholar-link">
          <span className="chip-dot-sm" style={{ background: HAVZA_COLORS[a.havza] }} />
          {a.meshur_isim}
        </Link>
      </div>
      <div className="vtable-cell vtable-cell-num">{a.vefat_yili_m || '—'}{a.vefat_yili_h ? ` / ${a.vefat_yili_h}h` : ''}</div>
      <div className="vtable-cell vtable-cell-num vtable-cell-sm">{a.yuzyil || '—'}</div>
      <div className="vtable-cell vtable-cell-mid">{t(`havza_names.${a.havza}`)}</div>
      <div className="vtable-cell vtable-cell-mid">{a.sehir || '—'}</div>
      <div className="vtable-cell vtable-cell-num vtable-cell-sm">{a.eser_sayisi}</div>
    </div>
  ), [t]);

  const header = useMemo(() => (
    <div className="vtable-header-row">
      <div className="vtable-hcell vtable-cell-name">{t('scholar_detail.full_name')}</div>
      <div className="vtable-hcell vtable-cell-num">{t('scholar_detail.death')}</div>
      <div className="vtable-hcell vtable-cell-num vtable-cell-sm">{t('scholar_detail.century')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('scholar_detail.havza')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('scholar_detail.city')}</div>
      <div className="vtable-hcell vtable-cell-num vtable-cell-sm">{t('scholar_detail.works')}</div>
    </div>
  ), [t]);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>{t('nav.scholars')}</h1>
        <span className="list-count">{results.length} {t('common.scholar_count')}</span>
      </header>

      <div className="list-controls">
        <input
          type="text"
          className="search-input"
          placeholder={t('nav.search_placeholder')}
          value={query}
          onChange={e => setParam('q', e.target.value)}
        />
        <select value={havzaFilter} onChange={e => setParam('havza', e.target.value)} className="filter-select">
          <option value="">{t('common.all')} — {t('stats.havzas')}</option>
          {HAVZA_ORDER.map(h => (
            <option key={h} value={h}>{t(`havza_names.${h}`)}</option>
          ))}
        </select>
        <select value={centuryFilter} onChange={e => setParam('century', e.target.value)} className="filter-select">
          <option value="">{t('common.all')} — {t('scholar_detail.century')}</option>
          {centuries.map(c => (
            <option key={c} value={String(c)}>{c}. {t('dashboard.century_suffix')}</option>
          ))}
        </select>
        <ExportButton<Author>
          data={results}
          filename="itta_scholars"
          csvHeaders={['author_id', 'meshur_isim', 'tam_isim', 'havza', 'vefat_yili_m', 'vefat_yili_h', 'yuzyil', 'sehir', 'kimlik', 'eser_sayisi']}
          csvRow={a => [a.author_id, a.meshur_isim, a.tam_isim, a.havza, String(a.vefat_yili_m || ''), String(a.vefat_yili_h || ''), String(a.yuzyil || ''), a.sehir, a.kimlik, String(a.eser_sayisi)]}
        />
      </div>

      <FilterChips
        chips={activeChips}
        onRemove={(key) => setParam(key, '')}
        onClearAll={clearAllFilters}
      />

      {isMobile ? (
        <div className="mcard-grid">
          {results.slice(0, 100).map(a => (
            <Link key={a.author_id} to={`/scholars/${a.author_id}`} className="mcard">
              <div className="mcard-stripe" style={{ background: HAVZA_COLORS[a.havza] }} />
              <div className="mcard-body">
                <div className="mcard-name">{a.meshur_isim}</div>
                <div className="mcard-meta">
                  <span>{a.vefat_yili_m || '?'}</span>
                  <span className="mcard-sep">·</span>
                  <span>{a.sehir || '—'}</span>
                </div>
                <div className="mcard-footer">
                  <span className="mcard-badge">{t(`havza_names.${a.havza}`)}</span>
                  {a.eser_sayisi > 0 && <span className="mcard-count">{a.eser_sayisi} {t('common.work_count')}</span>}
                </div>
              </div>
            </Link>
          ))}
          {results.length > 100 && (
            <p className="mcard-more">+{results.length - 100} {t('common.more')}</p>
          )}
        </div>
      ) : (
        <VirtualTable<Author>
          data={results}
          rowHeight={44}
          height={Math.min(results.length * 44 + 2, 660)}
          header={header}
          renderRow={renderRow}
        />
      )}
    </div>
  );
}
