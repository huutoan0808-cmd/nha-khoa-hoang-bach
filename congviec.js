/* ================= PHÂN CÔNG VIỆC — BÁO CÁO CUỐI NGÀY — THÔNG BÁO =================
   Ba thứ gắn liền nhau nên để chung một chỗ:

   1. Quản lý (và bác sĩ) giao việc cho từng người, có hạn và mức ưu tiên. Việc lặp
      hằng ngày hoặc hằng tuần thì đặt một lần, mỗi ngày phần mềm tự sinh ra bản của
      ngày đó — khỏi phải giao lại mỗi sáng.
   2. Cuối ngày mỗi người gửi một báo cáo: tick những việc đã xong, ghi việc còn
      vướng và đề xuất. Danh sách việc trong báo cáo lấy thẳng từ việc được giao,
      không phải gõ lại.
   3. Quản lý nhận thông báo: ai gửi báo cáo, ai làm xong việc, việc nào quá hạn, và
      cuối ngày ai chưa gửi.

   Thông báo nằm TRONG phần mềm (chuông ở góc trên), không phải tin nhắn điện thoại.
   Muốn đẩy thông báo ra ngoài thì phải có máy chủ riêng gửi đi, mà phần mềm này là
   trang tĩnh cộng với Supabase nên chưa làm được. Chuông đồng bộ giữa các máy như
   mọi dữ liệu khác, nên quản lý mở máy nào cũng thấy. */
'use strict';

const CV_TT = ['Chưa làm', 'Đang làm', 'Xong'];
const CV_UT = ['Thường', 'Gấp'];
const CV_LAP = [['', 'Không lặp'], ['ngay', 'Mỗi ngày'], ['tuan', 'Mỗi tuần']];

const CV = {
  /* ---------- Tiện ích ---------- */
  ds(){ return db.congViec || (db.congViec = []); },
  bc(){ return db.baoCao || (db.baoCao = []); },
  tb(){ return db.thongBao || (db.thongBao = []); },
  toi(){ const s = Att.myStaff(); return s ? s.id : ''; },
  ten(id){ const s = staffById(id); return s ? s.name : '—'; },
  laQL(){ return Perm.can('baocaoall'); },

  gio(iso){
    const d = new Date(iso); if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ' ' + p(d.getDate()) + '/' + p(d.getMonth() + 1);
  },

  /* ---------- Việc lặp: mỗi ngày tự sinh bản của ngày đó ---------- */
  sinhHomNay(){
    const T = todayISO(), thu = new Date(T + 'T00:00').getDay();
    let them = 0;
    this.ds().filter(x => x.lap && !x.goc).forEach(mau => {
      if (mau.lap === 'tuan' && mau.thu != null && +mau.thu !== thu) return;
      const co = this.ds().some(x => x.goc === mau.id && x.ngay === T);
      if (co) return;
      this.ds().push({
        id: uid(), goc: mau.id, ngay: T,
        tieuDe: mau.tieuDe, moTa: mau.moTa, giaoCho: mau.giaoCho, nguoiGiao: mau.nguoiGiao,
        han: T, uuTien: mau.uuTien, lap: '', trangThai: 'Chưa làm', ghiChu: '', _up: Date.now(),
      });
      them++;
    });
    if (them) { try { save(); } catch(e){} }
    return them;
  },

  /* Việc thật của một người trong ngày — bỏ qua các bản mẫu lặp */
  cuaNguoi(sid, ngay){
    const T = ngay || todayISO();
    return this.ds().filter(x => !x.lap && x.giaoCho === sid &&
      (x.ngay === T || (!x.ngay && (!x.han || x.han <= T) && x.trangThai !== 'Xong') ||
       (x.han === T)));
  },
  /* Việc phải báo cáo trong ngày = việc của hôm nay CỘNG việc quá hạn còn treo.
     Bỏ việc quá hạn ra khỏi báo cáo là giấu đúng thứ quản lý cần thấy nhất. */
  viecTrongNgay(sid, ngay){
    const T = ngay || todayISO();
    const ds = (T === todayISO() ? this.quaHan(sid) : []).concat(this.cuaNguoi(sid, T));
    const co = {};
    return ds.filter(v => co[v.id] ? false : (co[v.id] = true));
  },
  quaHan(sid){
    const T = todayISO();
    return this.ds().filter(x => !x.lap && x.trangThai !== 'Xong' && x.han && x.han < T &&
      (!sid || x.giaoCho === sid));
  },

  /* ---------- Thông báo ---------- */
  bao(choAi, loai, noiDung){
    if (!choAi) return;
    this.tb().push({id: uid(), choAi, loai, noiDung, tuAi: this.toi(),
      luc: new Date().toISOString(), daDoc: false, _up: Date.now()});
  },
  baoQuanLy(loai, noiDung){
    db.staff.filter(s => s.active !== false && Perm.roleOf(s) === 'quanly')
      .forEach(s => { if (s.id !== this.toi()) this.bao(s.id, loai, noiDung); });
  },
  chuaDoc(){
    const me = this.toi();
    return me ? this.tb().filter(x => x.choAi === me && !x.daDoc) : [];
  },
  veChuong(){
    const n = this.chuaDoc().length;
    const nut = document.getElementById('cvChuong');
    if (!nut) return;
    nut.style.display = this.toi() ? '' : 'none';
    const d = nut.querySelector('.dot');
    if (d) { d.style.display = n ? '' : 'none'; d.textContent = n > 9 ? '9+' : String(n || ''); }
    nut.title = n ? n + ' thông báo chưa đọc' : 'Thông báo';
  },
  hopThongBao(){
    const me = this.toi();
    if (!me) { App.toast('Chưa đăng nhập nên chưa có thông báo'); return; }
    const ds = this.tb().filter(x => x.choAi === me).sort((a, b) => (a.luc < b.luc ? 1 : -1)).slice(0, 80);
    App.modal('Thông báo', `
      ${ds.length ? '' : '<div class="note-block">Chưa có thông báo nào.</div>'}
      ${ds.map(x => `<div class="ho-so-file ${x.daDoc ? '' : 'da-dien'}">
        <div class="hsf-than"><div class="hsf-dau">
          <b>${h(x.noiDung)}</b>${x.daDoc ? '' : '<span class="pill warn">Mới</span>'}</div>
          <div class="hsf-mo">${h(this.gio(x.luc))}${x.tuAi ? ' · ' + h(this.ten(x.tuAi)) : ''}</div></div></div>`).join('')}
      <div class="form-actions">
        <button class="btn" onclick="App.closeModal()">Đóng</button>
        ${ds.some(x => !x.daDoc) ? '<button class="btn primary" onclick="CV.docHet()">Đánh dấu đã đọc hết</button>' : ''}</div>`);
  },
  docHet(){
    const me = this.toi();
    this.tb().forEach(x => { if (x.choAi === me && !x.daDoc) { x.daDoc = true; x._up = Date.now(); } });
    save(); App.closeModal(); App.render();
  },

  /* ---------- Giao việc ---------- */
  form(id){
    if (Perm.chan('giaoviec', 'giao việc cho người khác')) return;
    const v = id ? this.ds().find(x => x.id === id) : null;
    const ai = db.staff.filter(s => s.active !== false);
    App.modal(v ? 'Sửa công việc' : 'Giao việc mới', `
      <form class="form-grid" onsubmit="CV.luu(event,'${id || ''}')">
        <div class="f full"><label>Việc cần làm</label>
          <input name="tieuDe" required value="${h(v ? v.tieuDe : '')}" placeholder="Vd: Gọi nhắc khách KH167 tái khám"></div>
        <div class="f full"><label>Mô tả thêm</label>
          <textarea name="moTa" rows="2" placeholder="Không bắt buộc">${h(v ? v.moTa : '')}</textarea></div>
        <div class="f"><label>Giao cho</label>
          <select name="giaoCho" required>${ai.map(s =>
            `<option value="${s.id}"${v && v.giaoCho === s.id ? ' selected' : ''}>${h(s.name)}${s.role ? ' — ' + h(s.role) : ''}</option>`).join('')}</select></div>
        <div class="f"><label>Hạn hoàn thành</label>
          <input type="date" name="han" value="${h(v ? v.han : todayISO())}"></div>
        <div class="f"><label>Mức ưu tiên</label>
          <select name="uuTien">${CV_UT.map(x => `<option${v && v.uuTien === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="f"><label>Lặp lại</label>
          <select name="lap" onchange="CV.doiLap(this)">${CV_LAP.map(([k, l]) =>
            `<option value="${k}"${v && v.lap === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="f full" id="oThu" style="display:${v && v.lap === 'tuan' ? '' : 'none'}"><label>Thứ mấy trong tuần</label>
          <select name="thu">${['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'].map((x, i) =>
            `<option value="${i}"${v && String(v.thu) === String(i) ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="note-block full">Chọn <b>lặp lại</b> thì đây thành việc mẫu: mỗi ngày (hoặc mỗi tuần đúng thứ đã chọn)
          phần mềm tự sinh ra một việc mới cho người đó, khỏi phải giao lại.</div>
        <div class="form-actions full">
          ${v ? `<button type="button" class="btn danger" onclick="CV.xoa('${v.id}')">Xóa việc</button>` : ''}
          <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
          <button class="btn primary">${v ? 'Lưu' : 'Giao việc'}</button></div>
      </form>`);
  },
  doiLap(sel){
    const o = document.getElementById('oThu');
    if (o) o.style.display = sel.value === 'tuan' ? '' : 'none';
  },
  luu(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const cu = id ? this.ds().find(x => x.id === id) : null;
    if (cu) {
      const doiNguoi = cu.giaoCho !== d.giaoCho;
      Object.assign(cu, d, {_up: Date.now()});
      if (doiNguoi) this.bao(d.giaoCho, 'viec', 'Bạn được giao việc: ' + d.tieuDe);
    } else {
      this.ds().push(Object.assign({
        id: uid(), nguoiGiao: this.toi(), trangThai: 'Chưa làm', ghiChu: '',
        ngay: d.lap ? '' : (d.han || todayISO()), _up: Date.now(),
      }, d));
      this.bao(d.giaoCho, 'viec', 'Bạn được giao việc: ' + d.tieuDe +
        (d.han ? ' (hạn ' + fmtD(d.han) + ')' : ''));
    }
    if (d.lap) this.sinhHomNay();
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('sua', (cu ? 'Sửa' : 'Giao') + ' công việc: ' + d.tieuDe + ' → ' + this.ten(d.giaoCho));
    App.closeModal(); App.render();
    App.toast(cu ? 'Đã lưu ✓' : 'Đã giao việc cho ' + this.ten(d.giaoCho) + ' ✓');
  },
  xoa(id){
    const v = this.ds().find(x => x.id === id); if (!v) return;
    if (!confirm('Xóa việc "' + v.tieuDe + '"?' + (v.lap ? '\n\nĐây là việc lặp — các bản đã sinh ra của những ngày trước vẫn giữ nguyên.' : ''))) return;
    db.congViec = this.ds().filter(x => x.id !== id);
    save(); App.closeModal(); App.render();
    App.toast('Đã xóa');
  },

  /* ---------- Người làm cập nhật ---------- */
  datTT(id, tt){
    const v = this.ds().find(x => x.id === id); if (!v) return;
    v.trangThai = tt;
    v.xongLuc = tt === 'Xong' ? new Date().toISOString() : '';
    v._up = Date.now();
    if (tt === 'Xong' && v.nguoiGiao && v.nguoiGiao !== this.toi())
      this.bao(v.nguoiGiao, 'xong', this.ten(this.toi()) + ' đã làm xong: ' + v.tieuDe);
    save(); App.render();
  },
  ghiChu(id){
    const v = this.ds().find(x => x.id === id); if (!v) return;
    const g = prompt('Ghi chú cho việc "' + v.tieuDe + '":', v.ghiChu || '');
    if (g === null) return;
    v.ghiChu = g.trim(); v._up = Date.now(); save(); App.render();
  },

  /* ---------- Báo cáo cuối ngày ---------- */
  cuaNgay(sid, ngay){
    return this.bc().find(x => x.staffId === sid && x.ngay === (ngay || todayISO()));
  },
  formBaoCao(){
    const me = this.toi();
    if (!me) { App.toast('Chưa đăng nhập'); return; }
    const T = todayISO();
    const viec = this.viecTrongNgay(me, T);
    const cu = this.cuaNgay(me, T);
    App.modal('Báo cáo cuối ngày — ' + fmtD(T), `
      <form class="form-grid" onsubmit="CV.luuBaoCao(event)">
        <div class="note-block full">Tick những việc đã làm xong hôm nay. Việc chưa xong cứ để trống,
          ghi lý do ở ô <b>còn vướng</b> — báo cáo trung thực có ích hơn báo cáo đẹp.</div>
        ${viec.length ? `<div class="f full"><label>Việc được giao hôm nay</label>
          <div class="check-row">${viec.map(v => `<label>
            <input type="checkbox" name="xong" value="${v.id}"${
              v.trangThai === 'Xong' || (cu && (cu.xong || []).includes(v.id)) ? ' checked' : ''}>
            ${h(v.tieuDe)}${v.uuTien === 'Gấp' ? ' ⚡' : ''}${
              v.han && v.han < T && v.trangThai !== 'Xong' ? ' (quá hạn ' + fmtD(v.han) + ')' : ''}</label>`).join('')}</div></div>`
        : '<div class="f full"><div class="note-block">Hôm nay không có việc nào được giao riêng.</div></div>'}
        <div class="f full"><label>Hôm nay đã làm những gì</label>
          <textarea name="daLam" rows="3" required placeholder="Vd: phụ 3 ca trám, dọn và hấp dụng cụ, gọi nhắc 5 khách tái khám">${h(cu ? cu.daLam : '')}</textarea></div>
        <div class="f full"><label>Còn vướng, chưa xong</label>
          <textarea name="conVuong" rows="2" placeholder="Để trống nếu không có">${h(cu ? cu.conVuong : '')}</textarea></div>
        <div class="f full"><label>Đề xuất, cần hỗ trợ</label>
          <textarea name="deXuat" rows="2" placeholder="Vd: sắp hết composite A2, cần đặt thêm">${h(cu ? cu.deXuat : '')}</textarea></div>
        <div class="form-actions full">
          <button type="button" class="btn" onclick="App.closeModal()">Để sau</button>
          <button class="btn primary">${cu ? 'Cập nhật báo cáo' : 'Gửi báo cáo'}</button></div>
      </form>`);
  },
  luuBaoCao(ev){
    ev.preventDefault();
    const f = ev.target, me = this.toi(), T = todayISO();
    const d = Object.fromEntries(new FormData(f).entries());
    const xong = [...f.querySelectorAll('[name="xong"]:checked')].map(x => x.value);
    /* Chốt danh sách việc TRƯỚC khi đổi trạng thái. Tính sau thì việc quá hạn vừa
       tick xong sẽ rơi khỏi danh sách quá hạn, mẫu số teo lại và ra "xong 2/1". */
    const viec = this.viecTrongNgay(me, T);
    /* Tick trong báo cáo thì cập nhật luôn trạng thái việc — khỏi phải làm hai lần */
    viec.forEach(v => {
      const moi = xong.includes(v.id) ? 'Xong' : (v.trangThai === 'Xong' ? 'Đang làm' : v.trangThai);
      if (moi !== v.trangThai) {
        v.trangThai = moi;
        v.xongLuc = moi === 'Xong' ? new Date().toISOString() : '';
        v._up = Date.now();
      }
    });
    const cu = this.cuaNgay(me, T);
    const ban = Object.assign(cu || {id: uid(), staffId: me, ngay: T},
      {xong, viecIds: viec.map(v => v.id),
       daLam: d.daLam, conVuong: d.conVuong, deXuat: d.deXuat,
       luc: new Date().toISOString(), _up: Date.now()});
    if (!cu) this.bc().push(ban);
    const tong = viec.length;
    this.baoQuanLy('baocao', this.ten(me) + ' đã gửi báo cáo cuối ngày' +
      (tong ? ' — xong ' + xong.length + '/' + tong + ' việc' : '') +
      (d.conVuong ? ' · có việc còn vướng' : ''));
    save();
    if (typeof Vet !== 'undefined') Vet.ghi('sua', 'Gửi báo cáo cuối ngày ' + fmtD(T));
    App.closeModal(); App.render();
    App.toast(cu ? 'Đã cập nhật báo cáo ✓' : 'Đã gửi báo cáo cho quản lý ✓');
  },
  xemBaoCao(id){
    const b = this.bc().find(x => x.id === id); if (!b) return;
    const viec = (b.viecIds || []).length
      ? b.viecIds.map(id => this.ds().find(x => x.id === id)).filter(Boolean)
      : this.viecTrongNgay(b.staffId, b.ngay);
    App.modal('Báo cáo của ' + this.ten(b.staffId) + ' — ' + fmtD(b.ngay), `
      <div class="f full"><label>Việc được giao</label>
        ${viec.length ? `<div class="tooth-info" style="margin-top:0">${viec.map(v =>
          ((b.xong || []).includes(v.id) ? '✓ ' : '○ ') + h(v.tieuDe)).join('<br>')}</div>`
        : '<div class="sub-line">Không có việc nào được giao riêng</div>'}</div>
      <div class="f full"><label>Đã làm</label><div class="tooth-info" style="margin-top:0">${h(b.daLam || '—').replace(/\n/g, '<br>')}</div></div>
      <div class="f full"><label>Còn vướng</label><div class="tooth-info" style="margin-top:0">${h(b.conVuong || '—').replace(/\n/g, '<br>')}</div></div>
      <div class="f full"><label>Đề xuất</label><div class="tooth-info" style="margin-top:0">${h(b.deXuat || '—').replace(/\n/g, '<br>')}</div></div>
      <div class="sub-line">Gửi lúc ${h(this.gio(b.luc))}</div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },

  /* ---------- Nhắc cuối ngày ---------- */
  /* Hết giờ làm mà chưa gửi báo cáo thì nhắc một lần trong ngày */
  nhacCuoiNgay(){
    const me = this.toi(); if (!me) return;
    const T = todayISO();
    const ra = ((db.clinic || {}).caChieuRa) || '17:00';
    const n = new Date(), bay = n.getHours() * 60 + n.getMinutes();
    const m = ra.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || bay < (+m[1]) * 60 + (+m[2])) return;
    if (this.cuaNgay(me, T)) return;
    let da = '';
    try { da = localStorage.getItem('nkhb_nhac_bc') || ''; } catch(e){}
    if (da === T) return;
    try { localStorage.setItem('nkhb_nhac_bc', T); } catch(e){}
    App.toast('Hết giờ làm rồi — nhớ gửi báo cáo cuối ngày');
  },

  /* ---------- Màn hình ---------- */
  man(){
    const me = this.toi(), T = todayISO();
    const ql = this.laQL();
    const tab = App.state.cvTab || 'toi';
    const nut = (k, l) => `<button class="btn small ${tab === k ? 'primary' : ''}" onclick="App.state.cvTab='${k}';App.render()">${l}</button>`;

    return `
    <div class="page-head"><h1>Công việc</h1>
      <div class="sub">Phân công, theo dõi tiến độ và báo cáo cuối ngày</div></div>
    <div class="form-actions" style="justify-content:flex-start;margin-bottom:12px;flex-wrap:wrap">
      ${nut('toi', 'Việc của tôi')}
      ${ql ? nut('all', 'Cả phòng khám') + nut('bc', 'Báo cáo cuối ngày') : nut('bc', 'Báo cáo của tôi')}
      ${Perm.can('giaoviec') ? `<button class="btn small primary" onclick="CV.form()">${IC.plus} Giao việc</button>` : ''}
      <button class="btn small" onclick="CV.formBaoCao()">Báo cáo cuối ngày</button>
    </div>
    ${tab === 'toi' ? this.manToi(me, T) : tab === 'all' ? this.manAll(T) : this.manBaoCao(ql, me, T)}`;
  },

  dongViec(v, hienNguoi){
    const T = todayISO();
    const tre = v.trangThai !== 'Xong' && v.han && v.han < T;
    const cuaToi = v.giaoCho === this.toi();
    return `<div class="ho-so-file ${v.trangThai === 'Xong' ? 'da-dien' : ''}">
      <div class="hsf-than">
        <div class="hsf-dau"><b>${h(v.tieuDe)}</b>
          ${v.uuTien === 'Gấp' ? '<span class="pill danger">Gấp</span>' : ''}
          ${tre ? '<span class="pill warn">Quá hạn</span>' : ''}
          <span class="pill ${v.trangThai === 'Xong' ? 'ok' : v.trangThai === 'Đang làm' ? 'info' : 'mutedp'}">${h(v.trangThai)}</span></div>
        <div class="hsf-mo">${v.moTa ? h(v.moTa) + '<br>' : ''}
          ${hienNguoi ? 'Giao cho <b>' + h(this.ten(v.giaoCho)) + '</b> · ' : ''}
          ${v.han ? 'hạn ' + fmtD(v.han) : 'không đặt hạn'}
          ${v.nguoiGiao ? ' · người giao ' + h(this.ten(v.nguoiGiao)) : ''}
          ${v.xongLuc ? ' · xong lúc ' + h(this.gio(v.xongLuc)) : ''}
          ${v.ghiChu ? '<br><i>Ghi chú: ' + h(v.ghiChu) + '</i>' : ''}</div></div>
      <div class="hsf-nut" style="flex-wrap:wrap;gap:4px">
        ${cuaToi ? CV_TT.filter(x => x !== v.trangThai).map(x =>
          `<button class="btn small${x === 'Xong' ? ' primary' : ''}" onclick="CV.datTT('${v.id}','${x}')">${x}</button>`).join('') : ''}
        ${cuaToi ? `<button class="btn small" onclick="CV.ghiChu('${v.id}')">Ghi chú</button>` : ''}
        ${Perm.can('giaoviec') ? `<button class="btn small" onclick="CV.form('${v.id}')">Sửa</button>` : ''}
      </div></div>`;
  },

  manToi(me, T){
    if (!me) return '<div class="note-block">Chưa đăng nhập nên chưa biết bạn là ai. Đăng nhập để thấy việc của mình.</div>';
    const tre = this.quaHan(me);
    const homNay = this.cuaNguoi(me, T).filter(v => !tre.some(x => x.id === v.id));
    const chuaXong = homNay.filter(v => v.trangThai !== 'Xong');
    const xong = homNay.filter(v => v.trangThai === 'Xong');
    const khoi = (ten, ds, k) => ds.length ? `<div class="card mb"><div class="card-h"><h2>${ten}</h2>
      <span class="pill ${k}">${ds.length}</span></div>
      <div class="card-b">${ds.map(v => this.dongViec(v, false)).join('')}</div></div>` : '';
    return `
      ${khoi('Quá hạn', tre, 'warn')}
      ${khoi('Hôm nay', chuaXong, 'info')}
      ${khoi('Đã xong hôm nay', xong, 'ok')}
      ${(tre.length + homNay.length) ? '' : '<div class="note-block">Hôm nay bạn không có việc nào được giao riêng. Cuối ngày vẫn nên gửi báo cáo.</div>'}`;
  },

  manAll(T){
    const ai = db.staff.filter(s => s.active !== false);
    const mau = this.ds().filter(x => x.lap);
    return `
      ${ai.map(s => {
        const ds = this.quaHan(s.id).concat(this.cuaNguoi(s.id, T).filter(v => !(v.han && v.han < T && v.trangThai !== 'Xong')));
        const xong = ds.filter(v => v.trangThai === 'Xong').length;
        const bc = this.cuaNgay(s.id, T);
        return `<div class="card mb"><div class="card-h"><h2>${h(s.name)}</h2>
          <span class="hint">${h(s.role || '')}</span>
          <span class="pill ${ds.length && xong === ds.length ? 'ok' : 'mutedp'}">${xong}/${ds.length} việc</span>
          ${bc ? '<span class="pill ok">Đã báo cáo</span>' : '<span class="pill warn">Chưa báo cáo</span>'}</div>
          <div class="card-b">${ds.length ? ds.map(v => this.dongViec(v, false)).join('')
            : '<div class="sub-line">Không có việc nào hôm nay</div>'}</div></div>`;
      }).join('')}
      ${mau.length ? `<div class="card"><div class="card-h"><h2>Việc lặp theo lịch</h2>
        <span class="hint">tự sinh ra mỗi ngày, không cần giao lại</span></div>
        <div class="card-b">${mau.map(v => `<div class="ho-so-file">
          <div class="hsf-than"><div class="hsf-dau"><b>${h(v.tieuDe)}</b>
            <span class="pill info">${v.lap === 'ngay' ? 'Mỗi ngày' : 'Mỗi tuần'}</span></div>
            <div class="hsf-mo">Giao cho <b>${h(this.ten(v.giaoCho))}</b></div></div>
          <div class="hsf-nut"><button class="btn small" onclick="CV.form('${v.id}')">Sửa</button></div></div>`).join('')}
        </div></div>` : ''}`;
  },

  manBaoCao(ql, me, T){
    if (!ql) {
      const ds = this.bc().filter(x => x.staffId === me).sort((a, b) => (a.ngay < b.ngay ? 1 : -1)).slice(0, 30);
      return `<div class="card"><div class="card-h"><h2>Báo cáo của tôi</h2></div><div class="card-b">
        ${ds.map(b => `<div class="ho-so-file"><div class="hsf-than">
          <div class="hsf-dau"><b>${fmtD(b.ngay)}</b><span class="sub-line">gửi lúc ${h(this.gio(b.luc))}</span></div>
          <div class="hsf-mo">${h((b.daLam || '').slice(0, 140))}</div></div>
          <div class="hsf-nut"><button class="btn small" onclick="CV.xemBaoCao('${b.id}')">Xem</button></div></div>`).join('')
          || '<div class="sub-line">Chưa gửi báo cáo nào.</div>'}</div></div>`;
    }
    const ngay = App.state.cvNgay || T;
    const ai = db.staff.filter(s => s.active !== false);
    const gui = ai.filter(s => this.cuaNgay(s.id, ngay));
    return `
      <div class="card mb"><div class="card-h"><h2>Báo cáo ngày ${fmtD(ngay)}</h2>
        <span class="pill ${gui.length === ai.length ? 'ok' : 'warn'}">${gui.length}/${ai.length} người đã gửi</span></div>
        <div class="card-b">
          <div class="f" style="max-width:220px"><label>Chọn ngày</label>
            <input type="date" value="${h(ngay)}" onchange="App.state.cvNgay=this.value;App.render()"></div>
          ${ai.map(s => {
            const b = this.cuaNgay(s.id, ngay);
            return `<div class="ho-so-file ${b ? 'da-dien' : ''}">
              <div class="hsf-than"><div class="hsf-dau"><b>${h(s.name)}</b>
                ${b ? '<span class="pill ok">Đã gửi ' + h(this.gio(b.luc)) + '</span>' : '<span class="pill warn">Chưa gửi</span>'}</div>
                <div class="hsf-mo">${b ? h((b.daLam || '').slice(0, 160)) +
                  (b.conVuong ? '<br><b>Còn vướng:</b> ' + h(b.conVuong) : '') : h(s.role || '')}</div></div>
              <div class="hsf-nut">${b ? `<button class="btn small" onclick="CV.xemBaoCao('${b.id}')">Xem đủ</button>` : ''}</div></div>`;
          }).join('')}
        </div></div>`;
  },

  /* ---------- Thẻ trên màn hình Tổng quan ---------- */
  theTongQuan(){
    const me = this.toi(); if (!me) return '';
    const T = todayISO();
    if (this.laQL()) {
      const ai = db.staff.filter(s => s.active !== false);
      const gui = ai.filter(s => this.cuaNgay(s.id, T)).length;
      const tre = this.quaHan().length;
      return `<div class="card mb"><div class="card-h"><h2>Công việc hôm nay</h2>
        <button class="btn small" onclick="App.go('work')">Mở</button></div>
        <div class="card-b">
          <div class="ky-dong"><span class="pill ${gui === ai.length ? 'ok' : 'warn'}">${gui}/${ai.length} người đã gửi báo cáo</span>
          ${tre ? `<span class="pill danger">${tre} việc quá hạn</span>` : '<span class="pill ok">Không có việc quá hạn</span>'}</div>
        </div></div>`;
    }
    const tre = this.quaHan(me).length;
    const chua = this.cuaNguoi(me, T).filter(v => v.trangThai !== 'Xong').length;
    const bc = this.cuaNgay(me, T);
    return `<div class="card mb"><div class="card-h"><h2>Việc của tôi hôm nay</h2>
      <button class="btn small" onclick="App.go('work')">Mở</button></div>
      <div class="card-b"><div class="ky-dong">
        <span class="pill ${chua ? 'info' : 'ok'}">${chua ? chua + ' việc chưa xong' : 'Xong hết việc hôm nay'}</span>
        ${tre ? `<span class="pill warn">${tre} việc quá hạn</span>` : ''}
        ${bc ? '<span class="pill ok">Đã gửi báo cáo</span>'
             : '<button class="btn small primary" onclick="CV.formBaoCao()">Gửi báo cáo cuối ngày</button>'}
      </div></div></div>`;
  },
};

/* ================= PHÂN CÔNG VIỆC TRONG TAB NHÂN SỰ =================
   Cùng dữ liệu với tab Công việc, nhưng xếp theo NGƯỜI thay vì theo việc — quản lý
   nhìn một người là thấy ngay họ đang ôm bao nhiêu việc, xong tới đâu.

   Thêm phần phản hồi tiến độ: người làm ghi lại tiến độ kèm MỘT tấm ảnh chụp,
   người giao nhận thông báo ngay.

   Vì sao chỉ một ảnh mỗi lần phản hồi: ảnh nằm chung kho dữ liệu với hồ sơ bệnh nhân,
   mà trình duyệt chỉ cho mỗi trang khoảng 5MB. Một ảnh đã nén cỡ 50KB; cho đính kèm
   thoải mái thì vài chục việc là đầy kho, mất cả dữ liệu bệnh án. Cần nhiều ảnh thì
   ghi thêm một lần phản hồi nữa. */

Object.assign(CV, {
  /* ---------- Nén ảnh trước khi lưu ---------- */
  NEN_CANH: 800,
  NEN_CHAT: 0.6,
  nenAnh(file){
    return new Promise((ok, loi) => {
      if (!file) return ok('');
      if (!/^image\//.test(file.type)) return loi(new Error('Chỉ nhận tệp ảnh'));
      const fr = new FileReader();
      fr.onerror = () => loi(new Error('Không đọc được tệp'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => loi(new Error('Tệp ảnh hỏng'));
        im.onload = () => {
          const tl = Math.min(1, this.NEN_CANH / Math.max(im.width, im.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(im.width * tl);
          cv.height = Math.round(im.height * tl);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          ok(cv.toDataURL('image/jpeg', this.NEN_CHAT));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  },

  /* ---------- Phản hồi tiến độ ---------- */
  phanHoiForm(id){
    const v = this.ds().find(x => x.id === id); if (!v) return;
    App.modal('Phản hồi tiến độ — ' + v.tieuDe, `
      <form class="form-grid" onsubmit="CV.luuPhanHoi(event,'${id}')">
        <div class="f full"><label>Tiến độ hiện tại</label>
          <select name="trangThai">${CV_TT.map(x =>
            `<option${v.trangThai === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="f full"><label>Ghi lại tiến độ</label>
          <textarea name="noiDung" rows="3" required placeholder="Vd: đã hấp xong 2 mẻ, còn 1 mẻ chờ máy nguội"></textarea></div>
        <div class="f full"><label>Ảnh chụp (không bắt buộc)</label>
          <input type="file" name="anh" accept="image/*" capture="environment" onchange="CV.xemTruoc(this)">
          <div class="combo-hint">Mỗi lần phản hồi đính kèm <b>một ảnh</b>, phần mềm tự nén lại cho nhẹ.
            Cần nhiều ảnh thì ghi thêm lần phản hồi nữa.</div>
          <div id="cvAnhXem" style="margin-top:8px"></div></div>
        <div class="form-actions full">
          <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
          <button class="btn primary">Gửi phản hồi</button></div>
      </form>`);
  },
  async xemTruoc(inp){
    const o = document.getElementById('cvAnhXem'); if (!o) return;
    o.innerHTML = '<span class="sub-line">Đang xử lý ảnh…</span>';
    try {
      const d = await this.nenAnh(inp.files[0]);
      o.innerHTML = d ? `<img src="${d}" class="cv-anh">
        <div class="sub-line">Đã nén còn ${Math.round(d.length / 1024)} KB</div>` : '';
    } catch(e){ o.innerHTML = '<span class="sub-line">' + h(e.message) + '</span>'; }
  },
  async luuPhanHoi(ev, id){
    ev.preventDefault();
    const f = ev.target, v = this.ds().find(x => x.id === id); if (!v) return;
    const d = Object.fromEntries(new FormData(f).entries());
    const nut = f.querySelector('button.primary');
    nut.disabled = true; nut.textContent = 'Đang gửi…';
    let anh = '';
    try { anh = await this.nenAnh(f.querySelector('[name="anh"]').files[0]); }
    catch(e){ App.toast('Ảnh lỗi: ' + e.message); }
    v.phanHoi = v.phanHoi || [];
    v.phanHoi.push({id: uid(), luc: new Date().toISOString(), nguoi: this.toi(),
      noiDung: d.noiDung, anh, trangThai: d.trangThai});
    const doiTT = v.trangThai !== d.trangThai;
    v.trangThai = d.trangThai;
    v.xongLuc = d.trangThai === 'Xong' ? (v.xongLuc || new Date().toISOString()) : '';
    v._up = Date.now();
    if (v.nguoiGiao && v.nguoiGiao !== this.toi())
      this.bao(v.nguoiGiao, 'tiendo', this.ten(this.toi()) + ' báo tiến độ "' + v.tieuDe + '": ' +
        d.trangThai + (anh ? ' · có ảnh' : ''));
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('sua', 'Phản hồi tiến độ: ' + v.tieuDe + ' → ' + d.trangThai + (anh ? ' (kèm ảnh)' : ''));
    App.closeModal(); App.render();
    App.toast(doiTT ? 'Đã gửi phản hồi, trạng thái → ' + d.trangThai : 'Đã gửi phản hồi ✓');
  },
  xemAnh(id, phId){
    const v = this.ds().find(x => x.id === id); if (!v) return;
    const ph = (v.phanHoi || []).find(x => x.id === phId); if (!ph || !ph.anh) return;
    App.modal('Ảnh tiến độ — ' + v.tieuDe, `
      <div class="sub-line">${h(this.ten(ph.nguoi))} · ${h(this.gio(ph.luc))}</div>
      <img src="${ph.anh}" style="width:100%;border-radius:10px;margin-top:8px">
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },
  dongPhanHoi(v){
    const ds = v.phanHoi || [];
    if (!ds.length) return '';
    return `<div class="cv-thread">${ds.slice().reverse().map(ph => `
      <div class="cv-ph">
        <div class="cv-ph-dau"><b>${h(this.ten(ph.nguoi))}</b>
          <span class="pill ${ph.trangThai === 'Xong' ? 'ok' : 'info'}">${h(ph.trangThai || '')}</span>
          <span class="sub-line">${h(this.gio(ph.luc))}</span></div>
        <div>${h(ph.noiDung || '')}</div>
        ${ph.anh ? `<img src="${ph.anh}" class="cv-anh" onclick="CV.xemAnh('${v.id}','${ph.id}')" title="Bấm để xem to">` : ''}
      </div>`).join('')}</div>`;
  },

  /* ---------- Màn hình trong tab Nhân sự ---------- */
  manNhanSu(){
    const me = this.toi(), T = todayISO();
    const xemHet = Perm.can('baocaoall') || Perm.can('giaoviec');
    const ai = xemHet ? db.staff.filter(s => s.active !== false)
                      : db.staff.filter(s => s.id === me);
    if (!ai.length) return '<div class="note-block">Chưa có nhân viên nào, hoặc bạn chưa đăng nhập.</div>';

    const dong = v => {
      const tre = v.trangThai !== 'Xong' && v.han && v.han < T;
      const cuaToi = v.giaoCho === me;
      return `<div class="ho-so-file ${v.trangThai === 'Xong' ? 'da-dien' : ''}">
        <div class="hsf-than">
          <div class="hsf-dau"><b>${h(v.tieuDe)}</b>
            ${v.uuTien === 'Gấp' ? '<span class="pill danger">Gấp</span>' : ''}
            ${tre ? '<span class="pill warn">Quá hạn</span>' : ''}
            <span class="pill ${v.trangThai === 'Xong' ? 'ok' : v.trangThai === 'Đang làm' ? 'info' : 'mutedp'}">${h(v.trangThai)}</span>
            ${(v.phanHoi || []).length ? `<span class="pill mutedp">${v.phanHoi.length} phản hồi</span>` : ''}</div>
          <div class="hsf-mo">${v.moTa ? h(v.moTa) + '<br>' : ''}
            ${v.han ? 'hạn ' + fmtD(v.han) : 'không đặt hạn'}
            ${v.nguoiGiao ? ' · giao bởi ' + h(this.ten(v.nguoiGiao)) : ''}</div>
          ${this.dongPhanHoi(v)}
        </div>
        <div class="hsf-nut" style="flex-wrap:wrap;gap:4px">
          ${cuaToi ? `<button class="btn small primary" onclick="CV.phanHoiForm('${v.id}')">Phản hồi tiến độ</button>` : ''}
          ${Perm.can('giaoviec') ? `<button class="btn small" onclick="CV.form('${v.id}')">Sửa</button>` : ''}
        </div></div>`;
    };

    return `
      ${Perm.can('giaoviec') ? `<div class="form-actions" style="justify-content:flex-start;margin-bottom:12px">
        <button class="btn primary" onclick="CV.form()">${IC.plus} Giao việc mới</button>
        <button class="btn" onclick="App.go('work')">Mở tab Công việc</button></div>` : ''}
      ${ai.map(s => {
        const ds = this.quaHan(s.id).concat(this.cuaNguoi(s.id, T))
          .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
        const xong = ds.filter(v => v.trangThai === 'Xong').length;
        const bc = this.cuaNgay(s.id, T);
        return `<div class="card mb"><div class="card-h"><h2>${h(s.name)}</h2>
          <span class="hint">${h(s.role || '')}</span>
          <span class="pill ${ds.length && xong === ds.length ? 'ok' : 'mutedp'}">${xong}/${ds.length} việc hôm nay</span>
          ${bc ? '<span class="pill ok">Đã báo cáo</span>' : '<span class="pill warn">Chưa báo cáo</span>'}
          ${Perm.can('giaoviec') ? `<button class="btn small" onclick="CV.giaoCho('${s.id}')">Giao việc</button>` : ''}</div>
          <div class="card-b">${ds.length ? ds.map(dong).join('')
            : '<div class="sub-line">Không có việc nào hôm nay.</div>'}</div></div>`;
      }).join('')}`;
  },
  /* Giao việc với người nhận chọn sẵn */
  giaoCho(sid){
    this.form();
    setTimeout(() => {
      const o = document.querySelector('#modalBody [name="giaoCho"]');
      if (o) o.value = sid;
    }, 40);
  },
});
