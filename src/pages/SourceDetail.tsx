import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorks, useAuthors } from '../hooks/useData';
import { HAVZA_COLORS, TYPE_COLORS } from '../utils/colors';
import { useMemo } from 'react';

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { works, loading: wLoading } = useWorks();
  const { authors, loading: aLoading } = useAuthors();

  const work = useMemo(() => works.find(w => w.work_id === id), [works, id]);
  const author = useMemo(() => work ? authors.find(a => a.author_id === work.author_id) : null, [authors, work]);

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
    </div>
  );
}
