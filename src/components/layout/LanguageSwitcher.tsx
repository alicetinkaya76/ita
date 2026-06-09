import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'tr', label: 'TR', name: 'Türkçe' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'ع', name: 'العربية' },
  { code: 'fa', label: 'فا', name: 'فارسی' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          className={i18n.language === l.code ? 'active' : ''}
          aria-label={l.name}
          aria-pressed={i18n.language === l.code}
          lang={l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
