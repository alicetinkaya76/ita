import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorks, useAuthors } from '../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS } from '../utils/colors';
import CiteButton from '../components/CiteButton';
import { useMemo } from 'react';

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { works, loading: wLoading } = useWorks();
  const { authors, loading: aLoading } = useAuthors();

  const work = useMemo(() => works.find(w => w.work_id === id), [works, id]);
  const author = useMemo(() => work ? authors.find(a => a.author_id === work.author_id) : null, [authors, work]);

  const relatedWorks = useMemo(() => {
    if (!work) return [];
    // Catch-all genres (ozel_tarih ~474, diger ~221) are too generic to signal
    // real relatedness, so they barely score; author/dynasty/specific genre dominate.
    const CATCHALL = new Set(['diger', 'ozel_tarih']);
    return works
      .filter(w => w.work_id !== work.work_id)
      .map(w => {
        let score = 0;
        if (w.author_id === work.author_id) score += 100;
        if (w.hanedan && work.hanedan && w.hanedan === work.hanedan) score += 12;
        if (w.eser_turu === work.eser_turu) score += CATCHALL.has(work.eser_turu) ? 1 : 6;
        if (w.havza === work.havza) score += 2;
        if (w.dil && work.dil && w.dil === work.dil) score += 1;
        return { w, score };
      })
      .filter(x => x.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(x => x.w);
  }, [works, work]);

  if (wLoading || aLoading) return <div className="loading-screen">{t('common.loading')}</div>;
  if (!work) return <div className="loading-screen">{t('scholar_detail.no_data')}</div>;

  return (
    <div className="detail-page">
      <Link to="/sources" className="back-link">← {t('common.back')}</Link>

      <header className="detail-header">
        <div className="detail-badges">
          <span className="detail-havza-badge" style={{ background: HAVZA_COLORS[work.havza] }}>
            {t(`havza_names.${work.havza}`)}
          </span>
          <span className="detail-type-badge" style={{ background: TYPE_COLORS[work.eser_turu] || '#666' }}>
            {t(`source_types.${work.eser_turu}`)}
          </span>
        </div>
        <h1 className="detail-name">{work.eser_adi}</h1>
        {work.diger_adlari && work.diger_adlari.length > 0 && (
          <p className="detail-alt-names">{work.diger_adlari.join(' · ')}</p>
        )}
        <div className="detail-actions">
          <CiteButton kind="work" id={work.work_id} title={work.eser_adi} author={author?.meshur_isim} filename={`ita-${work.work_id}`} />
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-meta">
          {author && (
            <div className="meta-row">
              <span className="meta-key">{t('source_detail.author')}</span>
              <Link to={`/scholars/${author.author_id}`} className="meta-val author-ref">
                {author.meshur_isim}
              </Link>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-key">{t('source_detail.language')}</span>
            <span className="meta-val">{work.dil}</span>
          </div>
          {work.hanedan && (
            <div className="meta-row">
              <span className="meta-key">{t('source_detail.dynasty')}</span>
              <span className="meta-val">{work.hanedan}</span>
            </div>
          )}
          {work.yazilma_sehri && (
            <div className="meta-row">
              <span className="meta-key">{t('source_detail.city')}</span>
              <span className="meta-val">{work.yazilma_sehri}</span>
            </div>
          )}
        </section>

        {work.tanitim && (
          <section className="detail-description">
            <h2>{t('source_detail.description')}</h2>
            <p className="description-text">{work.tanitim}</p>
          </section>
        )}
      </div>

      {relatedWorks.length > 0 && (
        <div className="similar-scholars-card">
          <h3>{t('source_detail.related')}</h3>
          <div className="similar-scholars-grid">
            {relatedWorks.map(w => (
              <Link key={w.work_id} to={`/sources/${w.work_id}`} className="scholar-chip-mini">
                <span className="chip-dot" style={{ background: TYPE_COLORS[w.eser_turu] || '#999' }} />
                <span>{w.eser_adi}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
