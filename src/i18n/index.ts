import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import trCommon from './locales/tr/common.json';
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import faCommon from './locales/fa/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { common: trCommon },
      en: { common: enCommon },
      ar: { common: arCommon },
      fa: { common: faCommon },
    },
    defaultNS: 'common',
    fallbackLng: ['en', 'tr'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
