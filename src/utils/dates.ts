/* Scholarly Hijri/Gregorian date formatting. Both years already exist in the data
 * (vefat_yili_h / vefat_yili_m etc.) — this only formats them, no fabrication. */

type Tr = (key: string) => string;

/**
 * Format an (Hijri, Gregorian) year pair the scholarly way:
 *  - both present -> "H/M"  (e.g. "460/1067")
 *  - only Gregorian -> "M m." ; only Hijri -> "H h." (era marker from i18n)
 *  - neither -> "?"
 */
export function yearPair(
  h: number | null | undefined,
  m: number | null | undefined,
  t: Tr
): string {
  if (h && m) return `${h}/${m}`;
  if (m) return `${m} ${t('common.m_short')}`;
  if (h) return `${h} ${t('common.h_short')}`;
  return '?';
}

/** Convenience: a scholar's death year as a "H/M" pair (used by the many "ö." chips). */
export function deathYears(
  a: { vefat_yili_h?: number | null; vefat_yili_m?: number | null },
  t: Tr
): string {
  return yearPair(a.vefat_yili_h, a.vefat_yili_m, t);
}

/** True if a record has any death year at all (to decide whether to render the chip). */
export function hasDeathYear(a: { vefat_yili_h?: number | null; vefat_yili_m?: number | null }): boolean {
  return Boolean(a.vefat_yili_h || a.vefat_yili_m);
}
