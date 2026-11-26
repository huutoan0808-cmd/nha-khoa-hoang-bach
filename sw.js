const CACHE = 'nkhb-app-v90';
/* Phải liệt kê ĐỦ mọi tệp index.html gọi tới. Thiếu một tệp thì lúc mất mạng trình
   duyệt lấy được trang nhưng không lấy được tệp đó, app trắng màn hoặc thiếu hẳn một
   mảng chức năng mà không báo gì. Trước đây thiếu tám tệp: vet, ky, lienthong, pdf,
   saoluu, khoagio, mahoa, congviec — trong đó vet.js là nhật ký lưu vết, thứ bắt buộc
   phải có với bệnh án điện tử. */
const ASSETS = ['.', 'index.html', 'cdha.html', 'app.css',
  'qrcode.lib.js', 'qr.js', 'kho.js', 'config.js', 'cloud.js', 'wards.js', 'vatlieu.js',
  'banggia.js', 'banglab.js', 'vet.js', 'ky.js', 'lienthong.js', 'donthuoc.js',
  'pdf.js', 'saoluu.js', 'khoagio.js', 'mahoa.js', 'sync.js', 'importer.js',
  'danhgia.js', 'luong.js', 'minhchung.js', 'congviec.js', 'app.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
