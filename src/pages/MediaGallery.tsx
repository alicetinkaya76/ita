import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';

type Video =
  | { kind: 'youtube'; id: string; title: string; source: string }
  | { kind: 'link'; url: string; title: string; source: string };

const PROGRAMS: Video[] = [
  { kind: 'youtube', id: '9uWzdqb1pJ4', title: 'Medeniyet Havzalarında Tarih ve Tarihçilik — Doç. Dr. Abdulkadir Macit', source: 'Enderun Sohbetleri · VAV TV' },
  { kind: 'youtube', id: 'T_w34-yEP0A', title: 'Medeniyet Havzalarında Tarih ve Tarihçilik', source: 'Enderun Sohbetleri · VAV TV' },
  { kind: 'youtube', id: 'bBpUef2TZZ4', title: 'Hafızanın Haritasından, Haritanın Hafızasına Medeniyet Havzaları', source: 'Bin1 · TVNET' },
  { kind: 'link', url: 'https://www.vavtv.com.tr/programlar/son-davet/islam-medeniyetinde-tarih-yaziciligi-ve-muhammed-hamidullah-son-davet', title: 'İslam Medeniyetinde Tarih Yazıcılığı ve Muhammed Hamidullah', source: 'Son Davet · VAV TV' },
  { kind: 'youtube', id: 'RXyxbP1VLFs', title: 'Tarih Yazımı ve Tarih Yazıcılığı Sürecine Dair 4 Eser', source: 'Tırnak İçinde · #1000TemelEser' },
  { kind: 'youtube', id: 'k-hkTDTAxnc', title: 'Hint Alt Kıtasında Tarihyazımı', source: 'HAKAMER Seminerleri' },
  { kind: 'youtube', id: 'GOLh3Ypv04A', title: 'Dünya Tarihyazımında Kapsayıcı Bir Alan Açmak', source: 'İDM Seminerleri' },
];

const WORKSHOPS: Video[] = [
  { kind: 'youtube', id: 'sKjJvvbPOdw', title: 'Mısır’da Tarih Kaynakları ve Tarihyazımı — I', source: 'Çalıştay' },
  { kind: 'youtube', id: 'l6gb-7jPbw0', title: 'Mısır’da Tarih Kaynakları ve Tarihyazımı — II', source: 'Çalıştay' },
  { kind: 'youtube', id: 'TguzP8ggznQ', title: 'Mısır’da Tarih Kaynakları ve Tarihyazımı — III', source: 'Çalıştay' },
  { kind: 'link', url: 'https://drive.google.com/drive/folders/12ha8Iz2r1gsGL3eOb1nXtb1ff8jxRlfx?usp=sharing', title: 'Bilâdüşşam Çalıştayı (video arşivi)', source: 'Çalıştay · Google Drive' },
  { kind: 'link', url: 'https://drive.google.com/drive/folders/1phgg8nsNlE1Ce_AO9sLmgkjqyZ6NDHnk?usp=sharing', title: 'Mağrib Çalıştayı (1., 2. ve 3. Oturumlar)', source: 'Çalıştay · Google Drive' },
  { kind: 'link', url: 'https://drive.google.com/file/d/1BF7PGV4c6WFUs_uzkINkmE5uLPV8GuSC/view?usp=sharing', title: 'Balkan Çalıştayı (Açılış Oturumu)', source: 'Çalıştay · Google Drive' },
  { kind: 'link', url: 'https://drive.google.com/file/d/1Rwa3vuQw1RZKzcoeCV-5jKGIMsILyDTW/view?usp=sharing', title: 'Balkan Çalıştayı (1. Oturum)', source: 'Çalıştay · Google Drive' },
  { kind: 'link', url: 'https://drive.google.com/file/d/1Gm8C0ZXOJmaZdTrKhpZaqsOxKoHR9jqh/view?usp=sharing', title: 'Balkan Çalıştayı (2. Oturum)', source: 'Çalıştay · Google Drive' },
  { kind: 'link', url: 'https://drive.google.com/file/d/1M9UJoU3MAb3Gt0QNPvCGlAHza2xfTdSj/view?usp=sharing', title: 'Balkan Çalıştayı (3. Oturum)', source: 'Çalıştay · Google Drive' },
];

function YouTubeCard({ v }: { v: Extract<Video, { kind: 'youtube' }> }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
  return (
    <div className="media-card">
      <div className="media-thumb">
        {playing ? (
          <iframe
            className="media-iframe"
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" className="media-play-btn" onClick={() => setPlaying(true)} aria-label={v.title}>
            <img src={thumb} alt={v.title} loading="lazy" />
            <span className="media-play" aria-hidden>▶</span>
          </button>
        )}
      </div>
      <div className="media-body">
        <span className="media-source">{v.source}</span>
        <span className="media-title">{v.title}</span>
      </div>
    </div>
  );
}

function VideoCard({ v }: { v: Video }) {
  if (v.kind === 'youtube') return <YouTubeCard v={v} />;
  return (
    <a className="media-card media-card-link" href={v.url} target="_blank" rel="noopener noreferrer">
      <div className="media-thumb media-thumb-link">
        <span className="media-link-icon" aria-hidden>↗</span>
      </div>
      <div className="media-body">
        <span className="media-source">{v.source}</span>
        <span className="media-title">{v.title}</span>
      </div>
    </a>
  );
}

export default function MediaGallery() {
  const { t } = useTranslation();
  return (
    <div className="media-page">
      <Seo title={t('media.title')} description={t('media.subtitle')} path="/videolar" />
      <header className="period-hero">
        <div className="hero-pattern" />
        <h1 className="hero-title">{t('media.title')}</h1>
        <p className="hero-subtitle">{t('media.subtitle')}</p>
      </header>

      <div className="media-content">
        <section className="media-section">
          <h2 className="media-section-title">{t('media.programs')}</h2>
          <div className="media-grid">
            {PROGRAMS.map((v, i) => <VideoCard key={i} v={v} />)}
          </div>
        </section>

        <section className="media-section">
          <h2 className="media-section-title">{t('media.workshops')}</h2>
          <div className="media-grid">
            {WORKSHOPS.map((v, i) => <VideoCard key={i} v={v} />)}
          </div>
          <p className="media-note">{t('media.more_soon')}</p>
        </section>
      </div>
    </div>
  );
}
