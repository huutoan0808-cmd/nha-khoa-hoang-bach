/* Đồng bộ dữ liệu giữa các máy qua Supabase.
   Nguyên tắc: mỗi bản ghi mang dấu thời gian sửa (_up); hai máy cùng sửa thì bản sửa sau thắng.
   Mất mạng vẫn dùng bình thường, có mạng lại thì đẩy lên. */
'use strict';

const SYNC_TABLES = ['services','staff','customers','treatments','receipts','rx','inventory','appointments','labs','bonuses','invLog','episodes','quyTrinh','giaLab'];

/* Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.1.k: "Dữ liệu hồ sơ bệnh án
   điện tử của người bệnh được lưu trữ độc lập không phụ thuộc vào các hệ thống khác
   tại cơ sở khám bệnh, chữa bệnh."

   Trước đây mọi thứ nằm chung một bảng records — bệnh án lẫn với kho vật tư, chấm
   công, thưởng phạt. Nay tách làm hai kho: bảng emr chỉ chứa hồ sơ bệnh án, bảng
   records giữ phần vận hành. Nhờ vậy sao lưu, phân quyền và bàn giao dữ liệu bệnh
   án làm riêng được, không kéo theo phần còn lại.

   BẢNG TRÊN SUPABASE — chạy một lần trong SQL Editor:

     create table if not exists emr (
       id text primary key, tbl text, data jsonb,
       deleted boolean default false, updated_at timestamptz
     );
     alter table emr enable row level security;
     create policy "doc"  on emr for select to authenticated using (true);
     create policy "them" on emr for insert to authenticated with check (true);
     create policy "sua"  on emr for update to authenticated using (true);

   Chưa chạy thì phần mềm vẫn chạy bình thường, tự quay về dùng bảng records như cũ
   và báo một lần — không để phòng khám đứng hình vì chưa kịp tạo bảng. */
const EMR_TABLES = ['customers','episodes','treatments','rx','labs','appointments','receipts'];
const khoCua = t => (EMR_TABLES.includes(t) ? 'emr' : 'records');

const Sync = {
  shadow: {},        /* tbl -> {id: nội dung đã lưu lần trước} */
  tombs: [],         /* bản ghi đã xóa, chờ báo cho các máy khác */
  busy: false,
  lastAt: 0,
  emrSan: null,      /* null = chưa biết, true = có bảng emr, false = chưa tạo */
  daBaoEmr: false,

  /* ---------- Đánh dấu bản ghi vừa đổi ---------- */
  snapshot(){
    this.shadow = {};
    SYNC_TABLES.forEach(t => {
      const m = this.shadow[t] = {};
      (db[t] || []).forEach(r => { if (r && r.id) m[r.id] = this.plain(r); });
    });
  },
  plain(r){ const o = {}; Object.keys(r).forEach(k => { if (k !== '_up') o[k] = r[k]; }); return JSON.stringify(o); },
  stamp(){
    const now = Date.now();
    SYNC_TABLES.forEach(t => {
      const arr = db[t] || [], m = this.shadow[t] || (this.shadow[t] = {});
      const alive = {};
      arr.forEach(r => {
        if (!r || !r.id) return;
        alive[r.id] = 1;
        const j = this.plain(r);
        if (m[r.id] !== j) { r._up = now; m[r.id] = j; }
      });
      Object.keys(m).forEach(id => {
        if (!alive[id]) { delete m[id]; this.tombs.push({tbl:t, id, at:now}); }
      });
    });
  },

  /* ---------- Đẩy lên / kéo về ---------- */
  /* Bảng chưa tồn tại thì PostgREST báo theo mấy kiểu khác nhau — gom lại một chỗ */
  thieuBang(e){ return /does not exist|schema cache|Could not find the table|404/i.test(e && e.message || ''); },
  kho(t){ return this.emrSan === false ? 'records' : khoCua(t); },

  async guiLo(kho, rows){
    for (let i = 0; i < rows.length; i += 200) {
      await Cloud.auth('/rest/v1/' + kho + '?on_conflict=id', {
        method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
        body: rows.slice(i, i + 200), timeout: 30000,
      });
    }
  },
  async push(){
    const theo = {records: [], emr: []};
    SYNC_TABLES.forEach(t => (db[t] || []).forEach(r => {
      if (r && r.id) theo[this.kho(t)].push({id: t + ':' + r.id, tbl: t, data: r, deleted: false,
        updated_at: new Date(r._up || Date.now()).toISOString()});
    }));
    this.tombs.forEach(x => theo[this.kho(x.tbl)].push({id: x.tbl + ':' + x.id, tbl: x.tbl,
      data: {id: x.id}, deleted: true, updated_at: new Date(x.at).toISOString()}));

    let dem = theo.records.length + theo.emr.length;
    await this.guiLo('records', theo.records);
    if (theo.emr.length) {
      try {
        await this.guiLo('emr', theo.emr);
        this.emrSan = true;
      } catch(e){
        if (!this.thieuBang(e)) throw e;
        /* Chưa tạo bảng emr — quay về bảng cũ, đừng để phòng khám mất đồng bộ */
        this.emrSan = false;
        if (!this.daBaoEmr) {
          this.daBaoEmr = true;
          App.toast('Chưa tạo bảng emr trên Supabase — tạm dùng kho chung như cũ');
        }
        await this.guiLo('records', theo.emr);
      }
    }
    this.tombs = [];
    return dem;
  },
  async pull(){
    let rows = await Cloud.auth('/rest/v1/records?select=*', {timeout: 30000}) || [];
    /* Đọc cả hai kho rồi trộn. Bản ghi bệnh án cũ còn sót trong records sẽ thua bản
       trong emr vì dấu thời gian cũ hơn — thứ tự trộn không ảnh hưởng kết quả. */
    if (this.emrSan !== false) {
      try {
        const e = await Cloud.auth('/rest/v1/emr?select=*', {timeout: 30000}) || [];
        rows = rows.concat(e);
        this.emrSan = true;
      } catch(err){
        if (!this.thieuBang(err)) throw err;
        this.emrSan = false;
      }
    }
    let added = 0, updated = 0, removed = 0;
    const byTbl = {};
    rows.forEach(r => (byTbl[r.tbl] || (byTbl[r.tbl] = [])).push(r));
    SYNC_TABLES.forEach(t => {
      const remote = byTbl[t] || [];
      if (!db[t]) db[t] = [];
      const local = db[t], idx = {};
      local.forEach((r, i) => { if (r && r.id) idx[r.id] = i; });
      remote.forEach(rr => {
        const rid = String(rr.id).slice(t.length + 1);
        const rup = Date.parse(rr.updated_at) || 0;
        const at = idx[rid];
        if (rr.deleted) {
          if (at !== undefined && (local[at]._up || 0) <= rup) { local.splice(at, 1); removed++;
            local.forEach((r, i) => { if (r && r.id) idx[r.id] = i; }); }
          return;
        }
        const rec = Object.assign({}, rr.data, {_up: rup});
        /* Phải cập nhật idx ngay khi thêm. Trước đây idx dựng một lần trước vòng lặp,
           nên cùng một bản ghi xuất hiện hai lần trong danh sách kéo về là bị thêm
           thành hai hồ sơ trùng. Một kho thì không xảy ra, đọc hai kho là lộ ra. */
        if (at === undefined) { local.push(rec); idx[rid] = local.length - 1; added++; }
        else if ((local[at]._up || 0) < rup) { local[at] = rec; updated++; }
      });
    });
    return {added, updated, removed};
  },

  /* ---------- Cài đặt phòng khám & bộ đếm số phiếu ----------
     Bộ đếm phải lấy giá trị LỚN NHẤT giữa các máy, không phải "bản mới thắng",
     nếu không hai máy cùng lập phiếu sẽ ra trùng số. */
  clinicSeen: null,       /* bản cài đặt lúc đồng bộ lần trước, để biết máy này có sửa gì không */

  async syncMeta(){
    const s = await Cloud.pullSettings();
    /* Cài đặt phòng khám: chỉ ghi đè khi máy này KHÔNG sửa gì kể từ lần đồng bộ trước,
       tránh đè mất thay đổi của máy khác. */
    const mine = JSON.stringify(db.clinic || {});
    const changedHere = this.clinicSeen !== null && this.clinicSeen !== mine;
    if (changedHere || !s.clinic) {
      await Cloud.pushSetting('clinic', mine);
    } else if (s.clinic && s.clinic !== mine) {
      try { db.clinic = Object.assign({}, db.clinic, JSON.parse(s.clinic)); } catch(e){}
    }
    this.clinicSeen = JSON.stringify(db.clinic || {});

    /* Bộ đếm mã KH / số phiếu thu: luôn lấy giá trị LỚN NHẤT giữa các máy
       để hai máy không bao giờ cấp trùng số. */
    db.seq = db.seq || {};
    if (s.seq) {
      try {
        const remote = JSON.parse(s.seq);
        Object.keys(remote).forEach(k => { db.seq[k] = Math.max(+db.seq[k] || 0, +remote[k] || 0); });
      } catch(e){}
    }
    await Cloud.pushSetting('seq', JSON.stringify(db.seq));
  },

  /* ---------- Dọn bản ghi trùng lặp ----------
     Dùng khi dữ liệu đã bị nhân đôi do lỗi đồng bộ trước đây. Giữ bản mới nhất,
     chuyển hết điều trị / phiếu thu / lịch hẹn của bản cũ sang bản được giữ. */
  findDupCustomers(){
    const byCode = {};
    (db.customers || []).forEach(c => { if (c.code) (byCode[c.code] || (byCode[c.code] = [])).push(c); });
    return Object.entries(byCode).filter(([, arr]) => arr.length > 1);
  },
  dedupeReport(){
    const dupC = this.findDupCustomers();
    const thua = dupC.reduce((s, [, arr]) => s + arr.length - 1, 0);
    const noC = {}; (db.receipts || []).forEach(r => { if (r.no) noC[r.no] = (noC[r.no] || 0) + 1; });
    const dupR = Object.values(noC).filter(v => v > 1).reduce((s, v) => s + v - 1, 0);
    return {maTrung: dupC.length, hoSoThua: thua, phieuThuThua: dupR};
  },
  dedupe(){
    let goneC = 0, moved = 0;
    this.findDupCustomers().forEach(([, arr]) => {
      /* giữ bản có nhiều dữ liệu điều trị nhất, hòa thì giữ bản sửa gần đây nhất */
      arr.sort((a, b) => (((b.record && b.record.dienBien) || []).length - ((a.record && a.record.dienBien) || []).length)
                      || ((b._up || 0) - (a._up || 0)));
      const keep = arr[0];
      arr.slice(1).forEach(old => {
        ['treatments','receipts','appointments','labs','rx'].forEach(t => {
          (db[t] || []).forEach(x => { if (x.customerId === old.id) { x.customerId = keep.id; moved++; } });
        });
        db.customers = db.customers.filter(c => c.id !== old.id);
        goneC++;
      });
    });
    /* phiếu thu trùng hệt nhau (cùng ngày, cùng khách, cùng số tiền, cùng nội dung) */
    const seen = {}, dropR = [];
    (db.receipts || []).forEach(r => {
      const k = [r.customerId, r.date, r.amount, r.desc].join('|');
      if (seen[k]) dropR.push(r.id); else seen[k] = 1;
    });
    db.receipts = (db.receipts || []).filter(r => !dropR.includes(r.id));
    return {hoSoDaGop: goneC, banGhiChuyenSang: moved, phieuThuDaBo: dropR.length};
  },

  /* Hai máy cùng lập phiếu lúc mất mạng có thể ra trùng số phiếu thu.
     Sau khi gộp dữ liệu, phát hiện trùng thì giữ phiếu lập trước, đánh lại số phiếu lập sau. */
  fixDupReceipts(){
    const seen = {}, fixed = [];
    (db.receipts || []).slice().sort((a,b) => (a._up||0) - (b._up||0)).forEach(r => {
      if (!r.no) return;
      if (seen[r.no]) {
        const old = r.no;
        r.no = 'PT-' + (++db.seq.receipt);
        r._up = Date.now();
        fixed.push(old + ' → ' + r.no);
      } else seen[r.no] = 1;
    });
    return fixed;
  },

  /* ---------- Dọn bản ghi bệnh án cũ còn sót trong kho chung ----------
     Chỉ chạy sau khi đã đẩy thành công lên bảng emr, và chỉ một lần. Đẩy hỏng thì
     tuyệt đối không xóa — thà để hai bản còn hơn mất. */
  async donKhoChung(){
    if (this.emrSan !== true) return 0;
    if ((db.clinic || {}).emrDaTach) return 0;
    try {
      await Cloud.auth('/rest/v1/records?tbl=in.(' + EMR_TABLES.join(',') + ')', {method: 'DELETE', timeout: 30000});
      db.clinic = db.clinic || {};
      db.clinic.emrDaTach = new Date().toISOString();
      if (typeof Vet !== 'undefined')
        Vet.ghi('xoa', 'Tách kho dữ liệu bệnh án: đã dọn bản ghi bệnh án còn sót trong kho chung');
      return 1;
    } catch(e){ return 0; }
  },

  /* ---------- Chạy đồng bộ ---------- */
  async run(quiet){
    if (!Cloud.configured() || !Cloud.loggedIn() || this.busy) return null;
    /* Chưa mở khóa thì trong bộ nhớ đang là dữ liệu rỗng — đẩy lên là ghi đè bảng
       giá và quy trình thật trên đám mây bằng bản mặc định. */
    if (App.choMoKhoa) return null;
    this.busy = true;
    try {
      this.stamp();
      /* KÉO VỀ TRƯỚC rồi mới đẩy lên. Nếu đẩy trước, máy nào còn dữ liệu cũ sẽ ghi đè
         lên dấu xóa trên đám mây, làm sống lại bản ghi đã xóa và sinh ra trùng lặp. */
      /* Thay đổi kéo từ máy khác về KHÔNG phải do người ngồi máy này làm — máy kia đã
         ghi vết rồi. Ngưng ghi trong lúc kéo, xong chụp lại từ đầu. */
      if (typeof Vet !== 'undefined') Vet.ngung();
      let r;
      try { r = await this.pull(); }
      finally { if (typeof Vet !== 'undefined') Vet.chay(); }
      await this.push();
      await this.donKhoChung();
      if (typeof Vet !== 'undefined') { try { await Vet.day(); } catch(e){} }
      await this.syncMeta();
      const dup = this.fixDupReceipts();
      if (dup.length) { await this.push(); App.toast('Đã đánh lại ' + dup.length + ' số phiếu thu bị trùng: ' + dup.slice(0,3).join(', ')); }
      this.snapshot();
      save(); this.lastAt = Date.now();
      if (!quiet) App.toast(`Đồng bộ xong ✓ (thêm ${r.added}, cập nhật ${r.updated}${r.removed?', xóa '+r.removed:''})`);
      App.render();
      return r;
    } catch(e){
      if (!quiet) App.toast('Đồng bộ lỗi: ' + e.message);
      return null;
    } finally { this.busy = false; }
  },
  /* Mô tả kho dữ liệu bệnh án cho màn hình Cài đặt */
  moTaKho(){
    if (this.emrSan === true)
      return 'Hồ sơ bệnh án nằm ở kho riêng <b>emr</b>, tách khỏi kho vận hành' +
        (((db.clinic || {}).emrDaTach) ? ' · đã dọn bản cũ trong kho chung' : '');
    if (this.emrSan === false)
      return 'Chưa tạo bảng <b>emr</b> trên Supabase — bệnh án đang nằm chung kho với kho vật tư, chấm công';
    return 'Chưa đồng bộ lần nào nên chưa biết — bấm Đồng bộ ngay để kiểm tra';
  },
  pillKho(){
    return this.emrSan === true ? '<span class="pill ok">Đã tách kho</span>'
         : this.emrSan === false ? '<span class="pill warn">Chưa tách kho</span>'
         : '<span class="pill mutedp">Chưa rõ</span>';
  },
  sqlKho(){
    App.modal('Tạo kho dữ liệu bệnh án riêng', `
      <div class="note-block">Mục III.1.1.k của hướng dẫn Bộ Y tế đòi dữ liệu hồ sơ bệnh án
        phải <b>lưu trữ độc lập</b>, không phụ thuộc các hệ thống khác. Mở Supabase →
        <b>SQL Editor</b> → dán đoạn dưới đây → Run. Chạy một lần duy nhất.</div>
      <div class="f full"><textarea rows="12" readonly style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px">create table if not exists emr (
  id text primary key, tbl text, data jsonb,
  deleted boolean default false, updated_at timestamptz
);
alter table emr enable row level security;
create policy "doc"  on emr for select to authenticated using (true);
create policy "them" on emr for insert to authenticated with check (true);
create policy "sua"  on emr for update to authenticated using (true);</textarea></div>
      <div class="note-block">Chạy xong bấm <b>Đồng bộ ngay</b>. Phần mềm sẽ chuyển hồ sơ bệnh án
        sang kho mới, rồi mới dọn bản cũ trong kho chung — đẩy chưa xong thì không xóa gì cả.</div>
      <div class="form-actions full">
        <button class="btn" onclick="App.closeModal()">Đóng</button>
        <button class="btn primary" onclick="App.closeModal();App.syncNow()">Đồng bộ ngay</button></div>`);
  },

  status(){
    if (!Cloud.configured()) return {k:'mutedp', t:'Chưa kết nối — dữ liệu chỉ ở máy này'};
    if (!Cloud.loggedIn()) return {k:'warn', t:'Đã kết nối, chưa đăng nhập'};
    if (!this.lastAt) return {k:'info', t:'Đã đăng nhập — chưa đồng bộ lần nào'};
    const m = Math.round((Date.now() - this.lastAt) / 60000);
    return {k:'ok', t: m < 1 ? 'Vừa đồng bộ xong' : 'Đồng bộ ' + m + ' phút trước'};
  },
};
