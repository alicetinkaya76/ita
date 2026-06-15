import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMobile } from '../../hooks/useMobile';
import Navbar from './Navbar';
import Breadcrumb from './Breadcrumb';
import BottomNav from '../mobile/BottomNav';
import MobileHeader from '../mobile/MobileHeader';
import CommandPalette from '../CommandPalette';

const TAB_GROUPS: { match: string[]; tabs: { key: string; path: string }[] }[] = [
  { match: ['/network', '/silsile'], tabs: [{ key: 'network', path: '/network' }, { key: 'silsile', path: '/silsile' }] },
  { match: ['/statistics', '/compare'], tabs: [{ key: 'statistics', path: '/statistics' }, { key: 'compare', path: '/compare' }] },
];

export default function Layout() {
  const { isMobile } = useMobile();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const tabGroup = TAB_GROUPS.find(g => g.match.includes(pathname));

  return (
    <div className={`app-layout ${isMobile ? 'app-mobile' : ''}`}>
      {isMobile ? <MobileHeader /> : <Navbar />}
      <main className="main-content">
        {!isMobile && <Breadcrumb />}
        {tabGroup && (
          <div className="page-tabs">
            {tabGroup.tabs.map(tb => (
              <NavLink key={tb.path} to={tb.path} end viewTransition className={({ isActive }) => `page-tab ${isActive ? 'active' : ''}`}>
                {t(`nav.${tb.key}`)}
              </NavLink>
            ))}
          </div>
        )}
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
      {!isMobile && <CommandPalette />}
    </div>
  );
}
