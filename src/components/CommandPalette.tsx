import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useAuthors, useWorks, usePeriods, useHistoriography, type Author, type Work } from '../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS, PERIOD_COLORS } from '../utils/colors';
import { prefetchRoute, prefetchChunk } from '../utils/prefetch';

/* Pages reachable from the palette (mirrors the navbar routes). */
const PAGES: { key: string; path: string }[] = [
  { key: 'home', path: '/' },
  { key: 'havzalar', path: '/havzalar' },
  { key: 'veritabani', path: '/veritabani' },
  { key: 'hanedanlar', path: '/hanedanlar' },
  { key: 'genres', path: '/turler' },
  { key: 'makaleler', path: '/makaleler' },
  { key: 'periodization', path: '/periodization' },
  { key: 'historiography', path: '/historiography' },
  { key: 'map', path: '/map' },
  { key: 'network', path: '/network' },
  { key: 'silsile', path: '/silsile' },
  { key: 'timeline', path: '/timeline' },
  { key: 'compare', path: '/compare' },
  { key: 'statistics', path: '/statistics' },
  { key: 'media', path: '/videolar' },
  { key: 'scholars', path: '/scholars' },
  { key: 'sources', path: '/sources' },
  { key: 'about', path: '/about' },
];

type Group = 'pages' | 'scholars' | 'sources' | 'basins' | 'periods';

interface CmdItem {
  uid: string;
  group: Group;
  kind: 'page' | 'entity';
  label: string;
  meta: string;
  color: string;
  prefetch?: () => void;
  run: () => void;
}

const GROUP_ORDER: Group[] = ['pages', 'scholars', 'sources', 'basins', 'periods'];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export default function CommandPalette() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'tr';
  const navigate = useNavigate();
  const { authors } = useAuthors();
  const { works } = useWorks();
  const { periodsData } = usePeriods();
  const { histData } = useHistoriography();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ── Fuse indices (same fields as the existing global search) ── */
  const fuseScholars = useMemo(
    () => new Fuse(authors, { keys: ['meshur_isim', 'tam_isim', 'sehir', 'kimlik', 'arabic_name'], threshold: 0.35 }),
    [authors]
  );
  const fuseSources = useMemo(
    () => new Fuse(works, { keys: ['eser_adi', 'hanedan', 'yazilma_sehri'], threshold: 0.35 }),
    [works]
  );

  const periodItems = useMemo(() => {
    if (!periodsData) return [] as { id: string; name: string; subtitle: string }[];
    return periodsData.periods.map(p => ({
      id: p.id,
      name: p[lang as 'tr' | 'en'].name,
      subtitle: p[lang as 'tr' | 'en'].subtitle,
    }));
  }, [periodsData, lang]);
  const fusePeriods = useMemo(
    () => new Fuse(periodItems, { keys: ['name', 'subtitle'], threshold: 0.4 }),
    [periodItems]
  );

  const basinItems = useMemo(() => {
    if (!histData) return [] as { id: string; havza_key: string; name: string }[];
    return histData.basins.map(b => ({ id: b.id, havza_key: b.havza_key, name: t(`havza_names.${b.havza_key}`) }));
  }, [histData, t]);
  const fuseBasins = useMemo(
    () => new Fuse(basinItems, { keys: ['name'], threshold: 0.4 }),
    [basinItems]
  );

  /* ── Open / close ── */
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  // Global ⌘K / Ctrl+K toggle + external open event
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    function onExternalOpen() { setOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('itta:open-command-palette', onExternalOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('itta:open-command-palette', onExternalOpen);
    };
  }, []);

  // Lock body scroll + autofocus while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; };
  }, [open]);

  // Reset highlight when the query or open state changes
  useEffect(() => { setActiveIdx(0); }, [query, open]);

  /* ── Build the flat (grouped) result list ── */
  const items = useMemo<CmdItem[]>(() => {
    const q = query.trim();
    const ql = q.toLocaleLowerCase(i18n.language);
    const out: CmdItem[] = [];

    const pages = PAGES.filter(p => {
      if (!q) return true;
      return t(`nav.${p.key}`).toLocaleLowerCase(i18n.language).includes(ql);
    });
    for (const p of pages) {
      out.push({
        uid: `page:${p.path}`,
        group: 'pages',
        kind: 'page',
        label: t(`nav.${p.key}`),
        meta: t('command.group_pages'),
        color: 'var(--accent)',
        prefetch: () => prefetchRoute(p.path),
        run: () => navigate(p.path, { viewTransition: true }),
      });
    }

    if (q) {
      for (const r of fuseScholars.search(q, { limit: 6 })) {
        const a = r.item as Author;
        out.push({
          uid: `scholar:${a.author_id}`,
          group: 'scholars',
          kind: 'entity',
          label: a.meshur_isim,
          meta: `${t(`havza_names.${a.havza}`)}${a.vefat_yili_m ? ` · ö. ${a.vefat_yili_m}` : ''}`,
          color: HAVZA_COLORS[a.havza] || '#999',
          prefetch: () => prefetchChunk('scholarDetail'),
          run: () => navigate(`/scholars/${a.author_id}`, { viewTransition: true }),
        });
      }
      for (const r of fuseSources.search(q, { limit: 6 })) {
        const w = r.item as Work;
        out.push({
          uid: `source:${w.work_id}`,
          group: 'sources',
          kind: 'entity',
          label: w.eser_adi,
          meta: t(`source_types.${w.eser_turu}`),
          color: TYPE_COLORS[w.eser_turu] || '#999',
          prefetch: () => prefetchChunk('sourceDetail'),
          run: () => navigate(`/sources/${w.work_id}`, { viewTransition: true }),
        });
      }
      for (const r of fuseBasins.search(q, { limit: 4 })) {
        const b = r.item;
        out.push({
          uid: `basin:${b.id}`,
          group: 'basins',
          kind: 'entity',
          label: b.name,
          meta: t('historiography.title'),
          color: HAVZA_COLORS[b.havza_key] || '#999',
          prefetch: () => prefetchChunk('historiographyDetail'),
          run: () => navigate(`/historiography/${b.id}`, { viewTransition: true }),
        });
      }
      for (const r of fusePeriods.search(q, { limit: 3 })) {
        const p = r.item;
        out.push({
          uid: `period:${p.id}`,
          group: 'periods',
          kind: 'entity',
          label: p.name,
          meta: `${t('periodization.title')} · ${p.subtitle}`,
          color: PERIOD_COLORS[p.id] || '#999',
          prefetch: () => prefetchRoute('/periodization'),
          run: () => navigate(`/periodization#${p.id}`, { viewTransition: true }),
        });
      }
    }

    // Keep items in fixed group order
    return out.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [query, i18n.language, t, navigate, fuseScholars, fuseSources, fuseBasins, fusePeriods]);

  // Scroll the active option into view + prefetch its target (chunk/data)
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#cmdk-opt-${activeIdx}`);
    el?.scrollIntoView({ block: 'nearest' });
    items[activeIdx]?.prefetch?.();
  }, [activeIdx, open, items]);

  const select = useCallback((item: CmdItem | undefined) => {
    if (!item) return;
    item.run();
    close();
  }, [close]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActiveIdx(i => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActiveIdx(i => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  let prevGroup: Group | null = null;

  return (
    <div
      className="cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('command.open')}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="cmdk-panel" role="document">
        <div className="cmdk-input-row">
          <svg className="cmdk-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="cmdk-listbox"
            aria-activedescendant={items.length ? `cmdk-opt-${activeIdx}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('command.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>

        <div className="cmdk-list" id="cmdk-listbox" role="listbox" ref={listRef}>
          {items.length === 0 ? (
            <div className="cmdk-empty">{t('command.no_results')}</div>
          ) : (
            items.map((item, i) => {
              const showHeader = item.group !== prevGroup;
              prevGroup = item.group;
              return (
                <div key={item.uid} role="presentation">
                  {showHeader && (
                    <div className="cmdk-group" role="presentation">{t(`command.group_${item.group}`)}</div>
                  )}
                  <button
                    type="button"
                    id={`cmdk-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={`cmdk-item ${i === activeIdx ? 'cmdk-item--active' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => select(item)}
                  >
                    {item.kind === 'page' ? (
                      <svg className="cmdk-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    ) : (
                      <span className="cmdk-dot" style={{ background: item.color }} aria-hidden="true" />
                    )}
                    <span className="cmdk-item-label">{item.label}</span>
                    <span className="cmdk-item-meta">{item.meta}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="cmdk-footer">
          <span className="cmdk-hint"><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> {t('command.hint_navigate')}</span>
          <span className="cmdk-hint"><kbd className="cmdk-kbd">↵</kbd> {t('command.hint_select')}</span>
          <span className="cmdk-hint"><kbd className="cmdk-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd> {t('command.hint_toggle')}</span>
        </div>
      </div>
    </div>
  );
}
