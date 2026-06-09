import { Outlet } from 'react-router-dom';
import { useMobile } from '../../hooks/useMobile';
import Navbar from './Navbar';
import Breadcrumb from './Breadcrumb';
import BottomNav from '../mobile/BottomNav';
import MobileHeader from '../mobile/MobileHeader';

export default function Layout() {
  const { isMobile } = useMobile();

  return (
    <div className={`app-layout ${isMobile ? 'app-mobile' : ''}`}>
      {isMobile ? <MobileHeader /> : <Navbar />}
      <main className="main-content">
        {!isMobile && <Breadcrumb />}
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
