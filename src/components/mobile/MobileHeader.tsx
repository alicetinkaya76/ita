import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useAuthors, useWorks } from '../../hooks/useData';
import { HAVZA_COLORS } from '../../utils/colors';
import ThemeToggle from '../layout/ThemeToggle';
import LanguageSwitcher from '../layout/LanguageSwitcher';

export default function MobileHeader() {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { authors } = useAuthors();
  const { works } = useWorks();

  const fuse = useMemo(() => {
    const items = [
      ...authors.map(a => ({ type: 'scholar' as const, id: a.author_id, name: a.meshur_isim, havza: a.havza, meta: `${a.vefat_yili_m || ''} — ${a.sehir || ''}` })),
      ...works.map(w => ({ type: 'source' as const, id: w.work_id, name: w.eser_adi, havza: w.havza, meta: w.eser_turu })),
    ];
    return new Fuse(items, { keys: ['name'], threshold: 0.35 });
  }, [authors, works]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 12 }).map(r => r.item);
  }, [query, fuse]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);

  const goTo = useCallback((type: string, id: string) => {
    navigate(type === 'scholar' ? `/scholars/${id}` : `/sources/${id}`);
    closeSearch();
  }, [navigate, closeSearch]);

  // Close on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, closeSearch]);

  return (
    <>
      <header className="mheader">
        <NavLink to="/" className="mheader-brand">
          <span className="brand-icon">◆</span>
          <span className="brand-text">İTA</span>
        </NavLink>
        <div className="mheader-actions">
          <button className="mheader-btn" onClick={openSearch} aria-label={t('common.search')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Fullscreen Search Overlay */}
      {searchOpen && (
        <div className="msearch-overlay">
          <div className="msearch-bar">
            <svg className="msearch-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className="msearch-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('nav.search_placeholder')}
              autoComplete="off"
            />
            <button className="msearch-close" onClick={closeSearch} aria-label={t('mobile.close')}>
              {t('common.back')}
            </button>
          </div>
          <div className="msearch-results">
            {results.length > 0 ? results.map(r => (
              <button key={`${r.type}-${r.id}`} className="msearch-item" onClick={() => goTo(r.type, r.id)}>
                <span className="msearch-dot" style={{ background: HAVZA_COLORS[r.havza] }} />
                <div className="msearch-item-info">
                  <span className="msearch-item-name">{r.name}</span>
                  <span className="msearch-item-meta">{r.meta}</span>
                </div>
                <span className="msearch-item-type">
                  {r.type === 'scholar' ? t('stats.scholars') : t('stats.sources')}
                </span>
              </button>
            )) : query.trim() ? (
              <p className="msearch-empty">{t('common.no_results')}</p>
            ) : (
              <p className="msearch-hint">{t('mobile.search_hint')}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
