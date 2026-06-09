import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useArticles } from '../hooks/useData';
import { HAVZA_COLORS, PERIOD_COLORS } from '../utils/colors';

export default function Makaleler() {
  const { t } = useTranslation();
  const { articlesData, loading } = useArticles();

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;
  const articles = articlesData?.articles || [];
  const periods = articles.filter(a => a.kind === 'period');
  const havzas = articles.filter(a => a.kind === 'havza');

  const Card = ({ a }: { a: typeof articles[number] }) => {
    const isHavza = a.kind === 'havza';
    const color = isHavza ? HAVZA_COLORS[a.key] || '#8B4513' : PERIOD_COLORS[a.key] || '#8B4513';
    return (
      <Link to={`/makale/${a.id}`} className="article-index-card" style={{ borderTopColor: color }}>
        <span className="article-index-badge" style={{ background: color }}>
          {isHavza ? t(`havza_names.${a.key}`) : t(`periods.${a.key}`)}
        </span>
        <h3 className="article-index-title">{a.title}</h3>
        {a.abstract && <p className="article-index-abstract">{a.abstract.slice(0, 160)}…</p>}
        <div className="article-index-meta">
          <span>{t('article.reading_time', { count: a.reading_minutes })}</span>
          <span className="article-index-dot">·</span>
          <span>{t('article.word_count', { n: a.word_count.toLocaleString() })}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="makaleler-page">
      <Seo title={t('makaleler.title')} description={t('makaleler.subtitle')} path="/makaleler" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('makaleler.title')}</h1>
        <p className="hero-subtitle">{t('makaleler.subtitle')}</p>
      </header>

      <div className="makaleler-content">
        <section>
          <h2 className="makaleler-section-title">{t('makaleler.periods')}</h2>
          <div className="article-index-grid">
            {periods.map(a => <Card key={a.id} a={a} />)}
          </div>
        </section>
        <section>
          <h2 className="makaleler-section-title">{t('makaleler.basins')}</h2>
          <div className="article-index-grid">
            {havzas.map(a => <Card key={a.id} a={a} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
