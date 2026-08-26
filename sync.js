/* Đồng bộ dữ liệu giữa các máy qua Supabase.
   Nguyên tắc: mỗi bản ghi mang dấu thời gian sửa (_up); hai máy cùng sửa thì bản sửa sau thắng.
   Mất mạng vẫn dùng bình thường, có mạng lại thì đẩy lên. */
'use strict';

const SYNC_TABLES = ['services','staff','customers','treatments','receipts','rx','inventory','appointments','labs','bonuses','invLog','episodes'];

const Sync = {
  shadow: {},        /* tbl -> {id: nội dung đã lưu lần trước} */
  tombs: [],         /* bản ghi đã xóa, chờ báo cho các máy khác */
  busy: false,
  lastAt: 0,

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
  async push(){
    const rows = [];
    SYNC_TABLES.forEach(t => (db[t] || []).forEach(r => {
      if (r && r.id) rows.push({id: t + ':' + r.id, tbl: t, data: r, deleted: false,
        updated_at: new Date(r._up || Date.now()).toISOString()});
    }));
    this.tombs.forEach(x => rows.push({id: x.tbl + ':' + x.id, tbl: x.tbl, data: {id:x.id}, deleted: true,
      updated_at: new Date(x.at).toISOString()}));
    /* gửi theo lô để không quá nặng một lần */
    for (let i = 0; i < rows.length; i += 200) {
      await Cloud.auth('/rest/v1/records?on_conflict=id', {
        method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
        body: rows.slice(i, i + 200), timeout: 30000,
      });
    }
    this.tombs = [];
    return rows.length;
  },
  async pull(){
    const rows = await Cloud.auth('/rest/v1/records?select=*', {timeout: 30000}) || [];
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
        if (at === undefined) { local.push(rec); added++; }
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

  /* ---------- Chạy đồng bộ ---------- */
  async run(quiet){
    if (!Cloud.configured() || !Cloud.loggedIn() || this.busy) return null;
    this.busy = true;
    try {
      this.stamp();
      /* KÉO VỀ TRƯỚC rồi mới đẩy lên. Nếu đẩy trước, máy nào còn dữ liệu cũ sẽ ghi đè
         lên dấu xóa trên đám mây, làm sống lại bản ghi đã xóa và sinh ra trùng lặp. */
      const r = await this.pull();
      await this.push();
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
  status(){
    if (!Cloud.configured()) return {k:'mutedp', t:'Chưa kết nối — dữ liệu chỉ ở máy này'};
    if (!Cloud.loggedIn()) return {k:'warn', t:'Đã kết nối, chưa đăng nhập'};
    if (!this.lastAt) return {k:'info', t:'Đã đăng nhập — chưa đồng bộ lần nào'};
    const m = Math.round((Date.now() - this.lastAt) / 60000);
    return {k:'ok', t: m < 1 ? 'Vừa đồng bộ xong' : 'Đồng bộ ' + m + ' phút trước'};
  },
};
