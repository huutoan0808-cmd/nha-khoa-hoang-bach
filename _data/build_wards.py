# -*- coding: utf-8 -*-
"""Gop wards_g*.json -> deploy/wards.js (du lieu xa/phuong ca nuoc)."""
import io, os, json, glob, unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'deploy', 'wards.js')

# Thu tu hien thi: 6 thanh pho truc thuoc TW truoc, roi 28 tinh theo alphabet
CITIES = ['Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế']

def sort_key(s):
    return unicodedata.normalize('NFD', s.lower())

merged = {}
counts = {}
for f in sorted(glob.glob(os.path.join(BASE, 'wards_g*.json'))):
    with io.open(f, encoding='utf-8-sig') as fh:
        data = json.load(fh)
    for prov, wards in data.items():
        prov = prov.strip()
        # lam sach: bo trung, bo rong, bo so thu tu dau dong neu lot
        seen, clean = set(), []
        for w in wards:
            w = ' '.join(str(w).split()).strip(' .,;')
            if not w or w in seen:
                continue
            seen.add(w)
            clean.append(w)
        if prov in merged:
            print('TRUNG TINH:', prov, os.path.basename(f))
        merged[prov] = clean
        counts[prov] = len(clean)

provs = [p for p in CITIES if p in merged] + sorted([p for p in merged if p not in CITIES], key=sort_key)
missing = [p for p in CITIES if p not in merged]

lines = ['/* Danh muc don vi hanh chinh cap xa toan quoc — dia gioi moi tu 01/07/2025 */',
         '/* Sinh tu dong boi build_wards.py — khong sua tay */',
         'const WARDS = {']
for p in provs:
    items = ','.join(json.dumps(w, ensure_ascii=False) for w in merged[p])
    lines.append('%s: [%s],' % (json.dumps(p, ensure_ascii=False), items))
lines.append('};')
lines.append('const PROVINCES = Object.keys(WARDS);')

with io.open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('\n'.join(lines) + '\n')

total = sum(counts.values())
print('Tinh/thanh:', len(provs), '| Tong xa/phuong:', total)
for p in provs:
    print('  %-16s %4d' % (p, counts[p]))
if missing:
    print('THIEU:', ', '.join(missing))
print('Ghi:', OUT, os.path.getsize(OUT) // 1024, 'KB')
