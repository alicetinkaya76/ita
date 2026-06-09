import { useMemo, useCallback, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useWorks, useAuthors } from '../hooks/useData';
import { HAVZA_ORDER, TYPE_COLORS } from '../utils/colors';
import ExportButton from '../components/ui/ExportButton';
import VirtualTable from '../components/ui/VirtualTable';
import FilterChips from '../components/ui/FilterChips';
import { useMobile } from '../hooks/useMobile';
import type { Work } from '../hooks/useData';

export default function SourceList() {
  const { t } = useTranslation();
  const { works, loading: wLoading } = useWorks();
  const { authors, loading: aLoading } = useAuthors();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useMobile();

  const havzaFilter = searchParams.get('havza') || '';
  const typeFilter = searchParams.get('type') || '';
  const hanedanFilter = searchParams.get('hanedan') || '';
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
      next.delete('type');
      next.delete('hanedan');
      next.delete('q');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (havzaFilter) chips.push({ key: 'havza', label: t('scholar_detail.havza'), value: t(`havza_names.${havzaFilter}`) });
    if (typeFilter) chips.push({ key: 'type', label: t('source_detail.type'), value: t(`source_types.${typeFilter}`) });
    if (hanedanFilter) chips.push({ key: 'hanedan', label: t('source_detail.dynasty'), value: hanedanFilter });
    if (query) chips.push({ key: 'q', label: t('common.search'), value: query });
    return chips;
  }, [havzaFilter, typeFilter, hanedanFilter, query, t]);

  const authorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of authors) m[a.author_id] = a.meshur_isim;
    return m;
  }, [authors]);

  const types = useMemo(() => {
    const set = new Set(works.map(w => w.eser_turu).filter(Boolean));
    return [...set].sort();
  }, [works]);

  const filtered = useMemo(() => {
    let list = works;
    if (havzaFilter) list = list.filter(w => w.havza === havzaFilter);
    if (typeFilter) list = list.filter(w => w.eser_turu === typeFilter);
    if (hanedanFilter) list = list.filter(w => (w.hanedan || '') === hanedanFilter);
    return list;
  }, [works, havzaFilter, typeFilter, hanedanFilter]);

  const fuse = useMemo(
    () => new Fuse(filtered, { keys: ['eser_adi', 'hanedan', 'yazilma_sehri'], threshold: 0.35 }),
    [filtered]
  );

  const results = useMemo(() => {
    if (!query.trim()) return filtered;
    return fuse.search(query).map(r => r.item);
  }, [query, fuse, filtered]);

  const renderRow = useCallback((w: Work, _index: number, style: CSSProperties) => (
    <div key={w.work_id} className="vtable-row" style={style}>
      <div className="vtable-cell vtable-cell-name">
        <Link to={`/sources/${w.work_id}`} className="scholar-link">
          <span className="chip-dot-sm" style={{ background: TYPE_COLORS[w.eser_turu] || '#999' }} />
          {w.eser_adi}
        </Link>
      </div>
      <div className="vtable-cell vtable-cell-mid">
        <Link to={`/scholars/${w.author_id}`} className="author-ref">
          {authorMap[w.author_id] || w.author_id}
        </Link>
      </div>
      <div className="vtable-cell vtable-cell-mid">
        <span className="type-tag" style={{ borderColor: TYPE_COLORS[w.eser_turu] }}>{t(`source_types.${w.eser_turu}`)}</span>
      </div>
      <div className="vtable-cell vtable-cell-mid">{t(`havza_names.${w.havza}`)}</div>
      <div className="vtable-cell vtable-cell-mid">{w.hanedan || '—'}</div>
    </div>
  ), [t, authorMap]);

  const header = useMemo(() => (
    <div className="vtable-header-row">
      <div className="vtable-hcell vtable-cell-name">{t('source_detail.title')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('source_detail.author')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('source_detail.type')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('source_detail.havza')}</div>
      <div className="vtable-hcell vtable-cell-mid">{t('source_detail.dynasty')}</div>
    </div>
  ), [t]);

  if (wLoading || aLoading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="list-page">
      <header className="list-header">
        <h1>{t('nav.sources')}</h1>
        <span className="list-count">{results.length} {t('common.work_count')}</span>
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
        <select value={typeFilter} onChange={e => setParam('type', e.target.value)} className="filter-select">
          <option value="">{t('common.all')} — {t('source_detail.type')}</option>
          {types.map(tp => (
            <option key={tp} value={tp}>{t(`source_types.${tp}`)}</option>
          ))}
        </select>
        <ExportButton<Work>
          data={results}
          filename="itta_sources"
          csvHeaders={['work_id', 'eser_adi', 'author_id', 'havza', 'eser_turu', 'dil', 'yazilma_sehri', 'hanedan']}
          csvRow={w => [w.work_id, w.eser_adi, w.author_id, w.havza, w.eser_turu, w.dil, w.yazilma_sehri, w.hanedan]}
        />
      </div>

      <FilterChips
        chips={activeChips}
        onRemove={(key) => setParam(key, '')}
        onClearAll={clearAllFilters}
      />

      {isMobile ? (
        <div className="mcard-grid">
          {results.slice(0, 100).map(w => (
            <Link key={w.work_id} to={`/sources/${w.work_id}`} className="mcard">
              <div className="mcard-stripe" style={{ background: TYPE_COLORS[w.eser_turu] || '#999' }} />
              <div className="mcard-body">
                <div className="mcard-name">{w.eser_adi}</div>
                <div className="mcard-meta">
                  <span>{authorMap[w.author_id] || '—'}</span>
                </div>
                <div className="mcard-footer">
                  <span className="mcard-badge">{t(`source_types.${w.eser_turu}`)}</span>
                  <span className="mcard-count">{t(`havza_names.${w.havza}`)}</span>
                </div>
              </div>
            </Link>
          ))}
          {results.length > 100 && (
            <p className="mcard-more">+{results.length - 100} {t('common.more')}</p>
          )}
        </div>
      ) : (
        <VirtualTable<Work>
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
