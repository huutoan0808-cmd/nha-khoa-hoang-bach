/* ================= SAO LƯU TỰ ĐỘNG =================
   Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.2.c: "Định kỳ thực hiện sao lưu
   dữ liệu gồm 01 bản tại cơ sở khám bệnh, chữa bệnh và khuyến nghị có thêm 01 bản
   tại đơn vị cung cấp dịch vụ lưu trữ bảo đảm an toàn cho dữ liệu khi bị tấn công
   mạng." Mục III.1.2.a cũng đòi cơ chế sao lưu dự phòng và khôi phục.

   Bản trên đám mây (Supabase) là bản thứ hai. Còn thiếu đúng bản "tại cơ sở", nên
   đây là phần lo chuyện đó, hai lớp:

   1. Ảnh chụp dữ liệu hằng ngày cất vào IndexedDB của máy. Tự chạy, không cần ai
      bấm gì. Giữ 14 bản gần nhất.
   2. Nếu người dùng chọn một thư mục trên máy (Chrome trên Windows cho phép), phần
      mềm ghi thẳng tệp .json vào thư mục đó mỗi ngày. Đây mới thật sự là bản sao
      nằm ngoài trình duyệt — xóa dữ liệu duyệt web cũng không mất.

   Trình duyệt không cho phần mềm tự ghi file xuống máy nếu chưa được cho phép một
   lần, nên nếu chưa chọn thư mục thì phần mềm nhắc tải bản sao lưu về. */
'use strict';

const SL = {
  TEN_DB: 'nkhb_saoluu',
  KHO: 'ban',
  CD: 'caidat',
  GIU: 14,                /* giữ bao nhiêu bản gần nhất trong máy */
  NHAC_SAU: 7,            /* chưa có bản ra tệp quá bao nhiêu ngày thì nhắc */
  tt: null,               /* trạng thái đã đọc sẵn, để vẽ giao diện khỏi phải chờ */

  /* ---------- IndexedDB ---------- */
  mo(){
    if (this._mo) return this._mo;
    this._mo = new Promise((ok, loi) => {
      const y = indexedDB.open(this.TEN_DB, 1);
      y.onupgradeneeded = () => {
        const d = y.result;
        if (!d.objectStoreNames.contains(this.KHO)) d.createObjectStore(this.KHO, {keyPath: 'id'});
        if (!d.objectStoreNames.contains(this.CD)) d.createObjectStore(this.CD);
      };
      y.onsuccess = () => ok(y.result);
      y.onerror = () => loi(y.error);
    });
    return this._mo;
  },
  async viec(kho, cheDo, lam){
    const d = await this.mo();
    return new Promise((ok, loi) => {
      const t = d.transaction(kho, cheDo);
      const y = lam(t.objectStore(kho));
      t.oncomplete = () => ok(y && y.result);
      t.onerror = () => loi(t.error);
    });
  },
  dat(kho, val, key){ return this.viec(kho, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)); },
  lay(kho, key){ return this.viec(kho, 'readonly', s => s.get(key)); },
  xoa(kho, key){ return this.viec(kho, 'readwrite', s => s.delete(key)); },
  tatCa(kho){ return this.viec(kho, 'readonly', s => s.getAll()); },

  /* ---------- Thư mục sao lưu trên máy ---------- */
  coThuMuc(){ return typeof window.showDirectoryPicker === 'function'; },
  async layTay(){ return await this.lay(this.CD, 'thumuc'); },
  async quyen(tay, hoi){
    if (!tay) return false;
    const o = {mode: 'readwrite'};
    if ((await tay.queryPermission(o)) === 'granted') return true;
    if (!hoi) return false;
    return (await tay.requestPermission(o)) === 'granted';
  },
  async chonThuMuc(){
    if (!this.coThuMuc()) {
      App.toast('Trình duyệt này không cho chọn thư mục — dùng Chrome hoặc Edge trên máy tính');
      return;
    }
    try {
      const tay = await window.showDirectoryPicker({id: 'nkhb-saoluu', mode: 'readwrite'});
      await this.dat(this.CD, tay, 'thumuc');
      App.toast('Đã chọn thư mục sao lưu ✓');
      await this.chup(false);
      this.bang();
    } catch(e){ /* người dùng bấm hủy */ }
  },
  async boThuMuc(){
    await this.xoa(this.CD, 'thumuc');
    App.toast('Đã bỏ thư mục sao lưu');
    this.bang();
  },

  /* ---------- Chụp một bản ---------- */
  tenTep(ngay){ return 'nhakhoa-hoangbach-saoluu-' + ngay + '.json'; },
  /* Mỗi bản một mã riêng chứ không lấy ngày làm mã. Trước đây lấy ngày làm mã thì
     phục hồi hai lần trong cùng một ngày sẽ đè mất bản an toàn của lần đầu — đúng
     lúc cần nó nhất. */
  async chup(tuDong, nhan){
    if (!db || !(db.customers || []).length) return null;
    const ngay = todayISO();
    const noi = JSON.stringify(db);
    const ban = {id: ngay + '~' + Date.now().toString(36), ngay,
                 at: new Date().toISOString(), co: noi.length, tuDong: !!tuDong, nhan: nhan || '',
                 khach: db.customers.length, muc: (db.treatments || []).length, data: noi, tep: false};

    /* Ghi ra thư mục trước, vì đó mới là bản sao thật sự nằm ngoài trình duyệt */
    try {
      const tay = await this.layTay();
      if (tay && await this.quyen(tay, false)) {
        const fh = await tay.getFileHandle(this.tenTep(ngay), {create: true});
        const w = await fh.createWritable();
        await w.write(noi); await w.close();
        ban.tep = true;
      }
    } catch(e){ ban.loi = String(e.message || e); }

    await this.dat(this.KHO, ban);
    await this.donBot();
    await this.docTT();
    if (typeof Vet !== 'undefined' && !tuDong)
      Vet.ghi('xuat', 'Sao lưu dữ liệu' + (ban.tep ? ' ra thư mục trên máy' : ' vào bộ nhớ máy'));
    return ban;
  },
  async donBot(){
    const ds = await this.ds();
    for (const x of ds.slice(this.GIU)) await this.xoa(this.KHO, x.id);
  },
  /* Xếp mới trước cũ sau — dùng chung cho mọi chỗ đọc danh sách */
  async ds(){ return (await this.tatCa(this.KHO)).sort((a, b) => (a.at < b.at ? 1 : -1)); },

  /* ---------- Chạy tự động ---------- */
  async tuDong(){
    try {
      await this.docTT();
      if (this.tt.hnay) return;                    /* hôm nay đã có bản tự động rồi */
      await this.chup(true);
    } catch(e){ /* máy chặn IndexedDB thì thôi, đừng làm vỡ app */ }
  },
  async docTT(){
    try {
      const ds = await this.ds();
      const tay = await this.layTay();
      this.tt = {
        so: ds.length,
        moiNhat: ds.length ? ds[0].ngay : '',
        hnay: ds.some(x => x.ngay === todayISO() && x.tuDong),
        tepMoiNhat: (ds.find(x => x.tep) || {}).ngay || '',
        coThuMuc: !!tay,
        tenThuMuc: tay ? tay.name : '',
      };
    } catch(e){ this.tt = {so: 0, moiNhat: '', hnay: false, tepMoiNhat: '', coThuMuc: false, tenThuMuc: ''}; }
    return this.tt;
  },
  /* Bao nhiêu ngày rồi chưa có bản ra tệp ngoài trình duyệt */
  treNgay(){
    const t = this.tt; if (!t || !t.tepMoiNhat) return 999;
    return Math.round((Date.parse(todayISO()) - Date.parse(t.tepMoiNhat)) / 86400000);
  },

  /* ---------- Dòng trạng thái trong Cài đặt ---------- */
  moTa(){
    const t = this.tt;
    if (!t) return 'Đang kiểm tra…';
    const phan = [];
    phan.push(t.so ? t.so + ' bản trong máy · mới nhất ' + fmtD(t.moiNhat) : 'Chưa có bản nào');
    if (t.coThuMuc) phan.push('ghi vào thư mục <b>' + h(t.tenThuMuc) + '</b>');
    else phan.push('chưa đặt thư mục trên máy');
    return phan.join(' · ');
  },
  pill(){
    const t = this.tt;
    if (!t) return '';
    if (!t.coThuMuc) return '<span class="pill warn">Chưa có bản ngoài trình duyệt</span>';
    const tre = this.treNgay();
    return tre <= 1 ? '<span class="pill ok">Đã sao lưu ra tệp</span>'
         : tre > this.NHAC_SAU ? '<span class="pill danger">Trễ ' + tre + ' ngày</span>'
         : '<span class="pill info">Tệp gần nhất ' + tre + ' ngày trước</span>';
  },

  /* ---------- Hộp thoại ---------- */
  async bang(){
    if (Perm.chan('saoluu', 'mở phần sao lưu, phục hồi')) return;
    await this.docTT();
    const ds = await this.ds();
    const co = n => (n / 1024 < 1024) ? Math.round(n/1024) + ' KB' : (n/1048576).toFixed(1) + ' MB';
    const gio = at => { const d = new Date(at); return isNaN(d) ? ''
      : String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
    const dong = x => `<tr>
      <td>${fmtD(x.ngay)}<br><span class="sub-line">${gio(x.at)}${x.tuDong ? ' · tự động' : ''}</span></td>
      <td>${x.khach} khách · ${x.muc} hạng mục${x.nhan ? '<br><span class="sub-line">' + h(x.nhan) + '</span>' : ''}</td>
      <td>${co(x.co)}</td>
      <td>${x.tep ? '<span class="pill ok">Đã ghi ra tệp</span>' : '<span class="pill mutedp">Chỉ trong máy</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn small" onclick="SL.taiVe('${x.id}')">Tải về</button>
        <button class="btn small" onclick="SL.phucHoi('${x.id}')">Phục hồi</button></td></tr>`;

    App.modal('Sao lưu tự động', `
      <div class="note-block">Quy định đòi <b>một bản sao lưu tại phòng khám</b> bên cạnh bản trên đám mây.
        Phần mềm tự chụp dữ liệu mỗi ngày một lần và giữ ${this.GIU} bản gần nhất.</div>

      <div class="ho-so-file">
        <div class="hsf-than"><div class="hsf-dau"><b>Thư mục sao lưu trên máy</b> ${this.pill()}</div>
          <div class="hsf-mo">${this.tt.coThuMuc
            ? 'Đang ghi vào thư mục <b>' + h(this.tt.tenThuMuc) + '</b>. Đây là bản nằm ngoài trình duyệt — xóa dữ liệu duyệt web cũng không mất.'
            : (this.coThuMuc()
               ? 'Chưa đặt. Chọn một thư mục (ví dụ một ổ cắm ngoài hoặc thư mục đồng bộ đám mây) thì mỗi ngày phần mềm tự ghi một tệp vào đó.'
               : 'Trình duyệt này không cho chọn thư mục. Dùng Chrome hoặc Edge trên máy tính, hoặc bấm Tải về hằng tuần để tự cất giữ.')}</div></div>
        <div class="hsf-nut">
          ${this.tt.coThuMuc ? `<button class="btn small" onclick="SL.boThuMuc()">Bỏ</button>` : ''}
          ${this.coThuMuc() ? `<button class="btn small primary" onclick="SL.chonThuMuc()">${this.tt.coThuMuc ? 'Đổi thư mục' : 'Chọn thư mục'}</button>` : ''}
        </div></div>

      <div class="ho-so-file">
        <div class="hsf-than"><div class="hsf-dau"><b>Chụp ngay một bản</b></div>
          <div class="hsf-mo">Dùng trước khi làm việc gì lớn — nhập hàng loạt, dọn trùng lặp, sửa nhiều hồ sơ.</div></div>
        <div class="hsf-nut"><button class="btn small primary" onclick="SL.chupTay()">Chụp ngay</button></div></div>

      <h3 class="nhom-tieu">Các bản đã có</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th>Ngày</th><th>Nội dung</th><th>Dung lượng</th><th>Nơi lưu</th><th></th>
      </tr></thead><tbody>
        ${ds.map(dong).join('') || '<tr><td colspan="5" class="empty">Chưa có bản nào</td></tr>'}
      </tbody></table></div>`);
  },
  async chupTay(){
    const b = await this.chup(false);
    App.toast(b ? (b.tep ? 'Đã chụp và ghi ra thư mục ✓' : 'Đã chụp vào bộ nhớ máy ✓') : 'Chưa có dữ liệu để chụp');
    this.bang();
  },
  async taiVe(id){
    const b = await this.lay(this.KHO, id); if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([b.data], {type: 'application/json'}));
    a.download = this.tenTep(b.ngay); a.click(); URL.revokeObjectURL(a.href);
    if (typeof Vet !== 'undefined') Vet.ghi('xuat', 'Tải bản sao lưu ngày ' + fmtD(b.ngay) + ' về máy');
  },
  async phucHoi(id){
    const b = await this.lay(this.KHO, id); if (!b) return;
    if (!confirm('Phục hồi dữ liệu về bản ngày ' + fmtD(b.ngay) + '?\n\n' +
        'Toàn bộ dữ liệu hiện tại trên máy này sẽ bị THAY THẾ. ' +
        'Việc đã làm sau ngày đó mà chưa đồng bộ lên đám mây sẽ mất.')) return;
    try {
      const d = JSON.parse(b.data);
      if (!d.customers) throw new Error('Bản sao lưu hỏng');
      /* Chụp bản hiện tại trước khi đè, để lỡ bấm nhầm còn đường lùi */
      await this.chup(false, 'Bản tự giữ lại ngay trước khi phục hồi về ' + fmtD(b.ngay));
      db = d; save();
      if (typeof Vet !== 'undefined') { Vet.chup(); Vet.ghi('khoiphuc', 'Phục hồi toàn bộ dữ liệu từ bản sao lưu ngày ' + fmtD(b.ngay)); }
      App.closeModal(); App.render();
      App.toast('Đã phục hồi về bản ngày ' + fmtD(b.ngay) + ' ✓');
    } catch(e){ App.toast('Không phục hồi được: ' + e.message); }
  },
};
