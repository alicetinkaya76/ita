import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useStats, useAuthors, useWorks } from '../hooks/useData';
import { HAVZA_COLORS, HAVZA_ORDER, TYPE_COLORS, PERIOD_COLORS, getPeriodId } from '../utils/colors';
import { deathYears, hasDeathYear } from '../utils/dates';
import { useMemo } from 'react';

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function HavzaBar({ name, count, total, color }: { name: string; count: number; total: number; color: string }) {
  const pct = (count / total) * 100;
  return (
    <div className="havza-bar">
      <div className="havza-bar-label">
        <span className="havza-dot" style={{ background: color }} />
        <span>{name}</span>
      </div>
      <div className="havza-bar-track">
        <div className="havza-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="havza-bar-count">{count}</span>
    </div>
  );
}

function CenturyChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
    .map(([c, n]) => ({ century: parseInt(c), count: n }))
    .filter(e => e.century >= 7 && e.century <= 20)
    .sort((a, b) => a.century - b.century);
  const max = Math.max(...entries.map(e => e.count));

  return (
    <div className="century-chart">
      {entries.map(e => (
        <div key={e.century} className="century-col">
          <div className="century-bar-wrap">
            <div
              className="century-bar"
              style={{ height: `${(e.count / max) * 100}%` }}
              title={`${e.count}`}
            />
          </div>
          <div className="century-label">{e.century}</div>
        </div>
      ))}
    </div>
  );
}

function TypeDonut({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let cumAngle = 0;

  const slices = entries.map(([key, count]) => {
    const angle = (count / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { key, count, startAngle, angle, color: TYPE_COLORS[key] || '#9E9E9E' };
  });

  function polarToCart(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
    const s = polarToCart(cx, cy, r, start);
    const e = polarToCart(cx, cy, r, end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  return (
    <div className="type-donut-wrap">
      <svg viewBox="0 0 200 200" className="type-donut-svg">
        {slices.map(s => (
          <path
            key={s.key}
            d={arcPath(100, 100, 90, s.startAngle, s.startAngle + s.angle - 0.5)}
            fill={s.color}
            opacity={0.85}
          >
            <title>{t(`source_types.${s.key}`)}: {s.count}</title>
          </path>
        ))}
        <circle cx="100" cy="100" r="50" className="donut-hole" />
        <text x="100" y="96" textAnchor="middle" className="donut-total">{total}</text>
        <text x="100" y="112" textAnchor="middle" className="donut-label">{t('stats.sources')}</text>
      </svg>
      <div className="type-legend">
        {slices.map(s => (
          <div key={s.key} className="type-legend-item">
            <span className="type-legend-dot" style={{ background: s.color }} />
            <span className="type-legend-name">{t(`source_types.${s.key}`)}</span>
            <span className="type-legend-count">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { stats, loading: statsLoading } = useStats();
  const { authors, loading: authorsLoading } = useAuthors();
  const { works, loading: worksLoading } = useWorks();

  const featured = useMemo(() => {
    if (!authors.length) return [];
    return [...authors]
      .filter(a => a.importance_score)
      .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
      .slice(0, 8);
  }, [authors]);

  const authorByHavza = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of authors) m[a.havza] = (m[a.havza] || 0) + 1;
    return m;
  }, [authors]);

  // Period counts
  const periodCounts = useMemo(() => {
    const counts: Record<string, number> = { formation: 0, development: 0, contraction: 0 };
    for (const a of authors) {
      const pid = getPeriodId(a.yuzyil);
      if (pid && counts[pid] !== undefined) counts[pid]++;
    }
    return counts;
  }, [authors]);

  if (statsLoading || authorsLoading || worksLoading) {
    return <div className="loading-screen">{t('common.loading')}</div>;
  }

  return (
    <div className="dashboard">
      <Seo title="İTA — İslam Tarihyazım Atlası" description={t('dashboard.subtitle')} path="/" />
      {/* Hero */}
      <header className="dash-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('dashboard.title')}</h1>
        <p className="hero-subtitle">{t('dashboard.subtitle')}</p>
      </header>

      {/* Stats Row */}
      <section className="stats-row">
        <StatCard label={t('stats.scholars')} value={stats?.total_scholars || 0} />
        <StatCard label={t('stats.sources')} value={stats?.total_works || 0} />
        <StatCard label={t('stats.havzas')} value={stats?.total_havzas || 0} />
        <StatCard label={t('stats.dia_links')} value={stats?.dia_matches || 0} />
        <StatCard label={t('stats.relations')} value={stats?.dia_relations || 0} />
      </section>

      {/* Main Grid */}
      <div className="dash-grid">
        {/* Havza Bars */}
        <section className="dash-card havza-card">
          <h2 className="card-title">{t('dashboard.havza_overview')}</h2>
          <div className="havza-bars">
            {HAVZA_ORDER.map(h => (
              <HavzaBar
                key={h}
                name={t(`havza_names.${h}`)}
                count={authorByHavza[h] || 0}
                total={authors.length}
                color={HAVZA_COLORS[h]}
              />
            ))}
          </div>
        </section>

        {/* Century Chart */}
        <section className="dash-card century-card">
          <h2 className="card-title">{t('dashboard.century_overview')}</h2>
          {stats && <CenturyChart data={stats.century_counts} />}
        </section>

        {/* Type Donut */}
        <section className="dash-card type-card">
          <h2 className="card-title">{t('dashboard.type_overview')}</h2>
          {stats && <TypeDonut data={stats.type_counts} />}
        </section>

        {/* Featured Scholars */}
        <section className="dash-card featured-card">
          <h2 className="card-title">{t('dashboard.recent_scholars')}</h2>
          <div className="featured-grid">
            {featured.map(s => (
              <Link key={s.author_id} to={`/scholars/${s.author_id}`} className="scholar-chip">
                <span className="chip-dot" style={{ background: HAVZA_COLORS[s.havza] }} />
                <div className="chip-info">
                  <span className="chip-name">{s.meshur_isim}</span>
                  <span className="chip-meta">
                    {hasDeathYear(s) ? `ö. ${deathYears(s, t)}` : ''} · {t(`havza_names.${s.havza}`)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/scholars" className="show-all-link">{t('common.show_all')} →</Link>
        </section>
      </div>

      {/* Period Overview */}
      <section className="dash-period-section">
        <h2 className="section-title">{t('periodization.title')}</h2>
        <div className="dash-period-cards">
          {(['formation', 'development', 'contraction'] as const).map(pid => (
            <Link key={pid} to="/periodization" className="dash-period-card" style={{ borderLeftColor: PERIOD_COLORS[pid] }}>
              <span className="dash-period-dot" style={{ background: PERIOD_COLORS[pid] }} />
              <div className="dash-period-info">
                <span className="dash-period-name">{t(`periods.${pid}`)}</span>
                <span className="dash-period-count">{periodCounts[pid]} {t('stats.scholars').toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>
        <Link to="/periodization" className="show-all-link">{t('periodization.detail')} →</Link>
      </section>

      {/* Historiography Quick Access */}
      <section className="dash-hist-section">
        <h2 className="section-title">{t('historiography.title')}</h2>
        <div className="dash-hist-chips">
          {HAVZA_ORDER.slice(0, 6).map(h => (
            <Link key={h} to={`/historiography/${h}`} className="dash-hist-chip" style={{ borderColor: HAVZA_COLORS[h] }}>
              <span className="dash-hist-dot" style={{ background: HAVZA_COLORS[h] }} />
              <span>{t(`havza_names.${h}`)}</span>
              <span className="dash-hist-arrow">→</span>
            </Link>
          ))}
        </div>
        <Link to="/historiography" className="show-all-link">{t('historiography.all_basins')} →</Link>
      </section>
    </div>
  );
}
