# -*- coding: utf-8 -*-
import io, sys, json, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Co cau cong bo tu nguon chinh thuc (phuong, xa, dac khu)
SRC = {
 'Lào Cai':(10,89,0), 'Phú Thọ':(15,133,0), 'Bắc Ninh':(33,66,0), 'Hưng Yên':(11,93,0),
 'Ninh Bình':(32,97,0), 'Thanh Hóa':(19,147,0), 'Nghệ An':(11,119,0), 'Hà Tĩnh':(9,60,0),
 'Quảng Trị':(8,69,1), 'Quảng Ngãi':(9,86,1), 'Gia Lai':(25,110,0),
 'An Giang':(14,85,3), 'Cần Thơ':(31,72,0), 'Cà Mau':(9,55,0), 'Cao Bằng':(3,53,0),
 'Đà Nẵng':(23,70,1), 'Đắk Lắk':(14,88,0), 'Hà Nội':(51,75,0), 'Hồ Chí Minh':(113,54,1),
 'Hải Phòng':(45,67,2), 'Huế':(21,19,0), 'Quảng Ninh':(30,22,2), 'Khánh Hòa':(16,48,1),
 'Lâm Đồng':(20,103,1), 'Đồng Nai':(33,62,0), 'Tây Ninh':(14,82,0), 'Vĩnh Long':(19,105,0),
}
mine = {}
for f in glob.glob('wards_g*.json'):
    mine.update(json.load(io.open(f, encoding='utf-8-sig')))

lech = []
for prov, (p, x, d) in SRC.items():
    ws = mine.get(prov, [])
    mp = sum(1 for w in ws if w.startswith('Phường '))
    mx = sum(1 for w in ws if w.startswith('Xã '))
    md = sum(1 for w in ws if w.startswith('Đặc khu '))
    if (mp, mx, md) != (p, x, d):
        lech.append((prov, (mp, mx, md), (p, x, d)))

if not lech:
    print('Toan bo co cau phuong/xa/dac khu KHOP voi nguon.')
else:
    print('%-14s %-22s %s' % ('TỈNH', 'CỦA TÔI (P/X/ĐK)', 'NGUỒN (P/X/ĐK)'))
    for prov, a, b in lech:
        print('%-14s %-22s %s' % (prov, '%d / %d / %d' % a, '%d / %d / %d' % b))
print('\nDa doi chieu co cau %d/34 tinh (cac tinh con lai chua co so lieu co cau tu nguon).' % len(SRC))
