/* Bảng lương tháng theo Quy chế lương, thưởng của Gò Quao (05/2026/QĐ-HB-GQ).

   Mỗi người một "phiếu lương" gồm từng khoản riêng: lương chức danh, các khoản hỗ trợ
   (Chương III), hoa hồng và thưởng theo doanh thu (Chương IV), các loại thưởng (Chương V),
   rồi các khoản khấu trừ. Khoản nào cũng có dòng CĂN CỨ ghi rõ lấy số từ đâu — lịch hẹn,
   hồ sơ khách, diễn biến điều trị, phiếu thu, chấm công — để khi cơ quan BHXH hay thuế hỏi
   vì sao tháng này thưởng nhiều tháng kia ít thì có ngay minh chứng.

   Quản lý được sửa mọi khoản: số tự tính vẫn giữ nguyên bên cạnh, số sửa phải kèm lý do,
   và lần sửa nào cũng ghi vào lịch sử của phiếu. Ở trang Tổng hợp còn loại được từng
   khách khỏi thưởng, hoặc gán lại khách cho đúng người. Chốt xong thì phiếu đóng băng. */
'use strict';

const Luong = {
  thang: null,

  /* ---------- Mức tiền theo quy chế ---------- */
  NHOM: {
    bs:     {ten: 'Bác sĩ RHM',                  anCa: 100000, dienThoai: 300000, chuyenCan: 700000, hq: [[90, 900000], [75, 600000], [60, 300000]], heSo: 2},
    trothu: {ten: 'Phụ tá, điều dưỡng',          anCa: 50000,  dienThoai: 0,      chuyenCan: 300000, hq: [[90, 600000], [75, 400000], [60, 200000]], heSo: 1},
    letan:  {ten: 'Lễ tân',                      anCa: 50000,  dienThoai: 200000, chuyenCan: 300000, hq: [[90, 600000], [75, 400000], [60, 200000]], heSo: 1},
    media:  {ten: 'Media – Marketing',           anCa: 50000,  dienThoai: 200000, chuyenCan: 300000, hq: [[90, 600000], [75, 400000], [60, 200000]], heSo: 1},
    btg:    {ten: 'Điều dưỡng không trọn thời gian', anCa: 50000, dienThoai: 0,   chuyenCan: 0,      hq: [],                                         heSo: 1},
    khac:   {ten: 'Khác (quản lý, kế toán)',     anCa: 0,      dienThoai: 0,      chuyenCan: 0,      hq: [],                                         heSo: 1},
  },
  XANG: [[15, 30000], [30, 50000], [50.0001, 70000], [Infinity, 100000]],   /* km một chiều: dưới 15 / 15–<30 / 30–50 / trên 50 */
  ONLINE: ['Facebook', 'Zalo', 'TikTok', 'Google', 'Đặt hẹn online'],
  CONG_CHUAN: 26,
  /* QĐ 10/2026/QĐ-HB-GQ: quy chế sửa đổi áp dụng từ kỳ lương tháng 11/2026. Tháng trước
     đó tính theo quy chế cũ (QĐ 05): xăng xe khoán theo chức danh, quỹ 1,5% và 1% tính trên
     toàn bộ doanh thu, chưa có thưởng hiệu quả tháng, Điều 19, Điều 20. */
  HIEU_LUC: '2026-11',
  /* Quỹ Điều 10, 11 và thưởng Điều 20 chỉ tính trên phần doanh thu thuần vượt mức này */
  NGUONG_DT: 300000000,
  XANG_CU: {bs: 50000, trothu: 30000, letan: 30000, media: 30000, btg: 30000, khac: 0},
  quyCheMoi(M){ return M >= this.HIEU_LUC; },

  /* Các khoản trên phiếu lương, theo thứ tự in. loai: thu (cộng) / tru (trừ) */
  KHOAN: [
    {k: 'luong',      ten: 'Lương chức danh (đóng BHXH)',                cc: 'Điều 4, 5',     loai: 'thu', nhom: 'Lương'},
    {k: 'anCa',       ten: 'Hỗ trợ ăn giữa ca',                         cc: 'Điều 8',        loai: 'thu', nhom: 'Hỗ trợ'},
    {k: 'xangXe',     ten: 'Hỗ trợ xăng xe, đi lại',                    cc: 'Mục 8.3, 8.4',  loai: 'thu', nhom: 'Hỗ trợ'},
    {k: 'dienThoai',  ten: 'Hỗ trợ điện thoại, liên lạc',               cc: 'Mục 8.5',       loai: 'thu', nhom: 'Hỗ trợ'},
    {k: 'hoaHong',    ten: 'Hoa hồng điều trị',                         cc: 'Điều 9',        loai: 'thu', nhom: 'Hoa hồng & thưởng doanh thu'},
    {k: 'htdt',       ten: 'Thưởng hỗ trợ điều trị (quỹ 1,5%)',         cc: 'Điều 10',       loai: 'thu', nhom: 'Hoa hồng & thưởng doanh thu'},
    {k: 'ptkh',       ten: 'Thưởng phát triển khách hàng (quỹ 1%)',     cc: 'Điều 11',       loai: 'thu', nhom: 'Hoa hồng & thưởng doanh thu'},
    {k: 'thuNo',      ten: 'Thưởng thu hồi công nợ (2%)',               cc: 'Mục 11.3',      loai: 'thu', nhom: 'Hoa hồng & thưởng doanh thu'},
    {k: 'chuyenCan',  ten: 'Thưởng chuyên cần',                         cc: 'Điều 17',       loai: 'thu', nhom: 'Thưởng'},
    {k: 'hieuQua',    ten: 'Thưởng hiệu quả công việc',                 cc: 'Điều 18',       loai: 'thu', nhom: 'Thưởng'},
    {k: 'phuCa',      ten: 'Thưởng phụ ca kỹ thuật',                    cc: 'Mục 19.1',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'ksnk',       ten: 'Thưởng tuân thủ KSNK',                      cc: 'Mục 19.1',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'chungChi',   ten: 'Thưởng đạt chứng chỉ',                      cc: 'Mục 19.1',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'dungHen',    ten: 'Thưởng tỷ lệ khách đến đúng hẹn',           cc: 'Mục 19.2',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'khachMoi',   ten: 'Thưởng người bệnh mới',                     cc: 'Mục 19.2, 19.3',loai: 'thu', nhom: 'Thưởng'},
    {k: 'vuotDT',     ten: 'Thưởng vượt doanh thu cá nhân',             cc: 'Mục 19.4',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'kyThuat',    ten: 'Thưởng ca kỹ thuật cao',                    cc: 'Mục 19.4',      loai: 'thu', nhom: 'Thưởng'},
    {k: 'mucTieu',    ten: 'Thưởng vượt mức doanh thu cơ sở (300 triệu)', cc: 'Điều 20',       loai: 'thu', nhom: 'Thưởng'},
    {k: 'thuongKhac', ten: 'Thưởng khác (lễ, Tết, thâm niên, sáng kiến…)', cc: 'Điều 13–16, 21', loai: 'thu', nhom: 'Thưởng'},
    {k: 'bhxh',       ten: 'BHXH, BHYT, BHTN người lao động đóng (10,5%)', cc: 'Điều 23',     loai: 'tru', nhom: 'Khấu trừ'},
    {k: 'thue',       ten: 'Thuế thu nhập cá nhân',                     cc: 'Mục 23.3',      loai: 'tru', nhom: 'Khấu trừ'},
    {k: 'tamUng',     ten: 'Tạm ứng trong tháng',                       cc: 'Mục 6.5',       loai: 'tru', nhom: 'Khấu trừ'},
    {k: 'khauTru',    ten: 'Khấu trừ bồi thường thiệt hại',             cc: 'Điều 7',        loai: 'tru', nhom: 'Khấu trừ'},
  ],
  /* Ô quản lý nhập tay mỗi tháng (phần mềm không có dữ liệu để tự biết) */
  NHAP: {
    nghiKP:   {ten: 'Số ngày nghỉ không phép', nhom: ['bs', 'trothu', 'letan', 'media']},
    ksnk:     {ten: 'Tỷ lệ đạt bảng kiểm KSNK (%)', nhom: ['trothu', 'btg']},
    chungChi: {ten: 'Số chứng chỉ mới được cấp', nhom: ['trothu', 'btg']},
    diemHQ:   {ten: 'Điểm thưởng hiệu quả (0–100)', nhom: ['trothu', 'letan', 'media']},
    thuNo:    {ten: 'Tiền nợ quá hạn đã thu nhờ nhắc nợ (₫)', nhom: ['letan'], tien: true},
    tamUng:   {ten: 'Tạm ứng trong tháng (₫)', tien: true},
    thue:     {ten: 'Thuế TNCN khấu trừ (₫)', tien: true},
  },

  /* ---------- Tiện ích ---------- */
  M(){ return this.thang || (this.thang = DanhGia.macDinhThang()); },
  nhanThang(M){ return M.slice(5) + '/' + M.slice(0, 4); },
  quanLy(){ return Perm.can('caidat'); },
  norm(s){ return Combo.norm(String(s || '')); },
  nhomCua(st){
    const pl = st.pl || {};
    if (pl.nhom && this.NHOM[pl.nhom]) return pl.nhom;
    const t = this.norm(st.role);
    if (/bac si/.test(t)) return 'bs';
    if (/khong tron|ban thoi gian/.test(t)) return 'btg';
    if (/phu ta|tro thu|dieu duong/.test(t)) return 'trothu';
    if (/le tan|tiep tan/.test(t)) return 'letan';
    if (/media|marketing/.test(t)) return 'media';
    return 'khac';
  },
  dsNV(M){
    return db.staff.filter(s => s.active !== false || this.phieu(s.id, M)
      || (db.attLog || []).some(l => l.staffId === s.id && monthOf(l.date) === M));
  },
  phieu(stId, M){ return (db.bangLuong || []).find(r => r.id === 'bl_' + stId + '_' + M); },
  phieuMoi(stId, M){
    if (!db.bangLuong) db.bangLuong = [];
    let r = this.phieu(stId, M);
    if (!r) { r = {id: 'bl_' + stId + '_' + M, staffId: stId, thang: M, nhap: {}, sua: {}, lichSu: []}; db.bangLuong.push(r); }
    return r;
  },
  /* Bản ghi của cả cơ sở trong tháng: mục tiêu doanh thu, khách bị loại / gán lại */
  coSo(M){ return (db.bangLuong || []).find(r => r.id === 'blcs_' + M) || {nhap: {}, loai: {}, gan: {}}; },
  coSoMoi(M){
    if (!db.bangLuong) db.bangLuong = [];
    let r = (db.bangLuong || []).find(x => x.id === 'blcs_' + M);
    if (!r) { r = {id: 'blcs_' + M, thang: M, nhap: {}, loai: {}, gan: {}, lichSu: []}; db.bangLuong.push(r); }
    return r;
  },
  ai(){ const s = Perm.me(); return (s && s.name) || (Cloud.who && Cloud.who()) || 'Quản lý'; },
  luc(){ return new Date().toLocaleString('vi-VN'); },

  /* ---------- Số liệu chung của cơ sở ---------- */
  /* Doanh thu thuần = thực thu trừ tiền lab của các hạng mục được thu (mỗi hạng mục trừ
     một lần, vào tháng thu tiền đầu tiên của hạng mục đó) — mục 9.2 */
  _labDaTru: null,
  labThang(M){
    if (!this._labDaTru) {
      const dau = {};
      [...db.receipts].sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1).forEach(r =>
        (r.mucIds || []).forEach(id => { if (!dau[id]) dau[id] = r; }));
      this._labDaTru = dau;
    }
    const ra = [];
    Object.entries(this._labDaTru).forEach(([tid, r]) => {
      if (monthOf(r.date) !== M) return;
      const t = (db.treatments || []).find(x => x.id === tid);
      if (t && +t.tienLab > 0) ra.push({r, t, tien: +t.tienLab});
    });
    return ra;
  },
  dtThuan(M, bsId){
    const thu = db.receipts.filter(r => monthOf(r.date) === M && !r.old && (!bsId || r.doctorId === bsId));
    const lab = this.labThang(M).filter(x => !bsId || x.r.doctorId === bsId);
    const tongThu = thu.reduce((s, r) => s + (+r.amount || 0), 0), tongLab = lab.reduce((s, x) => s + x.tien, 0);
    return {thu: tongThu, lab: tongLab, thuan: Math.max(0, tongThu - tongLab), soPhieu: thu.length, dsLab: lab};
  },
  congCua(stId, M){
    const s = Att.summary(stId, M);
    return {cong: Math.min(this.CONG_CHUAN, Number((s.cong || 0).toFixed(2))), ngay: Math.min(this.CONG_CHUAN, s.days || 0),
            tre: s.late || 0, som: s.som || 0};
  },

  /* ---------- Khách mới (Điều 19.2, 19.3) ----------
     Người bệnh mới = người lần đầu được lập hồ sơ khám tại Công ty. Ngày khám đầu là
     ngày sớm nhất có diễn biến điều trị hoặc phiếu thu. Người được thưởng: nguồn thuộc
     kênh trực tuyến → Media; còn lại → người đặt lịch hẹn của buổi khám đầu (lễ tân).
     Quản lý gán lại hoặc loại khách ở trang Tổng hợp. */
  _km: null,
  khachMoi(M){
    if (this._km && this._km.M === M) return this._km.ds;
    const cs = this.coSo(M);
    const ra = [], thuCua = {}, henCua = {};
    db.receipts.forEach(r => { if (r.customerId) (thuCua[r.customerId] = thuCua[r.customerId] || []).push(r); });
    (db.appointments || []).forEach(a => { if (a.customerId) (henCua[a.customerId] = henCua[a.customerId] || []).push(a); });
    db.customers.forEach(c => {
      const thu = thuCua[c.id] || [];
      if (thu.some(r => r.old)) return;
      const ngay = [];
      ((c.record && c.record.dienBien) || []).forEach(v => v.date && ngay.push(v.date));
      thu.forEach(r => { if (r.date) ngay.push(r.date); });
      if (!ngay.length) return;
      const dau = ngay.sort()[0];
      /* Hồ sơ tạo trước buổi khám đầu quá 60 ngày là khách cũ nhập lại, không tính */
      if (c.createdAt && DanhGia.cachNgay(dau, c.createdAt) > 60) return;
      const den = isoAdd(dau, 60);
      let cong = 0, ngayDat3 = '', ngayDat5 = '';
      thu.filter(r => r.date >= dau && r.date <= den)
        .sort((a, b) => a.date < b.date ? -1 : 1).forEach(r => {
          cong += +r.amount || 0;
          if (!ngayDat3 && cong >= 3000000) ngayDat3 = r.date;
          if (!ngayDat5 && cong >= 5000000) ngayDat5 = r.date;
        });
      const online = this.ONLINE.includes((c.source || '').trim());
      const hen = (henCua[c.id] || []).filter(a => a.date <= dau && a.status !== 'Hủy')
        .sort((a, b) => a.date < b.date ? 1 : -1)[0];
      const coCS = monthOf(dau) === M || monthOf(ngayDat3) === M || monthOf(ngayDat5) === M;
      if (!coCS) return;
      let nguoi = '', kenh = online ? 'online' : 'letan';
      if (online) nguoi = 'media';
      else if (hen && hen.nguoiHenId) nguoi = hen.nguoiHenId;
      if (cs.gan && cs.gan[c.id]) nguoi = cs.gan[c.id];
      ra.push({c, dau, ngayDat3, ngayDat5, online, kenh, nguoi, henId: hen ? hen.id : '',
               loai: !!(cs.loai && cs.loai[c.id]), tong60: cong});
    });
    ra.sort((a, b) => a.dau < b.dau ? -1 : 1);
    this._km = {M, ds: ra};
    return ra;
  },
  /* Xoá bộ nhớ tạm mỗi lần vẽ lại, vì dữ liệu có thể vừa đổi */
  moi(){ this._labDaTru = null; this._km = null; },
  /* Tiền thưởng khách mới của một người trong tháng, kèm danh sách minh chứng */
  thuongKhachMoi(st, nhom, M, ds){
    const media = this.dsNV(M).filter(s => this.nhomCua(s) === 'media');
    const cuaToi = ds.filter(x => !x.loai && (x.nguoi === st.id || (x.nguoi === 'media' && nhom === 'media')));
    let tien = 0; const dong = [];
    cuaToi.forEach(x => {
      const laMedia = x.nguoi === 'media' || nhom === 'media';
      const [co, them, nguong, ngayDat] = laMedia ? [50000, 150000, '5 triệu', x.ngayDat5] : [30000, 50000, '3 triệu', x.ngayDat3];
      const chia = x.nguoi === 'media' ? Math.max(1, media.length) : 1;
      let t = 0; const ly = [];
      if (monthOf(x.dau) === M) { t += co; ly.push('khám đầu ' + fmtD(x.dau) + ' +' + money(co)); }
      if (ngayDat && monthOf(ngayDat) === M) { t += them; ly.push('trả đủ ' + nguong + ' ngày ' + fmtD(ngayDat) + ' +' + money(them)); }
      if (!t) return;
      t = Math.round(t / chia);
      tien += t;
      dong.push(h(x.c.name) + ' (' + h(x.c.code || '') + (x.c.source ? ', ' + h(x.c.source) : '') + '): ' + ly.join(', ')
        + (chia > 1 ? ' — chia ' + chia + ' người' : ''));
    });
    return {tien, dong};
  },

  /* ---------- Tỷ lệ đến đúng hẹn của cả cơ sở (Điều 19.2) ---------- */
  dungHen(M){
    const T = todayISO();
    const hen = (db.appointments || []).filter(a => a.customerId && monthOf(a.date) === M && a.date <= T
      && !String(a.id).startsWith('busy') && a.status !== 'Hủy');
    const coDen = a => ['Đang điều trị', 'Hoàn tất'].includes(a.status)
      || ((custById(a.customerId) || {}).record || {dienBien: []}).dienBien.some(v => v.date === a.date)
      || db.receipts.some(r => r.customerId === a.customerId && r.date === a.date);
    const den = hen.filter(coDen);
    return {tong: hen.length, den: den.length, tyLe: hen.length ? den.length / hen.length : null,
            vang: hen.filter(a => !coDen(a))};
  },

  /* ---------- Ca kỹ thuật theo diễn biến điều trị ---------- */
  LOAI_CA: [
    {k: 'implant', ten: 'Cấy ghép implant',          re: /implant|cay ghep|tru/, phuTa: 50000, bs: 300000},
    {k: 'tieuPhau',ten: 'Nhổ răng khôn, tiểu phẫu',  re: /rang khon|tieu phau|rang so 8|rang 8|r8|nho rang lech|nho rang ngam/, phuTa: 30000},
    {k: 'macCai',  ten: 'Gắn mắc cài chỉnh nha',     re: /gan mac cai|dan mac cai|gan khi cu|mac cai/, phuTa: 20000},
    {k: 'thaoMC',  ten: 'Chỉnh nha hoàn tất, tháo mắc cài', re: /thao mac cai|thao khi cu|ket thuc chinh nha/, bs: 200000},
  ],
  loaiCa(v){
    const t = (v.treatmentId && (db.treatments || []).find(x => x.id === v.treatmentId)) || {};
    const s = this.norm((t.name || '') + ' ' + (v.db || '') + ' ' + (v.xt || ''));
    /* Tháo mắc cài phải xét trước gắn mắc cài */
    const thu = ['thaoMC', 'implant', 'tieuPhau', 'macCai'].map(k => this.LOAI_CA.find(x => x.k === k));
    return (thu.find(x => x.re.test(s)) || {}).k || '';
  },
  caTrongThang(M){
    const ra = [];
    db.customers.forEach(c => ((c.record && c.record.dienBien) || []).forEach(v => {
      if (monthOf(v.date) !== M) return;
      const k = this.loaiCa(v);
      if (k) ra.push({c, v, k, tid: v.treatmentId || ''});
    }));
    return ra;
  },

  /* ---------- Tính phiếu lương của một người ---------- */
  tinh(st, M){
    const p = this.phieu(st.id, M);
    if (p && p.chot && p.snap) return Object.assign({daChot: true, p}, p.snap);
    const nhom = this.nhomCua(st), N = this.NHOM[nhom], pl = st.pl || {};
    const nhap = (p && p.nhap) || {};
    const cs = this.coSo(M);
    const cg = this.congCua(st.id, M);
    const d = {}, cc = {};       /* d: số tự tính, cc: căn cứ (mảng dòng minh chứng) */
    const dsNV = this.dsNV(M);

    /* Lương chức danh */
    const base = +(pl.luong != null && pl.luong !== '' ? pl.luong : st.base) || 0;
    if (nhom === 'btg') {
      const dg = +pl.donGia || 250000;
      d.luong = dg * cg.cong; cc.luong = [`Đơn giá ${money(dg)}/ngày công × ${cg.cong} công chấm được`];
    } else {
      d.luong = Math.round(base / this.CONG_CHUAN * cg.cong);
      cc.luong = [`${money(base)} ÷ ${this.CONG_CHUAN} × ${cg.cong} công thực tế (chấm công)`];
    }

    /* Hỗ trợ */
    d.anCa = N.anCa * cg.ngay; cc.anCa = [`${money(N.anCa)} × ${cg.ngay} ngày có mặt`];
    const km = +pl.km || 0;
    if (this.quyCheMoi(M)) {
      const mucXang = km ? this.XANG.find(([toi]) => km < toi)[1] : 0;
      d.xangXe = mucXang * cg.ngay;
      cc.xangXe = [km ? `Nơi ở cách ${km} km → ${money(mucXang)}/ngày × ${cg.ngay} ngày` : 'Chưa khai khoảng cách nơi ở — vào "Cài đặt lương" của người này để điền'];
    } else {
      d.xangXe = this.XANG_CU[nhom] * cg.ngay;
      cc.xangXe = [`Quy chế cũ (QĐ 05): ${money(this.XANG_CU[nhom])}/ngày × ${cg.ngay} ngày`];
    }
    d.dienThoai = cg.cong ? Math.round(N.dienThoai * Math.min(1, cg.cong / this.CONG_CHUAN)) : 0;
    cc.dienThoai = N.dienThoai ? [`${money(N.dienThoai)}/tháng${cg.cong < this.CONG_CHUAN ? ' × ' + cg.cong + '/' + this.CONG_CHUAN + ' công' : ''}`] : ['Chức danh không hưởng'];

    /* Hoa hồng & quỹ theo doanh thu */
    const dtCS = this.dtThuan(M);
    /* Từ 11/2026 quỹ chỉ tính trên phần vượt 300 triệu */
    const coSoQuy = this.quyCheMoi(M) ? Math.max(0, dtCS.thuan - this.NGUONG_DT) : dtCS.thuan;
    const moTaCoSo = this.quyCheMoi(M) ? `phần doanh thu thuần vượt 300 triệu (${money(dtCS.thuan)} − 300.000.000 = ${money(coSoQuy)})`
      : `${money(dtCS.thuan)} doanh thu thuần cơ sở`;
    d.hoaHong = Math.round(HR.commissionOf(st, M)); cc.hoaHong = [`Theo công đoạn đã ghi ở tab Điều trị (xem tab Hoa hồng)`];
    const chiaQuy = (quy, loc) => {
      const ds = dsNV.filter(loc).map(s => ({s, c: this.congCua(s.id, M).cong}));
      const tong = ds.reduce((x, y) => x + y.c, 0);
      return tong ? Math.round(quy * cg.cong / tong) : 0;
    };
    if (nhom === 'trothu' || nhom === 'btg') {
      const quy = coSoQuy * 0.015;
      d.htdt = chiaQuy(quy, s => ['trothu', 'btg'].includes(this.nhomCua(s)));
      cc.htdt = [`Quỹ 1,5% × ${moTaCoSo} = ${money(quy)}, chia theo ngày công (${cg.cong} công)`];
    } else { d.htdt = 0; cc.htdt = ['Chức danh không hưởng']; }
    if (nhom === 'letan' || nhom === 'media') {
      const coLT = dsNV.some(s => this.nhomCua(s) === 'letan'), coMD = dsNV.some(s => this.nhomCua(s) === 'media');
      const quy = coSoQuy * 0.01 * (coLT && coMD ? 0.5 : 1);
      d.ptkh = chiaQuy(quy, s => this.nhomCua(s) === nhom);
      cc.ptkh = [`Quỹ 1% × ${moTaCoSo}${coLT && coMD ? ' ÷ 2 chức danh' : ''} = ${money(quy)}, chia theo ngày công trong chức danh`];
    } else { d.ptkh = 0; cc.ptkh = ['Chức danh không hưởng']; }
    d.thuNo = nhom === 'letan' ? Math.round((+nhap.thuNo || 0) * 0.02) : 0;
    cc.thuNo = nhom === 'letan' ? [`2% × ${money(+nhap.thuNo || 0)} nợ quá hạn đã thu (nhập tay, kèm xác nhận kế toán)`] : ['Chức danh không hưởng'];

    /* Chuyên cần */
    if (N.chuyenCan) {
      const kp = +nhap.nghiKP || 0, lan = Math.floor((cg.tre + cg.som) / 3);
      d.chuyenCan = kp >= 2 ? 0 : Math.max(0, N.chuyenCan - 100000 * (kp + lan));
      cc.chuyenCan = [`Mức tối đa ${money(N.chuyenCan)}; đi trễ ${cg.tre} lần, về sớm ${cg.som} lần (giảm ${lan} × 100.000); nghỉ không phép ${kp} ngày`
        + (kp >= 2 ? ' → từ 2 ngày trở lên không thưởng' : '')];
    } else { d.chuyenCan = 0; cc.chuyenCan = ['Chức danh không hưởng']; }

    /* Hiệu quả */
    if (nhom === 'bs') {
      const k = DanhGia.tinh(st, M);
      d.hieuQua = k.tien; cc.hieuQua = [`Phiếu đánh giá tháng: ${k.tong} điểm${k.kyLuat ? ', có kỷ luật' : ''}${k.daChot ? ' (đã chốt)' : ' (chưa chốt phiếu)'}`];
    } else if (N.hq.length) {
      const diem = nhap.diemHQ === '' || nhap.diemHQ == null ? null : +nhap.diemHQ;
      d.hieuQua = diem == null ? 0 : ((N.hq.find(([m]) => diem >= m) || [0, 0])[1]);
      cc.hieuQua = [diem == null ? 'Chưa nhập điểm đánh giá tháng' : `${diem} điểm theo phiếu đánh giá`];
    } else { d.hieuQua = 0; cc.hieuQua = ['Chức danh không hưởng']; }

    /* Điều 19 */
    const ca = this.caTrongThang(M);
    if (nhom === 'trothu' || nhom === 'btg') {
      const cua = ca.filter(x => x.v.assistantId === st.id && this.LOAI_CA.find(l => l.k === x.k).phuTa);
      d.phuCa = cua.reduce((s, x) => s + this.LOAI_CA.find(l => l.k === x.k).phuTa, 0);
      cc.phuCa = cua.length ? cua.map(x => `${fmtD(x.v.date)} ${h(x.c.name)}: ${this.LOAI_CA.find(l => l.k === x.k).ten} +${money(this.LOAI_CA.find(l => l.k === x.k).phuTa)}`)
        : ['Không có ca implant, tiểu phẫu, gắn mắc cài nào ghi tên người này là người phụ'];
      const pt = nhap.ksnk === '' || nhap.ksnk == null ? null : +nhap.ksnk;
      d.ksnk = pt == null ? 0 : pt >= 90 ? 200000 : pt >= 80 ? 100000 : 0;
      cc.ksnk = [pt == null ? 'Chưa nhập tỷ lệ đạt bảng kiểm KSNK' : `Bảng kiểm KSNK đạt ${pt}%`];
      d.chungChi = (+nhap.chungChi || 0) * 500000;
      cc.chungChi = [`${+nhap.chungChi || 0} chứng chỉ mới × 500.000`];
    } else { ['phuCa', 'ksnk', 'chungChi'].forEach(k => { d[k] = 0; cc[k] = ['Chức danh không hưởng']; }); }
    if (nhom === 'letan') {
      const dh = this.dungHen(M);
      d.dungHen = dh.tyLe == null ? 0 : dh.tyLe >= 0.85 ? 300000 : dh.tyLe >= 0.75 ? 150000 : 0;
      cc.dungHen = [dh.tyLe == null ? 'Không có lượt hẹn nào' : `${dh.den}/${dh.tong} lượt hẹn đến đúng ngày (${Math.round(dh.tyLe * 100)}%)`];
    } else { d.dungHen = 0; cc.dungHen = ['Chức danh không hưởng']; }
    if (nhom === 'letan' || nhom === 'media') {
      const km2 = this.thuongKhachMoi(st, nhom, M, this.khachMoi(M));
      d.khachMoi = km2.tien; cc.khachMoi = km2.dong.length ? km2.dong : ['Không có người bệnh mới được tính cho người này'];
    } else { d.khachMoi = 0; cc.khachMoi = ['Chức danh không hưởng']; }
    if (nhom === 'bs') {
      const dt = this.dtThuan(M, st.id).thuan;
      d.vuotDT = Math.round(Math.max(0, Math.min(dt, 150e6) - 100e6) * 0.02 + Math.max(0, dt - 150e6) * 0.03);
      cc.vuotDT = [`Doanh thu thuần cá nhân ${money(dt)} (thực thu trừ tiền lab); phần 100–150 triệu × 2%, phần trên 150 triệu × 3%`];
      /* Mỗi hạng mục (ca) chỉ tính một lần, vào tháng có buổi đầu tiên của loại đó */
      const daTinh = new Set();
      db.customers.forEach(c => ((c.record && c.record.dienBien) || []).forEach(v => {
        if (monthOf(v.date) < M && v.doctorId === st.id) { const k = this.loaiCa(v); if (k) daTinh.add(c.id + '|' + (v.treatmentId || k)); }
      }));
      const cua = ca.filter(x => x.v.doctorId === st.id && this.LOAI_CA.find(l => l.k === x.k).bs);
      const dem = [];
      cua.forEach(x => { const key = x.c.id + '|' + (x.tid || x.k); if (!daTinh.has(key)) { daTinh.add(key); dem.push(x); } });
      d.kyThuat = dem.reduce((s, x) => s + this.LOAI_CA.find(l => l.k === x.k).bs, 0);
      cc.kyThuat = dem.length ? dem.map(x => `${fmtD(x.v.date)} ${h(x.c.name)}: ${this.LOAI_CA.find(l => l.k === x.k).ten} +${money(this.LOAI_CA.find(l => l.k === x.k).bs)}`)
        : ['Không có ca implant hoặc tháo mắc cài hoàn tất'];
    } else { d.vuotDT = 0; d.kyThuat = 0; cc.vuotDT = ['Chức danh không hưởng']; cc.kyThuat = ['Chức danh không hưởng']; }

    /* Điều 20 */
    const mt = this.NGUONG_DT;
    if (dtCS.thuan > mt && nhom !== 'khac') {
      const quy = (dtCS.thuan - mt) * 0.05;
      const ds = dsNV.filter(s => this.nhomCua(s) !== 'khac').map(s => ({s, w: this.NHOM[this.nhomCua(s)].heSo * this.congCua(s.id, M).cong}));
      const tong = ds.reduce((x, y) => x + y.w, 0);
      d.mucTieu = tong ? Math.round(quy * N.heSo * cg.cong / tong) : 0;
      cc.mucTieu = [`Doanh thu thuần ${money(dtCS.thuan)} vượt mức ${money(mt)} → quỹ 5% = ${money(quy)}; hệ số ${N.heSo} × ${cg.cong} công`];
    } else { d.mucTieu = 0; cc.mucTieu = [`Doanh thu thuần ${money(dtCS.thuan)} chưa vượt mức ${money(mt)}`]; }

    /* Trước 11/2026: các khoản quy chế cũ chưa có */
    if (!this.quyCheMoi(M)) ['hieuQua', 'phuCa', 'ksnk', 'chungChi', 'dungHen', 'khachMoi', 'vuotDT', 'kyThuat', 'mucTieu'].forEach(k => {
      d[k] = 0; cc[k] = ['Chưa áp dụng — khoản này có từ kỳ lương 11/2026 theo QĐ 10/2026/QĐ-HB-GQ'];
    });

    /* Thưởng khác & khấu trừ ghi ở tab KPI · Thưởng · Phạt (trừ thưởng hiệu quả đã tính ở trên) */
    const bon = (db.bonuses || []).filter(b => b.staffId === st.id && monthOf(b.date) === M && !String(b.id).startsWith('dg_'));
    const cong = bon.filter(b => b.amount > 0), tru = bon.filter(b => b.amount < 0);
    d.thuongKhac = cong.reduce((s, b) => s + b.amount, 0);
    cc.thuongKhac = cong.length ? cong.map(b => `${fmtD(b.date)} ${h(b.reason || '')}: +${money(b.amount)}`) : ['Không có'];
    d.khauTru = -tru.reduce((s, b) => s + b.amount, 0);
    cc.khauTru = tru.length ? tru.map(b => `${fmtD(b.date)} ${h(b.reason || '')}: ${money(-b.amount)}`) : ['Không có'];

    const dongBH = nhom !== 'btg' && !pl.khongBHXH && cg.cong >= 14;
    d.bhxh = dongBH ? Math.round(base * 0.105) : 0;
    cc.bhxh = [dongBH ? `10,5% × ${money(base)} lương chức danh` : (nhom === 'btg' || pl.khongBHXH ? 'Không đóng BHXH tại Công ty' : 'Làm dưới 14 ngày công trong tháng: không đóng')];
    d.thue = +nhap.thue || 0; cc.thue = ['Nhập tay theo tờ khai'];
    d.tamUng = +nhap.tamUng || 0; cc.tamUng = ['Nhập tay theo phiếu chi tạm ứng'];

    /* Áp số quản lý đã sửa */
    const sua = (p && p.sua) || {};
    const v = {};
    this.KHOAN.forEach(K => { v[K.k] = sua[K.k] && sua[K.k].v != null && sua[K.k].v !== '' ? +sua[K.k].v : d[K.k]; });
    const thu = this.KHOAN.filter(K => K.loai === 'thu').reduce((s, K) => s + v[K.k], 0);
    const truTong = this.KHOAN.filter(K => K.loai === 'tru').reduce((s, K) => s + v[K.k], 0);
    return {daChot: false, p, nhom, cg, d, v, cc, sua, thu, tru: truTong, linh: thu - truTong, base};
  },

  /* ---------- Màn Bảng lương ---------- */
  chonThang(){
    const M = this.M();
    return `<label class="sub-line" style="display:flex;align-items:center;gap:8px">Tháng
      <input type="month" value="${M}" onchange="Luong.thang=this.value||null;Luong.moi();App.render()"></label>`;
  },
  tab(){
    this.moi();
    const M = this.M(), ds = this.dsNV(M);
    const rows = ds.map(st => ({st, k: this.tinh(st, M)}));
    const nhomTien = (k, n) => this.KHOAN.filter(K => K.nhom === n).reduce((s, K) => s + k.v[K.k], 0);
    const tong = rows.reduce((s, r) => s + r.k.linh, 0);
    const soSua = rows.reduce((s, r) => s + Object.keys(r.k.sua || {}).length, 0);
    const bh = rows.reduce((s, r) => s + (r.k.v.bhxh ? r.k.base : 0), 0);
    return `
    <div class="page-head" style="margin-bottom:12px">${this.chonThang()}
      <span class="spacer"></span>
      ${Perm.only('caidat', `<button class="btn" onclick="Att.accountsPanel()">Tài khoản truy cập</button>`)}
      ${Perm.only('caidat', `<button class="btn" onclick="HR.staffForm()">${IC.plus} Thêm nhân viên</button>`)}
      <button class="btn primary" onclick="Luong.inBang()">${IC.print} In bảng lương</button></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="k-label">Tổng thực lĩnh</div><div class="k-value num">${money(tong)}</div><div class="k-note">${ds.length} người · ${rows.filter(r => r.k.daChot).length} phiếu đã chốt</div></div>
      <div class="card kpi"><div class="k-label">BHXH phải nộp (32%)</div><div class="k-value num">${money(bh * 0.32)}</div><div class="k-note">DN 21,5% + NLĐ 10,5% trên lương chức danh</div></div>
      <div class="card kpi"><div class="k-label">Khoản quản lý đã sửa tay</div><div class="k-value num">${soSua}</div><div class="k-note">mỗi lần sửa đều có lý do và lịch sử</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>Bảng lương tháng ${this.nhanThang(M)}</h2>
      <span class="hint">bấm tên để xem từng khoản, căn cứ và sửa</span></div>
    <div class="tbl-wrap"><table style="min-width:1000px">
      <thead><tr><th>Nhân viên</th><th class="r">Công</th><th class="r">Lương CD</th><th class="r">Hỗ trợ</th>
        <th class="r">Hoa hồng & DT</th><th class="r">Thưởng</th><th class="r">Khấu trừ</th><th class="r">Thực lĩnh</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${rows.map(({st, k}) => `<tr class="clickable" onclick="Luong.chiTiet('${st.id}')">
        <td><b>${h(st.name)}</b><br><span class="sub-line">${h(this.NHOM[k.nhom].ten)}</span></td>
        <td class="r num">${k.cg.cong}</td>
        <td class="r num">${money(k.v.luong)}</td>
        <td class="r num">${money(nhomTien(k, 'Hỗ trợ'))}</td>
        <td class="r num">${money(nhomTien(k, 'Hoa hồng & thưởng doanh thu'))}</td>
        <td class="r num" style="color:var(--ok)">${money(nhomTien(k, 'Thưởng'))}</td>
        <td class="r num" style="color:var(--danger)">−${money(k.tru)}</td>
        <td class="r num" style="font-weight:700">${money(k.linh)}</td>
        <td>${k.daChot ? '<span class="pill ok">Đã chốt</span>' : '<span class="pill warn">Tạm tính</span>'}
          ${Object.keys(k.sua || {}).length ? `<br><span class="pill info">${Object.keys(k.sua).length} khoản sửa tay</span>` : ''}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button class="btn small" onclick="Luong.chiTiet('${st.id}')">Xem · sửa</button>
          <button class="btn small" onclick="Luong.inPhieu('${st.id}')">${IC.print}</button></td></tr>`).join('')
        || '<tr><td colspan="10" class="sub-line">Chưa có nhân viên.</td></tr>'}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Số liệu tự lấy từ chấm công, lịch hẹn, hồ sơ khách, diễn biến điều trị và phiếu thu.
      Quản lý sửa được <b>từng khoản</b> trong phiếu (phải ghi lý do), loại hoặc gán lại khách ở tab <b>Tổng hợp tháng</b>.
      Chốt phiếu thì số liệu đóng băng, dữ liệu nhập sau không làm đổi lương đã chốt.</div>`;
  },

  /* ---------- Phiếu chi tiết: từng khoản, căn cứ, sửa ---------- */
  chiTiet(stId){
    const M = this.M(), st = staffById(stId); if (!st) return;
    const k = this.tinh(st, M), ql = this.quanLy(), khoa = k.daChot || !ql;
    const nhap = (k.p && k.p.nhap) || {};
    const oNhap = Object.entries(this.NHAP).filter(([, x]) => !x.nhom || x.nhom.includes(k.nhom)).map(([key, x]) =>
      `<div class="f"><label>${h(x.ten)}</label>${x.tien ? Tien.o('n_' + key, nhap[key] || '', khoa ? 'disabled' : '')
        : `<input type="number" step="any" name="n_${key}" value="${h(nhap[key] ?? '')}" ${khoa ? 'disabled' : ''}>`}</div>`).join('');
    let nhomTr = '';
    const dong = this.KHOAN.map(K => {
      const s = k.sua[K.k], tieuDe = K.nhom !== nhomTr ? (nhomTr = K.nhom, `<tr><th colspan="5" style="background:var(--bg-2,#f4f4f4)">${h(K.nhom)}</th></tr>`) : '';
      return tieuDe + `<tr>
        <td><b>${h(K.ten)}</b><br><span class="sub-line">${h(K.cc)}</span></td>
        <td style="font-size:12px">${(k.cc[K.k] || []).map(x => '• ' + x).join('<br>')}
          ${s ? `<br><span class="pill info">Sửa tay: ${h(s.lyDo)} — ${h(s.ai || '')}, ${h(s.luc || '')}</span>` : ''}</td>
        <td class="r num">${K.loai === 'tru' ? '−' : ''}${money(k.d[K.k])}</td>
        <td>${Tien.o('s_' + K.k, s ? s.v : '', (khoa ? 'disabled ' : '') + 'placeholder="giữ số tự tính" style="width:120px"')}</td>
        <td><input name="l_${K.k}" value="${h(s ? s.lyDo : '')}" ${khoa ? 'disabled' : ''} placeholder="lý do sửa" style="width:160px"></td></tr>`;
    }).join('');
    const ls = ((k.p && k.p.lichSu) || []).slice().reverse().map(x =>
      `<tr><td class="num">${h(x.luc)}</td><td>${h(x.ai)}</td><td>${h(x.viec)}</td></tr>`).join('');
    App.modal(`Phiếu lương ${this.nhanThang(M)} — ${st.name}`, `
    <form onsubmit="Luong.luu(event,'${stId}',false)">
      <div class="note-block mb">${h(this.NHOM[k.nhom].ten)} · ${k.cg.cong} công thực tế, ${k.cg.ngay} ngày có mặt ·
        ${k.daChot ? '<b>Đã chốt</b> ngày ' + fmtD(k.p.ngayChot) : 'Tạm tính'}
        ${ql ? ` · <button type="button" class="link-btn" onclick="Luong.caiDat('${stId}')">Cài đặt lương của người này</button>` : ''}</div>
      ${oNhap ? `<div class="form-grid mb">${oNhap}</div>` : ''}
      <div class="tbl-wrap"><table style="min-width:860px">
        <thead><tr><th style="width:24%">Khoản</th><th>Căn cứ, minh chứng</th><th class="r">Tự tính</th><th>Số sửa</th><th>Lý do</th></tr></thead>
        <tbody>${dong}
          <tr><td colspan="2"><b>Tổng thu nhập</b></td><td class="r num" colspan="3"><b>${money(k.thu)}</b></td></tr>
          <tr><td colspan="2"><b>Tổng khấu trừ</b></td><td class="r num" colspan="3"><b>−${money(k.tru)}</b></td></tr>
          <tr><td colspan="2"><b>THỰC LĨNH</b></td><td class="r num" colspan="3" style="font-size:16px"><b>${money(k.linh)}</b></td></tr>
        </tbody></table></div>
      ${ls ? `<details style="margin-top:10px"><summary>Lịch sử sửa (${(k.p.lichSu || []).length})</summary>
        <div class="tbl-wrap"><table><thead><tr><th>Lúc</th><th>Người sửa</th><th>Nội dung</th></tr></thead><tbody>${ls}</tbody></table></div></details>` : ''}
      <div class="form-actions">
        ${ql && k.daChot ? `<button type="button" class="btn danger" onclick="Luong.moChot('${stId}')">Mở chốt</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn" onclick="Luong.inPhieu('${stId}')">${IC.print} In phiếu</button>
        <button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
        ${!khoa ? `<button class="btn">Lưu tạm</button>
          <button type="button" class="btn primary" onclick="Luong.luu(event,'${stId}',true)">Lưu và chốt</button>` : ''}
      </div></form>`);
  },
  luu(ev, stId, chot){
    ev.preventDefault();
    if (!this.quanLy()) { App.toast('Chỉ quản lý mới sửa được bảng lương'); return; }
    const M = this.M(), st = staffById(stId);
    const f = ev.target.closest('form') || document.querySelector('#modalBody form');
    if ((this.phieu(stId, M) || {}).chot) { App.toast('Phiếu đã chốt — mở chốt trước khi sửa'); return; }
    /* Soát lý do trước khi ghi bất cứ thứ gì, để không lưu dở dang */
    for (const K of this.KHOAN) {
      const o = f.querySelector('[name="s_' + K.k + '"]'), l = f.querySelector('[name="l_' + K.k + '"]');
      if (o && o.value.trim() !== '' && !(l && l.value.trim())) { App.toast('Sửa khoản "' + K.ten + '" thì phải ghi lý do'); return; }
    }
    const p = this.phieuMoi(stId, M);
    const ai = this.ai(), luc = this.luc(), viec = [];
    /* Số nhập tay */
    Object.entries(this.NHAP).forEach(([key, x]) => {
      const o = f.querySelector('[name="n_' + key + '"]'); if (!o) return;
      const moi = o.value === '' ? '' : (x.tien ? num(o.value) : Number(o.value));
      const cu = p.nhap[key] ?? '';
      if (String(moi) !== String(cu)) { viec.push(`${x.ten}: ${cu === '' ? 'trống' : cu} → ${moi === '' ? 'trống' : moi}`); p.nhap[key] = moi; }
    });
    /* Số sửa từng khoản */
    for (const K of this.KHOAN) {
      const o = f.querySelector('[name="s_' + K.k + '"]'), l = f.querySelector('[name="l_' + K.k + '"]');
      if (!o) continue;
      const moi = o.value.trim() === '' ? null : num(o.value), ly = (l && l.value || '').trim(), cu = p.sua[K.k];
      if (moi == null) {
        if (cu) { viec.push(`${K.ten}: bỏ số sửa ${money(cu.v)}, dùng lại số tự tính`); delete p.sua[K.k]; }
        continue;
      }
      if (!cu || +cu.v !== moi || cu.lyDo !== ly) {
        viec.push(`${K.ten}: ${cu ? money(cu.v) : 'tự tính'} → ${money(moi)} (${ly})`);
        p.sua[K.k] = {v: moi, lyDo: ly, ai, luc};
      }
    }
    if (!p.lichSu) p.lichSu = [];
    viec.forEach(x => p.lichSu.push({ai, luc, viec: x}));
    if (chot) {
      const k = this.tinh(st, M);
      p.snap = {nhom: k.nhom, cg: k.cg, d: k.d, v: k.v, cc: k.cc, sua: JSON.parse(JSON.stringify(p.sua)), thu: k.thu, tru: k.tru, linh: k.linh, base: k.base};
      p.chot = true; p.ngayChot = todayISO();
      p.lichSu.push({ai, luc, viec: 'Chốt phiếu lương, thực lĩnh ' + money(k.linh)});
    }
    p._up = Date.now();
    save(); App.render(); this.chiTiet(stId);
    App.toast(chot ? 'Đã chốt phiếu lương ✓' : (viec.length ? 'Đã lưu ' + viec.length + ' thay đổi ✓' : 'Không có gì thay đổi'));
  },
  moChot(stId){
    if (!this.quanLy()) return;
    if (!confirm('Mở chốt thì phiếu lương tính lại theo dữ liệu hiện tại. Tiếp tục?')) return;
    const p = this.phieu(stId, this.M()); if (!p) return;
    p.chot = false; delete p.snap; delete p.ngayChot;
    (p.lichSu = p.lichSu || []).push({ai: this.ai(), luc: this.luc(), viec: 'Mở chốt phiếu lương'});
    p._up = Date.now();
    save(); App.render(); this.chiTiet(stId); App.toast('Đã mở chốt');
  },

  /* ---------- Cài đặt lương theo người (chức danh tính lương, lương, km, BHXH) ---------- */
  caiDat(stId){
    const st = staffById(stId); if (!st) return;
    const pl = st.pl || {}, nhom = this.nhomCua(st);
    App.modal('Cài đặt lương — ' + st.name, `
    <form class="form-grid" onsubmit="Luong.luuCaiDat(event,'${stId}')">
      <div class="f"><label>Nhóm tính lương</label><select name="nhom">
        ${Object.entries(this.NHOM).map(([k, x]) => `<option value="${k}"${nhom === k ? ' selected' : ''}>${h(x.ten)}</option>`).join('')}</select></div>
      <div class="f"><label>Lương chức danh (₫/tháng)</label>${Tien.o('luong', pl.luong ?? st.base ?? '')}</div>
      <div class="f"><label>Đơn giá ngày công (người làm không trọn thời gian)</label>${Tien.o('donGia', pl.donGia || '')}</div>
      <div class="f"><label>Khoảng cách nơi ở → cơ sở (km, 1 chiều)</label><input type="number" step="0.1" min="0" name="km" value="${h(pl.km ?? '')}">
        <div class="combo-hint">Theo Bản tự khai nơi ở. Dưới 15 km 30.000 · 15–dưới 30 km 50.000 · 30–50 km 70.000 · trên 50 km 100.000 đồng/ngày.</div></div>
      <div class="f full"><label><input type="checkbox" name="khongBHXH" ${pl.khongBHXH ? 'checked' : ''}> Không đóng BHXH tại Công ty (đã đóng nơi khác, có cam kết)</label></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="Luong.chiTiet('${stId}')">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  luuCaiDat(ev, stId){
    ev.preventDefault();
    if (!this.quanLy()) return;
    const st = staffById(stId), f = ev.target;
    const moi = {nhom: f.nhom.value, luong: f.luong.value === '' ? '' : num(f.luong.value), donGia: num(f.donGia.value) || '',
                 km: f.km.value === '' ? '' : Number(f.km.value), khongBHXH: f.khongBHXH.checked};
    const cu = st.pl || {}, doi = Object.keys(moi).filter(k => String(moi[k] ?? '') !== String(cu[k] ?? ''));
    st.pl = moi; st._up = Date.now();
    if (doi.length) {
      const p = this.phieuMoi(stId, this.M());
      (p.lichSu = p.lichSu || []).push({ai: this.ai(), luc: this.luc(), viec: 'Đổi cài đặt lương: ' + doi.map(k => k + ' ' + (cu[k] ?? '—') + ' → ' + moi[k]).join('; ')});
    }
    save(); App.render(); this.chiTiet(stId); App.toast('Đã lưu cài đặt lương ✓');
  },

  /* ---------- Trang Tổng hợp tháng ---------- */
  tongHop(){
    this.moi();
    const M = this.M(), cs = this.coSo(M), ql = this.quanLy(), dsNV = this.dsNV(M);
    const dt = this.dtThuan(M), mt = this.NGUONG_DT, vuot = Math.max(0, dt.thuan - mt);
    const dh = this.dungHen(M), km = this.khachMoi(M), ca = this.caTrongThang(M);
    const tenNguoi = id => id === 'media' ? 'Media (chia đều)' : ((staffById(id) || {}).name || '— chưa rõ —');
    const nguoiOpts = (chon) => `<option value="">— theo dữ liệu —</option><option value="media"${chon === 'media' ? ' selected' : ''}>Media</option>`
      + dsNV.filter(s => ['letan', 'media'].includes(this.nhomCua(s))).map(s => `<option value="${s.id}"${chon === s.id ? ' selected' : ''}>${h(s.name)}</option>`).join('');
    const kmRows = km.map(x => `<tr${x.loai ? ' style="opacity:.5;text-decoration:line-through"' : ''}>
      <td><b>${h(x.c.name)}</b><br><span class="sub-line">${h(x.c.code || '')} · nguồn: ${h(x.c.source || 'chưa ghi')}</span></td>
      <td class="num">${fmtD(x.dau)}</td>
      <td class="r num">${money(x.tong60)}${x.ngayDat3 ? '<br><span class="sub-line">đủ 3tr: ' + fmtD(x.ngayDat3) + '</span>' : ''}${x.ngayDat5 ? '<br><span class="sub-line">đủ 5tr: ' + fmtD(x.ngayDat5) + '</span>' : ''}</td>
      <td>${h(tenNguoi(x.nguoi))}${cs.gan && cs.gan[x.c.id] ? ' <span class="pill info">gán tay</span>' : ''}</td>
      <td style="white-space:nowrap">${ql ? `<select onchange="Luong.ganKhach('${x.c.id}',this.value)" style="max-width:150px">${nguoiOpts((cs.gan || {})[x.c.id] || '')}</select>
        <button class="btn small" onclick="Luong.loaiKhach('${x.c.id}')">${x.loai ? 'Tính lại' : 'Loại'}</button>` : ''}</td></tr>`).join('')
      || '<tr><td colspan="5" class="sub-line">Không có người bệnh mới phát sinh thưởng trong tháng.</td></tr>';
    const phuTa = dsNV.filter(s => ['trothu', 'btg'].includes(this.nhomCua(s)));
    const caRows = phuTa.map(s => {
      const c = this.LOAI_CA.filter(l => l.phuTa).map(l => ca.filter(x => x.v.assistantId === s.id && x.k === l.k).length);
      return `<tr><td><b>${h(s.name)}</b></td>${c.map(n => `<td class="r num">${n}</td>`).join('')}</tr>`;
    }).join('');
    const khongPhu = ca.filter(x => !x.v.assistantId && this.LOAI_CA.find(l => l.k === x.k).phuTa);
    const bsRows = dsNV.filter(s => this.nhomCua(s) === 'bs').map(s => {
      const d2 = this.dtThuan(M, s.id);
      return `<tr><td><b>${h(s.name)}</b></td><td class="r num">${money(d2.thu)}</td><td class="r num">−${money(d2.lab)}</td>
        <td class="r num" style="font-weight:700">${money(d2.thuan)}</td>
        <td class="r num">${ca.filter(x => x.v.doctorId === s.id && x.k === 'implant').length}</td>
        <td class="r num">${ca.filter(x => x.v.doctorId === s.id && x.k === 'thaoMC').length}</td></tr>`;
    }).join('');
    const ccRows = dsNV.map(s => { const g = this.congCua(s.id, M), p = this.phieu(s.id, M);
      return `<tr><td><b>${h(s.name)}</b></td><td class="r num">${g.cong}</td><td class="r num">${g.ngay}</td>
        <td class="r num">${g.tre}</td><td class="r num">${g.som}</td><td class="r num">${(p && p.nhap && p.nhap.nghiKP) || 0}</td></tr>`; }).join('');
    const ls = (cs.lichSu || []).slice().reverse().map(x => `<tr><td class="num">${h(x.luc)}</td><td>${h(x.ai)}</td><td>${h(x.viec)}</td></tr>`).join('');
    return `
    <div class="page-head" style="margin-bottom:12px">${this.chonThang()}<span class="spacer"></span>
      <button class="btn primary" onclick="Luong.inTongHop()">${IC.print} In bảng tổng hợp</button></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="k-label">Doanh thu thuần cơ sở</div><div class="k-value num">${money(dt.thuan)}</div>
        <div class="k-note">thực thu ${money(dt.thu)} − lab ${money(dt.lab)}</div></div>
      <div class="card kpi"><div class="k-label">Phần vượt 300 triệu (Điều 10, 11, 20)</div>
        <div class="k-value num">${this.quyCheMoi(M) ? money(vuot) : '—'}</div>
        <div class="k-note">${!this.quyCheMoi(M) ? 'tháng này còn theo quy chế cũ' : vuot ? `quỹ 1,5%: ${money(vuot * 0.015)} · 1%: ${money(vuot * 0.01)} · 5%: ${money(vuot * 0.05)}` : 'chưa vượt — các quỹ bằng 0'}</div></div>
      <div class="card kpi"><div class="k-label">Khách đến đúng hẹn (Điều 19.2)</div>
        <div class="k-value num">${dh.tyLe == null ? '—' : Math.round(dh.tyLe * 100) + '%'}</div><div class="k-note">${dh.den}/${dh.tong} lượt hẹn</div></div>
    </div>
    <div class="card mb"><div class="card-h"><h2>Người bệnh mới — thưởng lễ tân, media (Điều 19.2, 19.3)</h2>
      <span class="hint">${km.filter(x => !x.loai).length} người được tính</span></div>
      <div class="tbl-wrap"><table style="min-width:860px">
        <thead><tr><th>Khách</th><th>Khám đầu</th><th class="r">Đã trả trong 60 ngày</th><th>Tính cho</th><th>${ql ? 'Sửa' : ''}</th></tr></thead>
        <tbody>${kmRows}</tbody></table></div>
      <div class="note-block" style="margin:10px">Nguồn Facebook, Zalo, TikTok, Google tính cho <b>Media</b>; nguồn khác tính cho <b>người đặt hẹn</b> buổi khám đầu.
        Sai người thì chọn lại ở cột Sửa; khách không đủ điều kiện (người nhà, khách cũ lập hồ sơ mới…) thì bấm <b>Loại</b>.</div></div>
    <div class="card mb"><div class="card-h"><h2>Ca kỹ thuật — trợ thủ (Điều 19.1)</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Trợ thủ</th>${this.LOAI_CA.filter(l => l.phuTa).map(l => `<th class="r">${h(l.ten)}</th>`).join('')}</tr></thead>
        <tbody>${caRows || '<tr><td colspan="4" class="sub-line">Không có trợ thủ.</td></tr>'}</tbody></table></div>
      ${khongPhu.length ? `<div class="note-block" style="margin:10px;border-color:var(--warn)"><b>${khongPhu.length} ca chưa ghi người phụ</b> — vào hồ sơ khách sửa diễn biến để tính thưởng:
        ${khongPhu.map(x => `${fmtD(x.v.date)} ${h(x.c.name)}`).join(' · ')}</div>` : ''}</div>
    <div class="card mb"><div class="card-h"><h2>Bác sĩ — doanh thu và ca kỹ thuật cao (Điều 19.4)</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Bác sĩ</th><th class="r">Thực thu</th><th class="r">Tiền lab</th><th class="r">Doanh thu thuần</th><th class="r">Buổi implant</th><th class="r">Tháo mắc cài</th></tr></thead>
        <tbody>${bsRows || '<tr><td colspan="6" class="sub-line">Không có bác sĩ.</td></tr>'}</tbody></table></div></div>
    <div class="card mb"><div class="card-h"><h2>Chuyên cần (Điều 17)</h2><span class="hint">ngày nghỉ không phép nhập trong phiếu lương từng người</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Nhân viên</th><th class="r">Công</th><th class="r">Ngày có mặt</th><th class="r">Đi trễ</th><th class="r">Về sớm</th><th class="r">Nghỉ KP</th></tr></thead>
        <tbody>${ccRows}</tbody></table></div></div>
    ${dh.vang.length ? `<details class="card mb" style="padding:12px"><summary><b>${dh.vang.length} lượt hẹn khách không đến</b> (tính vào mẫu số tỷ lệ đúng hẹn)</summary>
      <div class="sub-line" style="margin-top:8px">${dh.vang.map(a => `${fmtD(a.date)} ${h((custById(a.customerId) || {}).name || '')}`).join(' · ')}</div>
      <div class="sub-line">Khách đã báo hủy, đổi lịch trước ít nhất 1 ngày thì chuyển lịch hẹn đó sang trạng thái <b>Hủy</b> để không bị tính.</div></details>` : ''}
    ${ls ? `<details class="card" style="padding:12px"><summary>Lịch sử sửa của tháng (${(cs.lichSu || []).length})</summary>
      <div class="tbl-wrap"><table><thead><tr><th>Lúc</th><th>Người sửa</th><th>Nội dung</th></tr></thead><tbody>${ls}</tbody></table></div></details>` : ''}`;
  },
  ghiCoSo(viec, fn){
    if (!this.quanLy()) { App.toast('Chỉ quản lý mới sửa được'); return; }
    const r = this.coSoMoi(this.M());
    fn(r);
    (r.lichSu = r.lichSu || []).push({ai: this.ai(), luc: this.luc(), viec});
    r._up = Date.now(); save(); App.render();
  },
  ganKhach(cid, nguoi){
    const c = custById(cid);
    this.ghiCoSo('Gán khách ' + (c ? c.name : cid) + ' cho ' + (nguoi ? (nguoi === 'media' ? 'Media' : (staffById(nguoi) || {}).name) : 'theo dữ liệu'),
      r => { r.gan = r.gan || {}; if (nguoi) r.gan[cid] = nguoi; else delete r.gan[cid]; });
  },
  loaiKhach(cid){
    const r0 = this.coSo(this.M()), dang = !!(r0.loai && r0.loai[cid]), c = custById(cid);
    let ly = '';
    if (!dang) { ly = prompt('Lý do loại khách ' + (c ? c.name : '') + ' khỏi thưởng:') || ''; if (!ly.trim()) { App.toast('Phải ghi lý do'); return; } }
    this.ghiCoSo((dang ? 'Tính lại khách ' : 'Loại khách ') + (c ? c.name : cid) + (ly ? ' — ' + ly : ''),
      r => { r.loai = r.loai || {}; if (dang) delete r.loai[cid]; else r.loai[cid] = ly; });
  },

  /* ---------- Phiếu lương của tôi ----------
     Mọi nhân viên tự xem phiếu lương của chính mình (mục 6.3 quy chế: người lao động
     được nhận bảng kê chi tiết). Chỉ hiện phiếu ĐÃ CHỐT — số tạm tính còn đổi, cho xem
     dễ sinh thắc mắc. Không bao giờ hiện phiếu của người khác. */
  cuaToi(){
    const me = Perm.me();
    if (!me) return `<div class="note-block">Tài khoản đang đăng nhập chưa gắn với nhân viên nào — nhờ quản lý điền email của bạn vào hồ sơ nhân viên.</div>`;
    const ds = (db.bangLuong || []).filter(r => r.staffId === me.id && r.chot && r.snap)
      .sort((a, b) => a.thang < b.thang ? 1 : -1);
    if (!ds.length) return `<div class="note-block">Chưa có phiếu lương nào được chốt cho <b>${h(me.name)}</b>. Phiếu hiện ở đây sau khi quản lý chốt lương tháng.</div>`;
    const M = ds.some(r => r.thang === this._xemCuaToi) ? this._xemCuaToi : ds[0].thang;
    const phieu = this.htmlPhieu(me, M, true);
    return `
    <div class="page-head" style="margin-bottom:12px">
      <label class="sub-line" style="display:flex;align-items:center;gap:8px">Tháng
        <select onchange="Luong._xemCuaToi=this.value;App.render()">${ds.map(r => `<option value="${r.thang}"${r.thang === M ? ' selected' : ''}>${this.nhanThang(r.thang)}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      <button class="btn primary" onclick="Luong.inCuaToi('${M}')">${IC.print} In phiếu</button></div>
    <div class="card"><div class="card-b" style="overflow-x:auto">${phieu}</div></div>
    <div class="note-block" style="margin-top:12px">Có khoản nào chưa đúng thì báo quản lý trong <b>07 ngày làm việc</b> kể từ ngày nhận phiếu.</div>`;
  },
  _xemCuaToi: null,
  inCuaToi(M){
    const me = Perm.me(), p = me && this.phieu(me.id, M);
    if (!p || !p.chot) return;
    App.print(this.htmlPhieu(me, M), 'A4', 'Phiếu lương ' + me.name + ' ' + this.nhanThang(M));
  },

  /* ---------- In ---------- */
  dau(tieuDe){
    const cl = db.clinic || {};
    return `<div style="display:flex;justify-content:space-between;font-size:12px"><div><b>${h((cl.legal || cl.name || '').toUpperCase())}</b><br>${h(cl.addr || '')}</div></div>
      <h2 style="text-align:center;margin:14px 0 4px">${tieuDe}</h2>`;
  },
  kyTen(trai, phai){
    return `<table style="width:100%;margin-top:18px;text-align:center;border:0"><tr>
      <td style="border:0;width:33%"><b>Người lập</b><br><i>(Ký, ghi rõ họ tên)</i></td>
      <td style="border:0;width:33%"><b>${trai}</b><br><i>(Ký, ghi rõ họ tên)</i></td>
      <td style="border:0"><i>${DanhGia.noiKy()}, ngày …… tháng …… năm ……</i><br><b>${phai}</b><br><i>(Ký, ghi rõ họ tên)</i></td></tr></table><div style="height:60px"></div>`;
  },
  htmlPhieu(st, M, manHinh){
    const k = this.tinh(st, M); let nhomTr = '';
    const dong = this.KHOAN.filter(K => k.v[K.k] || k.sua[K.k]).map(K => {
      const t = K.nhom !== nhomTr ? (nhomTr = K.nhom, `<tr><td colspan="3" style="background:#eee"><b>${h(K.nhom)}</b></td></tr>`) : '';
      const s = k.sua[K.k];
      return t + `<tr><td>${h(K.ten)}<br><span style="font-size:10px;color:#555">${h(K.cc)}</span></td>
        <td style="font-size:10.5px">${(k.cc[K.k] || []).join('<br>')}${s ? `<br><i>Điều chỉnh: ${h(s.lyDo)} (tự tính ${money(k.d[K.k])})</i>` : ''}</td>
        <td style="text-align:right;white-space:nowrap">${K.loai === 'tru' ? '−' : ''}${money(k.v[K.k])}</td></tr>`;
    }).join('');
    return `<div style="${manHinh ? '' : 'page-break-after:always;'}font-size:12px">${this.dau('PHIẾU LƯƠNG THÁNG ' + this.nhanThang(M))}
      <p style="text-align:center;margin:0 0 10px">Họ tên: <b>${h(st.name)}</b> · Chức danh: ${h(st.role || this.NHOM[k.nhom].ten)} ·
        Công thực tế: ${k.cg.cong} · Ngày có mặt: ${k.cg.ngay}${k.daChot ? '' : ' · <i>(tạm tính)</i>'}</p>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="4">
        <tr><th style="width:30%">Khoản</th><th>Căn cứ, minh chứng</th><th style="width:16%">Số tiền</th></tr>
        ${dong}
        <tr><td colspan="2"><b>Tổng thu nhập</b></td><td style="text-align:right"><b>${money(k.thu)}</b></td></tr>
        <tr><td colspan="2"><b>Tổng khấu trừ</b></td><td style="text-align:right"><b>−${money(k.tru)}</b></td></tr>
        <tr><td colspan="2"><b>THỰC LĨNH</b></td><td style="text-align:right;font-size:14px"><b>${money(k.linh)}</b></td></tr></table>
      <p style="font-size:10.5px"><i>Chỉ lương chức danh là căn cứ đóng BHXH. Các khoản hỗ trợ và tiền thưởng chi trả theo Quy chế lương, thưởng
        ${h(DanhGia.qc() || '')}, thay đổi theo số ngày làm việc thực tế và kết quả công việc của từng tháng. Người lao động có quyền đối chiếu
        trong 07 ngày làm việc kể từ ngày nhận phiếu.</i></p>
      ${manHinh ? '' : this.kyTen('Người lao động', 'Giám đốc')}</div>`;
  },
  inPhieu(stId){
    const st = staffById(stId); if (!st) return;
    App.print(this.htmlPhieu(st, this.M()), 'A4', 'Phiếu lương ' + st.name + ' ' + this.nhanThang(this.M()));
  },
  inBang(){
    const M = this.M(), ds = this.dsNV(M).map(st => ({st, k: this.tinh(st, M)}));
    const cot = this.KHOAN.filter(K => ds.some(r => r.k.v[K.k]));
    const tong = K => ds.reduce((s, r) => s + r.k.v[K.k], 0);
    const sm = n => (Math.round(n) || 0).toLocaleString('vi-VN');
    const html = `<div style="font-size:9.5px">${this.dau('BẢNG THANH TOÁN TIỀN LƯƠNG THÁNG ' + this.nhanThang(M))}
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="2">
        <tr><th>TT</th><th>Họ tên</th><th>Công</th>${cot.map(K => `<th>${h(K.ten)}</th>`).join('')}<th>Thực lĩnh</th><th>Ký nhận</th></tr>
        ${ds.map((r, i) => `<tr><td>${i + 1}</td><td>${h(r.st.name)}</td><td style="text-align:right">${r.k.cg.cong}</td>
          ${cot.map(K => `<td style="text-align:right">${K.loai === 'tru' && r.k.v[K.k] ? '−' : ''}${sm(r.k.v[K.k])}${r.k.sua[K.k] ? '*' : ''}</td>`).join('')}
          <td style="text-align:right"><b>${sm(r.k.linh)}</b></td><td style="width:60px"></td></tr>`).join('')}
        <tr><td></td><td><b>Cộng</b></td><td></td>${cot.map(K => `<td style="text-align:right"><b>${sm(tong(K))}</b></td>`).join('')}
          <td style="text-align:right"><b>${sm(ds.reduce((s, r) => s + r.k.linh, 0))}</b></td><td></td></tr></table>
      <p><i>(*) Khoản quản lý điều chỉnh, lý do ghi trong phiếu lương từng người. Đơn vị: đồng.</i></p>
      ${this.kyTen('Kế toán', 'Giám đốc')}</div>`;
    App.print(html, 'A4N', 'Bảng lương ' + this.nhanThang(M));
  },
  inTongHop(){
    const M = this.M();
    const tam = document.createElement('div'); tam.innerHTML = this.tongHop();
    tam.querySelectorAll('button, select, .page-head, input').forEach(x => {
      if (x.tagName === 'INPUT') x.replaceWith(document.createTextNode(x.value)); else x.remove();
    });
    App.print(`<div style="font-size:11px">${this.dau('BẢNG TỔNG HỢP SỐ LIỆU TÍNH THƯỞNG THÁNG ' + this.nhanThang(M))}${tam.innerHTML}${this.kyTen('Người kiểm tra', 'Giám đốc')}</div>`,
      'A4', 'Tổng hợp thưởng ' + this.nhanThang(M));
  },
};
