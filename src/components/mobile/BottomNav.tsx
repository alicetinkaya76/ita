import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

const mainTabs = [
  { key: 'home', path: '/', icon: '◆' },
  { key: 'havzalar', path: '/havzalar', icon: '🗺' },
  { key: 'scholars', path: '/scholars', icon: '👤' },
  { key: 'sources', path: '/sources', icon: '📚' },
];

const drawerItems: { key: string; path: string; labelKey?: string; match?: string[] }[] = [
  { key: 'hanedanlar', path: '/hanedanlar' },
  { key: 'genres', path: '/turler' },
  { key: 'periodization', path: '/periodization' },
  { key: 'map', path: '/map' },
  { key: 'network', path: '/network', labelKey: 'network_silsile', match: ['/network', '/silsile'] },
  { key: 'timeline', path: '/timeline' },
  { key: 'timemap', path: '/zaman-haritasi' },
  { key: 'statistics', path: '/statistics', labelKey: 'stats_compare', match: ['/statistics', '/compare'] },
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

  const isDrawerItemActive = drawerItems.some(d => {
    const paths = d.match || [d.path];
    return paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  });

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
          {drawerItems.map(item => {
            const paths = item.match || [item.path];
            const active = paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
            return (
              <NavLink
                key={item.key}
                to={item.path}
                viewTransition
                className={`bnav-drawer-link ${active ? 'active' : ''}`}
              >
                {t(`nav.${item.labelKey || item.key}`)}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Bar */}
      <nav className="bnav">
        {mainTabs.map(tab => (
          <NavLink
            key={tab.key}
            to={tab.path}
            end={tab.path === '/'}
            viewTransition
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
