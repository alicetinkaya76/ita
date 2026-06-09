import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { useArticle } from '../hooks/useData';
import { HAVZA_COLORS, PERIOD_COLORS } from '../utils/colors';

export default function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { article, loading } = useArticle(id);
  const [activeId, setActiveId] = useState<string>('');
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: highlight the TOC entry for the heading currently in view
  useEffect(() => {
    if (!article || !bodyRef.current) return;
    const headings = Array.from(
      bodyRef.current.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id], h4[id]')
    );
    if (!headings.length) return;
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [article]);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;
  if (!article) {
    return (
      <div className="article-page">
        <Link to="/periodization" className="back-link">← {t('common.back')}</Link>
        <p className="article-missing">{t('scholar_detail.no_data')}</p>
      </div>
    );
  }

  const isHavza = article.kind === 'havza';
  const color = isHavza
    ? HAVZA_COLORS[article.key] || '#8B4513'
    : PERIOD_COLORS[article.key] || '#8B4513';

  const badgeLabel = isHavza
    ? t(`havza_names.${article.key}`)
    : t(`periods.${article.key}`);

  const backTo = isHavza ? '/historiography' : '/periodization';
  const backLabel = isHavza ? t('historiography.title') : t('periodization.title');

  const scrollTo = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="article-page" style={{ ['--article-accent' as string]: color }}>
      <Seo title={article.title} description={article.abstract || badgeLabel} path={`/makale/${article.id}`} />
      <Link to={backTo} className="back-link">← {backLabel}</Link>

      {/* Header */}
      <header className="article-header">
        <span className="article-kind-badge" style={{ background: color }}>{badgeLabel}</span>
        <h1 className="article-title">{article.title}</h1>
        <div className="article-meta">
          <span className="article-meta-item">{t('article.reading_time', { count: article.reading_minutes })}</span>
          <span className="article-meta-dot">·</span>
          <span className="article-meta-item">{t('article.word_count', { n: article.word_count.toLocaleString() })}</span>
          {article.footnote_count > 0 && (
            <>
              <span className="article-meta-dot">·</span>
              <span className="article-meta-item">{t('article.footnotes', { count: article.footnote_count })}</span>
            </>
          )}
        </div>
      </header>

      {/* Abstract */}
      {article.abstract && (
        <section className="article-abstract" style={{ borderColor: color }}>
          <span className="article-abstract-label" style={{ color }}>{t('article.abstract')}</span>
          <p>{article.abstract}</p>
        </section>
      )}

      <div className="article-layout">
        {/* TOC */}
        {article.toc.length > 0 && (
          <aside className="article-toc">
            <div className="article-toc-inner">
              <span className="article-toc-title">{t('article.contents')}</span>
              <nav>
                {article.toc.map(item => (
                  <button
                    key={item.id}
                    className={`article-toc-link toc-level-${item.level} ${activeId === item.id ? 'active' : ''}`}
                    style={activeId === item.id ? { color, borderColor: color } : undefined}
                    onClick={() => scrollTo(item.id)}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Body */}
        <article className="article-main">
          <div
            ref={bodyRef}
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />

          {/* Footnotes / References */}
          {article.footnotes_html && (
            <section className="article-footnotes">
              <h2 className="article-footnotes-title">{t('article.notes')}</h2>
              <ol
                className="article-footnotes-list"
                dangerouslySetInnerHTML={{ __html: article.footnotes_html }}
              />
            </section>
          )}

          {/* Cross-links back into the data platform */}
          <section className="article-crosslinks">
            {isHavza ? (
              <>
                <Link to={`/historiography/${article.key}`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('historiography.havza_detail')} →
                </Link>
                <Link to={`/scholars?havza=${article.key}`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('nav.scholars')} →
                </Link>
                <Link to={`/map?havza=${article.key}`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('nav.map')} →
                </Link>
              </>
            ) : (
              <>
                <Link to={`/periodization#${article.key}`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('periodization.title')} →
                </Link>
                <Link to={`/network?period=${article.key}`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('nav.network')} →
                </Link>
                <Link to={`/timeline`} className="article-crosslink" style={{ borderColor: color }}>
                  {t('nav.timeline')} →
                </Link>
              </>
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
