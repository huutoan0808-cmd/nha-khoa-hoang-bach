/* ================= KÝ VÀ XÁC NHẬN ĐIỆN TỬ =================
   Thông tư 13/2025/TT-BYT và Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục V:
   phần mềm cho phép nhân viên y tế, người bệnh hoặc người đại diện ký, xác nhận
   điện tử trong hồ sơ bệnh án điện tử theo Luật Giao dịch điện tử.

   Làm theo hai tầng, đúng Điều 22 Luật Giao dịch điện tử 2023:

   TẦNG 1 — nhân viên y tế: chữ ký điện tử CHUYÊN DÙNG (điểm a khoản 1 Điều 22),
   do chính phòng khám tạo lập và dùng riêng trong nội bộ. Hỏi–đáp của Bộ Khoa học
   và Công nghệ đã xác nhận: dùng nội bộ thì KHÔNG phải xin cấp giấy chứng nhận.
   Cách ký: bác sĩ nhập lại mật khẩu tài khoản của mình, phần mềm đối chiếu với máy
   chủ, rồi băm toàn bộ nội dung giấy tờ thành một mã SHA-256 và ghi lại cùng người
   ký, thời điểm, máy. Đổi một chữ trong hồ sơ là mã băm khác ngay — đó là bằng chứng.

   TẦNG 2 — người bệnh: ký tay trên màn hình cảm ứng. Đây là "hình thức xác nhận
   khác bằng phương tiện điện tử" theo khoản 4 Điều 22, được phép vì Thông tư
   13/2025 chính là quy định chuyên ngành cho phép.

   Ký xong thì giấy tờ khoá lại. Muốn sửa phải mở khoá, và việc mở khoá bị ghi vết. */
'use strict';

/* ---------- SHA-256 ----------
   Tự cài để chạy đồng bộ ngay trong lúc dựng giao diện. crypto.subtle của trình duyệt
   chỉ chạy bất đồng bộ và đòi kết nối https, dùng ở đây sẽ phải rải async khắp nơi. */
function sha256(chuoi){
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];

  /* chuỗi -> byte theo UTF-8 */
  const b = [];
  for (const ch of unescape(encodeURIComponent(chuoi))) b.push(ch.charCodeAt(0));
  const bitLen = b.length * 8;
  b.push(0x80);
  while (b.length % 64 !== 56) b.push(0);
  /* độ dài 64 bit, phần cao gần như luôn bằng 0 với dữ liệu cỡ này */
  const cao = Math.floor(bitLen / 4294967296);
  b.push((cao >>> 24) & 255, (cao >>> 16) & 255, (cao >>> 8) & 255, cao & 255);
  b.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

  const xoay = (x, n) => (x >>> n) | (x << (32 - n));
  const w = new Array(64);
  for (let i = 0; i < b.length; i += 64) {
    for (let t = 0; t < 16; t++)
      w[t] = (b[i+t*4] << 24) | (b[i+t*4+1] << 16) | (b[i+t*4+2] << 8) | b[i+t*4+3];
    for (let t = 16; t < 64; t++) {
      const s0 = xoay(w[t-15],7) ^ xoay(w[t-15],18) ^ (w[t-15] >>> 3);
      const s1 = xoay(w[t-2],17) ^ xoay(w[t-2],19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
    }
    let [a,bb,c,d,e,f,g,hh] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = xoay(e,6) ^ xoay(e,11) ^ xoay(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = xoay(a,2) ^ xoay(a,13) ^ xoay(a,22);
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H = [(H[0]+a)|0,(H[1]+bb)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+hh)|0];
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

const KY_CACH = {
  noibo:    'Chữ ký điện tử chuyên dùng (nội bộ)',
  taymanhinh: 'Ký tay trên màn hình',
};

const Ky = {
  /* ---------- Băm nội dung ----------
     Phải xếp khóa theo thứ tự cố định, nếu không cùng một nội dung mà thứ tự khóa
     khác nhau sẽ ra hai mã băm khác nhau, hồ sơ nguyên vẹn vẫn bị báo là đã sửa. */
  BO_QUA: ['chuKy', 'kyCu', '_up', '_at'],
  chuanHoa(o){
    const di = v => {
      if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
      if (Array.isArray(v)) return '[' + v.map(di).join(',') + ']';
      return '{' + Object.keys(v).filter(k => !this.BO_QUA.includes(k)).sort()
        .map(k => JSON.stringify(k) + ':' + di(v[k])).join(',') + '}';
    };
    return di(o || {});
  },
  bam(o){ return sha256(this.chuanHoa(o)); },

  /* ---------- Trạng thái chữ ký ---------- */
  ds(o){ return (o && o.chuKy) || []; },
  cuaNhanVien(o){ return this.ds(o).filter(x => x.vaiKy === 'nhanvien'); },
  cuaNguoiBenh(o){ return this.ds(o).filter(x => x.vaiKy === 'nguoibenh'); },
  daKhoa(o){ return this.cuaNhanVien(o).length > 0; },
  /* Nội dung có còn đúng như lúc ký không */
  nguyenVen(o){
    const ds = this.ds(o);
    if (!ds.length) return null;                 /* chưa ký thì không có gì để soát */
    return ds.every(x => x.bam === this.bam(o));
  },

  /* ---------- Ai đang ký ---------- */
  nguoiKy(){
    const s = Perm.me();
    return {
      id: s ? s.id : '', ten: (s && s.name) || Cloud.who() || '',
      email: Cloud.who() || '', chucDanh: (s && s.role) || '', vai: Perm.label(),
    };
  },

  /* ---------- Lấy đối tượng giấy tờ để ký ---------- */
  /* k: mã giấy tờ trong HoSo.DS. Bệnh án BA-18 nằm ở c.record, bốn phiếu còn lại
     nằm trong đợt điều trị đang chọn. */
  oGiay(c, k){
    if (HoSo.cuaKhach(k)) return c.record || (c.record = {});
    const ep = Dot.dangChon(c);
    if (!ep) return null;
    ep.phieu = ep.phieu || {};
    return ep.phieu[k] || (ep.phieu[k] = {});
  },

  /* ---------- Dòng trạng thái hiện trong danh sách giấy tờ ---------- */
  dongTT(c, k){
    const o = this.oGiay(c, k);
    if (!o) return '';
    const nv = this.cuaNhanVien(o), nb = this.cuaNguoiBenh(o);
    const ven = this.nguyenVen(o);
    const the = [];
    nv.forEach(x => the.push(`<span class="pill ok" title="${h(KY_CACH[x.cach] || x.cach)} · mã băm ${h((x.bam||'').slice(0,16))}…">
      ✓ ${h(x.ten)}${x.chucDanh ? ' — ' + h(x.chucDanh) : ''} · ${h(this.gio(x.luc))}</span>`));
    nb.forEach(x => the.push(`<span class="pill ok" title="Ký tay trên màn hình">
      ✓ Người bệnh${x.ten && x.ten !== (c.name||'') ? ' (' + h(x.ten) + ')' : ''} · ${h(this.gio(x.luc))}</span>`));
    if (ven === false) the.push('<span class="pill warn">Nội dung đã đổi sau khi ký</span>');
    if (!the.length) the.push('<span class="pill mutedp">Chưa ký</span>');

    return `<div class="ky-dong">${the.join(' ')}
      <button class="btn small" onclick="Ky.hop('${k}')">${nv.length || nb.length ? 'Xem chữ ký' : 'Ký'}</button></div>`;
  },
  gio(iso){
    const d = new Date(iso);
    if (isNaN(d)) return iso || '';
    const hai = n => String(n).padStart(2, '0');
    return hai(d.getDate()) + '/' + hai(d.getMonth()+1) + '/' + d.getFullYear() +
           ' ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
  },

  /* ---------- Hộp thoại ký ---------- */
  hop(k){
    const c = custById(App.state.custSel); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const o = this.oGiay(c, k);
    if (!o) { App.toast('Mở một đợt điều trị trước đã'); return; }
    const ds = this.ds(o), ven = this.nguyenVen(o);
    const ma = this.bam(o);

    const dongKy = x => `<div class="ho-so-file">
      <div class="hsf-than">
        <div class="hsf-dau"><b>${h(x.ten || '')}</b>
          <span class="pill ${x.bam === ma ? 'ok' : 'warn'}">${x.bam === ma ? 'Còn nguyên vẹn' : 'Nội dung đã đổi'}</span></div>
        <div class="hsf-mo">${h(x.vaiKy === 'nguoibenh' ? 'Người bệnh / người đại diện' : (x.chucDanh || x.vai || 'Nhân viên y tế'))}
          · ${h(this.gio(x.luc))} · ${h(KY_CACH[x.cach] || x.cach)}${x.may ? ' · ' + h(x.may) : ''}
          <br><span class="sub-line">Mã băm lúc ký: ${h(x.bam || '')}</span></div>
        ${x.net ? `<img src="${x.net}" alt="Chữ ký" class="ky-anh">` : ''}
      </div></div>`;

    App.modal('Ký — ' + HoSo.ten(k), `
      <div class="note-block">Ký xong, nội dung giấy tờ này được băm thành một mã.
        Sau đó chỉ cần sửa một chữ là mã đổi, phần mềm báo ngay — đó là cách chứng minh hồ sơ còn nguyên vẹn.</div>
      ${ds.length ? `<h3 class="nhom-tieu">Đã ký</h3>${ds.map(dongKy).join('')}` : ''}
      ${ven === false ? `<div class="note-block warn-block">Nội dung đã bị sửa sau khi ký.
        Người chịu trách nhiệm cần ký lại thì chữ ký mới có giá trị.</div>` : ''}
      <h3 class="nhom-tieu">Ký mới</h3>
      <div class="ho-so-file">
        <div class="hsf-than"><div class="hsf-dau"><b>Nhân viên y tế</b></div>
          <div class="hsf-mo">Bác sĩ chịu trách nhiệm nội dung nhập lại mật khẩu tài khoản của mình để ký.
            Chữ ký điện tử chuyên dùng nội bộ — không cần mua chứng thư số.</div></div>
        <div class="hsf-nut"><button class="btn small primary" onclick="Ky.formNhanVien('${k}')">Ký hồ sơ</button></div></div>
      <div class="ho-so-file">
        <div class="hsf-than"><div class="hsf-dau"><b>Người bệnh / người đại diện</b></div>
          <div class="hsf-mo">Đưa điện thoại hoặc máy tính bảng cho khách ký tay lên màn hình.</div></div>
        <div class="hsf-nut"><button class="btn small primary" onclick="Ky.formNguoiBenh('${k}')">Lấy chữ ký khách</button></div></div>
      ${this.daKhoa(o) ? `<div class="form-actions full" style="justify-content:flex-start">
        <button class="btn" onclick="Ky.moKhoa('${k}')">Mở khóa để sửa lại</button></div>` : ''}`);
  },

  /* ---------- Tầng 1: nhân viên y tế ký bằng mật khẩu ---------- */
  formNhanVien(k){
    if (Perm.chan('ky', 'ký hồ sơ bệnh án')) return;
    if (!Cloud.loggedIn()) { App.toast('Phải đăng nhập mới ký được — chữ ký phải gắn với một người cụ thể'); return; }
    const ng = this.nguoiKy();
    App.modal('Ký hồ sơ — ' + HoSo.ten(k), `
      <form class="form-grid" onsubmit="Ky.kyNhanVien(event,'${k}')">
        <div class="f full"><label>Người ký</label>
          <div class="tooth-info" style="margin-top:0"><b>${h(ng.ten)}</b>${ng.chucDanh ? ' — ' + h(ng.chucDanh) : ''}
            <br><span class="sub-line">${h(ng.email)} · ${h(ng.vai)}</span></div></div>
        <div class="f full"><label>Nhập lại mật khẩu tài khoản của bạn</label>
          <input name="mk" type="password" required autocomplete="current-password" autofocus>
          <div class="combo-hint">Nhập lại mật khẩu là cách phần mềm chắc chắn chính bạn đang ký,
            chứ không phải người khác ngồi vào máy bạn đang mở.</div></div>
        <div class="note-block full">Ký xong giấy tờ này sẽ khóa lại. Muốn sửa phải mở khóa, và việc mở khóa được ghi vào nhật ký.</div>
        <div class="form-actions full">
          <button type="button" class="btn" onclick="Ky.hop('${k}')">Quay lại</button>
          <button class="btn primary">Xác nhận ký</button></div>
      </form>`);
  },
  async kyNhanVien(ev, k){
    ev.preventDefault();
    const mk = new FormData(ev.target).get('mk');
    const c = custById(App.state.custSel); if (!c) return;
    const o = this.oGiay(c, k); if (!o) return;
    App.toast('Đang xác thực…');
    try {
      /* Đối chiếu mật khẩu với máy chủ. Dùng req chứ không dùng Cloud.login để khỏi
         thay phiên đăng nhập đang chạy. */
      await Cloud.req('/auth/v1/token?grant_type=password', {
        method: 'POST', headers: {Authorization: 'Bearer ' + Cloud.cfg.key},
        body: {email: Cloud.who(), password: mk},
      });
    } catch(e){
      App.toast('Mật khẩu không đúng — chưa ký'); return;
    }
    const ng = this.nguoiKy();
    o.chuKy = o.chuKy || [];
    o.chuKy.push({
      id: uid(), vaiKy: 'nhanvien', cach: 'noibo',
      ai: ng.id, ten: ng.ten, email: ng.email, chucDanh: ng.chucDanh, vai: ng.vai,
      luc: new Date().toISOString(), may: (typeof Vet !== 'undefined' ? Vet.may() : ''),
      bam: this.bam(o),
    });
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('ky', HoSo.ten(k) + ' — ' + (c.name || '') + ' · ký bởi ' + ng.ten,
        {tbl: 'customers', rid: c.id, khach: c.id});
    App.render(); this.hop(k);
    App.toast('Đã ký ✓');
  },

  /* ---------- Tầng 2: người bệnh ký tay trên màn hình ---------- */
  formNguoiBenh(k){
    const c = custById(App.state.custSel); if (!c) return;
    App.modal('Chữ ký người bệnh — ' + HoSo.ten(k), `
      <div class="note-block">Đưa màn hình cho khách. Khách ký bằng ngón tay hoặc bút cảm ứng vào khung bên dưới.</div>
      <div class="f full"><label>Người ký</label>
        <input id="kyTen" value="${h(c.name || '')}">
        <div class="combo-hint">Người đại diện ký thay thì sửa lại tên và ghi rõ quan hệ, ví dụ "Trần Văn B (cha)".</div></div>
      <div class="f full"><label>Ký vào đây</label>
        <canvas id="kyBang" class="ky-bang"></canvas>
        <div class="combo-hint">Ký hỏng thì bấm Xóa rồi ký lại.</div></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="Ky.xoaBang()">Xóa</button>
        <button type="button" class="btn" onclick="Ky.hop('${k}')">Quay lại</button>
        <button type="button" class="btn primary" onclick="Ky.luuNguoiBenh('${k}')">Lưu chữ ký</button></div>`);
    setTimeout(() => this.moBang(), 30);
  },

  bang: null,
  moBang(){
    const cv = document.getElementById('kyBang'); if (!cv) return;
    /* Cho kích thước thật của canvas bằng đúng kích thước nó hiển thị (nhân thêm độ
       nét màn hình). Làm vậy thì tọa độ vẽ trùng tọa độ ngón tay, khỏi quy đổi —
       để lệch một chút là nét ký ra chỗ khác, khách ký xong nhìn không thấy gì. */
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(280, Math.round(r.width || 280));
    const cao = Math.max(120, Math.round(r.height || 170));
    cv.width = Math.round(w * dpr); cv.height = Math.round(cao * dpr);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    this.bang = {cv, ctx, ve: false, co: false, w, cao};
    const diem = e => {
      const b = cv.getBoundingClientRect();
      const tx = b.width ? w / b.width : 1, ty = b.height ? cao / b.height : 1;
      return {x: (e.clientX - b.left) * tx, y: (e.clientY - b.top) * ty};
    };
    const xuong = e => { e.preventDefault(); const p = diem(e);
      this.bang.ve = true; this.bang.co = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const di = e => { if (!this.bang.ve) return; e.preventDefault();
      const p = diem(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const len = () => { this.bang.ve = false; };
    cv.addEventListener('pointerdown', xuong);
    cv.addEventListener('pointermove', di);
    cv.addEventListener('pointerup', len);
    cv.addEventListener('pointerleave', len);
  },
  xoaBang(){
    const b = this.bang; if (!b) return;
    b.ctx.clearRect(0, 0, b.cv.width, b.cv.height); b.co = false;
  },
  /* Cắt bỏ khoảng trắng quanh nét ký rồi thu nhỏ lại, để ảnh chỉ còn vài KB */
  goiAnh(cv){
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0, co = false;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 20) {
        co = true;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (!co) return '';
    const dem = 8;
    x0 = Math.max(0, x0 - dem); y0 = Math.max(0, y0 - dem);
    x1 = Math.min(cv.width, x1 + dem); y1 = Math.min(cv.height, y1 + dem);
    const w = x1 - x0, hh = y1 - y0, tl = Math.min(1, 420 / w);
    const ra = document.createElement('canvas');
    ra.width = Math.round(w * tl); ra.height = Math.round(hh * tl);
    ra.getContext('2d').drawImage(cv, x0, y0, w, hh, 0, 0, ra.width, ra.height);
    return ra.toDataURL('image/png');
  },
  luuNguoiBenh(k){
    const b = this.bang;
    if (!b || !b.co) { App.toast('Chưa có nét ký nào'); return; }
    const net = this.goiAnh(b.cv);
    if (!net) { App.toast('Chưa có nét ký nào'); return; }
    const c = custById(App.state.custSel); if (!c) return;
    const o = this.oGiay(c, k); if (!o) return;
    const ten = (document.getElementById('kyTen') || {}).value || c.name || '';
    o.chuKy = o.chuKy || [];
    o.chuKy.push({
      id: uid(), vaiKy: 'nguoibenh', cach: 'taymanhinh',
      ten, luc: new Date().toISOString(),
      may: (typeof Vet !== 'undefined' ? Vet.may() : ''),
      net, bam: this.bam(o),
    });
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('ky', HoSo.ten(k) + ' — người bệnh ' + ten + ' ký tay trên màn hình',
        {tbl: 'customers', rid: c.id, khach: c.id});
    App.render(); this.hop(k);
    App.toast('Đã lưu chữ ký của khách ✓');
  },

  /* ---------- Mở khóa ---------- */
  moKhoa(k){
    if (Perm.chan('mokhoa', 'mở khóa hồ sơ đã ký')) return;
    const c = custById(App.state.custSel); if (!c) return;
    const o = this.oGiay(c, k); if (!o) return;
    const ly = prompt('Mở khóa "' + HoSo.ten(k) + '" để sửa lại.\n\nGhi rõ lý do — lý do này vào nhật ký và không xóa được:');
    if (ly === null) return;
    if (!ly.trim()) { App.toast('Phải ghi lý do mới mở khóa được'); return; }
    /* Giữ lại chữ ký cũ chứ không xóa: hồ sơ từng được ký rồi mở ra sửa là việc
       phải nhìn thấy được, không phải việc để giấu đi. */
    o.kyCu = (o.kyCu || []).concat((o.chuKy || []).map(x => Object.assign({}, x, {boLuc: new Date().toISOString(), lyDo: ly.trim()})));
    o.chuKy = [];
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('sua', 'Mở khóa ' + HoSo.ten(k) + ' — ' + (c.name || '') + ' · lý do: ' + ly.trim(),
        {tbl: 'customers', rid: c.id, khach: c.id});
    App.render(); this.hop(k);
    App.toast('Đã mở khóa — nhớ ký lại sau khi sửa xong');
  },

  /* ---------- Khối chữ ký in ra giấy ---------- */
  khoiIn(c, k){
    const o = this.oGiay(c, k);
    const ds = this.ds(o);
    if (!ds.length) return '';
    return `<div class="ky-in">
      <div class="ky-in-tieu">Ký, xác nhận điện tử</div>
      ${ds.map(x => `<div class="ky-in-dong">
        <b>${h(x.ten || '')}</b>${x.chucDanh ? ' — ' + h(x.chucDanh) : ''}
        ${x.vaiKy === 'nguoibenh' ? ' (người bệnh / người đại diện)' : ''}
        · ${h(this.gio(x.luc))}
        ${x.net ? `<br><img src="${x.net}" class="ky-in-anh">` : ''}
        <br><span class="ky-in-bam">Mã kiểm tra: ${h((x.bam || '').slice(0, 32))}</span></div>`).join('')}
      <div class="ky-in-chu">Bản điện tử được ký theo Thông tư 13/2025/TT-BYT và Điều 22 Luật Giao dịch điện tử 2023.</div>
    </div>`;
  },
};
