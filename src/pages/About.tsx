import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import { useStats } from '../hooks/useData';

const PILLARS = [
  'kronoloji', 'havzalar', 'hanedanlar', 'tarihciler',
  'kaynaklar', 'turler', 'metodoloji', 'kavramlar',
] as const;

// Project team — proper nouns, shared across languages (İTA Proje Ekibi)
const TEAM = {
  coordinator: ['Prof. Dr. Abdulkadir Macit'],
  deputy: [
    'Dr. Ali Çetinkaya', 'Dr. Halil İbrahim Erol',
    'Dr. Hüseyin Gökalp', 'Dr. Selahattin Polatoğlu',
  ],
  assistant: [
    'Abdullah Mamun', 'Elif Özdoğan Ulu', 'Hakan Araz',
    'Haşem Gözgü', 'Kazım Berkay Özkardaş', 'Mohammad Abdur Rouf',
  ],
  team: [
    'Prof. Dr. Feridun Bilgin', 'Prof. Dr. Levent Kayapınar',
    'Prof. Dr. Mehmet Hacısalihoğlu', 'Prof. Dr. Mustafa Hamdi Sayar',
    'Prof. Dr. Osman Aydınlı', 'Prof. Dr. Ziya Polat',
    'Doç. Dr. Ebubekir Ceylan', 'Doç. Dr. Halil Ortakçı',
    'Doç. Dr. İlyas Uçar', 'Doç. Dr. Serhan Afacan',
    'Doç. Dr. Şefaattin Deniz', 'Dr. Abdulhamit Dündar',
    'Dr. Ahmet İğdi', 'Dr. Ayşe Çekiç', 'Dr. Büşra Sıdıka Kaya',
    'Dr. Hasan Asadi', 'Dr. Suat Kaymak', 'Dr. Yakup Akyürek',
    'Dr. Zebiniso Kamalova', 'Faruk Akyıldız', 'Halil İbrahim Yılmaz',
  ],
  advisor: [
    'Prof. Dr. Ali Satan', 'Prof. Dr. Osman Gazi Özgüdenli',
    'Doç. Dr. Ertuğrul Ökten', 'Doç. Dr. Teyfur Erdoğdu',
    'Doç. Dr. Halil İbrahim Hançabay', 'Doç. Dr. Hakan Temir',
    'Dr. Faruk Yaslıçimen',
  ],
  researcher: [
    'Beytullah Mısır', 'Emre Özgören', 'Esra Bembeyaz',
    'Mehmet İlkay Çiftçi', 'Merjema İmamoviç', 'Sümeyye Cinisli', 'Yunus Ballı',
  ],
};
const TEAM_ORDER = ['coordinator', 'deputy', 'assistant', 'team', 'advisor', 'researcher'] as const;

const PUBLICATIONS = [
  'Anadolu’da Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap (Hazırlanıyor).',
  'Dicle & Fırat’ta Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2025.',
  'Bilâdüşşam’da Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2026.',
  'Türkistan’da Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2025.',
  'Arap Yarımadası’nda Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2025.',
  'Endülüs’te Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2025.',
  'Mağrib’de Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2024.',
  'Balkanlarda Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2024.',
  'Hint Alt Kıtası’nda Tarih Kaynakları ve Tarihyazımı (ed.), Fikir Kitap, 2024.',
  'Mısır’da Tarih Kaynakları ve Tarihyazımı (ed.), İLEM Yayınları, 2021.',
  'Memlük Entelektüel Tarihine Giriş I: Literatür Değerlendirmesi (ed.), İLEM Yayınları, 2023.',
  'H. İ. Erol, Mısır’da Tarihyazımı: Fransız İşgalinden Kavalalı Mehmed Ali Paşa Dönemine, İLEM Yayınları, 2021.',
  'İran’da Tarih Kaynakları ve Tarihyazımı (ed.), İLEM Yayınları, 2020.',
];

const PARTNERS = [
  'Yurtdışı Türkler ve Akraba Topluluklar Başkanlığı (YTB)',
  'Balkan Studies Foundation',
  'Saraybosna Üniversitesi Tarih Araştırmaları Merkezi',
  'Yıldız Teknik Üniversitesi BALKAR',
  'Ankara Üniversitesi DTCF',
  'İstanbul Üniversitesi Güneydoğu Avrupa Araştırmaları Merkezi',
  'İstanbul Üniversitesi Türkiyat Araştırmaları Merkezi',
  'Özbekistan Bilimler Akademisi Bîrûnî Şarkiyat Enstitüsü',
  'Artuklu Akademi (Mardin)',
  'Muş Alparslan Üniversitesi',
  'Eskişehir Osmangazi Üniversitesi İlahiyat Fakültesi',
];

const STRIPE = ['#1565C0', '#E65100', '#2E7D32', '#AD1457', '#6A1B9A', '#00838F'];

export default function About() {
  const { t } = useTranslation();
  const { stats } = useStats();

  return (
    <div className="about-page">
      <Seo title={t('about.title')} description={t('about.subtitle')} path="/about" />
      <header className="about-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('about.title')}</h1>
        <p className="hero-subtitle">{t('about.subtitle')}</p>
      </header>

      <div className="about-content">
        {/* What is İTA */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.what_title')}</h2>
          <p className="about-text">{t('about.what_text')}</p>
        </section>

        {/* Eight pillars */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.pillars_title')}</h2>
          <div className="about-pillars">
            {PILLARS.map((p, i) => (
              <div key={p} className="about-pillar">
                <span className="about-pillar-num" style={{ color: STRIPE[i % STRIPE.length] }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="about-pillar-name">{t(`about.pillar_${p}`)}</h3>
                <p className="about-pillar-desc">{t(`about.pillar_${p}_d`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Aims */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.aim_title')}</h2>
          <p className="about-text">{t('about.aim_text')}</p>
        </section>

        {/* Methodology */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.method_title')}</h2>
          <p className="about-text">{t('about.method_text')}</p>
        </section>

        {/* Data set */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.data_title')}</h2>
          <div className="about-data-grid">
            <div className="about-data-item">
              <span className="about-data-value">{stats?.total_scholars?.toLocaleString() || '—'}</span>
              <span className="about-data-label">{t('stats.scholars')}</span>
            </div>
            <div className="about-data-item">
              <span className="about-data-value">{stats?.total_works?.toLocaleString() || '—'}</span>
              <span className="about-data-label">{t('stats.sources')}</span>
            </div>
            <div className="about-data-item">
              <span className="about-data-value">{stats?.dia_relations?.toLocaleString() || '—'}</span>
              <span className="about-data-label">{t('stats.relations')}</span>
            </div>
            <div className="about-data-item">
              <span className="about-data-value">{stats?.dia_matches?.toLocaleString() || '—'}</span>
              <span className="about-data-label">{t('stats.dia_links')}</span>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.team_title')}</h2>
          <div className="about-team-groups">
            {TEAM_ORDER.map((role, ri) => (
              <div key={role} className="about-team-group">
                <h3 className="about-team-role-title" style={{ borderColor: STRIPE[ri % STRIPE.length] }}>
                  {t(`about.role_${role}`)}
                </h3>
                <div className="about-team-names">
                  {TEAM[role].map(name => (
                    <span key={name} className="about-team-name">{name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Publications */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.publications_title')}</h2>
          <ol className="about-pub-list">
            {PUBLICATIONS.map((pub, i) => <li key={i}>{pub}</li>)}
          </ol>
        </section>

        {/* Data sources */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.sources_title')}</h2>
          <div className="about-sources">
            <div className="about-source-card">
              <h3>MHTT</h3>
              <p>{t('about.source_mhtt')}</p>
            </div>
            <div className="about-source-card">
              <h3>DİA</h3>
              <p>{t('about.source_dia')}</p>
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.partners_title')}</h2>
          <div className="about-partners">
            {PARTNERS.map(p => <span key={p} className="about-partner">{p}</span>)}
          </div>
        </section>

        {/* Technology */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.tech_title')}</h2>
          <div className="about-tech-tags">
            {['React', 'TypeScript', 'Vite', 'D3.js', 'Leaflet', 'Tailwind CSS', 'Fuse.js', 'react-i18next'].map(tech => (
              <span key={tech} className="about-tech-tag">{tech}</span>
            ))}
          </div>
        </section>

        {/* Citation */}
        <section className="about-section">
          <h2 className="about-section-title">{t('about.cite_title')}</h2>
          <div className="about-cite-block">
            <code>
              Macit, A. (ed.) (2026). İTA: İslam Tarihyazım Atlası — Atlas of Islamic Historiography.
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}
