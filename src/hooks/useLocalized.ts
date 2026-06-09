import { useTranslation } from 'react-i18next';

/**
 * Gets localized field from data.
 * If the field is an object with language keys, returns the best match.
 * If it's a string, returns as-is (Turkish default).
 */
export function useLocalized() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  function getField(item: Record<string, unknown>, field: string): string {
    const val = item[field];
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, string>;
      return obj[lang] || obj['en'] || obj['tr'] || '';
    }
    return String(val);
  }

  return { getField, lang };
}
