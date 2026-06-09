import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthors, useWorks } from '../../hooks/useData';

interface Crumb {
  label: string;
  path?: string;
}

export default function Breadcrumb() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const { authors } = useAuthors();
  const { works } = useWorks();

  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [{ label: t('nav.home'), path: '/' }];

  if (segments[0] === 'scholars') {
    crumbs.push({ label: t('nav.scholars'), path: segments.length > 1 ? '/scholars' : undefined });
    if (params.id) {
      const scholar = authors.find(a => a.author_id === params.id);
      crumbs.push({ label: scholar?.meshur_isim || params.id });
    }
  } else if (segments[0] === 'sources') {
    crumbs.push({ label: t('nav.sources'), path: segments.length > 1 ? '/sources' : undefined });
    if (params.id) {
      const work = works.find(w => w.work_id === params.id);
      crumbs.push({ label: work?.eser_adi || params.id });
    }
  } else if (segments[0] === 'havza') {
    crumbs.push({ label: t('nav.map'), path: '/map' });
    if (params.id) {
      crumbs.push({ label: t(`havza_names.${params.id}`) });
    }
  } else if (segments[0] === 'map') {
    crumbs.push({ label: t('nav.map') });
  } else if (segments[0] === 'network') {
    crumbs.push({ label: t('nav.network') });
  } else if (segments[0] === 'timeline') {
    crumbs.push({ label: t('nav.timeline') });
  } else if (segments[0] === 'about') {
    crumbs.push({ label: t('nav.about') });
  } else if (segments[0] === 'statistics') {
    crumbs.push({ label: t('nav.statistics') });
  } else if (segments[0] === 'silsile') {
    crumbs.push({ label: t('nav.silsile') });
  } else if (segments[0] === 'compare') {
    crumbs.push({ label: t('nav.compare') });
  } else if (segments[0] === 'periodization') {
    crumbs.push({ label: t('periodization.title') });
  } else if (segments[0] === 'historiography') {
    crumbs.push({ label: t('historiography.title'), path: segments.length > 1 ? '/historiography' : undefined });
    if (params.id) {
      crumbs.push({ label: t(`havza_names.${params.id}`) });
    }
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {c.path && i < crumbs.length - 1 ? (
            <Link to={c.path} className="breadcrumb-link">{c.label}</Link>
          ) : (
            <span className="breadcrumb-current">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
