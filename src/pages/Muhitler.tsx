import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthors } from '../hooks/useData';
import type { Author } from '../hooks/useData';
import { HAVZA_COLORS } from '../utils/colors';
import Seo from '../components/Seo';

interface Milieu { city: string; century: number; list: Author[] }

export default function Muhitler() {
  const { t } = useTranslation();
  const { authors, loading } = useAuthors();

  const { milieus, covered } = useMemo(() => {
    const withCY = authors.filter(a => (a.sehir || '').trim() && a.vefat_yili_m != null);
    const cell: Record<string, Author[]> = {};
    for (const a of withCY) {
      const vy = a.vefat_yili_m as number;
      const yy = Math.ceil(vy / 100);
      const k = `${a.sehir.trim()}|${yy}`;
      (cell[k] = cell[k] || []).push(a);
    }
    const milieus: Milieu[] = Object.entries(cell)
      .map(([k, list]) => {
        const [city, yy] = k.split('|');
        return { city, century: Number(yy), list: [...list].sort((x, y) => (y.importance_score || 0) - (x.importance_score || 0)) };
      })
      .filter(c => c.list.length >= 3)
      .sort((a, b) => b.list.length - a.list.length || a.century - b.century);
    return { milieus, covered: withCY.length };
  }, [authors]);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

  return (
    <div className="list-page">
      <Seo
        title={t('milieus.title', { defaultValue: 'Çağdaşlık Muhitleri' })}
        description={t('milieus.subtitle', { defaultValue: 'Aynı şehir ve nesilde faal olan tarihçi kümeleri' })}
        path="/muhitler"
      />
      <header className="list-header">
        <h1>{t('milieus.title', { defaultValue: 'Çağdaşlık Muhitleri' })}</h1>
        <span className="list-count">{milieus.length} {t('milieus.hub_count', { defaultValue: 'muhit' })}</span>
      </header>

      <p style={{ maxWidth: 660, color: '#8a8a8a', lineHeight: 1.6, margin: '0 0 6px' }}>
        {t('milieus.intro', { defaultValue: 'Aynı şehirde ve aynı yüzyılda faal olan tarihçiler bir araya getirildiğinde, ilmî üretimin yoğunlaştığı çağdaş muhitler ortaya çıkar. En az üç tarihçinin buluştuğu şehir–yüzyıl kümeleri, yoğunluğa göre sıralanmıştır.' })}
      </p>
      <p style={{ maxWidth: 660, color: '#8a8a8a', lineHeight: 1.5, margin: '0 0 4px', fontSize: 13 }}>
        {t('milieus.note', { defaultValue: 'Not: Bu görünüm yalnızca hem şehri hem vefat yılı kayıtlı tarihçilere dayanır' })} ({covered}/{authors.length}).
      </p>

      <section className="stat-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {milieus.map(m => (
            <div key={`${m.city}-${m.century}`} style={{ border: '1px solid rgba(128,128,128,0.2)', borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 16 }}>{m.city} <span style={{ color: '#8a8a8a', fontWeight: 400, fontSize: 14 }}>· {m.century}. {t('dashboard.century_suffix', { defaultValue: 'yy' })}</span></strong>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8B4513', whiteSpace: 'nowrap' }}>{m.list.length} {t('common.scholar_count', { defaultValue: 'tarihçi' })}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
                {m.list.map(a => (
                  <span key={a.author_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: HAVZA_COLORS[a.havza] || '#999', flexShrink: 0 }} />
                    <Link to={`/scholars/${a.author_id}`} className="rel-link">{a.meshur_isim}</Link>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
