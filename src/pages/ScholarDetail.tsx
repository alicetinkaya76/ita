import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthors, useWorks, useRelations, usePeriods } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import { PERIOD_COLORS, getPeriodId } from '../utils/colors';
import { useMemo, lazy, Suspense } from 'react';

const MiniNetwork = lazy(() => import('../components/MiniNetwork'));

export default function ScholarDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { authors, loading: aLoading } = useAuthors();
  const { works, loading: wLoading } = useWorks();
  const { relations, loading: rLoading } = useRelations();
  const { periodsData } = usePeriods();

  const scholar = useMemo(() => authors.find(a => a.author_id === id), [authors, id]);
  const scholarWorks = useMemo(() => works.filter(w => w.author_id === id), [works, id]);
  const scholarRelations = useMemo(() => {
    if (!scholar?.dia_slug) return { teachers: [], students: [], contemporaries: [] };
    const slug = scholar.dia_slug;
    return {
      teachers: relations.filter(r => r.target === slug && r.type === 'TEACHER_OF'),
      students: relations.filter(r => r.source === slug && r.type === 'TEACHER_OF'),
      contemporaries: relations.filter(r =>
        (r.source === slug || r.target === slug) && r.type === 'CONTEMPORARY_OF'
      ),
    };
  }, [relations, scholar]);

  // Similar scholars: same havza + same period, sorted by importance
  const similarScholars = useMemo(() => {
    if (!scholar) return [];
    const pid = getPeriodId(scholar.yuzyil);
    return authors
      .filter(a =>
        a.author_id !== scholar.author_id &&
        a.havza === scholar.havza &&
        getPeriodId(a.yuzyil) === pid
      )
      .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
      .slice(0, 6);
  }, [authors, scholar]);

  if (aLoading || wLoading || rLoading) return <div className="loading-screen">{t('common.loading')}</div>;
  if (!scholar) return <div className="loading-screen">{t('scholar_detail.no_data')}</div>;

  const slugToAuthor = (slug: string) => authors.find(a => a.dia_slug === slug);

  function RelLink({ slug, name }: { slug: string; name: string }) {
    const a = slugToAuthor(slug);
    if (a) return <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>;
    return <span className="rel-external">{name}</span>;
  }

  return (
    <div className="detail-page">
      <Link to="/scholars" className="back-link">← {t('common.back')}</Link>

      <header className="detail-header">
        <div className="detail-badges-row">
          <span className="detail-havza-badge" style={{ background: HAVZA_COLORS[scholar.havza] }}>
            {t(`havza_names.${scholar.havza}`)}
          </span>
          {getPeriodId(scholar.yuzyil) && (
            <Link to={`/periodization#${getPeriodId(scholar.yuzyil)}`} className="detail-period-badge" style={{ background: PERIOD_COLORS[getPeriodId(scholar.yuzyil)!] }}>
              {t(`periods.${getPeriodId(scholar.yuzyil)}`)}
            </Link>
          )}
        </div>
        <h1 className="detail-name">{scholar.meshur_isim}</h1>
        {scholar.arabic_name && <p className="detail-arabic">{scholar.arabic_name}</p>}
        <p className="detail-full-name">{scholar.tam_isim}</p>

        {/* Historiography context link */}
        <div className="detail-context-links">
          <Link to={`/historiography/${scholar.havza}`} className="context-link">
            {t('historiography.basin_writing')} →
          </Link>
          {getPeriodId(scholar.yuzyil) === 'contraction' && (
            <Link to={`/periodization#contraction`} className="context-link context-link-period">
              {t('periods.contraction')} →
            </Link>
          )}
        </div>
      </header>

      <div className="detail-grid">
        {/* Meta */}
        <section className="detail-meta">
          <div className="meta-row">
            <span className="meta-key">{t('scholar_detail.death')}</span>
            <span className="meta-val">
              {scholar.vefat_yili_m || '?'} {t('common.ce')}
              {scholar.vefat_yili_h ? ` / ${scholar.vefat_yili_h} ${t('common.hijri')}` : ''}
            </span>
          </div>
          {scholar.dogum_yili_m && (
            <div className="meta-row">
              <span className="meta-key">{t('scholar_detail.birth')}</span>
              <span className="meta-val">{scholar.dogum_yili_m} {t('common.ce')}</span>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-key">{t('scholar_detail.century')}</span>
            <span className="meta-val">{scholar.yuzyil}{t('dashboard.century_suffix')}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">{t('scholar_detail.city')}</span>
            <span className="meta-val">{scholar.sehir || '—'}</span>
          </div>
          {scholar.kimlik && (
            <div className="meta-row">
              <span className="meta-key">{t('scholar_detail.identity')}</span>
              <span className="meta-val">{scholar.kimlik}</span>
            </div>
          )}
          {scholar.fields && (
            <div className="meta-row">
              <span className="meta-key">{t('scholar_detail.fields')}</span>
              <span className="meta-val">{scholar.fields}</span>
            </div>
          )}
          {scholar.dia_url && (
            <div className="meta-row">
              <span className="meta-key">{t('scholar_detail.dia_link')}</span>
              <a href={scholar.dia_url} target="_blank" rel="noreferrer" className="dia-link">
                islamansiklopedisi.org.tr →
              </a>
            </div>
          )}
        </section>

        {/* Works */}
        <section className="detail-works">
          <h2>{t('scholar_detail.works')} ({scholarWorks.length})</h2>
          {scholarWorks.length > 0 ? (
            <div className="works-list">
              {scholarWorks.map(w => (
                <Link key={w.work_id} to={`/sources/${w.work_id}`} className="work-item">
                  <span className="work-type-badge">{t(`source_types.${w.eser_turu}`)}</span>
                  <span className="work-title">{w.eser_adi}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-note">{t('common.no_results')}</p>
          )}
        </section>

        {/* Relations */}
        <section className="detail-relations">
          {scholarRelations.teachers.length > 0 && (
            <div className="rel-section">
              <h3>{t('scholar_detail.teachers')} ({scholarRelations.teachers.length})</h3>
              <div className="rel-list">
                {scholarRelations.teachers.map((r, i) => (
                  <RelLink key={i} slug={r.source} name={r.source_name} />
                ))}
              </div>
            </div>
          )}
          {scholarRelations.students.length > 0 && (
            <div className="rel-section">
              <h3>{t('scholar_detail.students')} ({scholarRelations.students.length})</h3>
              <div className="rel-list">
                {scholarRelations.students.map((r, i) => (
                  <RelLink key={i} slug={r.target} name={r.target_name} />
                ))}
              </div>
            </div>
          )}
          {scholarRelations.contemporaries.length > 0 && (
            <div className="rel-section">
              <h3>{t('scholar_detail.contemporaries')} ({scholarRelations.contemporaries.length})</h3>
              <div className="rel-list">
                {scholarRelations.contemporaries.slice(0, 20).map((r, i) => {
                  const otherSlug = r.source === scholar.dia_slug ? r.target : r.source;
                  const otherName = r.source === scholar.dia_slug ? r.target_name : r.source_name;
                  return <RelLink key={i} slug={otherSlug} name={otherName} />;
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mini Network Graph */}
      {scholar.dia_slug && (
        <Suspense fallback={null}>
          <MiniNetwork
            centerSlug={scholar.dia_slug}
            relations={relations}
            authors={authors}
          />
        </Suspense>
      )}

      {/* Period Context Card */}
      {getPeriodId(scholar.yuzyil) && periodsData && (() => {
        const pid = getPeriodId(scholar.yuzyil)!;
        const period = periodsData.periods.find(p => p.id === pid);
        if (!period) return null;
        const lang2 = i18n.language === 'en' ? 'en' : 'tr';
        return (
          <div className="period-context-card" style={{ borderLeftColor: PERIOD_COLORS[pid] }}>
            <div className="period-context-header">
              <span className="period-context-dot" style={{ background: PERIOD_COLORS[pid] }} />
              <Link to={`/periodization#${pid}`} className="period-context-title">
                {period[lang2].name}
              </Link>
              <span className="period-context-range">
                {period.century_min}–{period.century_max}. {t('dashboard.century_suffix')}
              </span>
            </div>
            <p className="period-context-summary">{period[lang2].summary}</p>
          </div>
        );
      })()}

      {/* Similar Scholars */}
      {similarScholars.length > 0 && (
        <div className="similar-scholars-card">
          <h3>{t('scholar_detail.similar_scholars')}</h3>
          <div className="similar-scholars-grid">
            {similarScholars.map(s => (
              <Link key={s.author_id} to={`/scholars/${s.author_id}`} className="scholar-chip-mini">
                <span className="chip-dot" style={{ background: HAVZA_COLORS[s.havza] }} />
                <span>{s.meshur_isim}</span>
                {s.vefat_yili_m && <span className="chip-year">ö. {s.vefat_yili_m}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Silsile Link */}
      {scholar.dia_slug && (scholarRelations.teachers.length > 0 || scholarRelations.students.length > 0) && (
        <div className="silsile-widget">
          <h3>{t('silsile.title')}</h3>
          <p className="silsile-widget-info">
            {scholarRelations.teachers.length} {t('scholar_detail.teachers').toLowerCase()} · {scholarRelations.students.length} {t('scholar_detail.students').toLowerCase()}
          </p>
          <Link to={`/silsile?scholar=${scholar.dia_slug}`} className="silsile-widget-link">
            {t('silsile.title')} →
          </Link>
        </div>
      )}
    </div>
  );
}
