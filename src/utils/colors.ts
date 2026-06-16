export const HAVZA_COLORS: Record<string, string> = {
  iran: '#C2185B',
  misir: '#1565C0',
  hint: '#00838F',
  endulus: '#AD1457',
  arabistan: '#BF360C',
  magrib: '#2E7D32',
  turkistan: '#6A1B9A',
  balkanlar: '#37474F',
  biladussam: '#E65100',
  dicle_firat: '#4E342E',
  anadolu: '#00695C',
  diger: '#757575',
};

export const HAVZA_COLORS_LIGHT: Record<string, string> = {
  iran: '#F8BBD0',
  misir: '#BBDEFB',
  hint: '#B2EBF2',
  endulus: '#F8BBD0',
  arabistan: '#FFCCBC',
  magrib: '#C8E6C9',
  turkistan: '#E1BEE7',
  balkanlar: '#CFD8DC',
  biladussam: '#FFE0B2',
  dicle_firat: '#D7CCC8',
  anadolu: '#B2DFDB',
  diger: '#EEEEEE',
};

export const TYPE_COLORS: Record<string, string> = {
  hanedan_tarihi: '#1565C0',
  modern_arastirma: '#6A1B9A',
  tabakat: '#00838F',
  cografya: '#2E7D32',
  seyahatname: '#E65100',
  siyer_megazi: '#AD1457',
  futuh: '#BF360C',
  genel_tarih: '#0277BD',
  edebiyat: '#4E342E',
  siir_divan: '#880E4F',
  kronoloji: '#37474F',
  ensab: '#00695C',
  tefsir: '#283593',
  fıkıh: '#1B5E20',
  hadis: '#4A148C',
  tasavvuf: '#311B92',
  sehir_tarihi: '#FF6F00',
  arkeoloji: '#795548',
  siyasetname: '#827717',
  lugat: '#546E7A',
  ozel_tarih: '#6D4C41',
  diger: '#9E9E9E',
};

// Madhhab (mezhep) colours — keys match the raw data values exactly.
export const MEZHEP_COLORS: Record<string, string> = {
  'Hanefî': '#1565C0',
  'Mâlikî': '#2E7D32',
  'Şâfiî': '#6A1B9A',
  'Hanbelî': '#BF360C',
  'Zâhirî': '#00838F',
  'Şiî': '#AD1457',
  'İbâzî': '#E65100',
  'İsmâilî': '#827717',
};

export const HAVZA_ORDER = [
  'iran', 'misir', 'hint', 'endulus', 'arabistan',
  'magrib', 'turkistan', 'balkanlar', 'biladussam',
];

export const PERIOD_COLORS: Record<string, string> = {
  formation: '#1565C0',
  development: '#2E7D32',
  contraction: '#E65100',
};

export const PERIOD_RANGES: Record<string, [number, number]> = {
  formation: [7, 10],
  development: [11, 18],
  contraction: [19, 21],
};

export function getPeriodId(century: number | null): string | null {
  if (!century) return null;
  if (century >= 7 && century <= 10) return 'formation';
  if (century >= 11 && century <= 18) return 'development';
  if (century >= 19) return 'contraction';
  return null;
}
