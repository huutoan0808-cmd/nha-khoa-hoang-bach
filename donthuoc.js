/* ================= KÊ ĐƠN THUỐC ĐIỆN TỬ THEO CHUẨN 808/QĐ-BYT =================
   Quyết định 808/QĐ-BYT — tài liệu hướng dẫn kết nối Hệ thống thông tin quốc gia về
   quản lý kê đơn thuốc và bán thuốc theo đơn. Bảng dữ liệu đầu vào của API
   POST https://api.donthuocquocgia.vn/api/v1/gui-don-thuoc có 27 trường; tên trường,
   kiểu dữ liệu và định dạng ngày giờ lấy đúng theo bảng đó.

   BA CHỖ DỄ GỬI SAI MÀ HỆ THỐNG KHÔNG BÁO LỖI:

   1. Hai kiểu ngày khác nhau trong cùng một đơn. Ngày sinh bệnh nhân là `d/m/Y`
      (25/12/1990) còn ngày giờ kê đơn là `Y-m-d H:i:s` (2026-10-28 14:30:00). Viết
      lẫn là dữ liệu vào sai mà vẫn 200 OK.
   2. `gioi_tinh` là SỐ, không phải chữ: 1 chưa rõ · 2 nam · 3 nữ. Gửi "Nam" là sai.
   3. `ngay_tai_kham` là SỐ NGÀY kể từ ngày kê đơn, không phải một cái ngày. Hẹn sau
      một tuần thì gửi 7, không gửi 2026-11-04.

   Chỗ chuẩn 808 tự nói ngược nhau, đã ghi lại ở HAI_TEN_CHAN_DOAN bên dưới. */
'use strict';

/* Thân đơn thuốc trong ví dụ FormData của 808 ghi phần tử chẩn đoán là
   ma_chan_doan/ten_chan_doan, nhưng bảng mô tả dữ liệu đầu vào (trường số 12) lại ghi
   ma_benh/ten_benh. Hai chỗ trong cùng một văn bản, không biết chỗ nào đúng.
   Đang đi theo ví dụ FormData vì đó là thân request thật được in ra. Nếu hệ thống trả
   lỗi thiếu trường chẩn đoán thì đổi cờ này sang false, không phải sửa gì khác. */
const DT_THEO_VI_DU = true;

/* Danh mục thuốc phòng khám hay dùng.
   ma: MÃ THUỐC DO CỤC QUẢN LÝ DƯỢC CẤP — cố tình để trống. Chuẩn 808 bắt buộc trường
   này (tối đa 20 ký tự) và nó phải là mã thật trong danh mục của Cục; tự nghĩ ra một
   dãy cho đủ chỗ là gửi rác lên hệ thống quốc gia. Khai một lần trong Cài đặt →
   Liên thông đơn thuốc, sau đó dùng mãi.
   hoatChat là biet_duoc theo cách gọi của 808 (hoạt chất chính), ten là tên thương mại. */
const DM_THUOC = [
  {ma:'', hoatChat:'Amoxicilin',                    ten:'Amoxicillin 500mg',        dv:'Viên'},
  {ma:'', hoatChat:'Amoxicilin + Acid clavulanic',  ten:'Augmentin 625mg',          dv:'Viên'},
  {ma:'', hoatChat:'Spiramycin',                    ten:'Rodogyl',                  dv:'Viên'},
  {ma:'', hoatChat:'Spiramycin',                    ten:'Spiramycin 3 M.IU',        dv:'Viên'},
  {ma:'', hoatChat:'Metronidazol',                  ten:'Metronidazol 250mg',       dv:'Viên'},
  {ma:'', hoatChat:'Cefuroxim',                     ten:'Cefuroxim 500mg',          dv:'Viên'},
  {ma:'', hoatChat:'Cefixim',                       ten:'Cefixim 200mg',            dv:'Viên'},
  {ma:'', hoatChat:'Clindamycin',                   ten:'Dalacin C 300mg',          dv:'Viên'},
  {ma:'', hoatChat:'Paracetamol',                   ten:'Paracetamol 500mg',        dv:'Viên'},
  {ma:'', hoatChat:'Paracetamol',                   ten:'Efferalgan 500mg',         dv:'Viên'},
  {ma:'', hoatChat:'Paracetamol + Codein',          ten:'Efferalgan Codein',        dv:'Viên'},
  {ma:'', hoatChat:'Ibuprofen',                     ten:'Ibuprofen 400mg',          dv:'Viên'},
  {ma:'', hoatChat:'Meloxicam',                     ten:'Mobic 7,5mg',              dv:'Viên'},
  {ma:'', hoatChat:'Diclofenac',                    ten:'Voltaren 50mg',            dv:'Viên'},
  {ma:'', hoatChat:'Alphachymotrypsin',             ten:'Alphachymotrypsin 4,2mg',  dv:'Viên'},
  {ma:'', hoatChat:'Serratiopeptidase',             ten:'Danzen 5mg',               dv:'Viên'},
  {ma:'', hoatChat:'Prednisolon',                   ten:'Prednisolon 5mg',          dv:'Viên'},
  {ma:'', hoatChat:'Methylprednisolon',             ten:'Medrol 16mg',              dv:'Viên'},
  {ma:'', hoatChat:'Vitamin C',                     ten:'Vitamin C 500mg',          dv:'Viên'},
  {ma:'', hoatChat:'Chlorhexidin',                  ten:'Nước súc miệng Chlorhexidine 0,12%', dv:'Chai'},
  {ma:'', hoatChat:'Povidon iod',                   ten:'Betadine súc miệng 1%',    dv:'Chai'},
  {ma:'', hoatChat:'Benzydamin',                    ten:'Tantum Verde',             dv:'Chai'},
];

const DT = {
  /* ---------------- Khai báo trong Cài đặt ---------------- */
  /* Mỗi chi nhánh một mã liên thông riêng vì là hai cơ sở được cấp phép riêng. Mã này
     KHÔNG phải thứ bí mật — nó nằm ngay 5 ký tự đầu của mọi mã đơn thuốc, nhà thuốc
     nào cũng đọc được — nên để trong Cài đặt của app là được.
     Còn MẬT KHẨU cơ sở thì thêm/xóa được bác sĩ khỏi phòng khám trên hệ thống quốc
     gia, nên không để trong app; nó nằm bên Apps Script. */
  cfg(){ return (db.clinic && db.clinic.dt) || {}; },
  maCoSo(){ return String(this.cfg().maCoSo || '').trim(); },

  /* ---------------- Định dạng ---------------- */
  /* ngay_sinh_benh_nhan — d/m/Y */
  ngay(iso){
    const s = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  },
  /* ngay_gio_ke_don — Y-m-d H:i:s. Khác hẳn kiểu trên, đừng dùng lẫn. */
  ngayGio(d){
    const t = d ? new Date(d) : new Date();
    if (isNaN(t)) return '';
    const p = n => String(n).padStart(2, '0');
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) + ' '
         + p(t.getHours()) + ':' + p(t.getMinutes()) + ':' + p(t.getSeconds());
  },
  /* gioi_tinh — số, không phải chữ */
  gioiTinh(c){
    const g = Combo.norm(String((c && c.gender) || ''));
    if (g.startsWith('nam')) return 2;
    if (g.startsWith('nu'))  return 3;
    return 1;
  },
  /* Số tháng tuổi — dùng để biết có phải khai người giám hộ không */
  soThang(dob){
    const s = String(dob || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + 'T00:00:00'), n = new Date();
    if (isNaN(d)) return null;
    return (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth())
         - (n.getDate() < d.getDate() ? 1 : 0);
  },
  treEm(c){ const t = this.soThang(c && c.dob); return t !== null && t < 72; },

  /* ---------------- Mã đơn thuốc ----------------
     14 ký tự: 5 ký tự mã liên thông cơ sở + 7 ký tự bất kỳ (0-9, a-z) + 2 ký tự loại.
     Sinh xong là lưu ngay vào đơn. Lỡ mạng rớt lúc gửi thì bấm gửi lại dùng đúng mã
     cũ, không sinh mã thứ hai cho cùng một đơn — chuẩn 808 đòi mã phải là duy nhất,
     mà một bệnh nhân hai mã cho một đơn thì sau này không ai đối chiếu được. */
  LOAI: {c:'đơn thuốc thường', n:'đơn thuốc gây nghiện', h:'đơn thuốc hướng thần', y:'đơn thuốc y học cổ truyền'},
  maDon(loai){
    const co = this.maCoSo();
    if (co.length !== 5) return '';
    const l = (loai || 'c').toLowerCase();
    const bang = '0123456789abcdefghijklmnopqrstuvwxyz';
    const dung = new Set((db.rx || []).map(r => r.code).filter(Boolean));
    for (let thu = 0; thu < 9999; thu++) {
      let giua = '';
      for (let i = 0; i < 7; i++) giua += bang[Math.floor(Math.random() * bang.length)];
      const ma = co + giua + '-' + l;
      if (!dung.has(ma)) return ma;
    }
    return '';
  },

  /* ---------------- Dựng thân request gửi lên ----------------
     Trả về đúng hình dạng FormData mà 808 in trong tài liệu. Trường signature để
     rỗng: chuẩn 808 có trường đó ("Chữ ký số của người kê đơn") nhưng KHÔNG nói ký
     trên chuỗi nào, chuẩn hóa ra sao, bọc dạng gì — và trong bảng dữ liệu đầu vào nó
     cũng không được đánh dấu bắt buộc. Chờ đơn vị hỗ trợ kỹ thuật trả lời rồi điền
     vào đúng một chỗ: hàm DT.kySo() ở cuối file. */
  json(rx){
    const c = custById(rx.customerId) || {};
    const cfg = this.cfg();
    const sdt = String(c.phone || '').replace(/\D/g, '').slice(0, 12);
    const cccd = String(c.cccd || '').replace(/\D/g, '').slice(0, 12);

    const chan = (rx.chanDoan || []).filter(x => x && (x.ma || x.ten)).map(x => DT_THEO_VI_DU
      ? {ma_chan_doan: x.ma || '', ten_chan_doan: x.ten || '', ket_luan: x.ketLuan || ''}
      : {ma_benh:      x.ma || '', ten_benh:      x.ten || '', ket_luan: x.ketLuan || ''});

    const o = {
      loai_don_thuoc: (rx.loai || 'c').toLowerCase(),
      ma_don_thuoc: rx.code || '',
      ho_ten_benh_nhan: String(c.name || '').slice(0, 500),
      ngay_sinh_benh_nhan: this.ngay(c.dob),
      gioi_tinh: this.gioiTinh(c),
      dia_chi: String(fullAddr(c) || '').slice(0, 500),
      chan_doan: chan,
      thong_tin_don_thuoc: (rx.items || []).map(it => ({
        ma_thuoc: String(it.ma || '').slice(0, 20),
        biet_duoc: String(it.hoatChat || '').slice(0, 500),
        ten_thuoc: String(it.ten || '').slice(0, 500),
        don_vi_tinh: String(it.dv || '').slice(0, 500),
        so_luong: Number(it.sl) || 0,
        cach_dung: String(it.cachDung || '').slice(0, 500),
      })),
      ngay_gio_ke_don: this.ngayGio(rx.luc || rx.date),
      signature: rx.signature || '',
    };

    /* Bắt buộc với đơn thường; danh mục do Bộ Y tế ban hành, khai một lần trong Cài đặt */
    if (o.loai_don_thuoc === 'c' && cfg.hinhThuc) o.hinh_thuc_dieu_tri = Number(cfg.hinhThuc);
    /* Bắt buộc với đơn gây nghiện / hướng thần / y học cổ truyền */
    if (['n', 'h', 'y'].includes(o.loai_don_thuoc) && (rx.dot || []).length) {
      o.dot_dung_thuoc = rx.dot.map(d => ({
        dot: Number(d.dot) || 1, tu_ngay: this.ngay(d.tu), den_ngay: this.ngay(d.den),
        so_thang_thuoc: Number(d.soThang) || 0,
      }));
    }
    /* Các trường không bắt buộc — chỉ gửi khi có, khỏi đẩy chuỗi rỗng lên */
    if (c.maYTe) o.ma_dinh_danh_y_te = String(c.maYTe).slice(0, 10);
    if (cccd.length === 12) o.ma_dinh_danh_cong_dan = cccd;
    if (rx.canNang) o.can_nang = Number(rx.canNang);
    if (c.bhyt) o.ma_so_bao_hiem_y_te = String(c.bhyt).slice(0, 10);
    if (rx.giamHo) o.thong_tin_nguoi_giam_ho = String(rx.giamHo).slice(0, 500);
    if (rx.luuY) o.luu_y = String(rx.luuY).slice(0, 2000);
    if (rx.loiDan) o.loi_dan = String(rx.loiDan).slice(0, 2000);
    if (sdt) o.so_dien_thoai_nguoi_kham_benh = sdt;
    if (rx.taiKham) o.ngay_tai_kham = Number(rx.taiKham);   /* SỐ NGÀY, không phải ngày */
    return o;
  },

  /* ---------------- Soát trước khi gửi ----------------
     Gửi thiếu trường bắt buộc thì hệ thống trả 422 kèm danh_sach_cac_loi, nhưng bằng
     tiếng của họ và sau khi đã mất một lượt gọi. Soát ở đây để lễ tân sửa ngay. */
  thieu(rx){
    const c = custById(rx.customerId) || {};
    const l = [];
    if (this.maCoSo().length !== 5) l.push('Chưa khai mã liên thông cơ sở (5 ký tự) trong Cài đặt → Liên thông đơn thuốc');
    if (!rx.code) l.push('Đơn chưa có mã — mã sinh ra khi lưu, cần có mã liên thông cơ sở trước');
    if (!String(c.name || '').trim()) l.push('Khách chưa có họ tên');
    if (!this.ngay(c.dob)) l.push('Khách chưa có ngày sinh (chuẩn 808 bắt buộc)');
    if (!String(fullAddr(c) || '').trim()) l.push('Khách chưa có địa chỉ');
    if (!(rx.chanDoan || []).some(x => x && (x.ma || x.ten))) l.push('Đơn chưa có chẩn đoán');
    if (!(rx.items || []).length) l.push('Đơn chưa có thuốc nào');
    (rx.items || []).forEach((it, i) => {
      const n = 'Thuốc ' + (i + 1) + ' (' + (it.ten || 'chưa có tên') + ')';
      if (!it.ma) l.push(n + ': thiếu mã thuốc của Cục Quản lý Dược');
      if (!it.hoatChat) l.push(n + ': thiếu hoạt chất');
      if (!it.ten) l.push(n + ': thiếu tên thuốc');
      if (!it.dv) l.push(n + ': thiếu đơn vị tính');
      if (!(Number(it.sl) > 0)) l.push(n + ': thiếu số lượng');
      if (!it.cachDung) l.push(n + ': thiếu cách dùng');
    });
    if ((rx.loai || 'c') === 'c' && !this.cfg().hinhThuc)
      l.push('Chưa khai mã hình thức điều trị trong Cài đặt (chuẩn 808 bắt buộc với đơn thường)');
    /* Trẻ dưới 72 tháng thì 808 bắt buộc khai người giám hộ */
    if (this.treEm(c) && !String(rx.giamHo || '').trim())
      l.push('Khách dưới 6 tuổi — chuẩn 808 bắt buộc khai người giám hộ (họ tên, SĐT, địa chỉ)');
    return l;
  },

  /* ---------------- Chữ ký số ----------------
     Chỗ duy nhất còn chờ câu trả lời: ký trên chuỗi nào. Khi có, chỉ sửa trong đây —
     băm chuỗi đó bằng sha256() (đã có sẵn trong ky.js), gửi mã băm sang Apps Script để
     nó gọi MySign extendSigning, rồi gán chữ ký trả về vào rx.signature.
     Chưa có thì trả null, đơn vẫn gửi được với signature rỗng vì bảng dữ liệu đầu vào
     của 808 không đánh dấu trường này bắt buộc. */
  kySo(){ return null; },
};

/* ================= GIAO DIỆN KÊ ĐƠN =================
   Để trong file này cho gọn: app.js chỉ gọi sang, không chứa thêm logic chuẩn 808. */
Object.assign(DT, {
  /* Mã thuốc khai riêng trong Cài đặt, đè lên danh mục dựng sẵn.
     Khóa theo tên thương mại vì đó là thứ lễ tân chọn trên form. */
  mapMa(){ return (this.cfg().maThuoc) || {}; },
  dsThuoc(){
    const m = this.mapMa();
    return DM_THUOC.map(t => Object.assign({}, t, {ma: m[t.ten] || t.ma || ''}));
  },
  timThuoc(ten){
    const k = Combo.norm(String(ten || '').trim());
    return this.dsThuoc().find(t => Combo.norm(t.ten) === k) || null;
  },
  /* Đếm xem còn bao nhiêu thuốc chưa có mã — hiện ngay ở thẻ Cài đặt */
  soThieuMa(){ return this.dsThuoc().filter(t => !t.ma).length; },
  moTa(){
    const co = this.maCoSo();
    if (co.length !== 5) return 'Chưa khai mã liên thông cơ sở — chưa gửi được đơn nào';
    const thieu = this.soThieuMa();
    return 'Mã cơ sở ' + co + (thieu ? ' · còn ' + thieu + '/' + DM_THUOC.length + ' thuốc chưa có mã Cục Dược'
                                    : ' · đã khai đủ mã thuốc');
  },

  /* ---------------- Kê đơn ---------------- */
  SO_DONG: 6,
  form(cid){
    const c = custById(cid || App.state.treatCust);
    if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const tenThuoc = this.dsThuoc().map(t => ({t: t.ten + ' — ' + t.hoatChat + (t.ma ? '' : ' (chưa có mã)'), s: t.ten}));
    const dong = i => `<div class="form-grid full" style="grid-template-columns:3fr 1fr 1fr 3fr;gap:6px;margin-bottom:4px">
      <div class="f">${Combo.html('cbDT' + i, 'ten' + i, '', tenThuoc, 'Thuốc ' + (i + 1),
        'DT.chonThuoc(' + i + ',v)')}</div>
      <div class="f"><input name="sl${i}" type="number" min="0" step="1" placeholder="SL"></div>
      <div class="f"><input name="dv${i}" id="dvDT${i}" placeholder="Đơn vị" readonly></div>
      <div class="f"><input name="dung${i}" placeholder="Cách dùng, liều, thời gian"></div></div>`;

    /* Chẩn đoán lấy sẵn từ hồ sơ khám, lễ tân khỏi gõ lại; sửa được nếu khác */
    const dx = ((c.record || {}).chanDoan) || '';
    const tre = this.treEm(c), thang = this.soThang(c.dob);

    App.modal('Kê đơn thuốc — ' + c.name, `
    <form onsubmit="DT.save(event)">
      ${c.allergy ? `<div class="note-block mb" style="background:var(--danger-soft);color:var(--danger)">
        ⚠ Khách có ghi chú dị ứng: <b>${h(c.allergy)}</b></div>` : ''}
      ${!this.maCoSo() ? `<div class="note-block warn-block mb">Chưa khai <b>mã liên thông cơ sở</b> nên đơn này
        lưu được nhưng <b>chưa sinh được mã đơn</b> và chưa gửi lên hệ thống quốc gia được.
        Khai ở Cài đặt → Liên thông đơn thuốc.</div>` : ''}
      <div class="form-grid">
        <div class="f"><label>Loại đơn</label><select name="loai">
          ${Object.entries(this.LOAI).map(([k, v]) =>
            `<option value="${k}"${k === 'c' ? ' selected' : ''}>${h(v)} (${k})</option>`).join('')}
        </select></div>
        <div class="f"><label>Cân nặng (kg)</label><input name="canNang" type="number" min="0" step="0.1" placeholder="không bắt buộc"></div>
        <div class="f"><label>Tái khám sau (số ngày)</label><input name="taiKham" type="number" min="0" step="1" placeholder="vd: 7">
          <div class="combo-hint">Chuẩn 808 đòi <b>số ngày</b>, không phải ngày cụ thể.</div></div>
      </div>
      <div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbDTdx', 'dx', dx ? icdName(dx) : '', icdOptions(), 'Gõ tên bệnh hoặc mã ICD-10')}</div>
      <div class="f full"><label>Kết luận của bác sĩ</label><input name="ketLuan" placeholder="không bắt buộc"></div>
      ${tre ? `<div class="f full"><label>Người giám hộ (họ tên, SĐT, địa chỉ)</label>
        <input name="giamHo" placeholder="Bắt buộc với trẻ dưới 6 tuổi">
        <div class="combo-hint">Khách <b>${thang} tháng tuổi</b> — chuẩn 808 bắt buộc khai người giám hộ với trẻ dưới 72 tháng.</div></div>` : ''}
      <div class="full" style="margin-top:6px"><label>Thuốc</label></div>
      ${Array.from({length: this.SO_DONG}, (_, i) => dong(i)).join('')}
      <div class="f full"><label>Lời dặn</label><input name="loiDan" placeholder="Dặn khách sau khi dùng thuốc"></div>
      <div class="f full"><label>Lưu ý của bác sĩ</label><input name="luuY" placeholder="không bắt buộc"></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu đơn thuốc</button></div>
    </form>`);
  },
  /* Chọn thuốc thì điền sẵn đơn vị tính — lễ tân khỏi gõ, và khỏi gõ sai kiểu "viên/vien" */
  chonThuoc(i, ten){
    const t = this.timThuoc(ten);
    const o = document.getElementById('dvDT' + i);
    if (o) o.value = t ? t.dv : '';
  },
  save(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const items = [];
    for (let i = 0; i < this.SO_DONG; i++) {
      const ten = (d['ten' + i] || '').trim();
      if (!ten) continue;
      const t = this.timThuoc(ten);
      items.push({ma: t ? t.ma : '', hoatChat: t ? t.hoatChat : '', ten,
                  dv: (d['dv' + i] || (t ? t.dv : '')).trim(),
                  sl: Number(d['sl' + i]) || 0, cachDung: (d['dung' + i] || '').trim()});
    }
    if (!items.length) { App.toast('Đơn chưa có thuốc nào'); return; }

    /* Combo chẩn đoán trả về chuỗi "J03 — Viêm amidan cấp", tách lấy mã và tên */
    const dx = (d.dx || '').trim();
    const maDx = (dx.match(/^([A-Z]\d{2}(?:\.\d+)?)/) || [])[1] || '';
    const tenDx = dx.replace(/^[A-Z]\d{2}(?:\.\d+)?\s*[—-]\s*/, '').trim();

    const loai = (d.loai || 'c').toLowerCase();
    const rx = {
      id: uid(), customerId: App.state.treatCust, date: todayISO(),
      luc: new Date().toISOString(),
      doctorId: (Att.me && Att.me() && Att.me().id) || 'st1',
      loai, status: 'draft',
      code: this.maDon(loai),
      chanDoan: (maDx || tenDx) ? [{ma: maDx, ten: tenDx, ketLuan: (d.ketLuan || '').trim()}] : [],
      items,
      canNang: Number(d.canNang) || 0,
      taiKham: Number(d.taiKham) || 0,
      giamHo: (d.giamHo || '').trim(),
      loiDan: (d.loiDan || '').trim(),
      luuY: (d.luuY || '').trim(),
      signature: '',
    };
    db.rx.push(rx);
    save(); App.closeModal(); App.render();
    App.toast(rx.code ? 'Đã lưu đơn · mã ' + rx.code : 'Đã lưu đơn (chưa có mã — thiếu mã liên thông cơ sở)');
  },

  /* ---------------- Soát và gửi ----------------
     Chưa có client_id/mã liên thông thì chưa gọi API thật được. Bước này soát đủ 27
     trường rồi dựng sẵn đúng thân request, để khi có tài khoản chỉ việc đẩy đi. */
  gui(id){
    const rx = (db.rx || []).find(x => x.id === id);
    if (!rx) return;
    const loi = this.thieu(rx);
    if (loi.length) {
      App.modal('Chưa gửi được — còn thiếu ' + loi.length + ' chỗ', `
        <div class="note-block warn-block">Hệ thống đơn thuốc quốc gia trả lỗi 422 nếu thiếu trường bắt buộc,
          nhưng không nói rõ thiếu gì. Soát trước ở đây để sửa cho xong một lượt.</div>
        <ul style="margin:10px 0 0 18px;line-height:1.7">${loi.map(x => '<li>' + h(x) + '</li>').join('')}</ul>
        <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
      return;
    }
    const body = JSON.stringify(this.json(rx), null, 2);
    App.modal('Đơn đã đủ chuẩn 808', `
      <div class="note-block">Thân request gửi tới <b>POST /api/v1/gui-don-thuoc</b> đã dựng xong và đúng chuẩn.
        Chưa đẩy đi được vì còn thiếu <b>mật khẩu cơ sở và mã liên thông bác sĩ</b> — hai thứ đó nằm bên Apps Script,
        không để trong app.</div>
      <div class="f full"><label>Thân request</label>
        <textarea rows="16" readonly style="font-family:ui-monospace,monospace;font-size:12px">${h(body)}</textarea></div>
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },

  /* ---------------- In đơn ---------------- */
  inDon(id){
    const r = (db.rx || []).find(x => x.id === id);
    if (!r) return;
    const c = custById(r.customerId) || {};
    const bs = staffById(r.doctorId);
    const dx = (r.chanDoan || []).map(x => [x.ma, x.ten].filter(Boolean).join(' — ')).join('; ');
    App.print(`
    <div class="p-head">
      <div><b>${h(db.clinic.name)}</b><br>${h(db.clinic.addr)}${db.clinic.phone ? '<br>ĐT: ' + h(db.clinic.phone) : ''}</div>
      <div>${r.code ? 'Mã đơn thuốc: <b>' + h(r.code) + '</b><br>' : ''}Ngày: ${fmtD(r.date)}</div></div>
    <h1>ĐƠN THUỐC${r.loai && r.loai !== 'c' ? ' (' + h(this.LOAI[r.loai] || '') + ')' : ''}</h1>
    <table class="no-border">
      <tr><td style="width:120px">Họ tên:</td><td><b>${h(c.name)}</b> — ${fmtD(c.dob)} · ${h(c.gender || '')}</td></tr>
      <tr><td>Địa chỉ:</td><td>${h(fullAddr(c) || '')}</td></tr>
      ${r.canNang ? `<tr><td>Cân nặng:</td><td>${h(String(r.canNang))} kg</td></tr>` : ''}
      ${r.giamHo ? `<tr><td>Người giám hộ:</td><td>${h(r.giamHo)}</td></tr>` : ''}
      <tr><td>Chẩn đoán:</td><td>${h(dx || '—')}</td></tr>
      ${c.allergy ? `<tr><td>Dị ứng:</td><td><b>${h(c.allergy)}</b></td></tr>` : ''}
    </table>
    <table><tr><th style="width:24px">#</th><th>Tên thuốc</th><th>Hoạt chất</th><th>SL</th><th>Cách dùng</th></tr>
    ${(r.items || []).map((it, i) => `<tr><td>${i + 1}</td><td><b>${h(it.ten)}</b></td>
      <td>${h(it.hoatChat || '')}</td><td class="num">${h(String(it.sl || ''))} ${h(it.dv || '')}</td>
      <td>${h(it.cachDung || '')}</td></tr>`).join('')}</table>
    ${r.loiDan ? `<p><b>Lời dặn:</b> ${h(r.loiDan)}</p>` : ''}
    ${r.taiKham ? `<p><b>Tái khám sau:</b> ${h(String(r.taiKham))} ngày</p>` : ''}
    <div class="sign"><div></div><div>Ngày ${fmtD(r.date)}<br><b>Bác sĩ kê đơn</b><br>${h(bs ? bs.name : '')}<br><br></div></div>`);
  },

  /* ---------------- Cài đặt ---------------- */
  hopCaiDat(){
    const g = this.cfg();
    App.modal('Liên thông đơn thuốc quốc gia', `
    <form onsubmit="DT.luuCaiDat(event)">
      <div class="f full"><label>Mã liên thông cơ sở (5 ký tự)</label>
        <input name="maCoSo" value="${h(g.maCoSo || '')}" maxlength="5" placeholder="vd: 89abc" style="text-transform:lowercase">
        <div class="combo-hint">Lấy trong tài khoản <b>donthuocquocgia.vn</b> sau khi Sở Y tế phê duyệt.
          Cấp theo Quyết định 384/QĐ-BYT: 2 ký tự đầu là mã tỉnh, 3 ký tự sau là số thứ tự cơ sở.
          Đây là <b>5 ký tự đầu của mọi mã đơn thuốc</b>, nên mỗi chi nhánh một mã riêng.</div></div>
      <div class="f full"><label>Mã hình thức điều trị</label>
        <input name="hinhThuc" type="number" min="0" value="${h(String(g.hinhThuc || ''))}" placeholder="chưa biết">
        <div class="combo-hint">Chuẩn 808 bắt buộc với đơn thường, lấy theo <b>danh mục hình thức điều trị do Bộ Y tế
          ban hành</b> — nhưng tài liệu không in kèm danh mục đó. Hỏi đơn vị hỗ trợ kỹ thuật
          (medcomm, 1900.8960 nhánh 4) rồi điền một lần.</div></div>
      <div class="note-block full">Mật khẩu cơ sở <b>không khai ở đây</b>. Mật khẩu đó thêm và xóa được bác sĩ
        khỏi phòng khám trên hệ thống quốc gia, để trong app thì ai mở app cũng đọc ra — nên nó nằm bên Apps Script,
        app chỉ gọi sang.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu</button></div>
    </form>`);
  },
  luuCaiDat(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const ma = (d.maCoSo || '').trim().toLowerCase();
    if (ma && ma.length !== 5) { App.toast('Mã liên thông cơ sở phải đúng 5 ký tự'); return; }
    db.clinic.dt = Object.assign({}, db.clinic.dt, {maCoSo: ma, hinhThuc: Number(d.hinhThuc) || 0});
    save(); App.closeModal(); App.render(); App.toast('Đã lưu ✓');
  },

  /* Bảng khai mã thuốc. Để riêng vì khai một lần rồi thôi, mà danh mục thì dài. */
  hopMaThuoc(){
    const ds = this.dsThuoc();
    App.modal('Mã thuốc của Cục Quản lý Dược', `
    <form onsubmit="DT.luuMaThuoc(event)">
      <div class="note-block mb">Chuẩn 808 bắt buộc mỗi thuốc một <b>mã thuốc do Cục Quản lý Dược cấp</b> (tối đa 20 ký tự).
        Phần mềm <b>cố tình để trống</b> thay vì tự nghĩ ra số cho đủ chỗ — mã bịa là gửi rác lên hệ thống quốc gia
        mà vẫn được trả về 200 OK. Khai một lần, sau đó mọi đơn tự dùng theo.</div>
      <div class="tbl-wrap"><table><thead><tr><th>Tên thương mại</th><th>Hoạt chất</th><th>Đơn vị</th><th style="width:170px">Mã thuốc</th></tr></thead>
      <tbody>${ds.map((t, i) => `<tr>
        <td><b>${h(t.ten)}</b></td><td>${h(t.hoatChat)}</td><td>${h(t.dv)}</td>
        <td><input name="ma${i}" value="${h(t.ma)}" maxlength="20" placeholder="chưa có"></td></tr>`).join('')}</tbody></table></div>
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu ${ds.length} mã</button></div>
    </form>`);
  },
  luuMaThuoc(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const m = {};
    DM_THUOC.forEach((t, i) => { const v = (d['ma' + i] || '').trim(); if (v) m[t.ten] = v; });
    db.clinic.dt = Object.assign({}, db.clinic.dt, {maThuoc: m});
    save(); App.closeModal(); App.render();
    App.toast('Đã lưu · còn ' + this.soThieuMa() + ' thuốc chưa có mã');
  },
});
