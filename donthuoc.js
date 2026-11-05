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

/* 808 tự nói ngược nhau ở hai chỗ, ví dụ FormData một kiểu, bảng dữ liệu đầu vào một kiểu:
   - phần tử chẩn đoán: ma_chan_doan/ten_chan_doan  ↔  ma_benh/ten_benh (trường 12)
   - mã thẻ BHYT:       ma_so_the_bao_hiem_y_te     ↔  ma_so_bao_hiem_y_te (trường 9)
   Không biết bên nào đúng nên gửi CẢ HAI tên. Máy chủ của họ (Laravel) bỏ qua trường
   lạ, nên tên thừa không làm hỏng đơn, còn tên đúng thì chắc chắn có mặt. */

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

  /* Hai chi nhánh là hai cơ sở được cấp phép riêng nên có hai mã riêng:
     Thời Đại (Rạch Giá) 91AQL · Gò Quao 91AQM. Mã sai là mã đơn thuốc mang tên cơ sở
     khác, tra cứu ra nhầm chỗ.
     Danh sách chi nhánh thì chung cho cả phòng khám nên nằm trong db (đồng bộ được),
     NHƯNG "máy này đang ở chi nhánh nào" thì KHÔNG đồng bộ — nó là tính chất của cái
     máy, không phải của dữ liệu. Để trong db thì máy Gò Quao đổi một cái là máy Rạch
     Giá đổi theo, rồi kê đơn ra mã của chi nhánh kia mà không ai biết. */
  KHOA_MAY: 'nkhb_coso',
  coSoDS(){
    const ds = (this.cfg().coSo || []).filter(x => x && x.ma);
    if (ds.length) return ds;
    /* Bản cũ chỉ có một ô mã — nhận làm chi nhánh đầu tiên để không mất */
    const cu = String(this.cfg().maCoSo || '').trim();
    return cu ? [{ma: cu, ten: db.clinic.name || 'Cơ sở chính'}] : [];
  },
  coSoMay(){
    const ds = this.coSoDS();
    if (!ds.length) return null;
    let ma = '';
    try { ma = localStorage.getItem(this.KHOA_MAY) || ''; } catch(e){}
    return ds.find(x => x.ma === ma) || ds[0];
  },
  datCoSoMay(ma){ try { localStorage.setItem(this.KHOA_MAY, ma || ''); } catch(e){} },
  maCoSo(){ const c = this.coSoMay(); return c ? String(c.ma).trim() : ''; },
  tenCoSo(){ const c = this.coSoMay(); return c ? (c.ten || c.ma) : ''; },

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
     Trả về đúng hình dạng FormData mà 808 in trong tài liệu. Chưa có chữ ký thì BỎ
     HẲN trường signature chứ không gửi chuỗi rỗng: 808 không đánh dấu nó bắt buộc,
     nhưng có mặt mà rỗng thì máy chủ có thể kiểm định dạng rồi từ chối. Phần mềm eRx
     (donthuocdientu.vn) đang chạy thật cũng gửi đơn không kèm chữ ký. */
  json(rx){
    const c = custById(rx.customerId) || {};
    const cfg = this.cfg();
    const sdt = String(c.phone || '').replace(/\D/g, '').slice(0, 12);
    const cccd = String(c.cccd || '').replace(/\D/g, '').slice(0, 12);

    const chan = (rx.chanDoan || []).filter(x => x && (x.ma || x.ten)).map(x => ({
      ma_chan_doan: x.ma || '', ten_chan_doan: x.ten || '',
      ma_benh: x.ma || '', ten_benh: x.ten || '',
      ket_luan: x.ketLuan || ''}));

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
    };
    if (rx.signature) o.signature = rx.signature;

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
    /* Thẻ BHYT in 15 ký tự (GD4 91 2345678901): 2 chữ đối tượng + 1 số quyền lợi + 2 số
       tỉnh + 10 số MÃ SỐ BHXH. 808 đòi "mã số" 10 ký tự, tức là 10 số CUỐI, không phải
       10 ký tự đầu như bản trước cắt. */
    const bhyt = String(c.bhyt || '').replace(/\s/g, '').toUpperCase();
    if (bhyt) o.ma_so_bao_hiem_y_te = o.ma_so_the_bao_hiem_y_te = bhyt.length === 15 ? bhyt.slice(5) : bhyt.slice(0, 10);
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
    if (this.maCoSo().length !== 5) l.push('Máy này chưa chọn chi nhánh — vào Cài đặt → Liên thông đơn thuốc');
    /* Đơn kê ở chi nhánh này mà mang mã chi nhánh kia thì tra cứu ra nhầm cơ sở */
    if (rx.coSo && this.maCoSo() && rx.coSo !== this.maCoSo())
      l.push('Đơn này kê cho ' + (rx.tenCoSo || rx.coSo) + ' nhưng máy đang đặt ở ' + this.tenCoSo()
             + ' — đổi chi nhánh của máy rồi gửi lại');
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
     Chưa có thì trả null, đơn vẫn gửi được, json() bỏ hẳn trường signature vì bảng dữ
     liệu đầu vào của 808 không đánh dấu trường này bắt buộc. */
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
    const ds = this.coSoDS();
    if (!ds.length) return 'Chưa khai chi nhánh nào — chưa gửi được đơn nào';
    const c = this.coSoMay(), thieu = this.soThieuMa();
    return 'Máy này kê đơn cho <b>' + h(c.ten || c.ma) + '</b> (' + h(c.ma) + ')'
      + (ds.length > 1 ? ' · có ' + ds.length + ' chi nhánh' : '')
      + (thieu ? ' · còn ' + thieu + '/' + DM_THUOC.length + ' thuốc chưa có mã Cục Dược'
               : ' · đã khai đủ mã thuốc');
  },

  /* ---------------- Kê đơn ---------------- */
  SO_DONG: 6,
  form(cid){
    const c = custById(cid || App.state.treatCust);
    if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const tenThuoc = this.dsThuoc().map(t => ({t: t.ten + ' — ' + t.hoatChat + (t.ma ? '' : ' (chưa có mã)'), s: t.ten}));
    const dong = i => `<div class="form-grid full" style="grid-template-columns:3fr 1fr 1fr 3fr;gap:6px;margin-bottom:4px">
      ${/* Combo gọi onpick như MỘT HÀM: r.onpick(v, inp). Trước đây chỗ này truyền một
            CHUỖI nên chọn thuốc từ danh sách gợi ý là ném lỗi và ô đơn vị không tự điền
            — gõ tay thì không sao nên lỗi lọt qua. */''}
      <div class="f">${Combo.html('cbDT' + i, 'ten' + i, '', tenThuoc, 'Thuốc ' + (i + 1),
        v => DT.chonThuoc(i, v))}</div>
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
      /* Ghi luôn chi nhánh đã kê. Mã đơn đã mang 5 ký tự này ở đầu, nhưng lưu rời ra
         thì lọc đơn theo chi nhánh khỏi phải cắt chuỗi, và đổi mã sau này không làm
         mất dấu đơn cũ thuộc về đâu. */
      coSo: this.maCoSo(), tenCoSo: this.tenCoSo(),
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
     App không tự gọi API quốc gia: mật khẩu bác sĩ không được nằm trong trang web tĩnh.
     Đơn gửi sang Apps Script (donthuoc-lienthong/Code.gs trong vault), nó giữ mật khẩu,
     đăng nhập lấy token rồi chuyển đi.

     Đơn LUÔN được lưu trước, gửi sau — học theo eRx. Kết quả mỗi lần gửi ghi vào rx.lt:
       tt 'ok'   đã nằm trên hệ thống quốc gia (rx.status = 'sent')
          'loi'  bị từ chối (422) — phải sửa đơn, gửi lại y nguyên vẫn bị từ chối
          'cho'  mạng rớt / máy chủ quốc gia lỗi — đơn không sai, gửi lại sau là được
     Gửi lại dùng ĐÚNG mã đơn cũ (mã sinh lúc lưu), nên lỡ lần trước đã tới nơi thì hệ
     thống báo trùng mã và Apps Script coi như đã gửi, không thành hai đơn. */
  mayChu(){ return String(this.cfg().gasUrl || '').trim(); },
  /* Đơn chờ gửi lại: đủ chuẩn, chưa gửi được vì lỗi mạng */
  dsCho(){ return (db.rx || []).filter(r => r.status !== 'sent' && r.lt && r.lt.tt === 'cho'); },
  dsTuChoi(){ return (db.rx || []).filter(r => r.status !== 'sent' && r.lt && r.lt.tt === 'loi'); },

  async goiMayChu(q){
    if (!Cloud.loggedIn()) return {ok: false, tt: 'loi', msg: 'Phải đăng nhập app mới gửi được đơn — máy chủ gửi đơn hỏi lại phiên đăng nhập.'};
    /* Phiên Supabase sống 1 giờ; sắp hết thì gia hạn trước, kẻo Apps Script hỏi lại thấy hết hạn */
    if (Cloud.session.expires_at && Date.now() > Cloud.session.expires_at - 120000) await Cloud.refresh();
    if (!Cloud.loggedIn()) return {ok: false, tt: 'loi', msg: 'Phiên đăng nhập đã hết — đăng nhập lại app.'};
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      /* text/plain để trình duyệt khỏi hỏi CORS trước — Apps Script không trả lời được câu hỏi đó */
      const r = await fetch(this.mayChu(), {method: 'POST', body: JSON.stringify(Object.assign({jwt: Cloud.session.access_token}, q)),
        headers: {'Content-Type': 'text/plain;charset=utf-8'}, signal: ctrl.signal});
      const d = await r.json();
      return d && d.tt ? d : {ok: false, tt: 'cho', msg: 'Máy chủ gửi đơn trả lời lạ'};
    } catch(e){
      return {ok: false, tt: 'cho', msg: navigator.onLine === false ? 'Máy đang mất mạng' : 'Không gọi được máy chủ gửi đơn (' + (e.name === 'AbortError' ? 'quá lâu' : e.message) + ')'};
    } finally { clearTimeout(to); }
  },

  /* Gửi một đơn, ghi kết quả vào đơn. Không mở hộp thoại — dùng chung cho gửi lại hàng loạt. */
  async guiMot(rx){
    const bs = staffById(rx.doctorId);
    const kq = await this.goiMayChu({a: 'gui', bs: (bs && bs.email) || '', don: this.json(rx)});
    rx.lt = {tt: kq.tt, luc: new Date().toISOString(), msg: kq.msg || '', loi: kq.loi || [],
             lan: ((rx.lt && rx.lt.lan) || 0) + 1, boi: Cloud.who()};
    if (kq.tt === 'ok') rx.status = 'sent';
    return kq;
  },

  gui(id){
    const rx = (db.rx || []).find(x => x.id === id);
    if (!rx) return;
    const loi = this.thieu(rx);
    const bs = staffById(rx.doctorId);
    if (this.mayChu() && !(bs && bs.email)) loi.push('Bác sĩ kê đơn chưa có email trong Nhân sự — Apps Script tìm mã liên thông bác sĩ theo email');
    if (loi.length) {
      App.modal('Chưa gửi được — còn thiếu ' + loi.length + ' chỗ', `
        <div class="note-block warn-block">Hệ thống đơn thuốc quốc gia trả lỗi 422 nếu thiếu trường bắt buộc,
          nhưng không nói rõ thiếu gì. Soát trước ở đây để sửa cho xong một lượt.</div>
        <ul style="margin:10px 0 0 18px;line-height:1.7">${loi.map(x => '<li>' + h(x) + '</li>').join('')}</ul>
        <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
      return;
    }
    if (!this.mayChu()) {
      const body = JSON.stringify(this.json(rx), null, 2);
      App.modal('Đơn đã đủ chuẩn 808', `
        <div class="note-block">Đơn đã đủ chuẩn nhưng <b>chưa khai máy chủ gửi đơn</b> (Apps Script giữ mật khẩu bác sĩ).
          Cài theo <b>donthuoc-lienthong/HUONG-DAN.md</b> rồi dán đường dẫn vào Cài đặt → Liên thông đơn thuốc → Khai mã.</div>
        <div class="f full"><label>Thân request sẽ gửi tới POST /api/v1/gui-don-thuoc</label>
          <textarea rows="16" readonly style="font-family:ui-monospace,monospace;font-size:12px">${h(body)}</textarea></div>
        <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Đóng</button></div>`);
      return;
    }
    App.modal('Đang gửi đơn ' + rx.code,'<div class="note-block">Đang gửi lên hệ thống đơn thuốc quốc gia…</div>');
    this.guiMot(rx).then(kq => {
      save(); App.render();
      App.modal(kq.tt === 'ok' ? 'Đã liên thông ✓' : kq.tt === 'cho' ? 'Chưa gửi được — sẽ gửi lại' : 'Hệ thống từ chối đơn', `
        <div class="note-block ${kq.tt === 'ok' ? '' : 'warn-block'}">${h(kq.msg || '')}
          ${kq.tt === 'cho' ? '<br>Đơn đã lưu, không mất. App tự gửi lại khi có mạng, hoặc bấm "Gửi lại" ở thẻ đơn.' : ''}
          ${kq.tt === 'loi' ? '<br>Sửa theo các lỗi dưới đây rồi gửi lại — gửi y nguyên sẽ bị từ chối tiếp.' : ''}</div>
        ${(kq.loi || []).length ? `<ul style="margin:10px 0 0 18px;line-height:1.7">${kq.loi.map(x => '<li>' + h(x) + '</li>').join('')}</ul>` : ''}
        <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
    });
  },

  /* Gửi lại mọi đơn đang chờ vì lỗi mạng. Gửi lần lượt từng đơn, không gửi song song,
     để không đăng nhập cùng lúc nhiều lần bên hệ thống quốc gia. */
  dangGuiLai: false,
  async guiLai(imLang){
    if (this.dangGuiLai || !this.mayChu()) return;
    const ds = this.dsCho();
    if (!ds.length) { if (!imLang) App.toast('Không còn đơn nào chờ gửi'); return; }
    this.dangGuiLai = true;
    let ok = 0;
    try {
      for (const rx of ds) {
        const kq = await this.guiMot(rx);
        if (kq.tt === 'ok') ok++;
        /* Máy chủ vẫn lỗi thì dừng, đợi lần sau, khỏi gọi dồn */
        if (kq.tt === 'cho') break;
      }
    } finally { this.dangGuiLai = false; }
    save(); App.render();
    if (!imLang || ok) App.toast('Đã gửi lại ' + ok + '/' + ds.length + ' đơn' + (ok < ds.length ? ' · còn lại sẽ thử sau' : ''));
  },
  /* Tự gửi lại: lúc mở app và khi có mạng trở lại. Chỉ đơn lần gửi trước đã quá 5 phút. */
  tuGuiLai(){
    if (!this.mayChu() || !Cloud.loggedIn()) return;
    const cu = this.dsCho().filter(r => !r.lt.luc || Date.now() - new Date(r.lt.luc).getTime() > 5 * 60000);
    if (cu.length) this.guiLai(true);
  },

  async thuKetNoi(){
    if (!this.mayChu()) { App.toast('Chưa khai máy chủ gửi đơn'); return; }
    const me = Perm.me();
    App.toast('Đang thử đăng nhập hệ thống quốc gia…');
    const kq = await this.goiMayChu({a: 'thu', bs: (me && me.email) || Cloud.who(), coSo: this.maCoSo()});
    App.modal(kq.ok ? 'Kết nối được ✓' : 'Chưa kết nối được', `
      <div class="note-block ${kq.ok ? '' : 'warn-block'}">${h(kq.msg || '')}</div>
      ${(kq.loi || []).length ? `<ul style="margin:10px 0 0 18px;line-height:1.7">${kq.loi.map(x => '<li>' + h(x) + '</li>').join('')}</ul>` : ''}
      <div class="combo-hint">Thử bằng tài khoản đang đăng nhập (${h(Cloud.who() || '—')}) tại ${h(this.tenCoSo() || '—')}.
        Không gửi đơn nào.</div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },

  /* Danh sách đơn chưa liên thông, mở từ Cài đặt */
  hopChuaGui(){
    const ds = [...this.dsCho(), ...this.dsTuChoi()].sort((a, b) => a.date < b.date ? 1 : -1);
    App.modal('Đơn chưa liên thông', `
      ${ds.length ? `<div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th>Khách</th><th>Mã đơn</th><th>Tình trạng</th></tr></thead>
        <tbody>${ds.map(r => `<tr><td class="num">${fmtD(r.date)}</td><td>${h((custById(r.customerId) || {}).name || '')}</td>
          <td class="num">${h(r.code || '')}</td>
          <td>${r.lt.tt === 'cho' ? '<span class="pill warn">Chờ gửi lại</span>' : '<span class="pill danger">Bị từ chối</span>'}
            <br><span class="sub-line">${h(r.lt.msg || '')}${(r.lt.loi || []).length ? ' — ' + h(r.lt.loi.join('; ')) : ''}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="note-block">Mọi đơn đã lưu đều đã liên thông hoặc chưa bấm gửi.</div>'}
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button>
        ${this.dsCho().length ? `<button class="btn primary" onclick="App.closeModal();DT.guiLai()">Gửi lại ${this.dsCho().length} đơn chờ</button>` : ''}</div>`);
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
  SO_CS: 4,
  hopCaiDat(){
    const g = this.cfg(), ds = this.coSoDS(), may = this.coSoMay();
    const dong = i => {
      const c = ds[i] || {ma: '', ten: ''};
      return `<tr>
        <td><input type="radio" name="may" value="${i}"${may && c.ma && c.ma === may.ma ? ' checked' : ''}></td>
        <td><input name="ten${i}" value="${h(c.ten || '')}" placeholder="Tên chi nhánh"></td>
        <td><input name="ma${i}" value="${h(c.ma || '')}" maxlength="5" placeholder="5 ký tự"
              style="text-transform:uppercase;width:90px"></td></tr>`;
    };
    App.modal('Liên thông đơn thuốc quốc gia', `
    <form onsubmit="DT.luuCaiDat(event)">
      <div class="full"><label>Chi nhánh và mã liên thông</label>
        <div class="tbl-wrap"><table><thead><tr>
          <th style="width:80px">Máy này</th><th>Tên chi nhánh</th><th style="width:110px">Mã liên thông</th>
        </tr></thead><tbody>${Array.from({length: this.SO_CS}, (_, i) => dong(i)).join('')}</tbody></table></div>
        <div class="combo-hint">Mã lấy trong tài khoản <b>donthuocquocgia.vn</b> sau khi Sở Y tế phê duyệt.
          Cấp theo Quyết định 384/QĐ-BYT: 2 ký tự đầu là mã tỉnh, 3 ký tự sau là số thứ tự cơ sở.
          Đây là <b>5 ký tự đầu của mọi mã đơn thuốc</b> nên mỗi chi nhánh một mã riêng —
          Thời Đại và Gò Quao là hai cơ sở được cấp phép riêng.</div></div>
      <div class="note-block full">Cột <b>Máy này</b> chỉ đặt cho <b>riêng máy đang dùng</b>, không đồng bộ sang máy khác.
        Mỗi máy đứng ở một chi nhánh, nên máy nào tự nhớ chi nhánh của máy đó. Nếu để chung thì
        bên Gò Quao đổi một cái là bên Rạch Giá kê đơn ra mã Gò Quao mà không ai biết.</div>
      <div class="f full"><label>Mã hình thức điều trị</label>
        <input name="hinhThuc" type="number" min="0" value="${h(String(g.hinhThuc || ''))}" placeholder="chưa biết">
        <div class="combo-hint">Chuẩn 808 bắt buộc với đơn thường, lấy theo <b>danh mục hình thức điều trị do Bộ Y tế
          ban hành</b> — nhưng tài liệu không in kèm danh mục đó. Hỏi đơn vị hỗ trợ kỹ thuật
          (medcomm, 1900.8960 nhánh 4) rồi điền một lần.</div></div>
      <div class="f full"><label>Máy chủ gửi đơn (Apps Script)</label>
        <input name="gasUrl" value="${h(g.gasUrl || '')}" placeholder="https://script.google.com/macros/s/…/exec">
        <div class="combo-hint">Đường dẫn <b>/exec</b> của Apps Script <b>donthuoc-lienthong</b>. Cách cài ở HUONG-DAN.md cùng thư mục.
          Để trống thì đơn chỉ soát và xem trước, chưa gửi đi.</div></div>
      <div class="note-block full">Mật khẩu cơ sở và mật khẩu bác sĩ <b>không khai ở đây</b>. Mật khẩu đó đăng nhập được
        hệ thống quốc gia, để trong app thì ai mở app cũng đọc ra — nên nó nằm trong Script Properties của Apps Script,
        app chỉ gọi sang. Apps Script tìm mã liên thông bác sĩ theo <b>email</b> của bác sĩ trong Nhân sự.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu</button></div>
    </form>`);
  },
  luuCaiDat(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    /* Giữ theo ĐÚNG số thứ tự dòng trước, rồi mới bỏ dòng trống. Nút radio "Máy này"
       mang số dòng, nên nếu nén danh sách trước thì bỏ một dòng trống ở trên là số
       lệch hết, chọn Gò Quao lại ra Thời Đại. */
    const hang = [];
    for (let i = 0; i < this.SO_CS; i++) {
      /* Giữ nguyên CHỮ HOA như hệ thống đơn thuốc quốc gia cấp — Thời Đại 91AQL,
         Gò Quao 91AQM. Hạ về chữ thường là mã đơn ra "91aql…", lệch mã đã đăng ký. */
      const ma = (d['ma' + i] || '').trim().toUpperCase();
      const ten = (d['ten' + i] || '').trim();
      if (!ma && !ten) { hang[i] = null; continue; }
      if (ma.length !== 5) { App.toast('Mã liên thông phải đúng 5 ký tự — dòng "' + (ten || ma) + '"'); return; }
      if (hang.some(x => x && x.ma === ma)) { App.toast('Mã ' + ma + ' bị khai hai lần'); return; }
      hang[i] = {ma, ten: ten || ma};
    }
    const ds = hang.filter(Boolean);
    /* Bỏ maCoSo của bản cũ đi, không thì coSoDS() có thể đọc nhầm về sau */
    const cu = Object.assign({}, db.clinic.dt);
    delete cu.maCoSo;
    const gasUrl = (d.gasUrl || '').trim();
    if (gasUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(gasUrl)) {
      App.toast('Đường dẫn máy chủ gửi đơn phải có dạng https://script.google.com/macros/s/…/exec'); return;
    }
    db.clinic.dt = Object.assign(cu, {coSo: ds, hinhThuc: Number(d.hinhThuc) || 0, gasUrl});

    /* Chi nhánh của máy này: lưu riêng ngoài db nên không đồng bộ sang máy khác */
    const i = Number(d.may);
    const chon = hang[i] || this.coSoMay() || ds[0] || null;
    if (chon) this.datCoSoMay(chon.ma);

    save(); App.closeModal(); App.render();
    App.toast(chon ? 'Đã lưu · máy này kê đơn cho ' + (chon.ten || chon.ma) : 'Đã lưu ✓');
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
