/* Lớp bọc mỏng quanh thư viện qrcode-generator (MIT, Kazuhiko Arase) — xem qrcode.lib.js.
   Bật sẵn UTF-8 để mã QR chứa được tiếng Việt có dấu. */
'use strict';
const QR = (() => {
  if (typeof qrcode === 'undefined') {
    return {svg: () => '<div class="photo-empty">Chưa tải được bộ tạo mã QR</div>', encode: () => { throw new Error('qrcode.lib.js chưa được tải'); }};
  }
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  /* Ma trận 0/1 của mã QR */
  function encode(text){
    const q = qrcode(0, 'M');           /* 0 = tự chọn phiên bản, mức sửa lỗi M */
    q.addData(String(text), 'Byte');
    q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(q.isDark(r, c) ? 1 : 0); }
    return m;
  }

  /* Vẽ SVG — nhúng thẳng vào HTML, in ra giấy vẫn nét */
  function svg(text, px){
    const m = encode(text), n = m.length, q = 4, total = n + q * 2;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (m[r][c]) path += `M${c + q} ${r + q}h1v1h-1z`;
    return `<svg viewBox="0 0 ${total} ${total}" width="${px || 220}" height="${px || 220}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="Mã QR">`
      + `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }

  return {encode, svg};
})();
