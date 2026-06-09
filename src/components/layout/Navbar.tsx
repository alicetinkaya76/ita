import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from './ThemeToggle';

const navItems = [
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
  { key: 'about', path: '/about' },
];

export default function Navbar() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/" className="brand-link">
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
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {t(`nav.${item.key}`)}
          </NavLink>
        ))}
      </div>

      <GlobalSearch />
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
