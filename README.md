# İTA — İslam Tarihyazım Atlası

**Atlas of Islamic Historiography** — İslam medeniyetinin tarihyazım geleneğini haritalandıran, görselleştiren ve uzun-form makalelerle anlatan dijital atlas ve ansiklopedi.

## Genel Bakış

İTA, Hicrî 1.–15. (Milâdî 7.–21.) asırlar arasında İslam dünyasının havzalarında üretilen tarihçiliği; tarihçiler, eserler, hanedanlar, türler ve yöntemler üzerinden interaktif haritalar, ağ grafikleri ve kronolojik görselleştirmelerle sunar. Veriler, Medeniyet Havzalarında Tarih ve Tarihçilik (MHTT) çalışmalarından derlenmiş ve TDV İslam Ansiklopedisi (DİA) ile eşleştirilmiştir.

Bu sürüm (v2), v1'in tasarım dilini koruyarak proje dökümanlarından üretilen sekiz uzun-form makaleyi ve dokuzuncu havza olan **Bilâdüşşam**'ı içerir.

## Öne Çıkan Özellikler

- **Uzun-form Makaleler** — Üç dönem (Teşekkül, Gelişim, Daralma) ve beş havza (İran, Mısır, Balkanlar, Hint Alt Kıtası, Endülüs) için dipnotlu, içindekiler menülü tam akademik makaleler (`/makale/:id`)
- **İnteraktif Harita** — Leaflet tabanlı havza poligonları ve şehir işaretleri
- **Tarihçi Ağı** — D3 force-directed hoca–talebe ve çağdaşlık ilişkileri grafiği
- **Hoca–Talebe Silsileleri** — Çok kuşaklı silsile ağacı görselleştirmesi
- **Zaman Çizgisi** — Yüzyıl bazlı kronolojik görünüm
- **Havza Karşılaştırma** — İki havzanın yan yana istatistiksel kıyası
- **İstatistik Paneli** — Dönem/tür/ilişki dağılım grafikleri
- **Genel Arama** — Fuse.js ile bulanık arama
- **Çok dilli** — Türkçe, İngilizce, Arapça (tam RTL desteği)
- **Karanlık Mod** ve **PWA** (çevrimdışı destek)

## Teknoloji

React 19 · Vite · TypeScript · Tailwind v4 · React Router 7 · D3.js · Leaflet · Fuse.js · react-i18next · vite-plugin-pwa

## Veri Seti

| Veri | Sayı |
|------|------|
| Tarihçiler | 2.337 |
| Eserler | 2.249 |
| İlişkiler | 3.356 |
| DİA eşleşmeleri | 1.127 |
| Havzalar | 9 |
| Uzun-form makaleler | 8 |

## Geliştirme

```bash
npm install
npm run dev        # geliştirme sunucusu
npm run build      # production derlemesi (tsc + vite)
npm run preview    # production önizleme
```

## Yayınlama (GitHub Pages)

Bu proje GitHub Pages için yapılandırılmıştır. **Yeni bir repoya** yüklerken tek yapmanız gereken `base` yolunu repo adınıza eşitlemek:

1. `vite.config.ts` içindeki `base` değeri varsayılan olarak `/islamic-historiography-atlas-v2/`'dir. Repo adınız farklıysa şu iki yöntemden birini kullanın:
   - `vite.config.ts` içindeki `base` değerini `'/REPO-ADINIZ/'` olarak değiştirin **ve** `index.html` içindeki favicon/apple-touch-icon yollarındaki ön eki güncelleyin; veya
   - Derlemeyi ortam değişkeniyle yapın: `VITE_BASE=/REPO-ADINIZ/ npm run build`
2. `git push` sonrası `.github/workflows/deploy.yml` otomatik olarak derleyip `gh-pages`'e yayınlar. Repo ayarlarından **Settings → Pages → Source: GitHub Actions** seçili olmalıdır.

> **Google Analytics:** Mevcut ölçüm kimliği (`G-GRBKMGKSN3`) `index.html` içinde korunmuştur. Değiştirmeniz gerekirse yalnızca o satırı güncelleyin.

## Proje Yapısı

```
public/data/           # JSON veri katmanı
  articles.json        # 8 uzun-form makale (dökümanlardan üretildi)
  historiography.json  # 9 havza: hanedanlar, dönem anlatıları
  periods.json         # 3 dönem özetleri
  itta_authors.json    # 2.337 tarihçi
  itta_works.json      # 2.249 eser
  itta_relations.json  # 3.356 ilişki
src/
  pages/ArticleView.tsx   # makale okuyucu (TOC, dipnotlar)
  pages/About.tsx         # proje, ekip, yayınlar, kurumlar
  hooks/useData.ts        # veri hook'ları + tipler
  i18n/locales/{tr,en,ar} # çeviriler
```

## Ekip

**Koordinatör:** Prof. Dr. Abdulkadir Macit · **Koordinatör Yardımcıları:** Dr. Ali Çetinkaya, Dr. Halil İbrahim Erol, Dr. Hüseyin Gökalp, Dr. Selahattin Polatoğlu. Tam ekip, danışmanlar ve araştırmacılar listesi site içindeki **Hakkında** sayfasındadır.

## Lisans

© 2026 İTA — İslam Tarihyazım Atlası. Tüm hakları saklıdır.
