# -*- coding: utf-8 -*-
import io, sys, json, re, urllib.parse, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

MINE = json.load(io.open('wards_g3.json', encoding='utf-8-sig'))
MINE.update(json.load(io.open('wards_g4.json', encoding='utf-8-sig')))

UA = {'User-Agent': 'Mozilla/5.0 (verify-admin-units)'}

def wikitext(title):
    url = ('https://vi.wikipedia.org/w/index.php?title='
           + urllib.parse.quote(title.replace(' ', '_')) + '&action=raw')
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')

PAT = re.compile(
    r'(\d{2,3})\s*(?:đơn vị hành chính cấp xã|ĐVHC cấp xã)[^.]{0,160}?'
    r'(?:gồm|bao gồm)\s*([^.]{0,140})', re.S)

print('%-14s %6s %6s  %s' % ('TỈNH', 'CỦA TÔI', 'NGUỒN', 'CƠ CẤU THEO NGUỒN'))
ok = bad = unknown = 0
for prov in MINE:
    mine = len(MINE[prov])
    try:
        txt = wikitext(prov)
    except Exception as e:
        print('%-14s %6d %6s  LỖI TẢI: %s' % (prov, mine, '?', e)); unknown += 1; continue
    m = PAT.search(txt)
    if not m:
        print('%-14s %6d %6s  (không tìm thấy câu công bố)' % (prov, mine, '?')); unknown += 1; continue
    src = int(m.group(1))
    struct = ' '.join(re.sub(r"[\[\]']", '', m.group(2)).split())[:70]
    mark = 'KHỚP' if src == mine else '*** LỆCH ***'
    if src == mine: ok += 1
    else: bad += 1
    print('%-14s %6d %6d  %-8s %s' % (prov, mine, src, mark, struct))
print('\nKhớp: %d | Lệch: %d | Chưa rõ: %d' % (ok, bad, unknown))
