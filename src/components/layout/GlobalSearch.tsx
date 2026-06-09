import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useAuthors, useWorks, usePeriods, useHistoriography, type Author, type Work } from '../../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS, PERIOD_COLORS } from '../../utils/colors';

type ResultItem =
  | { kind: 'scholar'; data: Author }
  | { kind: 'source'; data: Work }
  | { kind: 'period'; data: { id: string; name: string; subtitle: string } }
  | { kind: 'basin'; data: { id: string; havza_key: string; name: string } };

export default function GlobalSearch() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const navigate = useNavigate();
  const { authors } = useAuthors();
  const { works } = useWorks();
  const { periodsData } = usePeriods();
  const { histData } = useHistoriography();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuseScholars = useMemo(
    () => new Fuse(authors, { keys: ['meshur_isim', 'tam_isim', 'sehir', 'kimlik', 'arabic_name'], threshold: 0.35, includeScore: true }),
    [authors]
  );

  const fuseSources = useMemo(
    () => new Fuse(works, { keys: ['eser_adi', 'hanedan', 'yazilma_sehri'], threshold: 0.35, includeScore: true }),
    [works]
  );

  // Build searchable period items
  const periodItems = useMemo(() => {
    if (!periodsData) return [];
    return periodsData.periods.map(p => ({
      id: p.id,
      name: p[lang as 'tr' | 'en'].name,
      subtitle: p[lang as 'tr' | 'en'].subtitle,
    }));
  }, [periodsData, lang]);

  const fusePeriods = useMemo(
    () => new Fuse(periodItems, { keys: ['name', 'subtitle'], threshold: 0.4, includeScore: true }),
    [periodItems]
  );

  // Build searchable basin items
  const basinItems = useMemo(() => {
    if (!histData) return [];
    return histData.basins.map(b => ({
      id: b.id,
      havza_key: b.havza_key,
      name: t(`havza_names.${b.havza_key}`),
    }));
  }, [histData, t]);

  const fuseBasins = useMemo(
    () => new Fuse(basinItems, { keys: ['name'], threshold: 0.4, includeScore: true }),
    [basinItems]
  );

  const results: ResultItem[] = useMemo(() => {
    if (!query.trim()) return [];
    const scholars = fuseScholars.search(query, { limit: 5 }).map(r => ({ kind: 'scholar' as const, data: r.item, score: r.score || 1 }));
    const sources = fuseSources.search(query, { limit: 5 }).map(r => ({ kind: 'source' as const, data: r.item, score: r.score || 1 }));
    const periods = fusePeriods.search(query, { limit: 2 }).map(r => ({ kind: 'period' as const, data: r.item, score: r.score || 1 }));
    const basins = fuseBasins.search(query, { limit: 3 }).map(r => ({ kind: 'basin' as const, data: r.item, score: r.score || 1 }));
    const merged = [...scholars, ...sources, ...periods, ...basins].sort((a, b) => a.score - b.score);
    return merged.slice(0, 10).map(({ kind, data }) => ({ kind, data } as ResultItem));
  }, [query, fuseScholars, fuseSources, fusePeriods, fuseBasins]);

  const goTo = useCallback((item: ResultItem) => {
    if (item.kind === 'scholar') navigate(`/scholars/${item.data.author_id}`);
    else if (item.kind === 'source') navigate(`/sources/${(item.data as Work).work_id}`);
    else if (item.kind === 'period') navigate(`/periodization#${(item.data as { id: string }).id}`);
    else if (item.kind === 'basin') navigate(`/historiography/${(item.data as { id: string }).id}`);
    setQuery('');
    setOpen(false);
  }, [navigate]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0 && results[selectedIdx]) {
      e.preventDefault();
      goTo(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="gs-input-wrap">
        <svg className="gs-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8.5" cy="8.5" r="5.5" /><line x1="13" y1="13" x2="18" y2="18" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="gs-input"
          placeholder={t('nav.search_placeholder')}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedIdx(-1); }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="gs-clear" onClick={() => { setQuery(''); setOpen(false); }}>×</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="gs-dropdown">
          {results.map((item, i) => {
            let itemKey = '';
            if (item.kind === 'scholar') itemKey = `scholar-${item.data.author_id}`;
            else if (item.kind === 'source') itemKey = `source-${(item.data as Work).work_id}`;
            else if (item.kind === 'period') itemKey = `period-${(item.data as { id: string }).id}`;
            else if (item.kind === 'basin') itemKey = `basin-${(item.data as { id: string }).id}`;

            return (
            <button
              key={itemKey}
              className={`gs-result ${i === selectedIdx ? 'gs-result-active' : ''}`}
              onClick={() => goTo(item)}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              {item.kind === 'scholar' ? (
                <>
                  <span className="gs-dot" style={{ background: HAVZA_COLORS[(item.data as Author).havza] }} />
                  <div className="gs-result-info">
                    <span className="gs-result-name">{(item.data as Author).meshur_isim}</span>
                    <span className="gs-result-meta">
                      {t('stats.scholars')} · {t(`havza_names.${(item.data as Author).havza}`)}
                      {(item.data as Author).vefat_yili_m ? ` · ö. ${(item.data as Author).vefat_yili_m}` : ''}
                    </span>
                  </div>
                </>
              ) : item.kind === 'source' ? (
                <>
                  <span className="gs-dot" style={{ background: TYPE_COLORS[(item.data as Work).eser_turu] || '#999' }} />
                  <div className="gs-result-info">
                    <span className="gs-result-name">{(item.data as Work).eser_adi}</span>
                    <span className="gs-result-meta">
                      {t('stats.sources')} · {t(`source_types.${(item.data as Work).eser_turu}`)}
                    </span>
                  </div>
                </>
              ) : item.kind === 'period' ? (
                <>
                  <span className="gs-dot" style={{ background: PERIOD_COLORS[(item.data as { id: string }).id] || '#999' }} />
                  <div className="gs-result-info">
                    <span className="gs-result-name">{(item.data as { name: string }).name}</span>
                    <span className="gs-result-meta">
                      {t('periodization.title')} · {(item.data as { subtitle: string }).subtitle}
                    </span>
                  </div>
                </>
              ) : item.kind === 'basin' ? (
                <>
                  <span className="gs-dot" style={{ background: HAVZA_COLORS[(item.data as { havza_key: string }).havza_key] || '#999' }} />
                  <div className="gs-result-info">
                    <span className="gs-result-name">{(item.data as { name: string }).name}</span>
                    <span className="gs-result-meta">
                      {t('historiography.title')}
                    </span>
                  </div>
                </>
              ) : null}
            </button>
            );
          })}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="gs-dropdown">
          <div className="gs-empty">{t('common.no_results')}</div>
        </div>
      )}
    </div>
  );
}
