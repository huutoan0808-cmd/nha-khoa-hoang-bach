/* Nhập danh sách khách hàng từ Google Sheet / file CSV.
   Tự quy đổi địa chỉ từ địa giới cũ (Kiên Giang) sang địa giới mới 01/07/2025 (An Giang). */
'use strict';

const Importer = {
  /* ---------- Quy đổi địa giới cũ → mới ---------- */
  /* Nguồn: NQ sắp xếp ĐVHC tỉnh Kiên Giang 2025 */
  WARD_MAP: (() => {
    const m = {};
    const to = (newWard, olds) => olds.forEach(o => {
      m['phường ' + o.toLowerCase()] = newWard;
      m['xã ' + o.toLowerCase()] = newWard;
      m['thị trấn ' + o.toLowerCase()] = newWard;
    });
    /* TP Rạch Giá (cũ) tách thành 2 phường mới */
    to('Phường Rạch Giá', ['Vĩnh Quang','Vĩnh Thanh','Vĩnh Thanh Vân','Vĩnh Lạc','An Hòa','An Hoà',
                           'Vĩnh Hiệp','An Bình','Rạch Sỏi','Vĩnh Lợi','Vĩnh Bảo']);
    to('Phường Vĩnh Thông', ['Vĩnh Thông','Phi Thông','Mỹ Lâm']);
    /* Huyện Châu Thành (cũ) */
    to('Xã Thạnh Lộc', ['Thạnh Lộc','Mong Thọ','Mong Thọ A','Mong Thọ B']);
    to('Xã Châu Thành', ['Minh Lương','Minh Hòa','Minh Hoà','Giục Tượng']);
    return m;
  })(),

  norm(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); },

  /* Trả về {ward, province, kind} — kind: sẵn-đúng | quy-đổi | khớp-tên | chưa-rõ | trống */
  convertAddr(raw){
    const a = this.norm(raw);
    if (!a) return {ward:'', province:'', kind:'trống'};
    const parts = a.split(',').map(x => this.norm(x)).filter(Boolean);
    const w = parts[0] || '';
    const AG = (typeof WARDS !== 'undefined' && WARDS['An Giang']) || [];
    if (AG.includes(w)) return {ward:w, province:'An Giang', kind:'sẵn-đúng'};
    const mapped = this.WARD_MAP[w.toLowerCase()];
    if (mapped) return {ward:mapped, province:'An Giang', kind:'quy-đổi'};
    const m = w.match(/^(?:Thị trấn|Phường|Xã)\s+(.+)$/i);
    if (m) {
      for (const pre of ['Xã ','Phường ','Đặc khu ']) {
        if (AG.includes(pre + m[1])) return {ward: pre + m[1], province:'An Giang', kind:'khớp-tên'};
      }
    }
    /* Chỉ ghi mỗi tên tỉnh, không có phường/xã */
    if (/^(tỉnh\s+)?(an giang|kiên giang)$/i.test(w)) return {ward:'', province:'An Giang', kind:'thiếu-phường'};
    /* Chưa quy đổi được tên phường/xã — giữ nguyên tên cũ để không mất dữ liệu.
       Riêng tỉnh thì chắc chắn: Kiên Giang cũ nay thuộc An Giang. */
    const oldProv = (parts[parts.length-1] || '');
    const prov = /kiên giang|an giang/i.test(oldProv) ? 'An Giang' : '';
    return {ward:w, province:prov, kind:'chưa-rõ'};
  },

  /* ---------- Đọc CSV ---------- */
  parseCSV(text){
    const rows = []; let row = [], cell = '', q = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const head = rows[0].map(x => this.norm(x));
    return rows.slice(1).filter(r => r.some(x => this.norm(x))).map(r => {
      const o = {}; head.forEach((hh, i) => o[hh] = this.norm(r[i] || '')); return o;
    });
  },

  /* d/m/yyyy hoặc dd/mm/yyyy → yyyy-mm-dd */
  toISO(s){
    const m = this.norm(s).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!m) return '';
    const d = +m[1], mo = +m[2], y = +m[3];
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
    return y + '-' + String(mo).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  },

  /* Đổi link Google Sheet sang link tải CSV */
  csvUrl(u){
    const m = String(u).match(/spreadsheets\/d\/([-\w]{20,})/);
    return m ? 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv' : String(u).trim();
  },

  /* ---------- Chuyển một dòng thành hồ sơ khách ---------- */
  COLS: {
    code:['Mã KH','Ma KH','Mã khách hàng'], name:['Họ và tên','Ho va ten','Họ tên','Tên khách hàng'],
    dob:['Ngày tháng năm sinh','Ngày sinh','Năm sinh'], street:['Số nhà, đường','Số nhà','Địa chỉ'],
    addr:['Phường/Xã, Quận/Huyện, Tỉnh/TP','Phường/Xã','Địa chỉ hành chính'],
    phone:['Số điện thoại','Điện thoại','SĐT'], visit:['Ngày khám','Ngày đến khám'],
    job:['Nghề nghiệp'], gender:['Giới tính'], source:['Người giới thiệu','Nguồn'],
    note:['Ghi chú'], photo:['Hình ảnh','Ảnh'],
  },
  pick(row, keys){ for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]; return ''; },

  toCustomer(row, seq){
    const g = k => this.pick(row, this.COLS[k]);
    const name = g('name'); if (!name) return null;
    const addr = this.convertAddr(g('addr'));
    const code = g('code');
    const c = {
      id: uid(),
      code: code ? 'KH-' + String(code).padStart(4,'0') : 'KH-' + (seq),
      name: name.toUpperCase(),
      dob: this.toISO(g('dob')),
      gender: /nữ|nu/i.test(g('gender')) ? 'Nữ' : (/nam/i.test(g('gender')) ? 'Nam' : ''),
      phone: g('phone'), job: g('job'),
      ethnic: 'Kinh', nation: 'Việt Nam',
      street: g('street'), ward: addr.ward, province: addr.province,
      doiTuong: 'Thu phí', bhyt: '', cccd: '', kinName: '', kinPhone: '',
      allergy: '', source: g('source'),
      createdAt: this.toISO(g('visit')) || todayISO(),
      teeth: {}, photos: [], record: {dienBien: []},
      _addrKind: addr.kind,
    };
    const note = g('note'); if (note) c.record.lyDo = note;
    return c;
  },

  /* ---------- Giao diện ---------- */
  form(){
    App.modal('Nhập khách hàng từ Google Sheet / CSV', `
    <form class="form-grid" onsubmit="Importer.run(event)">
      <div class="f full"><label>Link Google Sheet (đặt ở chế độ ai có link đều xem)</label>
        <input name="url" placeholder="https://docs.google.com/spreadsheets/d/..." ></div>
      <div class="f full"><label>Hoặc dán thẳng nội dung CSV</label>
        <textarea name="csv" placeholder="Mã KH,Họ và tên,..." style="min-height:80px"></textarea></div>
      <div class="f full"><label>Cách xử lý</label>
        <select name="mode">
          <option value="append">Thêm vào danh sách hiện có</option>
          <option value="replace">Thay thế toàn bộ danh sách khách hàng</option>
        </select></div>
      <div class="note-block full">Phần mềm tự quy đổi địa chỉ từ địa giới cũ (Kiên Giang, TP Rạch Giá…)
        sang địa giới mới 01/07/2025. Địa chỉ nào chưa quy đổi được sẽ <b>giữ nguyên văn bản gốc</b>
        và liệt kê ra để bạn sửa sau — không tự đoán bừa.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Đọc dữ liệu</button></div>
    </form>`);
  },
  async run(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    let text = (d.csv || '').trim();
    if (!text && d.url) {
      App.toast('Đang tải dữ liệu…');
      try {
        const r = await fetch(this.csvUrl(d.url));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        text = await r.text();
      } catch(e){ App.toast('Không tải được: ' + e.message + ' — thử dán thẳng nội dung CSV'); return; }
    }
    if (!text) { App.toast('Chưa có dữ liệu'); return; }
    const rows = this.parseCSV(text);
    if (!rows.length) { App.toast('Không đọc được dòng nào'); return; }

    let seq = db.seq.cust || 1300;
    const made = [], kinds = {};
    rows.forEach(r => {
      const c = this.toCustomer(r, ++seq);
      if (c) { kinds[c._addrKind] = (kinds[c._addrKind]||0)+1; made.push(c); }
    });
    if (!made.length) { App.toast('Không có dòng nào hợp lệ (thiếu cột Họ và tên?)'); return; }

    const review = made.filter(c => c._addrKind === 'chưa-rõ');
    const list = {};
    review.forEach(c => list[c.ward] = (list[c.ward]||0)+1);
    App.modal('Xem trước — ' + made.length + ' khách hàng', `
      <div class="card mb"><div class="card-b">
        <div class="alert-line"><span class="alert-ico info">✓</span><div>Đọc được <b>${made.length}</b> hồ sơ từ ${rows.length} dòng</div></div>
        ${Object.entries(kinds).map(([k,v]) => `<div class="alert-line"><span class="alert-ico ${k==='chưa-rõ'?'warn':'info'}">${k==='chưa-rõ'?'!':'✓'}</span><div>Địa chỉ <b>${h(k)}</b>: ${v} hồ sơ</div></div>`).join('')}
      </div></div>
      ${review.length ? `<div class="card mb"><div class="card-h"><h2>Địa chỉ cần bạn xem lại (${review.length})</h2>
        <span class="hint">giữ nguyên tên cũ, sửa sau trong hồ sơ</span></div>
        <div class="card-b" style="max-height:180px;overflow:auto">
          ${Object.entries(list).sort((a,b)=>b[1]-a[1]).map(([w,n])=>`<div class="alert-line"><span class="alert-ico warn">!</span><div>${h(w)} — <b>${n}</b> hồ sơ</div></div>`).join('')}
        </div></div>` : ''}
      <div class="note-block">Cách xử lý: <b>${d.mode==='replace'?'thay thế toàn bộ danh sách hiện có':'thêm vào danh sách hiện có'}</b>.</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button type="button" class="btn primary" onclick="Importer.commit('${d.mode}')">Nhập ${made.length} hồ sơ vào phần mềm</button></div>`);
    this._pending = made;
  },
  commit(mode){
    const made = this._pending || [];
    if (!made.length) { App.toast('Không có dữ liệu'); return; }
    if (mode === 'replace' && !confirm('Thay thế toàn bộ ' + db.customers.length + ' hồ sơ hiện có bằng ' + made.length + ' hồ sơ mới? Dữ liệu điều trị, phiếu thu của khách cũ sẽ không còn khớp.')) return;
    made.forEach(c => delete c._addrKind);
    if (mode === 'replace') db.customers = made;
    else {
      const have = new Set(db.customers.map(c => c.code));
      made.forEach(c => { if (!have.has(c.code)) db.customers.push(c); });
    }
    db.seq.cust = Math.max(db.seq.cust || 1300, 1300 + db.customers.length);
    this._pending = null;
    save(); App.closeModal(); App.state.custSel = db.customers[0] && db.customers[0].id;
    App.go('customers');
    App.toast('Đã nhập xong — tổng ' + db.customers.length + ' hồ sơ ✓');
  },
};
