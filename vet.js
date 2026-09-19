/* ================= NHẬT KÝ LƯU VẾT =================
   Bộ Y tế — Công văn hướng dẫn yêu cầu kỹ thuật triển khai phần mềm hồ sơ bệnh án
   điện tử, mục III.1.1.đ: phần mềm phải "ghi vết tất cả các giao dịch, tương tác
   của người dùng", bảo đảm "quyền riêng tư, bảo mật và kiểm tra truy vết".

   Cách làm: giữ một bản chụp toàn bộ dữ liệu, mỗi lần save() thì so lại để biết
   bản ghi nào vừa thêm / sửa / xóa và ai là người làm. Nhờ vậy không phải đi sửa
   hai trăm chỗ gọi save() trong app.js, và không chỗ nào lọt lưới được.

   Bản ghi bị xóa được giữ nguyên nội dung trong nhật ký, nên nhật ký kiêm luôn
   thùng rác — đáp ứng mục III.1.1.c "hủy, khôi phục dữ liệu".

   BẢNG TRÊN SUPABASE — chạy một lần trong SQL Editor:

     create table if not exists audit (
       id text primary key,
       at timestamptz not null,
       email text, ten text, vai text,
       act text not null, tbl text, rec_id text,
       nhan text, truong jsonb, ban_sao jsonb, may text
     );
     alter table audit enable row level security;
     create policy "doc" on audit for select to authenticated using (true);
     create policy "them" on audit for insert to authenticated with check (true);

   Cố tình KHÔNG tạo policy update/delete: nhật ký chỉ thêm, không ai sửa hay xóa
   được, kể cả quản lý. Đó mới là truy vết. */
'use strict';

const VET_MAX = 3000;          /* giữ lại trên máy bao nhiêu dòng gần nhất */

/* Bảng nào được theo dõi, và gọi tên ra tiếng Việt cho người đọc nhật ký */
const VET_BANG = {
  customers: 'Hồ sơ khách hàng', treatments: 'Hạng mục điều trị',
  receipts: 'Phiếu thu', rx: 'Đơn thuốc', appointments: 'Lịch hẹn',
  episodes: 'Đợt điều trị', labs: 'Phiếu lab', services: 'Bảng giá dịch vụ',
  giaLab: 'Bảng giá lab', quyTrinh: 'Quy trình công đoạn', staff: 'Nhân viên',
  inventory: 'Kho vật tư', invLog: 'Xuất nhập kho', bonuses: 'Thưởng phạt',
};

const VET_ACT = {
  them: 'Thêm mới', sua: 'Sửa', xoa: 'Xóa', khoiphuc: 'Khôi phục',
  dangnhap: 'Đăng nhập', dangxuat: 'Đăng xuất', in: 'In / kết xuất',
  xem: 'Mở hồ sơ', xuat: 'Xuất dữ liệu', ky: 'Ký xác nhận',
};

const Vet = {
  bong: null,        /* bản chụp lần trước: {bảng: {id: chuỗi JSON}} */
  tat: 0,            /* >0 thì tạm ngưng ghi — dùng khi kéo dữ liệu về hoặc nhập hàng loạt */
  dangDay: false,

  /* ---------- Ai đang thao tác ---------- */
  ai(){
    const email = (typeof Cloud !== 'undefined' && Cloud.who()) || '';
    const s = (typeof Perm !== 'undefined' && Perm.me && Perm.me()) || null;
    return {
      email,
      ten: (s && s.name) || email || 'Máy chưa đăng nhập',
      vai: (typeof Perm !== 'undefined' && Perm.label && Perm.label()) || '',
    };
  },
  /* Tên máy — để biết thao tác xuất phát từ máy quầy hay máy phòng khám */
  may(){
    let m = '';
    try { m = localStorage.getItem('nkhb_may') || ''; } catch(e){}
    if (!m) {
      m = 'May-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      try { localStorage.setItem('nkhb_may', m); } catch(e){}
    }
    return m;
  },

  /* ---------- Nhãn dễ đọc cho một bản ghi ---------- */
  nhan(tbl, r){
    if (!r) return '';
    const kh = id => {
      const c = (db.customers || []).find(x => x.id === id);
      return c ? (c.name || '') + (c.code ? ' (' + c.code + ')' : '') : '';
    };
    switch (tbl) {
      case 'customers':   return (r.name || '') + (r.code ? ' (' + r.code + ')' : '');
      case 'treatments':  return (r.name || '') + (r.tooth ? ' — R' + r.tooth : '') +
                                 (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'receipts':    return 'Phiếu ' + (r.no || '') + ' · ' +
                                 (r.amount != null ? r.amount.toLocaleString('vi-VN') + 'đ' : '') +
                                 (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'rx':          return 'Đơn thuốc' + (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'appointments':return (r.date || '') + ' ' + (r.time || '') +
                                 (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'episodes':    return (r.ten || '') + (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'labs':        return (r.ten || r.name || '') + (r.customerId ? ' · ' + kh(r.customerId) : '');
      case 'staff':       return (r.name || '') + (r.role ? ' — ' + r.role : '');
      default:            return r.name || r.ten || r.id || '';
    }
  },
  /* Hồ sơ khách nào — để lọc nhật ký theo bệnh nhân */
  cuaAi(tbl, r){
    if (!r) return '';
    return tbl === 'customers' ? r.id : (r.customerId || '');
  },

  /* ---------- Chụp và so ---------- */
  goi(r){
    const o = {};
    Object.keys(r).forEach(k => { if (k !== '_up') o[k] = r[k]; });
    return JSON.stringify(o);
  },
  chup(){
    this.bong = {};
    Object.keys(VET_BANG).forEach(t => {
      const m = this.bong[t] = {};
      (db[t] || []).forEach(r => { if (r && r.id) m[r.id] = this.goi(r); });
    });
  },
  /* Những trường vừa đổi giữa hai bản JSON — chỉ lấy tên trường, không lấy nội dung,
     để nhật ký không phình to và không nhân bản dữ liệu bệnh nhân khắp nơi. */
  khac(cuJSON, moiJSON){
    let a = {}, b = {};
    try { a = JSON.parse(cuJSON); b = JSON.parse(moiJSON); } catch(e){ return []; }
    const ten = new Set(Object.keys(a).concat(Object.keys(b)));
    const ra = [];
    ten.forEach(k => {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) ra.push(k);
    });
    return ra;
  },

  /* Gọi từ save(). Lần đầu chỉ chụp chứ không ghi, nếu không cả kho dữ liệu cũ
     sẽ bị coi là "vừa thêm mới". */
  quet(){
    if (!db) return;
    if (this.bong === null) { this.chup(); return; }
    if (this.tat) return;

    const who = this.ai(), may = this.may(), luc = new Date().toISOString();
    const them = [];

    Object.keys(VET_BANG).forEach(t => {
      const cu = this.bong[t] || (this.bong[t] = {});
      const con = {};
      (db[t] || []).forEach(r => {
        if (!r || !r.id) return;
        con[r.id] = 1;
        const j = this.goi(r);
        if (cu[r.id] === undefined) {
          them.push(this.dong(who, may, luc, 'them', t, r.id, this.nhan(t, r), null, null, this.cuaAi(t, r)));
        } else if (cu[r.id] !== j) {
          const tr = this.khac(cu[r.id], j);
          /* Đổi mỗi dấu thời gian nội bộ thì không đáng ghi */
          if (tr.length) them.push(this.dong(who, may, luc, 'sua', t, r.id, this.nhan(t, r), tr, null, this.cuaAi(t, r)));
        }
        cu[r.id] = j;
      });
      Object.keys(cu).forEach(id => {
        if (con[id]) return;
        let banCu = null;
        try { banCu = JSON.parse(cu[id]); } catch(e){}
        them.push(this.dong(who, may, luc, 'xoa', t, id, this.nhan(t, banCu), null, banCu, this.cuaAi(t, banCu)));
        delete cu[id];
      });
    });

    if (them.length) this.nap(them);
  },

  dong(who, may, luc, act, tbl, rid, nhan, truong, banSao, khach){
    return {
      id: (typeof uid === 'function' ? uid() : String(Math.random()).slice(2)) + Date.now().toString(36),
      at: luc, email: who.email, ten: who.ten, vai: who.vai,
      act, tbl: tbl || '', rid: rid || '', nhan: nhan || '',
      truong: truong || null, banSao: banSao || null,
      khach: khach || '', may,
    };
  },
  nap(ds){
    db.vet = db.vet || [];
    ds.forEach(x => db.vet.push(x));
    /* Cắt bớt: chỉ bỏ những dòng ĐÃ đẩy lên đám mây, để không mất vết khi mất mạng */
    if (db.vet.length > VET_MAX + 500) {
      const giu = [], thua = db.vet.length - VET_MAX;
      let bo = 0;
      db.vet.forEach(x => {
        if (bo < thua && x.day) { bo++; return; }
        giu.push(x);
      });
      db.vet = giu;
    }
  },

  /* ---------- Ghi một việc không phải sửa dữ liệu ---------- */
  /* Đăng nhập, đăng xuất, mở hồ sơ, in phiếu, xuất dữ liệu… */
  ghi(act, nhan, opt){
    if (!db) return;
    opt = opt || {};
    const who = this.ai();
    this.nap([this.dong(who, this.may(), new Date().toISOString(), act,
      opt.tbl || '', opt.rid || '', nhan || '', null, null, opt.khach || '')]);
    if (opt.luu !== false && typeof save === 'function') {
      /* Tự lưu nhưng đừng để quet() chạy đệ quy */
      this.tat++; try { save(); } finally { this.tat--; }
    }
  },

  /* Tạm ngưng ghi trong lúc kéo dữ liệu về / nhập hàng loạt, rồi chụp lại từ đầu */
  ngung(){ this.tat++; },
  chay(){ if (this.tat > 0) this.tat--; if (!this.tat) this.chup(); },

  /* ---------- Đẩy nhật ký lên đám mây ---------- */
  async day(){
    if (this.dangDay) return 0;
    if (typeof Cloud === 'undefined' || !Cloud.configured() || !Cloud.loggedIn()) return 0;
    const cho = (db.vet || []).filter(x => !x.day);
    if (!cho.length) return 0;
    this.dangDay = true;
    try {
      for (let i = 0; i < cho.length; i += 200) {
        const lo = cho.slice(i, i + 200);
        await Cloud.auth('/rest/v1/audit?on_conflict=id', {
          method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
          body: lo.map(x => ({
            id: x.id, at: x.at, email: x.email, ten: x.ten, vai: x.vai,
            act: x.act, tbl: x.tbl, rec_id: x.rid, nhan: x.nhan,
            truong: x.truong, ban_sao: x.banSao, may: x.may,
          })), timeout: 30000,
        });
        lo.forEach(x => x.day = 1);
      }
      return cho.length;
    } catch(e){
      return 0;       /* mất mạng thì để dành, lần sau đẩy tiếp */
    } finally { this.dangDay = false; }
  },
  /* Kéo nhật ký của các máy khác về để xem cho đủ */
  async keo(tuNgay){
    if (typeof Cloud === 'undefined' || !Cloud.loggedIn()) return 0;
    const q = tuNgay ? '&at=gte.' + tuNgay : '';
    const rows = await Cloud.auth('/rest/v1/audit?select=*' + q + '&order=at.desc&limit=2000') || [];
    db.vet = db.vet || [];
    const co = {}; db.vet.forEach(x => co[x.id] = 1);
    let them = 0;
    rows.forEach(r => {
      if (co[r.id]) return;
      db.vet.push({id: r.id, at: r.at, email: r.email, ten: r.ten, vai: r.vai,
        act: r.act, tbl: r.tbl, rid: r.rec_id, nhan: r.nhan,
        truong: r.truong, banSao: r.ban_sao, may: r.may, day: 1});
      them++;
    });
    db.vet.sort((a, b) => (a.at < b.at ? 1 : -1));
    return them;
  },

  /* ---------- Khôi phục bản ghi đã xóa ---------- */
  khoiPhuc(vid){
    if (Perm.chan('khoiphuc', 'khôi phục bản ghi đã xóa')) return;
    const v = (db.vet || []).find(x => x.id === vid);
    if (!v || v.act !== 'xoa' || !v.banSao) { App.toast('Dòng này không khôi phục được'); return; }
    if (!db[v.tbl]) db[v.tbl] = [];
    if (db[v.tbl].some(x => x.id === v.banSao.id)) { App.toast('Bản ghi này đã có lại rồi'); return; }
    if (!confirm('Khôi phục "' + (v.nhan || v.banSao.id) + '"?')) return;
    const r = Object.assign({}, v.banSao);
    r._up = Date.now();
    db[v.tbl].push(r);
    /* Lưu mà đừng để quet() ghi thành "thêm mới" — việc này là khôi phục, ghi đúng tên nó */
    this.tat++; try { save(); } finally { this.tat--; }
    this.chup();
    this.ghi('khoiphuc', v.nhan, {tbl: v.tbl, rid: r.id, khach: v.khach});
    App.render(); this.bang();
    App.toast('Đã khôi phục ✓');
  },

  /* ---------- Màn hình xem nhật ký ---------- */
  loc: {ngay: '', ai: '', act: '', tim: ''},

  ds(){
    const f = this.loc;
    let ds = (db.vet || []).slice();
    /* Nhân viên thường chỉ xem được việc mình làm; quản lý xem hết */
    if (!Perm.can('nhatkyall')) {
      const me = (Cloud.who() || '').toLowerCase();
      ds = ds.filter(x => (x.email || '').toLowerCase() === me);
    }
    if (f.ngay) ds = ds.filter(x => (x.at || '').slice(0, 10) === f.ngay);
    if (f.ai)   ds = ds.filter(x => x.email === f.ai);
    if (f.act)  ds = ds.filter(x => x.act === f.act);
    if (f.tim) {
      const k = Combo.norm(f.tim);
      ds = ds.filter(x => Combo.norm((x.nhan || '') + ' ' + (x.ten || '') + ' ' + (VET_BANG[x.tbl] || '')).includes(k));
    }
    return ds.sort((a, b) => (a.at < b.at ? 1 : -1));
  },

  gio(iso){
    const d = new Date(iso);
    if (isNaN(d)) return iso || '';
    const hai = n => String(n).padStart(2, '0');
    return hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
  },

  bang(){
    const ds = this.ds(), f = this.loc;
    const nguoi = [...new Set((db.vet || []).map(x => x.email).filter(Boolean))];
    const dong = v => {
      const co = v.act === 'xoa' && v.banSao && !((db[v.tbl] || []).some(x => x.id === v.banSao.id));
      return `<tr>
        <td style="white-space:nowrap">${h(this.gio(v.at))}</td>
        <td>${h(v.ten || '')}${v.vai ? '<br><span class="sub-line">' + h(v.vai) + '</span>' : ''}</td>
        <td><span class="pill ${v.act === 'xoa' ? 'warn' : v.act === 'them' ? 'ok' : 'info'}">${h(VET_ACT[v.act] || v.act)}</span></td>
        <td>${h(VET_BANG[v.tbl] || v.tbl || '')}</td>
        <td>${h(v.nhan || '')}${v.truong && v.truong.length
            ? '<br><span class="sub-line">đổi: ' + h(v.truong.join(', ')) + '</span>' : ''}</td>
        <td style="white-space:nowrap">${h(v.may || '')}
          ${co ? `<br><button class="btn small" onclick="Vet.khoiPhuc('${v.id}')">Khôi phục</button>` : ''}</td></tr>`;
    };
    App.modal('Nhật ký lưu vết', `
      <div class="note-block">Mọi thao tác thêm, sửa, xóa hồ sơ đều được ghi lại kèm người làm và thời điểm.
        Nhật ký <b>chỉ ghi thêm</b> — không ai xóa hay sửa được, kể cả quản lý.
        ${Perm.can('nhatkyall') ? '' : '<br>Bạn đang xem phần việc của chính mình.'}</div>
      <div class="form-grid" style="margin-top:10px">
        <div class="f"><label>Ngày</label>
          <input type="date" value="${h(f.ngay)}" onchange="Vet.datLoc('ngay',this.value)"></div>
        <div class="f"><label>Người làm</label>
          <select onchange="Vet.datLoc('ai',this.value)"><option value="">— tất cả —</option>
            ${nguoi.map(e => `<option value="${h(e)}"${f.ai === e ? ' selected' : ''}>${h(e)}</option>`).join('')}</select></div>
        <div class="f"><label>Loại việc</label>
          <select onchange="Vet.datLoc('act',this.value)"><option value="">— tất cả —</option>
            ${Object.entries(VET_ACT).map(([k, l]) =>
              `<option value="${k}"${f.act === k ? ' selected' : ''}>${h(l)}</option>`).join('')}</select></div>
        <div class="f full"><label>Tìm theo tên khách, nội dung</label>
          <input value="${h(f.tim)}" oninput="Vet.datLoc('tim',this.value)" placeholder="Gõ để lọc…"></div>
      </div>
      <div class="form-actions full" style="justify-content:flex-start;margin:6px 0 10px">
        <button class="btn small" onclick="Vet.dongBo()">Tải nhật ký các máy khác</button>
        <button class="btn small" onclick="Vet.xuatCSV()">Xuất ra file</button>
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th>Thời điểm</th><th>Người làm</th><th>Việc</th><th>Mục</th><th>Nội dung</th><th>Máy</th>
      </tr></thead><tbody>
        ${ds.slice(0, 400).map(dong).join('') ||
          '<tr><td colspan="6" class="empty">Chưa có dòng nào khớp</td></tr>'}
      </tbody></table></div>
      ${ds.length > 400 ? `<div class="sub-line" style="margin-top:8px">Hiện 400 dòng gần nhất trong ${ds.length} dòng — lọc bớt để xem phần còn lại.</div>` : ''}`);
  },
  datLoc(k, v){ this.loc[k] = v; this.bang(); },

  async dongBo(){
    App.toast('Đang tải nhật ký…');
    try {
      await this.day();
      const n = await this.keo();
      this.tat++; try { save(); } finally { this.tat--; }
      App.toast('Đã tải thêm ' + n + ' dòng');
      this.bang();
    } catch(e){ App.toast('Không tải được: ' + e.message); }
  },

  xuatCSV(){
    const ds = this.ds();
    const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const csv = ['Thời điểm,Người làm,Email,Vai trò,Việc,Mục,Nội dung,Trường đổi,Máy']
      .concat(ds.map(v => [this.gio(v.at), v.ten, v.email, v.vai, VET_ACT[v.act] || v.act,
        VET_BANG[v.tbl] || v.tbl, v.nhan, (v.truong || []).join(' '), v.may].map(esc).join(',')))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'}));
    a.download = 'nhat-ky-luu-vet-' + todayISO() + '.csv';
    a.click();
    this.ghi('xuat', 'Xuất nhật ký lưu vết ra file (' + ds.length + ' dòng)');
  },
};
