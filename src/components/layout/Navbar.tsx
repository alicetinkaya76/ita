import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { prefetchRoute } from '../../utils/prefetch';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

const navItems: { key: string; path: string; labelKey?: string; match?: string[] }[] = [
  { key: 'home', path: '/' },
  { key: 'havzalar', path: '/havzalar' },
  { key: 'scholars', path: '/scholars' },
  { key: 'sources', path: '/sources' },
  { key: 'hanedanlar', path: '/hanedanlar' },
  { key: 'genres', path: '/turler' },
  { key: 'periodization', path: '/periodization' },
  { key: 'map', path: '/map' },
  { key: 'network', path: '/network', labelKey: 'network_silsile', match: ['/network', '/silsile'] },
  { key: 'timeline', path: '/timeline' },
  { key: 'statistics', path: '/statistics', labelKey: 'stats_compare', match: ['/statistics', '/compare'] },
  { key: 'media', path: '/videolar' },
  { key: 'about', path: '/about' },
];

export default function Navbar() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/" className="brand-link" viewTransition>
          <span className="brand-icon">◆</span>
          <span className="brand-text">İTA</span>
        </NavLink>
      </div>

      <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
        {navItems.map(item => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            viewTransition
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            className={({ isActive }) => {
              const matchActive = item.match ? item.match.some(p => location.pathname === p || location.pathname.startsWith(p + '/')) : false;
              return `nav-link ${isActive || matchActive ? 'active' : ''}`;
            }}
            onClick={() => setMenuOpen(false)}
          >
            {t(`nav.${item.labelKey || item.key}`)}
          </NavLink>
        ))}
      </div>

      <button
        type="button"
        className="cmdk-trigger"
        onClick={() => window.dispatchEvent(new Event('itta:open-command-palette'))}
        aria-label={t('command.open')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="cmdk-trigger-text">{t('command.placeholder')}</span>
        <kbd className="cmdk-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <ThemeToggle />
      <LanguageSwitcher />

      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
      </button>
    </nav>
  );
}
