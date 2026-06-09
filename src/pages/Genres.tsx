import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';
import { useWorks } from '../hooks/useData';
import { TYPE_COLORS } from '../utils/colors';

// The official İTA "Türler" taxonomy. `key` (when present) links the leaf to
// the dataset's genre so users can jump to the filtered source list with a count.
type Leaf = { label: string; key?: string };
type Category = { id: string; title: string; color: string; intro?: boolean; leaves: Leaf[] };

const TAXONOMY: Category[] = [
  {
    id: 'siyer', title: 'Siyer ve Meğâzî', color: '#AD1457',
    leaves: [{ label: 'Siyer ve Meğâzî', key: 'siyer_megazi' }],
  },
  {
    id: 'dunya', title: 'Dünya Tarihi / Evrensel Tarih', color: '#0277BD',
    leaves: [{ label: 'Dünya Tarihi / Evrensel Tarih', key: 'genel_tarih' }],
  },
  {
    id: 'genel', title: 'Genel Tarih Kitapları', color: '#1565C0',
    leaves: [{ label: 'Genel Tarih Kitapları', key: 'genel_tarih' }],
  },
  {
    id: 'ozel', title: 'Özel Tarih Kitapları', color: '#6A1B9A',
    leaves: [
      { label: 'Sultanların Tarihi', key: 'hanedan_tarihi' },
      { label: 'Hanedan Tarihi', key: 'hanedan_tarihi' },
      { label: 'Şemâil ve Delâil' },
      { label: 'Hatırat ve Otobiyografi' },
      { label: 'Tabakat Terâcim', key: 'tabakat' },
      { label: 'Menâkıbnâme' },
      { label: 'Sergüzeştnâme' },
      { label: 'Fedâil' },
      { label: 'Ahbâr', key: 'edebiyat' },
      { label: 'Meşâyih' },
      { label: 'Vefeyât', key: 'tabakat' },
      { label: 'Ensâb', key: 'ensab' },
      { label: 'Adâb ve Muhadarât', key: 'edebiyat' },
      { label: 'Haraç ve Emvâl' },
      { label: 'Vekayinâme', key: 'kronoloji' },
      { label: 'Kronik', key: 'kronoloji' },
      { label: 'Salnâme', key: 'kronoloji' },
      { label: 'Rûznâme', key: 'kronoloji' },
      { label: 'Nasihatnâme / Siyasetnâme', key: 'siyasetname' },
      { label: 'Monografi' },
      { label: 'Gazânâme / Gazavâtnâme' },
      { label: 'Fütûh / Fütûhatnâme', key: 'futuh' },
      { label: 'Zafernâme' },
      { label: 'Şehnâme / Pâdişâhnâme' },
      { label: 'Surnâme' },
      { label: 'Tezkire' },
      { label: 'Ansiklopedi' },
      { label: 'Münşeât Mecmuası', key: 'edebiyat' },
      { label: 'Sefâretnâme', key: 'seyahatname' },
      { label: 'Nümizmatik (Meskukât)', key: 'arkeoloji' },
      { label: 'Epigrafya', key: 'arkeoloji' },
      { label: 'Arkeoloji', key: 'arkeoloji' },
      { label: 'Kültür Tarihi' },
      { label: 'Takvim Kronoloji', key: 'kronoloji' },
      { label: 'Özel Tarih (genel)', key: 'ozel_tarih' },
    ],
  },
  {
    id: 'bolge', title: 'Bölge ve Şehir Tarihleri', color: '#2E7D32',
    leaves: [
      { label: 'Coğrafya', key: 'cografya' },
      { label: 'Şehir Tarihi', key: 'sehir_tarihi' },
      { label: 'Seyahatnâme', key: 'seyahatname' },
    ],
  },
];

export default function Genres() {
  const { t } = useTranslation();
  const { works, loading } = useWorks();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const w of works) m[w.eser_turu] = (m[w.eser_turu] || 0) + 1;
    return m;
  }, [works]);

  return (
    <div className="genres-page">
      <Seo title={t('genres.title')} description={t('genres.subtitle')} path="/turler" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('genres.title')}</h1>
        <p className="hero-subtitle">{t('genres.subtitle')}</p>
      </header>

      <div className="genres-content">
        {TAXONOMY.map(cat => (
          <section key={cat.id} className="genre-cat" style={{ borderColor: cat.color }}>
            <div className="genre-cat-header" style={{ background: `${cat.color}12` }}>
              <span className="genre-cat-dot" style={{ background: cat.color }} />
              <h2 className="genre-cat-title" style={{ color: cat.color }}>{cat.title}</h2>
            </div>
            <div className="genre-leaves">
              {cat.leaves.map((leaf, i) => {
                const c = leaf.key ? counts[leaf.key] || 0 : 0;
                const color = leaf.key ? TYPE_COLORS[leaf.key] || cat.color : '#bbb';
                if (leaf.key && c > 0) {
                  return (
                    <Link key={i} to={`/sources?type=${leaf.key}`} className="genre-leaf genre-leaf-active" style={{ borderColor: color }}>
                      <span className="genre-leaf-label">{leaf.label}</span>
                      <span className="genre-leaf-count" style={{ background: color }}>{c}</span>
                    </Link>
                  );
                }
                return (
                  <span key={i} className="genre-leaf genre-leaf-static">
                    <span className="genre-leaf-label">{leaf.label}</span>
                  </span>
                );
              })}
            </div>
          </section>
        ))}

        {!loading && (
          <p className="genres-hint">{t('genres.hint')}</p>
        )}
      </div>
    </div>
  );
}
