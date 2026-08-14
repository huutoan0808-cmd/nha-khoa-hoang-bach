/* Kết nối cơ sở dữ liệu chung (Supabase) qua REST — không cần thư viện ngoài.
   Chưa cấu hình thì app vẫn chạy bình thường, dữ liệu lưu trên máy như cũ. */
'use strict';
const Cloud = {
  CFG_KEY: 'nkhb_cloud',
  cfg: null,          /* {url, key} */
  session: null,      /* {access_token, refresh_token, expires_at, email} */

  /* ---------- Cấu hình & phiên đăng nhập ---------- */
  load(){
    try { this.cfg = JSON.parse(localStorage.getItem(this.CFG_KEY) || 'null'); } catch(e){ this.cfg = null; }
    try { this.session = JSON.parse(localStorage.getItem(this.CFG_KEY + '_ss') || 'null'); } catch(e){ this.session = null; }
  },
  saveCfg(url, key){
    this.cfg = {url: String(url || '').trim().replace(/\/+$/, ''), key: String(key || '').trim()};
    localStorage.setItem(this.CFG_KEY, JSON.stringify(this.cfg));
  },
  saveSession(s){
    this.session = s;
    if (s) localStorage.setItem(this.CFG_KEY + '_ss', JSON.stringify(s));
    else localStorage.removeItem(this.CFG_KEY + '_ss');
  },
  configured(){ return !!(this.cfg && this.cfg.url && this.cfg.key); },
  loggedIn(){ return !!(this.session && this.session.access_token); },
  who(){ return this.session ? this.session.email : ''; },

  /* ---------- Gọi API ---------- */
  async req(path, opts){
    if (!this.configured()) throw new Error('Chưa cấu hình kết nối đám mây');
    opts = opts || {};
    const headers = Object.assign({
      'apikey': this.cfg.key,
      'Content-Type': 'application/json',
    }, opts.headers || {});
    if (this.session && this.session.access_token && !headers.Authorization)
      headers.Authorization = 'Bearer ' + this.session.access_token;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), opts.timeout || 15000);
    try {
      const r = await fetch(this.cfg.url + path, {
        method: opts.method || 'GET', headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      });
      const txt = await r.text();
      let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch(e){ data = txt; }
      if (!r.ok) {
        const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('Lỗi ' + r.status);
        throw new Error(msg);
      }
      return data;
    } finally { clearTimeout(to); }
  },

  /* ---------- Đăng nhập ---------- */
  async login(email, password){
    const d = await this.req('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: {Authorization: 'Bearer ' + this.cfg.key},
      body: {email: String(email).trim(), password},
    });
    this.saveSession({
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      email: (d.user && d.user.email) || email,
    });
    return this.session;
  },
  async refresh(){
    if (!this.session || !this.session.refresh_token) return false;
    try {
      const d = await this.req('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: {Authorization: 'Bearer ' + this.cfg.key},
        body: {refresh_token: this.session.refresh_token},
      });
      this.saveSession({
        access_token: d.access_token, refresh_token: d.refresh_token,
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        email: (d.user && d.user.email) || this.session.email,
      });
      return true;
    } catch(e){ this.saveSession(null); return false; }
  },
  /* Gọi API có tự gia hạn phiên khi hết hạn */
  async auth(path, opts){
    if (this.session && this.session.expires_at && Date.now() > this.session.expires_at - 60000) await this.refresh();
    try { return await this.req(path, opts); }
    catch(e){
      if (/JWT|token|401|expired/i.test(e.message) && await this.refresh()) return await this.req(path, opts);
      throw e;
    }
  },
  logout(){ this.saveSession(null); },

  /* ---------- Nhân viên ---------- */
  async pushStaff(list){
    if (!list.length) return;
    await this.auth('/rest/v1/staff?on_conflict=id', {
      method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
      body: list.map(s => ({id: s.id, name: s.name, role: s.role, active: true})),
    });
  },
  async pullStaff(){ return await this.auth('/rest/v1/staff?select=*') || []; },

  /* ---------- Chấm công ---------- */
  async pushAtt(rows){
    if (!rows.length) return;
    await this.auth('/rest/v1/attendance?on_conflict=staff_id,date', {
      method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
      body: rows.map(r => ({
        staff_id: r.staffId, date: r.date, in_at: r.inAt || null, out_at: r.outAt || null,
        net: r.net || 'unknown', ip: r.ip || null, via_qr: !!r.viaQR, note: r.note || null,
        updated_at: new Date().toISOString(),
      })),
    });
  },
  async pullAtt(fromDate){
    const q = fromDate ? '&date=gte.' + fromDate : '';
    const rows = await this.auth('/rest/v1/attendance?select=*' + q + '&order=date.desc') || [];
    return rows.map(r => ({
      id: r.id, staffId: r.staff_id, date: r.date, inAt: r.in_at || '', outAt: r.out_at || '',
      net: r.net || 'unknown', ip: r.ip || '', viaQR: !!r.via_qr, note: r.note || '',
    }));
  },

  /* ---------- Cài đặt chung ---------- */
  async pushSetting(key, value){
    await this.auth('/rest/v1/settings?on_conflict=key', {
      method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
      body: [{key, value: String(value == null ? '' : value), updated_at: new Date().toISOString()}],
    });
  },
  async pullSettings(){
    const rows = await this.auth('/rest/v1/settings?select=*') || [];
    const o = {}; rows.forEach(r => o[r.key] = r.value); return o;
  },

  /* ---------- Kiểm tra kết nối ---------- */
  async test(){
    const r = await this.req('/rest/v1/', {headers: {Authorization: 'Bearer ' + this.cfg.key}});
    return true;
  },
};
Cloud.load();
