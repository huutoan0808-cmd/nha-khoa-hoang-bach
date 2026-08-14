/* Đồng bộ dữ liệu giữa các máy qua Supabase.
   Nguyên tắc: mỗi bản ghi mang dấu thời gian sửa (_up); hai máy cùng sửa thì bản sửa sau thắng.
   Mất mạng vẫn dùng bình thường, có mạng lại thì đẩy lên. */
'use strict';

const SYNC_TABLES = ['services','staff','customers','treatments','receipts','rx','inventory','appointments','labs','bonuses'];

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

  /* ---------- Chạy đồng bộ ---------- */
  async run(quiet){
    if (!Cloud.configured() || !Cloud.loggedIn() || this.busy) return null;
    this.busy = true;
    try {
      this.stamp();
      await this.push();
      const r = await this.pull();
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
