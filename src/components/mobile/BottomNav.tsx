import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

const mainTabs = [
  { key: 'home', path: '/', icon: '◆' },
  { key: 'havzalar', path: '/havzalar', icon: '🗺' },
  { key: 'veritabani', path: '/veritabani', icon: '🗂' },
  { key: 'makaleler', path: '/makaleler', icon: '📄' },
];

const drawerItems = [
  { key: 'hanedanlar', path: '/hanedanlar' },
  { key: 'genres', path: '/turler' },
  { key: 'periodization', path: '/periodization' },
  { key: 'historiography', path: '/historiography' },
  { key: 'scholars', path: '/scholars' },
  { key: 'sources', path: '/sources' },
  { key: 'map', path: '/map' },
  { key: 'network', path: '/network' },
  { key: 'silsile', path: '/silsile' },
  { key: 'timeline', path: '/timeline' },
  { key: 'compare', path: '/compare' },
  { key: 'statistics', path: '/statistics' },
  { key: 'media', path: '/videolar' },
  { key: 'about', path: '/about' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(o => !o);
  }, []);

  const isDrawerItemActive = drawerItems.some(
    d => location.pathname === d.path || location.pathname.startsWith(d.path + '/')
  );

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div className="bnav-backdrop" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Drawer */}
      <div className={`bnav-drawer ${drawerOpen ? 'bnav-drawer-open' : ''}`}>
        <div className="bnav-drawer-handle" />
        <nav className="bnav-drawer-items">
          {drawerItems.map(item => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `bnav-drawer-link ${isActive ? 'active' : ''}`}
            >
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Bar */}
      <nav className="bnav">
        {mainTabs.map(tab => (
          <NavLink
            key={tab.key}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `bnav-tab ${isActive ? 'bnav-tab-active' : ''}`}
          >
            <span className="bnav-icon">{tab.icon}</span>
            <span className="bnav-label">{t(`nav.${tab.key}`)}</span>
          </NavLink>
        ))}
        <button
          className={`bnav-tab ${isDrawerItemActive || drawerOpen ? 'bnav-tab-active' : ''}`}
          onClick={toggleDrawer}
          aria-label="More"
        >
          <span className="bnav-icon">{drawerOpen ? '✕' : '⋯'}</span>
          <span className="bnav-label">{t('mobile.more')}</span>
        </button>
      </nav>
    </>
  );
}
