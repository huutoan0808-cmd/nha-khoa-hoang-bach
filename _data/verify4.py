# -*- coding: utf-8 -*-
import io, sys, json, re, glob, urllib.parse, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
UA = {'User-Agent': 'Mozilla/5.0 (verify-admin-units)'}
mine = {}
for f in glob.glob('wards_g*.json'):
    mine.update(json.load(io.open(f, encoding='utf-8-sig')))

REST = ['Lai Châu','Điện Biên','Sơn La','Lạng Sơn','Tuyên Quang','Thái Nguyên','Đồng Tháp']
print('%-13s %-16s %s' % ('TỈNH','CỦA TÔI P/X/ĐK','CÂU CÔNG BỐ TỪ NGUỒN'))
for prov in REST:
    ws = mine[prov]
    mp = sum(1 for w in ws if w.startswith('Phường '))
    mx = sum(1 for w in ws if w.startswith('Xã '))
    md = sum(1 for w in ws if w.startswith('Đặc khu '))
    url = ('https://vi.wikipedia.org/w/index.php?title='
           + urllib.parse.quote(prov.replace(' ','_')) + '&action=raw')
    try:
        txt = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8','replace')
    except Exception as e:
        print('%-13s %-16s LỖI: %s' % (prov, '%d/%d/%d'%(mp,mx,md), e)); continue
    hit = ''
    for m in re.finditer(r'[^.\n]{0,120}(\d{1,3})\s*phường[^.\n]{0,80}', txt):
        s = ' '.join(re.sub(r"[\[\]'{}|]", ' ', m.group(0)).split())
        if 'xã' in s and re.search(r'\d+\s*xã', s):
            hit = s[-95:]; break
    print('%-13s %-16s %s' % (prov, '%d/%d/%d'%(mp,mx,md), hit or '(không tìm thấy)'))
