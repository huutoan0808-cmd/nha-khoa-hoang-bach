/* ================= MÃ HÓA DỮ LIỆU LƯU TRÊN MÁY =================
   Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.2.a: cơ sở dữ liệu "có khả năng
   áp dụng cơ chế mã hóa đối với dữ liệu lưu trữ".

   Trên máy chủ thì Supabase đã mã hóa sẵn. Chỗ hở là bản sao nằm trong trình duyệt
   từng máy: mở công cụ nhà phát triển là đọc được cả kho hồ sơ bệnh nhân, và ai cầm
   được ổ cứng cũng đọc được.

   Cách làm: AES-256-GCM, khóa sinh từ một MẬT KHẨU MỞ DỮ LIỆU của phòng khám bằng
   PBKDF2 200.000 vòng. Mật khẩu này KHÔNG phải mật khẩu tài khoản cá nhân — nếu gắn
   với tài khoản thì người khác ngồi vào cùng máy sẽ không mở được dữ liệu, mà bốn
   người trong phòng khám vốn đều được xem hồ sơ như nhau.

   Khóa chỉ nằm trong bộ nhớ và trong sessionStorage của tab đang mở, không bao giờ
   ghi xuống đĩa. Đóng trình duyệt là phải nhập lại.

   MẶC ĐỊNH TẮT. Bật lên là mỗi lần mở phần mềm phải gõ thêm một mật khẩu — đó là
   cái giá, quản lý tự cân nhắc. */
'use strict';

const Mahoa = {
  KHOA_SS: 'nkhb_mk_tam',      /* khóa đã sinh, giữ trong tab đang mở */
  MUOI_LS: 'nkhb_mk_muoi',     /* muối, để ngoài cũng không sao */
  VONG: 200000,
  khoa: null,                  /* CryptoKey đang dùng */
  choGhi: null,                /* nội dung chờ ghi, gộp nhiều lần save liên tiếp */
  dangGhi: false,

  co(){ return !!(window.crypto && crypto.subtle); },
  bat(){ return !!(((db || {}).clinic || {}).baoMat || {}).maHoa; },

  /* ---------- Muối ---------- */
  muoi(){
    let m = '';
    try { m = localStorage.getItem(this.MUOI_LS) || ''; } catch(e){}
    if (!m) {
      const b = crypto.getRandomValues(new Uint8Array(16));
      m = btoa(String.fromCharCode(...b));
      try { localStorage.setItem(this.MUOI_LS, m); } catch(e){}
    }
    return Uint8Array.from(atob(m), c => c.charCodeAt(0));
  },

  /* ---------- Sinh khóa từ mật khẩu ---------- */
  async sinhKhoa(matKhau){
    const goc = await crypto.subtle.importKey('raw', new TextEncoder().encode(matKhau),
      'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
      {name: 'PBKDF2', salt: this.muoi(), iterations: this.VONG, hash: 'SHA-256'},
      goc, {name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
  },
  async nhoKhoa(k){
    this.khoa = k;
    try {
      const raw = await crypto.subtle.exportKey('raw', k);
      sessionStorage.setItem(this.KHOA_SS, btoa(String.fromCharCode(...new Uint8Array(raw))));
    } catch(e){}
  },
  async layKhoaTam(){
    if (this.khoa) return this.khoa;
    let b64 = '';
    try { b64 = sessionStorage.getItem(this.KHOA_SS) || ''; } catch(e){}
    if (!b64) return null;
    try {
      const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      this.khoa = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
      return this.khoa;
    } catch(e){ return null; }
  },
  quenKhoa(){
    this.khoa = null;
    try { sessionStorage.removeItem(this.KHOA_SS); } catch(e){}
  },

  /* ---------- Mã hóa / giải mã ---------- */
  async goi(chuoi){
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, this.khoa,
      new TextEncoder().encode(chuoi));
    return JSON.stringify({__enc: 1, iv: btoa(String.fromCharCode(...iv)),
      ct: btoa(String.fromCharCode(...new Uint8Array(ct)))});
  },
  async moGoi(json, khoa){
    const o = JSON.parse(json);
    const iv = Uint8Array.from(atob(o.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(o.ct), c => c.charCodeAt(0));
    const ra = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, khoa || this.khoa, ct);
    return new TextDecoder().decode(ra);
  },
  /* Dữ liệu trong ô lưu có phải bản đã mã hóa không */
  laGoi(raw){
    if (!raw || raw[0] !== '{') return false;
    try { return !!JSON.parse(raw).__enc; } catch(e){ return false; }
  },

  /* ---------- Ghi xuống máy ----------
     crypto.subtle chỉ chạy bất đồng bộ nên không ghi thẳng trong save() được. Gom
     lần ghi cuối cùng rồi ghi một lượt. Cửa sổ mất dữ liệu là đúng một lần mã hóa,
     cỡ chục mili giây; phần vừa nhập nếu có mạng thì đã lên đám mây rồi. */
  ghi(chuoi){
    this.choGhi = chuoi;
    if (this.dangGhi) return;
    this.dangGhi = true;
    Promise.resolve().then(async () => {
      try {
        while (this.choGhi !== null) {
          const n = this.choGhi; this.choGhi = null;
          if (!this.khoa) break;                 /* chưa mở khóa thì KHÔNG ghi gì cả */
          localStorage.setItem(DB_KEY, await this.goi(n));
        }
      } catch(e){ /* hết chỗ hoặc lỗi mã hóa — thà không ghi còn hơn ghi bản trần */ }
      finally { this.dangGhi = false; }
    });
  },

  /* Mở lại bằng khóa còn nằm trong tab hiện tại — khỏi hỏi lại khi bấm tải lại trang */
  async tuMo(){
    const k = await this.layKhoaTam();
    if (!k) return false;
    let raw = '';
    try { raw = localStorage.getItem(DB_KEY) || ''; } catch(e){}
    if (!this.laGoi(raw)) return false;
    try {
      const d = JSON.parse(await this.moGoi(raw, k));
      if (!d || !Array.isArray(d.customers)) return false;
      db = d; migrate();
      return true;
    } catch(e){ this.quenKhoa(); return false; }
  },

  /* ---------- Mở khóa lúc mở phần mềm ---------- */
  async thu(matKhau){
    let raw = '';
    try { raw = localStorage.getItem(DB_KEY) || ''; } catch(e){}
    if (!this.laGoi(raw)) return null;
    const k = await this.sinhKhoa(matKhau);
    const chuoi = await this.moGoi(raw, k);      /* sai mật khẩu thì ném lỗi ở đây */
    const d = JSON.parse(chuoi);
    if (!d || !Array.isArray(d.customers)) throw new Error('Dữ liệu hỏng');
    await this.nhoKhoa(k);
    return d;
  },
  manHinhMo(){
    const o = document.createElement('div');
    o.id = 'manKhoa';
    o.innerHTML = `<div class="mk-hop">
      <div class="mk-bieu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/>
        <path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
      <h2>Dữ liệu trên máy đang được mã hóa</h2>
      <p>Nhập <b>mật khẩu mở dữ liệu</b> của phòng khám để đọc hồ sơ đã lưu trên máy này.
        Đây không phải mật khẩu tài khoản của bạn.</p>
      <form onsubmit="Mahoa.moTay(event)">
        <input name="mk" type="password" placeholder="Mật khẩu mở dữ liệu" autocomplete="off" required>
        <button class="btn primary">Mở dữ liệu</button>
      </form>
      <div class="mk-duoi"><button class="link-btn" onclick="Mahoa.boQua()">Quên mật khẩu — tải lại từ đám mây</button></div>
    </div>`;
    document.body.appendChild(o);
    setTimeout(() => { const i = o.querySelector('input'); if (i) i.focus(); }, 60);
  },
  async moTay(ev){
    ev.preventDefault();
    const mk = new FormData(ev.target).get('mk');
    const nut = ev.target.querySelector('button');
    nut.disabled = true; nut.textContent = 'Đang mở…';
    try {
      const d = await this.thu(mk);
      if (!d) throw new Error('Không có dữ liệu mã hóa');
      db = d; migrate();
      const o = document.getElementById('manKhoa'); if (o) o.remove();
      App.choMoKhoa = false;          /* mở được rồi thì cho đồng bộ chạy lại */
      if (typeof Vet !== 'undefined') Vet.chup();
      if (typeof Sync !== 'undefined') Sync.snapshot();
      App.render();
      App.toast('Đã mở dữ liệu ✓');
    } catch(e){
      nut.disabled = false; nut.textContent = 'Mở dữ liệu';
      const i = ev.target.querySelector('input'); i.value = ''; i.focus();
      App.toast('Mật khẩu không đúng');
    }
  },
  /* Quên mật khẩu: bỏ bản trên máy, đăng nhập rồi kéo lại từ đám mây */
  boQua(){
    if (!confirm('Bỏ bản dữ liệu đã mã hóa trên máy này và tải lại từ đám mây?\n\n' +
      'Phần nào chưa kịp đồng bộ lên đám mây sẽ mất. Chỉ làm khi thật sự không nhớ mật khẩu.')) return;
    try { localStorage.removeItem(DB_KEY); localStorage.removeItem(this.MUOI_LS); } catch(e){}
    this.quenKhoa();
    location.replace(location.pathname + location.search);
  },

  /* ---------- Bật / tắt ---------- */
  async batLen(matKhau){
    const k = await this.sinhKhoa(matKhau);
    await this.nhoKhoa(k);
    db.clinic = db.clinic || {};
    db.clinic.baoMat = Object.assign({}, db.clinic.baoMat || {}, {maHoa: true});
    /* Ghi lại ngay ở dạng đã mã hóa, đè lên bản trần đang nằm trên máy */
    localStorage.setItem(DB_KEY, await this.goi(JSON.stringify(db)));
    if (typeof Vet !== 'undefined') Vet.ghi('sua', 'Bật mã hóa dữ liệu lưu trên máy');
  },
  async tat(){
    db.clinic = db.clinic || {};
    db.clinic.baoMat = Object.assign({}, db.clinic.baoMat || {}, {maHoa: false});
    this.quenKhoa();
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    if (typeof Vet !== 'undefined') Vet.ghi('sua', 'Tắt mã hóa dữ liệu lưu trên máy');
  },
  moTa(){
    if (!this.co()) return 'Trình duyệt này không hỗ trợ mã hóa';
    return this.bat()
      ? 'Đang bật — dữ liệu trên máy ở dạng mã hóa, mở phần mềm phải nhập mật khẩu mở dữ liệu'
      : 'Đang tắt — dữ liệu trên máy để dạng đọc được';
  },
  hop(){
    if (Perm.chan('caidat', 'đổi cài đặt mã hóa')) return;
    const dang = this.bat();
    App.modal('Mã hóa dữ liệu lưu trên máy', `
      <div class="note-block">Dữ liệu trên máy chủ vốn đã được mã hóa. Phần này lo bản sao nằm
        trong trình duyệt của từng máy — chỗ mà người cầm được máy có thể đọc thẳng.</div>
      ${dang ? `
        <div class="note-block warn-block"><b>Đang bật.</b> Mỗi lần mở phần mềm trên một máy,
          phải nhập mật khẩu mở dữ liệu một lần.</div>
        <div class="form-actions full">
          <button class="btn" onclick="App.closeModal()">Đóng</button>
          <button class="btn" onclick="Mahoa.tatTay()">Tắt mã hóa</button></div>`
      : `
        <form class="form-grid" onsubmit="Mahoa.batTay(event)">
          <div class="f full"><label>Mật khẩu mở dữ liệu của phòng khám</label>
            <input name="mk" type="password" minlength="8" required autocomplete="new-password">
            <div class="combo-hint">Tối thiểu 8 ký tự. Đây là mật khẩu <b>dùng chung cho cả phòng khám</b>,
              không phải mật khẩu tài khoản cá nhân — vì cả bốn vai trò đều được xem hồ sơ như nhau.</div></div>
          <div class="f full"><label>Nhập lại</label>
            <input name="mk2" type="password" minlength="8" required autocomplete="new-password"></div>
          <div class="note-block warn-block full"><b>Ghi mật khẩu này ra giấy cất nơi an toàn.</b>
            Mất mật khẩu là mất bản dữ liệu trên máy đó, chỉ còn cách tải lại từ đám mây.
            Phần chưa kịp đồng bộ sẽ mất theo.</div>
          <div class="form-actions full">
            <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
            <button class="btn primary">Bật mã hóa</button></div>
        </form>`}`);
  },
  async batTay(ev){
    ev.preventDefault();
    const f = new FormData(ev.target);
    if (f.get('mk') !== f.get('mk2')) { App.toast('Hai ô mật khẩu không giống nhau'); return; }
    try {
      await this.batLen(f.get('mk'));
      App.closeModal(); App.render();
      App.toast('Đã bật mã hóa ✓ — nhớ ghi mật khẩu ra giấy');
    } catch(e){ App.toast('Không bật được: ' + e.message); }
  },
  async tatTay(){
    if (!confirm('Tắt mã hóa? Dữ liệu trên máy sẽ quay về dạng đọc được.')) return;
    await this.tat();
    App.closeModal(); App.render();
    App.toast('Đã tắt mã hóa');
  },
};
