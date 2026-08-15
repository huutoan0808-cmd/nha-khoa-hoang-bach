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
      oldAddr: '',                       /* điền bên dưới nếu địa chỉ đã đổi so với sổ cũ */
      doiTuong: 'Thu phí', bhyt: '', cccd: '', kinName: '', kinPhone: '',
      allergy: '', source: g('source'),
      createdAt: this.toISO(g('visit')) || todayISO(),
      teeth: {}, photos: [], record: {dienBien: []},
      _addrKind: addr.kind,
    };
    /* Chỉ ghi địa chỉ cũ khi tên phường/xã thật sự bị đổi do sáp nhập.
       Hồ sơ vốn đã ghi đúng địa giới mới thì không cần chú thích gì. */
    if (addr.kind === 'quy-đổi' || addr.kind === 'khớp-tên') c.oldAddr = this.norm(g('addr'));
    const note = g('note'); if (note) c.record.lyDo = note;
    return c;
  },

  /* ================= NHẬP LỊCH SỬ ĐIỀU TRỊ / LỊCH HẸN / VẬT LIỆU ================= */

  /* Loại điều trị bên AppSheet → nhóm dịch vụ trong phần mềm */
  GROUP_MAP: {
    'trám răng':'Trám răng', 'cạo vôi răng':'Nha chu', 'nội nha':'Điều trị tủy',
    'nhổ răng':'Nhổ răng', 'răng sứ':'Phục hình sứ', 'răng tháo lắp':'Phục hình tháo lắp',
    'chỉnh nha':'Chỉnh nha', 'implant':'Implant', 'nước súc miệng':'Khác', 'loại khác':'Khác',
  },
  mapGroup(v){
    const s = this.norm(v).toLowerCase();
    if (!s) return 'Khác';
    for (const part of s.split(/\s*,\s*/)) if (this.GROUP_MAP[part]) return this.GROUP_MAP[part];
    return 'Khác';
  },
  money(v){ const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; },
  /* Mã KH bên AppSheet ("1", "1.0", 1) → mã trong phần mềm */
  custCode(v){
    const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? '' : 'KH-' + String(n).padStart(4, '0');
  },
  /* Ngày AppSheet: 24/06/2022 hoặc 2022-06-24 hoặc 2022-06-24 00:00:00 */
  anyDate(v){
    const s = this.norm(v); if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return this.toISO(s.split(' ')[0]);
  },
  hhmm(v){ const m = this.norm(v).match(/^(\d{1,2}):(\d{2})/); return m ? String(m[1]).padStart(2,'0') + ':' + m[2] : ''; },

  /* Tìm/tạo nhân viên theo tên có sẵn trong dữ liệu cũ */
  staffByName(name, role, created){
    /* Sổ cũ có ô ghi nhiều người: "Bs. Toàn , Bs. Mến" — tạo từng người, lấy người đầu làm chính */
    const parts = String(name == null ? '' : name).split(/\s*,\s*/).map(x => this.norm(x)).filter(Boolean);
    if (parts.length > 1) {
      const ids = parts.map(p => this.staffByName(p, role, created));
      return ids[0];
    }
    const n = this.norm(name); if (!n) return '';
    let st = db.staff.find(s => Combo.norm(s.name) === Combo.norm(n));
    if (!st) {
      st = {id: uid(), name: n, role: role || 'Bác sĩ điều trị', email: '', base: 0, kpiTarget: 0,
            model: {type: role === 'Phụ tá' ? 'perCase' : 'svcGroup', rates: {}, def: 10, rate: 2}};
      db.staff.push(st); if (created) created.push(n);
    }
    return st.id;
  },

  /* ---------- Điều trị (bảng CONG VIEC) ---------- */
  buildTreatments(rows){
    const byCode = {}; db.customers.forEach(c => byCode[c.code] = c);
    const treatments = [], receipts = [], created = [], visits = {};
    const missing = new Set(); let noDate = 0, noDateAmount = 0;
    const lastLeft = {};                       /* công nợ dòng cuối của từng khách */
    const g = (r, k) => this.norm(r[k] !== undefined ? r[k] : r[k + ' ']);

    const sorted = rows.slice().sort((a, b) =>
      (this.anyDate(g(a,'Ngày điều trị')) || '').localeCompare(this.anyDate(g(b,'Ngày điều trị')) || ''));

    sorted.forEach(r => {
      const code = this.custCode(g(r,'Mã KH'));
      const c = byCode[code];
      if (!c) { if (code) missing.add(code); return; }
      const date = this.anyDate(g(r,'Ngày điều trị'));
      if (!date) { noDate++; noDateAmount += this.money(g(r,'Thanh toán')); return; }
      const work = g(r,'Công việc') || g(r,'Công việc ') || 'Điều trị';
      const paid = this.money(g(r,'Thanh toán'));
      const left = this.money(g(r,'Còn lại'));
      const owed = this.money(g(r,'Tổng thu'));
      const grp  = this.mapGroup(g(r,'Loại điều trị'));
      const docId = this.staffByName(g(r,'Điều trị'), 'Bác sĩ điều trị', created);
      if (g(r,'Phụ tá')) this.staffByName(g(r,'Phụ tá'), 'Phụ tá', created);
      lastLeft[c.id] = left;

      /* Mỗi lần điều trị của sổ cũ vào mục "Quá trình điều trị" của hồ sơ bệnh án */
      const doc = docId ? (staffById(docId) || {}).name : '';
      const tien = [];
      if (owed)  tien.push('nợ tại thời điểm đó ' + owed.toLocaleString('vi-VN') + ' ₫');
      if (paid)  tien.push('đã thu ' + paid.toLocaleString('vi-VN') + ' ₫');
      if (left)  tien.push('còn lại ' + left.toLocaleString('vi-VN') + ' ₫');
      const lab = this.money(g(r,'Tiền Lab')), thuc = this.money(g(r,'Thực lãnh')), hs = this.norm(g(r,'Hệ số'));
      if (lab)  tien.push('tiền lab ' + lab.toLocaleString('vi-VN') + ' ₫');
      if (thuc) tien.push('thực lãnh ' + thuc.toLocaleString('vi-VN') + ' ₫');
      if (hs)   tien.push('hệ số ' + hs);
      (visits[c.id] || (visits[c.id] = [])).push({
        date,
        db: work,
        xt: [doc ? 'BS: ' + doc : '', g(r,'Phụ tá') ? 'Phụ tá: ' + g(r,'Phụ tá') : '',
             grp !== 'Khác' ? 'Nhóm: ' + grp : '', tien.join(' · ')].filter(Boolean).join(' — '),
      });

      /* old:true — phiếu thu của sổ cũ. Số nợ mang sang đã là số CÒN LẠI sau các lần thu này,
         nên khi tính công nợ không được trừ chúng thêm lần nữa. */
      if (paid > 0) receipts.push({id: uid(), no: '', date, customerId: c.id, desc: work,
        method: 'Tiền mặt', amount: paid, staffId: '', doctorId: docId, group: grp, invoice: null, old: true});
    });

    /* Công nợ đang còn của từng khách → một hạng mục chờ, để phần mềm tính đúng số phải thu */
    let debtTotal = 0;
    Object.keys(lastLeft).forEach(cid => {
      const v = lastLeft[cid];
      if (v > 0) {
        debtTotal += v;
        treatments.push({id: uid(), customerId: cid, serviceId: '', name: 'Công nợ chuyển từ sổ cũ',
          group: 'Khác', tooth: '', doctorId: '', price: v, status: 'Chờ điều trị', date: todayISO()});
      }
    });
    return {treatments, receipts, visits, created, missing: [...missing], noDate, noDateAmount, debtTotal,
            paidTotal: receipts.reduce((s, r) => s + r.amount, 0)};
  },

  /* ---------- Lịch hẹn (bảng DAT HEN) ---------- */
  buildAppointments(rows){
    const byCode = {}; db.customers.forEach(c => byCode[c.code] = c);
    const out = []; const missing = new Set(); const created = [];
    rows.forEach(r => {
      const g = k => this.norm(r[k]);
      const c = byCode[this.custCode(g('Mã KH'))];
      const date = this.anyDate(g('Ngày đặt hẹn'));
      if (!c || !date) { if (!c && g('Mã KH')) missing.add(this.custCode(g('Mã KH'))); return; }
      const t1 = this.hhmm(g('Giờ bắt đầu')) || '08:00', t2 = this.hhmm(g('Giờ kết thúc'));
      let dur = 30;
      if (t2) { const a = +t1.slice(0,2)*60 + +t1.slice(3), b = +t2.slice(0,2)*60 + +t2.slice(3); if (b > a) dur = b - a; }
      out.push({id: uid(), date, time: t1, dur, customerId: c.id,
        service: g('Công việc') || 'Tái khám',
        doctorId: this.staffByName(g('Bác sĩ'), 'Bác sĩ điều trị', created),
        chair: 'Ghế 1',
        status: /đã điện thoại/i.test(g('Tình trạng')) ? 'Đã xác nhận' : 'Chờ xác nhận',
        labOrderId: ''});
    });
    return {appointments: out, missing: [...missing], created};
  },

  /* ---------- Vật liệu (bảng VAT LIEU) ---------- */
  buildInventory(rows){
    const out = [];
    rows.forEach(r => {
      const g = k => this.norm(r[k]);
      const name = g('Tên vật liệu'); if (!name) return;
      const brand = g('Tên thương mại');
      const stock = this.money(g('Giữa tháng')) || this.money(g('Đầu tháng'));
      const color = g('Tình trạng').toLowerCase();
      /* màu bên sổ cũ: Red = cần mua gấp, Yellow = sắp hết, Black = đủ */
      const min = color === 'red' ? stock + 1 : color === 'yellow' ? stock : 0;
      out.push({id: uid(), name: name + (brand ? ' — ' + brand : ''), unit: g('Đơn vị tính') || 'cái',
        stock, min, supplier: g('Nơi bán'), buy: this.money(g('Giá')), sell: 0,
        expiry: this.anyDate(g('Ngày mua')) ? '' : ''});
    });
    return {inventory: out};
  },

  /* ---------- Giao diện ---------- */
  KINDS: {
    customers:   {label:'Khách hàng',        sheet:'THONG TIN'},
    treatments:  {label:'Lịch sử điều trị',  sheet:'CONG VIEC'},
    appointments:{label:'Lịch hẹn',          sheet:'DAT HEN'},
    inventory:   {label:'Vật liệu / kho',    sheet:'VAT LIEU'},
  },
  form(){
    App.modal('Nhập dữ liệu từ sổ cũ (AppSheet / Google Sheet)', `
    <div class="card mb"><div class="card-h"><h2>Cách nhanh nhất — nhập tất cả một lần</h2></div>
      <div class="card-b">
        <div class="f"><label>Chọn cùng lúc cả 4 file CSV đã tải về</label>
          <input type="file" id="impMulti" accept=".csv,text/csv" multiple></div>
        <div class="check-row"><label><input type="radio" name="mmode" value="replace" checked> Thay thế dữ liệu cũ</label>
          <label><input type="radio" name="mmode" value="append"> Thêm vào</label></div>
        <div class="form-actions" style="justify-content:flex-start">
          <button type="button" class="btn primary" onclick="Importer.goMulti()">Nhập tất cả</button></div>
        <div class="combo-hint">Phần mềm tự nhận file nào là khách hàng, điều trị, lịch hẹn hay vật liệu — không cần chọn đúng thứ tự.</div>
      </div></div>

    <form class="form-grid" onsubmit="Importer.run(event)">
      <div class="f full"><label>Hoặc nhập từng bảng một</label>
        <select name="kind">${Object.entries(this.KINDS).map(([k,v]) =>
          `<option value="${k}">${v.label} — bảng "${v.sheet}"</option>`).join('')}</select></div>

      <div class="f full"><label>Cách 1 — chọn file CSV từ máy (chắc chắn chạy được)</label>
        <input type="file" name="file" accept=".csv,text/csv"></div>
      <div class="f full"><label>Cách 2 — link Google Sheet của đúng bảng đó</label>
        <input name="url" placeholder="dán link khi đang mở đúng tab cần nhập"></div>
      <div class="f full"><label>Cách 3 — dán thẳng nội dung CSV</label>
        <textarea name="csv" style="min-height:70px"></textarea></div>

      <div class="f full"><label>Cách xử lý</label>
        <select name="mode">
          <option value="append">Thêm vào dữ liệu hiện có</option>
          <option value="replace">Thay thế toàn bộ bảng này</option>
        </select></div>

      <div class="note-block full"><b>Cách lấy file CSV:</b> mở Google Sheet → chọn đúng tab cần nhập
        → <b>File → Tải xuống → Giá trị được phân tách bằng dấu phẩy (.csv)</b> → chọn file vừa tải ở ô trên.
        <br>Làm lần lượt 4 bảng: Khách hàng → Lịch sử điều trị → Lịch hẹn → Vật liệu.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Đọc dữ liệu</button></div>
    </form>`);
  },

  /* Tự nhận ra file thuộc bảng nào dựa vào tên cột */
  detectKind(rows){
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]).map(x => x.toLowerCase());
    const has = t => cols.some(c => c.includes(t));
    if (has('họ và tên') && has('ngày tháng năm sinh')) return 'customers';
    if (has('ngày điều trị') || has('tổng thu')) return 'treatments';
    if (has('ngày đặt hẹn') || (has('giờ bắt đầu') && has('mã kh'))) return 'appointments';
    if (has('tên vật liệu') || has('mã vật liệu')) return 'inventory';
    return '';
  },

  /* Nhập nhiều file cùng lúc, tự sắp đúng thứ tự: khách hàng trước, còn lại sau */
  async runMulti(files, mode){
    const order = ['customers','treatments','appointments','inventory'];
    const found = {}, unknown = [];
    for (const f of files) {
      const rows = this.parseCSV(await f.text());
      const kind = this.detectKind(rows);
      if (!kind) { unknown.push(f.name); continue; }
      found[kind] = rows;
    }
    const done = [], skipped = [];
    for (const kind of order) {
      const rows = found[kind]; if (!rows) { skipped.push(this.KINDS[kind].label); continue; }
      if (kind === 'customers') {
        let seq = db.seq.cust || 1300; const made = [];
        rows.forEach(x => { const c = this.toCustomer(x, ++seq); if (c) made.push(c); });
        made.forEach(c => delete c._addrKind);
        if (mode === 'replace') db.customers = made;
        else { const have = new Set(db.customers.map(c => c.code)); made.forEach(c => { if (!have.has(c.code)) db.customers.push(c); }); }
        done.push('Khách hàng: ' + made.length);
      } else {
        const r = kind === 'treatments' ? this.buildTreatments(rows)
                : kind === 'appointments' ? this.buildAppointments(rows) : this.buildInventory(rows);
        this._pending = Object.assign({kind}, r);
        this.commitOther(mode === 'replace' ? 'replace-silent' : 'append');
        done.push(this.KINDS[kind].label + ': ' +
          (kind === 'treatments' ? Object.values(r.visits).reduce((s,v)=>s+v.length,0) + ' lần điều trị, ' + r.receipts.length + ' phiếu thu'
           : kind === 'appointments' ? r.appointments.length : r.inventory.length));
      }
      save();
    }
    App.closeModal(); App.render();
    App.modal('Đã nhập xong', done.map(t => `<div class="alert-line"><span class="alert-ico info">✓</span><div>${h(t)}</div></div>`).join('')
      + (skipped.length ? `<div class="alert-line"><span class="alert-ico warn">!</span><div>Không có file cho: ${h(skipped.join(', '))}</div></div>` : '')
      + (unknown.length ? `<div class="alert-line"><span class="alert-ico warn">!</span><div>Không nhận ra bảng: ${h(unknown.join(', '))}</div></div>` : '')
      + `<div class="form-actions"><button class="btn primary" onclick="App.closeModal();App.go('customers')">Xem danh sách khách</button></div>`);
  },

  goMulti(){
    const inp = document.getElementById('impMulti');
    const mode = (document.querySelector('[name=mmode]:checked') || {}).value || 'replace';
    if (!inp || !inp.files || !inp.files.length) { App.toast('Chưa chọn file nào'); return; }
    if (mode === 'replace' && !confirm('Thay thế toàn bộ dữ liệu hiện có bằng ' + inp.files.length + ' file vừa chọn?')) return;
    App.toast('Đang nhập ' + inp.files.length + ' file…');
    this.runMulti([...inp.files], mode).catch(e => App.toast('Lỗi: ' + e.message));
  },

  /* Lấy nội dung CSV từ file / link / ô dán */
  async readSource(d, fileInput){
    if (fileInput && fileInput.files && fileInput.files[0]) return await fileInput.files[0].text();
    if ((d.csv || '').trim()) return d.csv.trim();
    if ((d.url || '').trim()) {
      const m = String(d.url).match(/[#&?]gid=(\d+)/);
      let u = this.csvUrl(d.url);
      if (m && !/[?&]gid=/.test(u)) u += '&gid=' + m[1];
      const r = await fetch(u);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    }
    return '';
  },
  async run(ev){
    ev.preventDefault();
    const form = ev.target;
    const d = Object.fromEntries(new FormData(form).entries());
    let text = '';
    App.toast('Đang đọc dữ liệu…');
    try { text = await this.readSource(d, form.querySelector('[name=file]')); }
    catch(e){ App.toast('Không tải được: ' + e.message + ' — hãy tải file CSV về rồi chọn từ máy'); return; }
    if (!text) { App.toast('Chưa chọn file, chưa dán link hay nội dung nào'); return; }
    const rows = this.parseCSV(text);
    if (!rows.length) { App.toast('Không đọc được dòng nào'); return; }

    if (d.kind && d.kind !== 'customers') return this.runOther(d.kind, rows, d.mode);
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
  /* ---------- Xem trước & nhập cho 3 bảng còn lại ---------- */
  runOther(kind, rows, mode){
    const row = (k, t) => `<div class="alert-line"><span class="alert-ico ${k}">${k==='info'?'✓':'!'}</span><div>${t}</div></div>`;
    let body = '', pending = null;

    if (kind === 'treatments') {
      const r = this.buildTreatments(rows);
      pending = {kind, ...r};
      const soLan = Object.values(r.visits).reduce((s, v) => s + v.length, 0);
      body = row('info', `Đọc được <b>${soLan}</b> lần điều trị (đưa vào mục <b>Quá trình điều trị</b> của từng hồ sơ) và <b>${r.receipts.length}</b> phiếu thu`)
        + row('info', `Tổng tiền đã thu: <b>${money(r.paidTotal)}</b>`)
        + row('info', `Công nợ còn lại chuyển sang: <b>${money(r.debtTotal)}</b>`)
        + (r.created.length ? row('info', `Tự tạo <b>${r.created.length}</b> nhân viên từ sổ cũ: ${h(r.created.join(', '))}`) : '')
        + (r.missing.length ? row('warn', `<b>${r.missing.length}</b> mã khách chưa có hồ sơ nên bỏ qua: ${h(r.missing.slice(0,8).join(', '))}${r.missing.length>8?'…':''}`) : '')
        + (r.noDate ? row('warn', `<b>${r.noDate}</b> dòng thiếu ngày điều trị nên bỏ qua`
             + (r.noDateAmount ? ` — trong đó có <b>${money(r.noDateAmount)}</b> tiền đã thu, bạn nên nhập tay lại` : '')) : '')
        + `<div class="note-block" style="margin-top:10px">Sổ cũ ghi <b>Tổng thu</b> là số tiền còn nợ tại thời điểm đó, không phải giá của lần khám,
           và có <b>509 dòng</b> mà ba cột tiền không khớp nhau. Vì vậy tôi lấy con số chắc chắn nhất là
           <b>Thanh toán</b> làm doanh thu, còn số nợ gốc giữ nguyên trong ghi chú từng lần điều trị.</div>`;
    }
    if (kind === 'appointments') {
      const r = this.buildAppointments(rows);
      pending = {kind, ...r};
      body = row('info', `Đọc được <b>${r.appointments.length}</b> lịch hẹn từ ${rows.length} dòng`)
        + (r.created.length ? row('info', `Tự tạo nhân viên: ${h(r.created.join(', '))}`) : '')
        + (r.missing.length ? row('warn', `<b>${r.missing.length}</b> mã khách chưa có hồ sơ nên bỏ qua`) : '');
    }
    if (kind === 'inventory') {
      const r = this.buildInventory(rows);
      pending = {kind, ...r};
      const canhBao = r.inventory.filter(i => i.min > 0).length;
      body = row('info', `Đọc được <b>${r.inventory.length}</b> vật liệu từ ${rows.length} dòng`)
        + row('info', `<b>${canhBao}</b> món đang ở mức cần mua (theo màu Red/Yellow của sổ cũ)`);
    }
    this._pending = pending;
    App.modal('Xem trước — ' + this.KINDS[kind].label, `<div class="card mb"><div class="card-b">${body}</div></div>
      <div class="note-block">Cách xử lý: <b>${mode==='replace'?'thay thế toàn bộ bảng này':'thêm vào dữ liệu hiện có'}</b>.</div>
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button type="button" class="btn primary" onclick="Importer.commitOther('${mode}')">Nhập vào phần mềm</button></div>`);
  },
  commitOther(mode){
    const p = this._pending; if (!p) { App.toast('Không có dữ liệu'); return; }
    const silent = mode === 'replace-silent';
    if (silent) mode = 'replace';
    if (mode === 'replace' && !silent && !confirm('Thay thế toàn bộ dữ liệu ' + this.KINDS[p.kind].label.toLowerCase() + ' hiện có?')) return;
    if (p.kind === 'treatments') {
      if (mode === 'replace') { db.treatments = []; db.receipts = []; }
      db.treatments = db.treatments.concat(p.treatments);
      Object.keys(p.visits || {}).forEach(cid => {
        const c = custById(cid); if (!c) return;
        if (!c.record) c.record = {dienBien: []};
        if (!c.record.dienBien) c.record.dienBien = [];
        if (mode === 'replace') c.record.dienBien = [];
        c.record.dienBien = c.record.dienBien.concat(p.visits[cid])
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      });
      p.receipts.forEach(r => { r.no = 'PT-' + (++db.seq.receipt); db.receipts.push(r); });
    } else if (p.kind === 'appointments') {
      if (mode === 'replace') db.appointments = [];
      db.appointments = db.appointments.concat(p.appointments);
    } else if (p.kind === 'inventory') {
      if (mode === 'replace') db.inventory = [];
      db.inventory = db.inventory.concat(p.inventory);
    }
    this._pending = null;
    save();
    if (!silent) { App.closeModal(); App.render(); App.toast('Đã nhập xong ' + this.KINDS[p.kind].label.toLowerCase() + ' ✓'); }
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
