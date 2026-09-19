/* ================= GIỚI HẠN THỜI GIAN TRUY CẬP =================
   Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.1.g — phân quyền và bảo mật
   hồ sơ bệnh án điện tử, trong đó có: "Thiết lập khoảng thời gian giới hạn cho phép
   người dùng truy cập vào phần mềm" và "Bảo vệ, ngăn chặn việc truy cập trái phép
   vào hồ sơ bệnh án điện tử".

   Hai lớp, cùng một mục đích là không để hồ sơ bệnh nhân mở toang:

   1. Tự khóa khi bỏ đó không dùng. Máy ở quầy lễ tân là chỗ hở nhất — ai đi ngang
      cũng đọc được hồ sơ nếu màn hình cứ mở. Quá số phút đã đặt thì khóa lại, gõ
      mật khẩu mới vào tiếp.
   2. Khung giờ được phép truy cập. Ngoài khung giờ đó thì không mở được hồ sơ.
      Quản lý được đặt ra ngoài quy định này, vì người chịu trách nhiệm phải vào
      được bất cứ lúc nào.

   Máy chưa nối vào phòng khám (dùng một mình, không đăng nhập) thì không khóa —
   khóa mà không có mật khẩu để mở thì chỉ tự nhốt mình. */
'use strict';

const KG_MAC_DINH = {
  batIdle: true, phutIdle: 15,
  batGio: false, tuGio: '06:00', denGio: '20:00',
  truQuanLy: true,
};

const KG = {
  hen: null,
  dangKhoa: false,
  chamCuoi: 0,

  cai(){ return Object.assign({}, KG_MAC_DINH, (db.clinic || {}).baoMat || {}); },
  luuCai(o){
    db.clinic = db.clinic || {};
    db.clinic.baoMat = Object.assign(this.cai(), o);
    save();
  },
  /* Máy dùng một mình thì không có mật khẩu nào để mở khóa — đừng tự nhốt mình */
  apDung(){ return Cloud.configured() && Cloud.loggedIn(); },
  laQuanLy(){ return Perm.role() === 'quanly'; },

  /* ---------- Khung giờ ---------- */
  phut(hhmm){
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  },
  ngoaiGio(){
    const c = this.cai();
    if (!c.batGio) return false;
    if (c.truQuanLy && this.laQuanLy()) return false;
    const tu = this.phut(c.tuGio), den = this.phut(c.denGio);
    if (tu === null || den === null) return false;
    const n = new Date(), bay = n.getHours() * 60 + n.getMinutes();
    /* Khung giờ qua đêm, ví dụ 20:00 → 06:00 */
    return tu <= den ? (bay < tu || bay >= den) : (bay < tu && bay >= den);
  },

  /* ---------- Vòng canh ---------- */
  khoiDong(){
    if (this._chay) return;
    this._chay = true;
    this.cham();
    ['pointerdown','keydown','wheel','touchstart'].forEach(e =>
      document.addEventListener(e, () => this.cham(), {passive: true, capture: true}));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.soat(); });
    setInterval(() => this.soat(), 20000);
    this.soat();
  },
  cham(){ this.chamCuoi = Date.now(); },
  soat(){
    if (this.dangKhoa || !this.apDung()) return;
    if (this.ngoaiGio()) { this.khoa('gio'); return; }
    const c = this.cai();
    if (!c.batIdle) return;
    const phut = Math.max(1, +c.phutIdle || 15);
    if (Date.now() - this.chamCuoi >= phut * 60000) this.khoa('idle');
  },

  /* ---------- Màn khóa ---------- */
  khoa(vi){
    if (this.dangKhoa) return;
    this.dangKhoa = true;
    const c = this.cai();
    const ai = (typeof Vet !== 'undefined') ? Vet.ai() : {ten: Cloud.who()};
    const laGio = vi === 'gio';
    if (typeof Vet !== 'undefined')
      Vet.ghi('dangxuat', laGio
        ? 'Khóa màn hình — ngoài khung giờ được phép truy cập (' + c.tuGio + '–' + c.denGio + ')'
        : 'Khóa màn hình — để không quá ' + c.phutIdle + ' phút');

    const o = document.createElement('div');
    o.id = 'manKhoa';
    o.innerHTML = `<div class="mk-hop">
      <div class="mk-bieu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
      <h2>${laGio ? 'Ngoài giờ làm việc' : 'Màn hình đã khóa'}</h2>
      <p>${laGio
        ? 'Phòng khám đặt khung giờ được phép mở hồ sơ là <b>' + h(c.tuGio) + '–' + h(c.denGio) + '</b>. ' +
          'Ngoài khung giờ này, hồ sơ bệnh nhân không mở được. Cần vào gấp thì nhờ quản lý.'
        : 'Đã để máy không dùng quá <b>' + h(String(c.phutIdle)) + ' phút</b>. ' +
          'Nhập lại mật khẩu để mở — hồ sơ bệnh nhân không nên để mở trên màn hình khi không có ai.'}</p>
      <div class="mk-ai">${h(ai.ten || Cloud.who() || '')}</div>
      ${laGio ? '' : `<form onsubmit="KG.moKhoa(event)">
        <input name="mk" type="password" placeholder="Mật khẩu tài khoản của bạn" autocomplete="current-password" required>
        <button class="btn primary">Mở khóa</button>
      </form>`}
      <div class="mk-duoi"><button class="link-btn" onclick="KG.thoat()">Đăng xuất khỏi máy này</button></div>
    </div>`;
    document.body.appendChild(o);
    setTimeout(() => { const i = o.querySelector('input'); if (i) i.focus(); }, 60);
  },
  async moKhoa(ev){
    ev.preventDefault();
    const mk = new FormData(ev.target).get('mk');
    const nut = ev.target.querySelector('button');
    nut.disabled = true; nut.textContent = 'Đang kiểm tra…';
    try {
      await Cloud.req('/auth/v1/token?grant_type=password', {
        method: 'POST', headers: {Authorization: 'Bearer ' + Cloud.cfg.key},
        body: {email: Cloud.who(), password: mk},
      });
    } catch(e){
      nut.disabled = false; nut.textContent = 'Mở khóa';
      const i = ev.target.querySelector('input'); i.value = ''; i.focus();
      App.toast('Mật khẩu không đúng');
      if (typeof Vet !== 'undefined') Vet.ghi('dangnhap', 'Mở khóa màn hình không thành công — sai mật khẩu');
      return;
    }
    if (typeof Vet !== 'undefined') Vet.ghi('dangnhap', 'Mở khóa màn hình');
    this.boKhoa();
  },
  boKhoa(){
    const o = document.getElementById('manKhoa');
    if (o) o.remove();
    this.dangKhoa = false;
    this.cham();
  },
  thoat(){ this.boKhoa(); App.doLogout(); },

  /* ---------- Cài đặt ---------- */
  moTa(){
    const c = this.cai();
    const p = [];
    p.push(c.batIdle ? 'tự khóa sau ' + c.phutIdle + ' phút không dùng' : 'không tự khóa');
    p.push(c.batGio ? 'chỉ mở được ' + c.tuGio + '–' + c.denGio : 'không giới hạn khung giờ');
    return p.join(' · ');
  },
  hop(){
    const c = this.cai();
    App.modal('An toàn truy cập', `
      <div class="note-block">Hai thứ dưới đây là để hồ sơ bệnh nhân không bị người ngoài đọc được
        khi không có ai ngồi máy, hoặc ngoài giờ làm việc.</div>
      <form class="form-grid" onsubmit="KG.luu(event)">
        <label class="tick-d full"><input type="checkbox" name="batIdle"${c.batIdle?' checked':''}>
          <b>Tự khóa màn hình khi để không</b></label>
        <div class="f"><label>Sau bao nhiêu phút</label>
          <input type="number" name="phutIdle" min="1" max="180" value="${h(String(c.phutIdle))}">
          <div class="combo-hint">Máy ở quầy nên để 10–15 phút. Mở lại bằng mật khẩu tài khoản.</div></div>
        <div class="f"></div>

        <label class="tick-d full" style="margin-top:6px"><input type="checkbox" name="batGio"${c.batGio?' checked':''}>
          <b>Chỉ cho mở hồ sơ trong khung giờ</b></label>
        <div class="f"><label>Từ giờ</label><input type="time" name="tuGio" value="${h(c.tuGio)}"></div>
        <div class="f"><label>Đến giờ</label><input type="time" name="denGio" value="${h(c.denGio)}"></div>
        <label class="tick-d full"><input type="checkbox" name="truQuanLy"${c.truQuanLy?' checked':''}>
          Quản lý vào được mọi lúc, không theo khung giờ</label>
        <div class="note-block full">Đặt khung giờ qua đêm cũng được, ví dụ 20:00 đến 06:00.
          Nhớ chừa quản lý ra, nếu không có lúc cần vào gấp lại không ai mở được.</div>
        <div class="form-actions full">
          <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
          <button class="btn primary">Lưu</button></div>
      </form>`);
  },
  luu(ev){
    ev.preventDefault();
    const f = ev.target, co = n => !!f.querySelector(`[name="${n}"]`).checked;
    const v = n => f.querySelector(`[name="${n}"]`).value;
    this.luuCai({
      batIdle: co('batIdle'), phutIdle: Math.max(1, +v('phutIdle') || 15),
      batGio: co('batGio'), tuGio: v('tuGio') || '06:00', denGio: v('denGio') || '20:00',
      truQuanLy: co('truQuanLy'),
    });
    if (typeof Vet !== 'undefined') Vet.ghi('sua', 'Đổi cài đặt an toàn truy cập — ' + this.moTa());
    App.closeModal(); App.render();
    App.toast('Đã lưu ✓');
    this.cham();
  },
};
