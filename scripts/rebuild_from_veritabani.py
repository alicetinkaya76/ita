#!/usr/bin/env python3
"""İTA v2 — Köprülü Yol B: rebuild author/work DB from MHTT_KATALOG, then bridge
DİA slug / url / desc / importance_score from v1 by normalized-name match, keep
itta_relations.json as-is (recompute both_in_itta), derive sehir from nisbe,
recompute stats, fill historiography. DRY-RUN by default; pass --apply to write."""
import json, re, sys, os, glob, unicodedata
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime, timezone
import pandas as pd, warnings
warnings.filterwarnings('ignore')

REPO   = Path(__file__).resolve().parents[1]   # scripts/ -> ita-v2 repo root
DATA   = REPO / "public/data"
BACKUP = REPO / "data_v1_backup"
UPLOADS = Path("/mnt/user-data/uploads")
DRY = "--apply" not in sys.argv

def find_source():
    for base in (UPLOADS, REPO.parent / "kaynak-veriler"):
        for pat in ("İTA_VERİTABANI*.xlsx", "*VER?TABANI*.xlsx", "*VERITABANI*.xlsx"):
            hits = sorted(glob.glob(str(base / pat)))
            if hits: return hits[0]
    raise FileNotFoundError("İTA_VERİTABANI*.xlsx not found")

HAVZA_ORDER = ['iran','misir','hint','endulus','arabistan','magrib','turkistan','balkanlar','biladussam']
CANON = set(HAVZA_ORDER)

# free-text Havza label -> canonical basin (first-listed canonical part wins).
# DEFAULTS (flagged in report): Suriye->biladussam, Bulgaristan/Rumeli/Bosna->balkanlar, Yemen->arabistan,
# Horasan/Gazne->iran, Kuzey Afrika->magrib. Out-of-frame regions are EXCLUDED and itemized.
PART2HZ = {
 'endulus':'endulus','magrib':'magrib','kuzeyafrika':'magrib','misir':'misir',
 'biladussam':'biladussam','suriye':'biladussam','sam':'biladussam',
 'turkistan':'turkistan','harizm':'turkistan','horasan':'iran','gazne':'iran','iran':'iran','afganistan':'iran',
 'hint':'hint','hindistan':'hint','hintaltkitasi':'hint','arapyarimadasi':'arabistan','yemen':'arabistan',
 'balkanlar':'balkanlar','balkanlarlar':'balkanlar','bulgaristan':'balkanlar','rumeli':'balkanlar','bosna':'balkanlar',
 'sirbistan':'balkanlar','makedonya':'balkanlar','prilep':'balkanlar','belgrad':'balkanlar','sofya':'balkanlar',
 'tirnova':'balkanlar','uskup':'balkanlar','saraybosna':'balkanlar','kragujevac':'balkanlar','adriyatik':'balkanlar',
}
OUT_MARK = {
 'diclefirat':'Irak (Dicle-Fırat)','dicle':'Irak (Dicle-Fırat)','firat':'Irak (Dicle-Fırat)','irak':'Irak (Dicle-Fırat)','anadolu':'Anadolu','istanbul':'İstanbul/Anadolu',
 'rusya':'Batılı/şarkiyatçı','ingiltere':'Batılı/şarkiyatçı','fransa':'Batılı/şarkiyatçı','almanya':'Batılı/şarkiyatçı',
 'amerika':'Batılı/şarkiyatçı','italya':'Batılı/şarkiyatçı','iskocya':'Batılı/şarkiyatçı','ispanya':'Batılı/şarkiyatçı',
 'avusturya':'Batılı/şarkiyatçı','macaristan':'Batılı/şarkiyatçı','danimarka':'Batılı/şarkiyatçı','hollanda':'Batılı/şarkiyatçı',
 'kafkasya':'Kafkasya','bizans':'Batılı/şarkiyatçı','sicilya':'Batılı/şarkiyatçı','akdeniz':'Belirsiz',
 'islamdunyasi':'Belirsiz','osmanli':'Belirsiz','ortadogu':'Belirsiz','avrupa':'Batılı/şarkiyatçı',
}
def _canon_parts(label):
    # split the RAW label on punctuation separators (slash, comma, parens, dashes), THEN reduce each part
    out = []
    for p in re.split(r'[/,()]|–|—|\s-\s| ve ', label):
        red = _reduce(p).lower().replace(' ', '').strip()
        if red: out.append(red)
    return out
def map_havza(label):
    parts = _canon_parts(label)
    for p in parts:
        if p in PART2HZ: return PART2HZ[p], None
    for p in parts:
        if p in OUT_MARK: return None, OUT_MARK[p]
    return None, f'Belirsiz ({label.strip()})'

# ---------- normalization / parsing (ported from proven scripts) ----------
PARTICLES = {'el','et','ed','es','ez','er','en','ul','b','bin','ibn','ibnul','ebu','ebul','ebi','al','ben','bint','ebû'}
_REPL = {'â':'a','î':'i','û':'u','ā':'a','ī':'i','ū':'u','ş':'s','ç':'c','ğ':'g','ö':'o','ü':'u','ı':'i','İ':'i',
         'ʾ':'','ʿ':'','’':'','‘':'',"'":'','-':' ','/':' '}
def _reduce(s):
    s = s or ''
    s = ''.join(_REPL.get(ch,ch) for ch in s)
    s = ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c))
    return s
def norm(s):
    s = re.sub(r'[^a-z0-9 ]',' ',_reduce(s).lower())
    toks = [t for t in s.split() if t and t not in PARTICLES]
    return ''.join(sorted(toks))
def clean(x):
    if x is None: return ''
    s = re.sub(r'\s+',' ',str(x).strip())
    return '' if s.lower() in ('nan','none','---','--','-','?','??','') else s
def parse_year(x):
    s = str(x) if x is not None else ''
    if not s or s.lower() in ('nan','---','?','-','none') or '00:00:00' in s: return None
    m = re.search(r'(\d{3,4})',s); return int(m.group(1)) if m else None
def first_int(s):
    m = re.match(r'\s*(\d{1,2})',str(s)); return int(m.group(1)) if m else None
def parse_century(yy_m, yy_h, death_m):
    s = str(yy_m).strip() if yy_m is not None else ''
    if s and s.lower()!='nan' and '00:00:00' not in s and s.count('-')<2:
        v = first_int(s)
        if v is not None:
            if 1<=v<=21: return v
            if v>100: return v//100+1
    dy = parse_year(death_m)
    if dy: return dy//100+1
    hs = str(yy_h).strip() if yy_h is not None else ''
    if hs and hs.lower()!='nan' and '00:00:00' not in hs:
        hv = first_int(hs)
        if hv and 1<=hv<=15: return int(((hv-0.5)*100*0.970224+621.5)//100)+1
    return None
def score(nworks, has_bio, has_death, has_desc):
    return round(min(38.0+5.0*min(nworks,5)+(8 if has_bio else 0)+(4 if has_death else 0)+(3 if has_desc else 0),88.0),1)

# ---------- genre (extended: also checks the 2nd part of composites) ----------
_GENRE_CHECKS = [
    (('coğraf','cograf','mesâlik','mesalik','büldân','buldan'),'cografya'),
    (('ensâb','ensab','nesep'),'ensab'),
    (('tabakat','terâcim','teracim','terâcîm','teracîm','biyografi','tabaka'),'tabakat'),
    (('şehir','sehir','hıtat','hitat','bölge'),'sehir_tarihi'),
    (('dünya','evrensel'),'genel_tarih'),(('genel tarih',),'genel_tarih'),
    (('seyahat','sefernâme','sefername','rıhle','rihle'),'seyahatname'),
    (('hanedan','sultan','devlet tarihi'),'hanedan_tarihi'),
    (('fütûh','futuh','fütuh','fetih'),'futuh'),
    (('ahbâr','ahbar','münşe','munse','edeb'),'edebiyat'),
    (('salnâme','salname','vekayi','kronik','takvim'),'kronoloji'),
    (('sözlük','sozluk','lügat','lugat'),'lugat'),
    (('siyer','megazi','meğazi','sîre','sire','mevlid'),'siyer_megazi'),
    (('şiir','siir','divan','dîvân','divân','kaside'),'siir_divan'),
    (('tefsir','kıraat','kiraat'),'tefsir'),
    (('fıkıh','fikih','fıkh','fetva'),'fıkıh'),
    (('hadis','hadîs','rivâyet','rivayet'),'hadis'),
    (('tasavvuf','sûfî','sufi','menâkıb','menakıb','velâyet'),'tasavvuf'),
    (('arkeolo','epigraf','nümizmat','numizmat'),'arkeoloji'),
    (('siyasetnâme','siyasetname','nasihatnâme','nasihatname'),'siyasetname'),
    (('araştırma','arastirma','tetkik','inceleme','modern'),'modern_arastirma'),
]
def _genre_one(spec):
    spec = spec.strip().lower()
    if not spec: return None
    for keys,val in _GENRE_CHECKS:
        if any(k in spec for k in keys): return val
    if spec.startswith('özel tarih') or spec.startswith('ozel tarih') or 'özel tarih' in spec: return 'ozel_tarih'
    return None
def norm_genre(s):
    if not s: return 'diger'
    parts = [p for p in s.split('/') if p.strip()]
    for p in parts:                       # first part priority, then later parts
        g = _genre_one(p)
        if g: return g
    return 'diger'

# ---------- column resolver (generalized: underscore->space, künye single-key) ----------
def resolve_cols(df):
    cols = [(_reduce(str(c)).lower().replace('_',' ').strip(), c) for c in df.columns]
    def find(*subs, exclude=None):
        for n,col in cols:
            if all(s in n for s in subs) and (not exclude or exclude not in n): return col
        return None
    return {
        'meshur': find('bilinen','yazar') or find('kisa','yazar'),
        'tam':    find('kunye'),                          # 'Yazarın Tam Künyesi' & 'Müellif_Tam_Künyesi'
        'eser':   find('bilinen','eser') or find('kisa','eser'),
        'diger':  find('anilan','diger') or find('diger','isim'),
        'yy_m':   find('yuzyil','miladi'),
        'yy_h':   find('yuzyil','hicri'),
        'hanedan':find('hanedan'),
        'tur':    find('eserin','turu') or find('tur ', exclude='turkistan') or find('eser turu'),
        'vef_m':  find('vefat','miladi'),
        'vef_h':  find('vefat','hicri'),
        'dil':    find('dil'),
        'ybio':   find('tanitimi','yazar') or find('yazarin','tanitim'),
        'ebio':   find('tanitimi','eser')  or find('eserin','tanitim'),
    }
def g(row, col):
    return clean(row[col]) if col is not None and col in row.index else ''

# ---------- nisbe -> city (curated, evidence-based; reviewable) ----------
NISBE_CITY = {
    # Bilâdüşşam
    'dimaski':'Dımaşk','dimask':'Dımaşk','halebi':'Halep','haleb':'Halep','makdis':'Kudüs','kudsi':'Kudüs',
    'nabulus':'Nablus','nablus':'Nablus','gazzi':'Gazze','askalan':'Askalan','humus':'Humus','hamevi':'Hama',
    'baalbek':'Baalbek','beyruti':'Beyrut',
    # İran / Türkistan / Horasan
    'isfahan':'İsfahan','isbahan':'İsfahan','buhari':'Buhara','semerkand':'Semerkand','semerkant':'Semerkand',
    'mervezi':'Merv','nisaburi':'Nişabur','nishaburi':'Nişabur','tusi':'Tûs','heravi':'Herat','herati':'Herat',
    'belhi':'Belh','gaznev':'Gazne','sicistani':'Sîstan','sistani':'Sîstan','horasani':'Horasan','curcani':'Cürcân',
    'gurgani':'Cürcân','sirazi':'Şîrâz','kazvini':'Kazvin','hemedani':'Hemedan','hemadani':'Hemedan','tebrizi':'Tebriz',
    # Irak
    'bagdadi':'Bağdat','basri':'Basra','kufi':'Kûfe','mavsili':'Musul','musuli':'Musul','vasiti':'Vâsıt','samarrai':'Sâmerrâ',
    # Mısır
    'fustat':'Fustat','iskenderi':'İskenderiye','dimyati':'Dimyat',
    # Endülüs
    'kurtub':'Kurtuba','isbiliy':'İşbiliye','girnat':'Gırnata','tuleytul':'Tuleytula','belensiy':'Belensiye',
    'mursiy':'Mürsiye','sarakust':'Sarakusta',
    # Mağrib
    'fasi':'Fas','merakes':'Merakeş','tilimsan':'Tilimsân','kayrevan':'Kayrevan','kayravan':'Kayrevan',
    'tunusi':'Tunus','sebti':'Sebte','bicay':'Bicâye',
    # Arabistan
    'mekki':'Mekke','medeni':'Medine','taifi':'Tâif','sanani':"San'a",'zebidi':'Zebîd',
    # Hint
    'dihlev':'Delhi','dehlev':'Delhi','lahuri':'Lahor','keşmir':'Keşmir','kesmiri':'Keşmir','gucerat':'Gücerât',
    'gucrati':'Gücerât','sindi':'Sind','multani':'Multan',
    # Balkanlar / Anadolu
    'uskubi':'Üsküp','uskub':'Üsküp','bosnev':'Saraybosna','selaniki':'Selanik','manastir':'Manastır',
    'filibev':'Filibe','sofyali':'Sofya','mostari':'Mostar','belgradi':'Belgrad','prizreni':'Prizren',
    'kostantin':'İstanbul','istanbul':'İstanbul','bursev':'Bursa','burusev':'Bursa','edirnev':'Edirne','edirnevi':'Edirne',
}
NEW_COORDS = {  # added to city_coords if missing
    'Dımaşk':[33.5138,36.2765],'Halep':[36.2021,37.1343],'Kudüs':[31.7683,35.2137],'Nablus':[32.2211,35.2544],
    'Askalan':[31.6658,34.5664],'Humus':[34.7308,36.7090],'Hama':[35.1318,36.7578],'Baalbek':[34.0058,36.2181],
    'Beyrut':[33.8938,35.5018],'İsfahan':[32.6539,51.6660],'Buhara':[39.7747,64.4286],'Semerkand':[39.6270,66.9750],
    'Merv':[37.6620,61.8300],'Nişabur':[36.2133,58.7958],'Tûs':[36.4866,59.5760],'Herat':[34.3529,62.2040],
    'Belh':[36.7581,66.8989],'Gazne':[33.5450,68.4170],'Sîstan':[31.0000,61.5000],'Horasan':[36.2000,59.0000],
    'Cürcân':[36.8400,54.4400],'Şîrâz':[29.5918,52.5836],'Kazvin':[36.2797,50.0049],'Hemedan':[34.7983,48.5148],
    'Tebriz':[38.0800,46.2919],'Bağdat':[33.3152,44.3661],'Basra':[30.5085,47.7804],'Kûfe':[32.0286,44.4009],
    'Musul':[36.3450,43.1450],'Vâsıt':[32.1800,46.3000],'Sâmerrâ':[34.1962,43.8742],'Fustat':[30.0070,31.2330],
    'İskenderiye':[31.2001,29.9187],'Dimyat':[31.4165,31.8133],'Kurtuba':[37.8882,-4.7794],'İşbiliye':[37.3891,-5.9845],
    'Gırnata':[37.1773,-3.5986],'Tuleytula':[39.8628,-4.0273],'Belensiye':[39.4699,-0.3763],'Mürsiye':[37.9922,-1.1307],
    'Sarakusta':[41.6488,-0.8891],'Fas':[34.0181,-5.0078],'Merakeş':[31.6295,-7.9811],'Tilimsân':[34.8783,-1.3150],
    'Kayrevan':[35.6781,10.0963],'Tunus':[36.8065,10.1815],'Sebte':[35.8894,-5.3198],'Bicâye':[36.7509,5.0567],
    'Mekke':[21.4225,39.8262],'Medine':[24.4686,39.6142],'Tâif':[21.2854,40.4158],"San'a":[15.3694,44.1910],
    'Zebîd':[14.1950,43.3150],'Delhi':[28.6139,77.2090],'Lahor':[31.5204,74.3587],'Keşmir':[34.0837,74.7973],
    'Gücerât':[22.2587,71.1924],'Sind':[25.8943,68.5247],'Multan':[30.1575,71.5249],'Üsküp':[41.9981,21.4254],
    'Saraybosna':[43.8563,18.4131],'Selanik':[40.6401,22.9444],'Manastır':[41.0314,21.3347],'Filibe':[42.1354,24.7453],
    'Sofya':[42.6977,23.3219],'Mostar':[43.3438,17.8078],'Belgrad':[44.7866,20.4489],'Prizren':[42.2139,20.7397],
    'Bursa':[40.1885,29.0610],'Edirne':[41.6771,26.5557],
}
_NISBE_SORTED = sorted(NISBE_CITY.items(), key=lambda kv: -len(kv[0]))
def derive_city(tam):
    red = ' '+re.sub(r'[^a-z0-9 ]',' ',_reduce(tam).lower())+' '
    for stem, city in _NISBE_SORTED:
        if stem in red: return city
    return ''

# ---------- main ----------
def main():
    CAT = find_source()
    src = BACKUP if BACKUP.exists() else DATA
    A1 = json.load(open(src/"itta_authors.json", encoding="utf-8"))
    R  = json.load(open(src/"itta_relations.json", encoding="utf-8"))
    print(f"catalog: {CAT}")
    print(f"bridge source: {src}  (v1 authors={len(A1)}, relations={len(R)})")
    coords = json.load(open(src/"city_coords.json", encoding="utf-8"))

    # ---- build improved bridge: key->slug and slug->v1rec ----
    v1_by_slug = {}
    key2slug = {}
    def add_key(k, slug):
        if k and slug: key2slug.setdefault(k, slug)
    for a in A1:
        s = a.get('dia_slug')
        if s:
            v1_by_slug.setdefault(s, a)
            add_key(norm(a['meshur_isim']), s); add_key(norm(a.get('tam_isim','')), s); add_key(norm(a.get('arabic_name','')), s)
    for r in R:
        add_key(norm(r['source_name']), r['source']); add_key(norm(r['target_name']), r['target'])

    # ---- parse İTA_VERİTABANI -> rows per havza ----
    # New layout: main sheet 'İTA Veritabanı' (free-text Havza -> map_havza) + dedicated 'Balkan Havzası' sheet -> balkanlar.
    # Old layout: single 'Sayfa1' sheet. Handle both.
    xl = pd.ExcelFile(CAT)
    main_sheet = next((s for s in xl.sheet_names if 'veritaban' in _reduce(s).lower()), None) \
                 or next((s for s in xl.sheet_names if 'balkan' not in _reduce(s).lower()), xl.sheet_names[0])
    df = xl.parse(main_sheet, header=0)
    cm = resolve_cols(df)
    hcol = next((c for c in df.columns if _reduce(str(c)).lower().strip() == 'havza'), None)
    rows_by_hz = defaultdict(list)
    excluded = Counter(); excl_rows = 0; nohavza = 0
    for _, r in df.iterrows():
        if not g(r, cm['meshur']): continue
        lbl = g(r, hcol) if hcol is not None else ''
        if not lbl: nohavza += 1; continue
        hz, reason = map_havza(lbl)
        if hz is None: excluded[reason] += 1; excl_rows += 1; continue
        rows_by_hz[hz].append((r, cm))
    # dedicated Balkan Havzası sheet (if present) -> balkanlar
    for s in xl.sheet_names:
        if s != main_sheet and 'balkan' in _reduce(s).lower():
            dfb = xl.parse(s, header=0); cmb = resolve_cols(dfb)
            if cmb['meshur'] is None: continue
            for _, r in dfb.iterrows():
                if g(r, cmb['meshur']): rows_by_hz['balkanlar'].append((r, cmb))

    # ---- build authors + works ----
    authors, works = [], []
    next_au = next_wk = 1
    bridge_hit = Counter(); bridge_via = Counter(); sehir_src = Counter()
    for hz in HAVZA_ORDER:
        rows = rows_by_hz.get(hz, [])
        grouped = defaultdict(list); order = []
        for r, cm in rows:
            k = norm(g(r, cm['meshur']))
            if k not in grouped: order.append(k)
            grouped[k].append((r, cm))
        for k in order:
            items = grouped[k]
            auid = f"AU_{next_au:05d}"; next_au += 1
            meshur = g(items[0][0], items[0][1]['meshur'])
            tam  = next((g(r,c['tam'])  for r,c in items if g(r,c['tam'])), meshur)
            bio  = next((g(r,c['ybio']) for r,c in items if g(r,c['ybio'])), '')
            dm   = next((parse_year(g(r,c['vef_m'])) for r,c in items if parse_year(g(r,c['vef_m']))), None)
            dh   = next((parse_year(g(r,c['vef_h'])) for r,c in items if parse_year(g(r,c['vef_h']))), None)
            cents = [parse_century(g(r,c['yy_m']),g(r,c['yy_h']),g(r,c['vef_m'])) for r,c in items]
            cents = [x for x in cents if x]
            yuz  = min(cents) if cents else (dm//100+1 if dm else None)
            hasdesc = any(g(r,c['ebio']) for r,c in items)
            kim = (bio[:300].rsplit(' ',1)[0]+'…') if len(bio)>300 else bio
            # bridge (slug + curated v1 fields)
            slug = key2slug.get(k) or key2slug.get(norm(tam))
            v1 = v1_by_slug.get(slug) if slug else None
            if slug:
                via = 'meshur' if key2slug.get(k) else 'tam'
                bridge_hit[hz]+=1; bridge_via[via]+=1
                dia_url  = (v1.get('dia_url') if v1 else '') or f"https://islamansiklopedisi.org.tr/{slug}"
                dia_desc = (v1.get('dia_short_desc') if v1 else '') or kim
                imp = v1.get('importance_score') if (v1 and v1.get('importance_score') is not None) else None
            else:
                dia_url = dia_desc = ''; imp = None
            v_sehir = (v1.get('sehir') if v1 else '') or ''
            use_v1_sehir = bool(v_sehir) and v_sehir in coords   # accept only coordinate-backed cities
            sehir = v_sehir if use_v1_sehir else derive_city(tam)
            if sehir: sehir_src['v1' if use_v1_sehir else 'nisbe'] += 1
            arabic = (v1.get('arabic_name') if v1 else '') or ''
            mezhep = (v1.get('mezhep') if v1 else '') or ''
            bplace = (v1.get('birth_place') if v1 else '') or ''
            dplace = (v1.get('death_place') if v1 else '') or ''
            # works (dedup by normalized title within author)
            seen = set(); nworks = 0
            for r, c in items:
                eser = g(r,c['eser']) or g(r,c['diger']) or '(adı belirtilmemiş eser)'
                tn = norm(eser)
                if tn in seen: continue
                seen.add(tn); nworks += 1
                works.append({"work_id":f"WK_{next_wk:05d}","author_id":auid,"havza":hz,
                    "eser_adi":eser,"dil":g(r,c['dil']),"eser_turu":norm_genre(g(r,c['tur'])),
                    "yazilma_sehri":"","kaynak_sayfa":1,"tanitim":g(r,c['ebio']),"hanedan":g(r,c['hanedan'])})
                next_wk += 1
            authors.append({"author_id":auid,"havza":hz,"meshur_isim":meshur,"tam_isim":tam,
                "dogum_yili_h":None,"dogum_yili_m":None,"vefat_yili_h":dh,"vefat_yili_m":dm,"yuzyil":yuz,
                "sehir":sehir,"mezhep":mezhep,"kimlik":kim,"dia_slug":slug or "","dia_url":dia_url,
                "eser_sayisi":nworks,"arabic_name":arabic,"birth_place":bplace,"death_place":dplace,
                "importance_score":(imp if imp is not None else score(nworks,bool(bio),bool(dm),hasdesc)),
                "fields":"","dia_short_desc":dia_desc})

    # ---- recompute both_in_itta against NEW slug set ----
    new_slugs = set(a['dia_slug'] for a in authors if a['dia_slug'])
    for r in R:
        r['both_in_itta'] = (r['source'] in new_slugs) and (r['target'] in new_slugs)
    both = sum(1 for r in R if r['both_in_itta'])

    # ---- city coords additions ----
    cities_used = Counter(a['sehir'] for a in authors if a['sehir'])
    new_coord_names = sorted({c for c in cities_used if c not in coords})

    # ============================ REPORT ============================
    print("\n================= FAZ 1: İTA_VERİTABANI'NDAN KURULDU =================")
    _total = sum(len(v) for v in rows_by_hz.values()) + excl_rows + nohavza
    print(f"  kaynak satır (iki sayfa): {_total} | 9 havzaya eşlenen: {sum(len(v) for v in rows_by_hz.values())} | DIŞARIDA bırakılan: {excl_rows} | havzasız: {nohavza}")
    print(f"  DIŞARIDA bırakılanlar (9 havza menüsünde yok): {dict(excluded.most_common())}")
    print(f"{'havza':10s} {'src_rows':>9s} {'authors':>8s} {'works':>7s} {'slug_match':>11s}")
    tot_a = tot_w = 0
    for hz in HAVZA_ORDER:
        na = sum(1 for a in authors if a['havza']==hz)
        nw = sum(1 for w in works if w['havza']==hz)
        tot_a+=na; tot_w+=nw
        print(f"  {hz:8s} {len(rows_by_hz.get(hz,[])):9d} {na:8d} {nw:7d} {bridge_hit[hz]:8d} ({bridge_hit[hz]*100//max(na,1):2d}%)")
    print(f"  {'TOPLAM':8s} {sum(len(v) for v in rows_by_hz.values()):9d} {tot_a:8d} {tot_w:7d} {sum(bridge_hit.values()):8d} ({sum(bridge_hit.values())*100//tot_a}%)")
    print(f"  [v1 idi: yazar {len(A1)} -> yeni {tot_a}  ({tot_a-len(A1):+d})]")

    print("\n================= FAZ 2: KÖPRÜ + İLİŞKİ =================")
    print(f"  slug atanan yazar: {sum(1 for a in authors if a['dia_slug'])} (eşsiz slug {len(new_slugs)})  [match yolu: meshur={bridge_via['meshur']} tam={bridge_via['tam']}]")
    print(f"  importance_score v1'den taşınan: {sum(1 for a in authors if a['dia_slug'] and a['importance_score'] and a['author_id'])}  | heuristik: {sum(1 for a in authors if not a['dia_slug'])}")
    print(f"  itta_relations.json: {len(R)} kenar KORUNDU; both_in_itta yeniden = {both} (varsayılan Ağ görünümü)")
    print(f"  [v1 baz: varsayılan/render edilebilir kenar 366]")

    print("\n================= FAZ 3: TÜRETİLEN =================")
    sehir_n = sum(1 for a in authors if a['sehir'])
    print(f"  sehir dolu: {sehir_n}/{tot_a} ({sehir_n*100//tot_a}%)  [v1 küratör={sehir_src['v1']}, nisbeden türetilen={sehir_src['nisbe']}]")
    print(f"  en sık şehirler: {dict(cities_used.most_common(12))}")
    print(f"  city_coords'a EKLENECEK yeni şehir ({len(new_coord_names)}): {new_coord_names}")
    gc = Counter(w['eser_turu'] for w in works)
    print(f"  tür dağılımı (type_counts): {dict(gc.most_common())}")
    print(f"  'diger' oranı: {gc.get('diger',0)}/{tot_w} ({gc.get('diger',0)*100//tot_w}%)")
    cc = Counter(str(a['yuzyil']) for a in authors if a.get('yuzyil'))
    print(f"  century_counts: {{ {', '.join(f'{k}:{cc[k]}' for k in sorted(cc,key=lambda x:int(x)))} }}")
    nullc = sum(1 for a in authors if not a.get('yuzyil'))
    print(f"  yüzyılı boş yazar: {nullc}/{tot_a}")

    print("\n================= FAZ 5: BÜTÜNLÜK =================")
    aset = set(a['author_id'] for a in authors)
    orphans = [w['work_id'] for w in works if w['author_id'] not in aset]
    dup_au = [au for au,c in Counter(a['author_id'] for a in authors).items() if c>1]
    dup_wk = [wk for wk,c in Counter(w['work_id'] for w in works).items() if c>1]
    dup_name = [k for k,c in Counter((a['havza'],norm(a['meshur_isim'])) for a in authors).items() if c>1]
    print(f"  orphan works: {len(orphans)} | dup author_id: {len(dup_au)} | dup work_id: {len(dup_wk)} | dup (havza,norm-ad): {len(dup_name)}")
    print(f"  dia_slug dolu: {sum(1 for a in authors if a['dia_slug'])} | sehir dolu: {sum(1 for a in authors if a['sehir'])} | yüzyıl dolu: {tot_a-nullc}")

    if DRY:
        print("\n(DRY RUN — hiçbir dosya yazılmadı. Yazmak için: --apply)")
        return

    # ---------------- APPLY ----------------
    BACKUP.mkdir(exist_ok=True)
    if not (BACKUP/"itta_authors.json").exists():
        for f in DATA.glob("*.json"):
            (BACKUP/f.name).write_bytes(f.read_bytes())
        print(f"\nyedek alındı -> {BACKUP}")
    # eser_sayisi already set per author; write authors/works/relations
    json.dump(authors, open(DATA/"itta_authors.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(works,   open(DATA/"itta_works.json","w",encoding="utf-8"),   ensure_ascii=False, indent=1)
    json.dump(R,       open(DATA/"itta_relations.json","w",encoding="utf-8"),ensure_ascii=False, indent=1)
    # city coords
    for c in new_coord_names:
        if c in NEW_COORDS: coords[c] = NEW_COORDS[c]
    json.dump(coords, open(DATA/"city_coords.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
    # stats (preserve unrecomputable keys)
    S = json.load(open(src/"itta_stats.json", encoding="utf-8"))
    S["total_scholars"]=len(authors); S["total_works"]=len(works); S["total_havzas"]=len(HAVZA_ORDER)
    S["havza_counts"]=dict(Counter(a['havza'] for a in authors))
    S["type_counts"]=dict(gc); S["century_counts"]={k:cc[k] for k in sorted(cc,key=lambda x:int(x))}
    S["dia_matches"]=sum(1 for a in authors if a['dia_slug']); S["dia_relations"]=len(R)
    S["generated_at"]=datetime.now(timezone.utc).isoformat()
    json.dump(S, open(DATA/"itta_stats.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
    # historiography
    hist = json.load(open(src/"historiography.json", encoding="utf-8"))
    by_hz = defaultdict(list)
    for a in authors: by_hz[a['havza']].append(a)
    def pid(c):
        if not c: return None
        if 7<=c<=10: return 'formation'
        if 11<=c<=18: return 'development'
        if c>=19: return 'contraction'
        return None
    for b in hist.get("basins", []):
        hz = b.get("havza_key")
        ranked = sorted(by_hz.get(hz,[]), key=lambda a:a['importance_score'], reverse=True)
        b["key_scholars_ids"] = [a['author_id'] for a in ranked[:10]]
        buckets = {'formation':[], 'development':[], 'contraction':[]}
        for a in ranked:
            p = pid(a.get('yuzyil'))
            if p and len(buckets[p])<6 and a['meshur_isim'] not in buckets[p]:
                buckets[p].append(a['meshur_isim'])
        for p in ('formation','development','contraction'):
            if p in b.get("periods",{}): b["periods"][p]["key_historians"] = buckets[p]
    json.dump(hist, open(DATA/"historiography.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n(APPLIED — authors/works/relations/city_coords/stats/historiography yazıldı.)")

if __name__ == "__main__":
    main()
