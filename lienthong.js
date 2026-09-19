/* ================= KẾT XUẤT LIÊN THÔNG HỒ SƠ BỆNH ÁN ĐIỆN TỬ =================
   Công văn hướng dẫn kỹ thuật của Trung tâm Thông tin y tế Quốc gia (Bộ Y tế),
   mục III.1.1.d và mục IV: phần mềm phải kết xuất được thông tin hồ sơ bệnh án
   điện tử theo tệp XML hoặc JSON phục vụ liên thông dữ liệu, theo đúng cấu trúc
   ở Phụ lục "Mô tả dữ liệu trao đổi hồ sơ bệnh án điện tử".

   Tên trường, thứ tự và cách viết ngày giờ lấy đúng ví dụ trong phụ lục đó:
   gốc là HoSoBenhAn, ngày ghi dd/mm/yyyy, ngày giờ ghi dd/mm/yyyy HH:MM:SS.mmm,
   ô trống để chuỗi rỗng, mảng trong XML thì lặp lại thẻ cùng tên.

   Phụ lục có 11 nhóm. Phòng khám răng hàm mặt ngoại trú chỉ phát sinh dữ liệu ở
   5 nhóm đầu; 6 nhóm còn lại (chẩn đoán hình ảnh, xét nghiệm, chuyển viện, cấp
   cứu, thủ thuật, phẫu thuật) vẫn kết xuất nhưng để rỗng, giữ đủ cấu trúc cho
   bên nhận đọc. */
'use strict';

const LT = {
  /* ---------- Định dạng theo đúng ví dụ của Bộ ---------- */
  ngay(iso){
    if (!iso) return '';
    const s = String(iso).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8,10) + '/' + s.slice(5,7) + '/' + s.slice(0,4) : '';
  },
  gio(iso){
    if (!iso) return '';
    const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return '';
    const p = (n, r) => String(n).padStart(r || 2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth()+1) + '/' + d.getFullYear() + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
  },
  s(v){ return v == null ? '' : String(v); },
  tuoi(c){
    if (!c.dob) return '';
    const d = new Date(c.dob + 'T00:00'), n = new Date();
    let t = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) t--;
    return t >= 0 ? String(t) : '';
  },
  /* Số vào viện là khóa nối mọi nhóm dữ liệu lại với nhau. Mỗi đợt điều trị là
     một lần "vào viện"; khách chưa mở đợt nào thì lấy mã khách làm khóa. */
  soVaoVien(c, ep){
    return ep ? (c.code || c.id).replace(/\s/g,'') + '.' + String(ep.tuNgay || '').replace(/-/g,'')
              : (c.code || c.id);
  },
  ten(id){ const s = staffById(id); return s ? s.name : ''; },
  /* Chỉ lấy ra mã ICD khi chuỗi thật sự có mã. Chẩn đoán gõ tay thì để trống mã,
     đừng nhét cả câu tiếng Việt vào ô maicd — bên nhận sẽ đọc sai. */
  maICD(v){
    const m = String(v || '').match(/\b([A-Z]\d{2}(?:\.\d+)?)\b/);
    return m ? m[1] : '';
  },

  /* ---------- Mô tả tình trạng răng để đưa vào mục Răng Hàm Mặt ----------
     Phụ lục có sẵn nhánh 25.8 ranghammat trong khám các cơ quan — sơ đồ răng của
     mình đổ vào đúng chỗ đó, chứ không nhét vào ô ghi chú chung. */
  moTaRang(c, lop){
    const t = (c && c[lop]) || {};
    const ra = [];
    Object.keys(t).sort().forEach(n => {
      const mo = (typeof Tooth !== 'undefined') ? Tooth.moTa(n, t[n]) : '';
      if (mo && mo !== 'Bình thường') ra.push('R' + n + ': ' + mo);
    });
    return ra.join('; ');
  },

  /* ---------- I. Thông tin người bệnh ---------- */
  benhNhan(c, ep){
    const r = c.record || {};
    const tienSu = [];
    if (r.tienSuBanThan) tienSu.push({thongtin_ma:'', thongtin_noidung: r.tienSuBanThan, thongtin_giatri:'1', thongtin_ghichu:''});
    if (c.allergy)       tienSu.push({thongtin_ma:'', thongtin_noidung:'Dị ứng: ' + c.allergy, thongtin_giatri:'1', thongtin_ghichu:''});
    return {
      loaiba: 'BA-18',
      sovaovien: this.soVaoVien(c, ep),
      soba: this.s(c.soHS || c.code),
      soluutru: this.s(c.code),
      makhoa: 'RHM',
      tenkhoa: 'Răng Hàm Mặt',
      thoigianvaovien: this.gio(ep ? ep.tuNgay : c.createdAt),
      mabenhnhan: this.s(c.code || c.id),
      buong: '', giuong: '',
      cccd_so: this.s(c.cccd),
      hochieu_so: '',
      hoten: this.s(c.name).toUpperCase(),
      ngaysinh: this.ngay(c.dob),
      tuoi: this.tuoi(c),
      gioitinh: this.s(c.gender),
      nghenghiep: this.s(c.job), nghenghiep_ma: '',
      dantoc: this.s(c.danToc), dantoc_ma: '',
      ngoaikieu: this.s(c.quocTich), ngoaikieu_ma: '',
      tungaybhyt: '', denngaybhyt: '', mabhyt: this.s(c.bhyt), noidangkykcbbd: '',
      diachi: [c.addr, c.ward, c.province].filter(Boolean).join(', '),
      sonha: this.s(c.addr), thonpho: '',
      xaphuong: this.s(c.ward), quanhuyen: '', quanhuyen_ma: '',
      tinhthanh: this.s(c.province), tinhthanh_ma: '',
      noilamviec: '',
      sodienthoai: this.s(c.phone),
      nhommau: '', yeutorh: '',
      doituongbn_loai: this.s(c.doiTuong || 'Dịch vụ'),
      hotennguoithan: [c.kinRel, c.kinName].filter(Boolean).join(': '),
      diachinguoithan: '',
      sodienthoainguoithan: this.s(c.kinPhone),
      lydotiepnhan: this.s(r.lyDo),
      noigioithieu_loai: 'Tự đến',
      tiensubenhtatcuabanthan: tienSu,
      tiensubenhtatcuagiadinh: this.s(r.tienSuGiaDinh),
    };
  },

  /* ---------- II. Thông tin vào viện ---------- */
  vaoVien(c, ep){
    const r = c.record || {};
    const bs = (ep && ep.doctorId) || (db.treatments.find(t => ep && t.episodeId === ep.id && t.doctorId) || {}).doctorId || '';
    const ha = String(r.huyetAp || '').split('/');
    const rangMieng = [r.ngoaiMieng, r.trongMieng, this.moTaRang(c, 'teeth')].filter(Boolean).join('; ');
    const coQuan = k => ({dauchung_ma: {VNCODE:'', SNOMED:''}, dauchung: '', dauchung_ghichu: ''});
    return {
      sovaovien: this.soVaoVien(c, ep),
      sophieu: 'BA18.' + this.s(c.code || c.id),
      phongkham: this.s(db.clinic.name),
      maphongkham: this.s(db.clinic.maCSKCB),
      bacsikhambenh: this.ten(bs), mabacsikhambenh: this.s(bs),
      chandoancuanoigioithieu: '',
      chandoansobo: this.s(r.chanDoan),
      chandoanvaovien: this.s(r.chanDoan),
      khambenh_chandoanvaovienmaicd: this.maICD(r.chanDoan),
      chieucao: this.s(r.chieuCao),
      dieutritaikhoa: 'Răng Hàm Mặt', madieutritaikhoa: 'RHM',
      chuky_hoten: this.ten(bs),
      denkhambenhluc: this.gio(ep ? ep.tuNgay : c.createdAt),
      lydovaovien: this.s(r.lyDo),
      quatrinhbenhly: this.s(r.quaTrinh),
      mach: this.s(r.mach), nhietdo: this.s(r.nhietDo), nhiptho: this.s(r.nhipTho),
      huyetap_tamthu: this.s(ha[0] || ''), huyetap_tamtruong: this.s(ha[1] || ''),
      cannang: this.s(r.canNang),
      khambenh_toanthan: this.s(r.toanThan),
      khambenh_caccoquan: {
        tuanhoan: coQuan(), hohap: coQuan(), tieuhoa: coQuan(),
        thantietnieu: coQuan(), thankinh: coQuan(), coxuongkhop: coQuan(),
        taimuihong: coQuan(),
        ranghammat: {
          dauchung_ma: {VNCODE: '', SNOMED: ''},
          dauchung: rangMieng,
          dauchung_ghichu: this.s(r.canLamSang),
        },
        noitiet_dinhduong_benhlikhac: coQuan(),
      },
    };
  },

  /* ---------- III. Thông tin điều trị ---------- */
  dieuTri(c, ep){
    const r = c.record || {};
    const muc = ep ? db.treatments.filter(t => t.episodeId === ep.id) : [];
    const bs = (muc.find(t => t.doctorId) || {}).doctorId || '';
    const db_ = (r.dienBien || []).filter(v => !ep || !v.episodeId || v.episodeId === ep.id);
    const xong = muc.length && muc.every(t => t.status === 'Hoàn tất');
    return {
      bacsidieutri: this.ten(bs), bacsidieutri_ma: this.s(bs),
      khoadieutri_ma: 'RHM', khoadieutri: 'Răng Hàm Mặt',
      giuong_ma: '', giuong: '',
      khoavaovien_ma: 'RHM', khoavaovien: 'Răng Hàm Mặt',
      ngaynhapkhoa: this.ngay(ep ? ep.tuNgay : ''),
      songaydieutri: String(new Set(db_.map(v => v.date)).size || ''),
      ngayravien: xong && ep ? this.ngay(ep.denNgay || (db_.map(v=>v.date).sort().slice(-1)[0] || '')) : '',
      tongsongaydieutri: String(new Set(db_.map(v => v.date)).size || ''),
      chandoan: this.s(r.chanDoan), chandoan_ma: this.maICD(r.chanDoan),
      chandoanvaovien: this.s(r.chanDoan), chandoanvaovien_ma: this.maICD(r.chanDoan),
      chandoantuyenduoi: '', chandoantuyenduoi_ma: '',
      maicd: this.maICD(r.chanDoan),
      tenicd: this.s(r.chanDoan),
      maicd_khac: this.maICD(r.chanDoanKem), tenicd_khac: this.s(r.chanDoanKem),
      ghichu: '', taibien: '',
      tomtat: this.s(r.tomTat),
      bienchung: this.s(r.bienChung),
      tienluong: '',
      huongdieutri: this.s(r.keHoach),
      danhsachchuyenkhoa: [],
      danhsachsinhhieu: (r.mach || r.nhietDo || r.canNang) ? [{
        mach: this.s(r.mach), nhietdo: this.s(r.nhietDo),
        huyetap_cao: this.s(String(r.huyetAp||'').split('/')[0] || ''),
        huyetap_thap: this.s(String(r.huyetAp||'').split('/')[1] || ''),
        nhiptho: this.s(r.nhipTho), cannang: this.s(r.canNang), chieucao: this.s(r.chieuCao),
        thoidiem: this.gio(ep ? ep.tuNgay : c.createdAt),
      }] : [],
      tinhtrangravien: {
        ketquadieutri: xong ? 'Khỏi' : '',
        loidanbacsi: this.s(r.danDo) || (db_.slice(-1)[0] || {}).dan || '',
      },
      /* Diễn biến từng buổi — phụ lục không có nhánh riêng cho phòng khám ngoại trú
         nên gộp vào tóm tắt quá trình điều trị, giữ nguyên ngày và người thực hiện. */
      quatrinhdieutri: db_.map(v => ({
        ngay: this.ngay(v.date),
        bacsi: this.ten(v.doctorId), nguoiphu: this.ten(v.assistantId),
        dienbien: this.s(v.db), xutri: this.s(v.xt), dando: this.s(v.dan),
      })),
    };
  },

  /* ---------- IV. Y lệnh thuốc vật tư ---------- */
  thuoc(c, ep){
    const ds = (db.rx || []).filter(x => x.customerId === c.id);
    if (!ds.length) return {sovaovien: this.soVaoVien(c, ep), danhsach: []};
    return {
      sovaovien: this.soVaoVien(c, ep),
      danhsach: ds.map(d => ({
        sophieu: this.s(d.code || d.id),
        bacsichidinh: this.ten(d.doctorId), mabacsichidinh: this.s(d.doctorId),
        chandoansobo: this.s((c.record || {}).chanDoan),
        doituongbn: '',
        danhsach: (d.items || []).map((it, i) => ({
          machidinh: '', cachdung: this.s(it.use),
          ngaykedonthuoc: this.ngay(d.date),
          donvitinh: this.s(it.unit), nhom: '', loaithuoc: '',
          mathuocvattu_bv: '', mathuocvattu_byt: '',
          soluongthuocvattu: this.s(it.qty),
          sothutungaydungthuoc: String(i + 1),
          tenthuocvattu: this.s(it.name || it.drug),
          ylenhthuocvattu_ghichu: '',
        })),
      })),
    };
  },

  /* ---------- V. Phiếu chỉ định (dịch vụ kỹ thuật đã làm) ---------- */
  chiDinh(c, ep){
    const muc = ep ? db.treatments.filter(t => t.episodeId === ep.id)
                   : db.treatments.filter(t => t.customerId === c.id);
    if (!muc.length) return {sovaovien: this.soVaoVien(c, ep), danhsach: []};
    const bs = (muc.find(t => t.doctorId) || {}).doctorId || '';
    const tien = t => (typeof Treat !== 'undefined' && Treat.thanhTien)
      ? Treat.thanhTien(t.donGia, t.sl, t.giamPct, t.giamTien) : (t.donGia || 0) * (t.sl || 1);
    return {
      sovaovien: this.soVaoVien(c, ep),
      danhsach: [{
        sophieu: 'CD.' + this.s(c.code || c.id),
        bacsichidinh: this.ten(bs), mabacsichidinh: this.s(bs),
        chandoansobo: this.s((c.record || {}).chanDoan),
        doituongbn: '',
        danhsach: muc.map(t => ({
          machidinh: this.s(t.id),
          ngaychidinh: this.ngay(t.date || (ep && ep.tuNgay) || ''),
          benhnhanphaitra: String(tien(t)),
          dongia: String(t.donGia || 0),
          loaichidinh: this.s(t.group || 'Dịch vụ kỹ thuật RHM'), loaimachidinh: '',
          noithuchienchidinh: this.s(db.clinic.name),
          manoithuchienchidinh: this.s(db.clinic.maCSKCB),
          soluong: String(t.sl || 1),
          tenchidinh: this.s(t.name) + (t.tooth ? ' — R' + t.tooth : ''),
          thanhtien: String(tien(t)),
        })),
        giogiaomau: '', giolaymau: '', giuong: '',
        khoadieutri: 'Răng Hàm Mặt', mucdochidinh: '', nguoilaymau: '',
        noichidinh: this.s(db.clinic.name), phong: '',
        tongcong: String(muc.reduce((s, t) => s + tien(t), 0)),
      }],
    };
  },

  /* ---------- Gộp thành một hồ sơ ---------- */
  hoSo(c, ep){
    const sv = this.soVaoVien(c, ep);
    return {HoSoBenhAn: {
      ThongTinBenhNhan: this.benhNhan(c, ep),
      ThongTinVaoVien: this.vaoVien(c, ep),
      ThongTinDieuTri: this.dieuTri(c, ep),
      YLenhThuocVatTu: this.thuoc(c, ep),
      PhieuChiDinh: this.chiDinh(c, ep),
      /* Sáu nhóm dưới đây phòng khám răng hàm mặt ngoại trú không phát sinh —
         vẫn kết xuất rỗng để bên nhận đọc được đủ cấu trúc. */
      KetQuaChanDoanHinhAnh: {sovaovien: sv, danhsach: []},
      KetQuaXetNghiem: {sovaovien: sv, danhsach: []},
      GiayChuyenVien: {sovaovien: sv, danhsach: []},
      HoSoCapCuu: {sovaovien: sv, danhsach: []},
      PhieuThuThuat: {sovaovien: sv, danhsach: []},
      PhieuPhauThuat: {sovaovien: sv, danhsach: []},
    }};
  },

  /* ---------- Kết xuất ---------- */
  json(c, ep){ return JSON.stringify(this.hoSo(c, ep), null, 2); },

  /* XML: mảng thì lặp lại thẻ cùng tên, ô rỗng thì thẻ tự đóng — đúng như ví dụ. */
  xmlThan(o, sau){
    const n = sau || '  ';
    const thoat = v => String(v).replace(/[&<>]/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]));
    let ra = '';
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (Array.isArray(v)) {
        if (!v.length) { ra += n + '<' + k + '/>\n'; return; }
        v.forEach(x => {
          ra += (x && typeof x === 'object')
            ? n + '<' + k + '>\n' + this.xmlThan(x, n + '  ') + n + '</' + k + '>\n'
            : n + '<' + k + '>' + thoat(x) + '</' + k + '>\n';
        });
      } else if (v && typeof v === 'object') {
        ra += n + '<' + k + '>\n' + this.xmlThan(v, n + '  ') + n + '</' + k + '>\n';
      } else {
        const t = v == null ? '' : String(v);
        ra += t === '' ? n + '<' + k + '/>\n' : n + '<' + k + '>' + thoat(t) + '</' + k + '>\n';
      }
    });
    return ra;
  },
  xml(c, ep){
    const o = this.hoSo(c, ep).HoSoBenhAn;
    return '<?xml version="1.0" encoding="UTF-8"?>\n<HoSoBenhAn>\n' + this.xmlThan(o) + '</HoSoBenhAn>\n';
  },

  taiVe(ten, noiDung, kieu){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + noiDung], {type: kieu + ';charset=utf-8'}));
    a.download = ten; a.click();
  },
  tenTep(c, ep, duoi){
    return 'HSBA-' + (c.code || c.id) + (ep ? '-' + String(ep.tuNgay||'').replace(/-/g,'') : '') + '.' + duoi;
  },

  /* ---------- Hộp thoại ---------- */
  hop(cid){
    const c = custById(cid || App.state.custSel);
    if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const ds = (typeof Dot !== 'undefined' ? Dot.cua(c.id) : []);
    const ep = ds.find(e => e.id === this.epId) || Dot.dangChon(c) || ds[0] || null;
    this.epId = ep ? ep.id : '';
    const xem = this.json(c, ep);
    App.modal('Kết xuất liên thông — ' + c.name, `
      <div class="note-block">Tệp kết xuất theo Phụ lục <b>"Mô tả dữ liệu trao đổi hồ sơ bệnh án điện tử"</b>
        của Bộ Y tế — gốc <code>HoSoBenhAn</code>, 11 nhóm dữ liệu. Dùng khi cơ quan quản lý
        hoặc cơ sở khác yêu cầu dữ liệu hồ sơ bệnh án.</div>
      ${ds.length > 1 ? `<div class="f full"><label>Đợt điều trị</label>
        <select onchange="LT.epId=this.value;LT.hop('${c.id}')">
          ${ds.map(e => `<option value="${e.id}"${ep && e.id===ep.id?' selected':''}>${h(e.ten||'(chưa đặt tên)')} — ${fmtD(e.tuNgay)}</option>`).join('')}
        </select></div>` : ''}
      <div class="f full"><label>Số vào viện (khóa nối các nhóm dữ liệu)</label>
        <div class="tooth-info" style="margin-top:0"><b>${h(this.soVaoVien(c, ep))}</b></div></div>
      <div class="f full"><label>Xem trước (JSON)</label>
        <textarea rows="14" readonly style="font-family:ui-monospace,Consolas,monospace;font-size:11px">${h(xem)}</textarea>
        <div class="combo-hint">${xem.length.toLocaleString('vi-VN')} ký tự.
          Nhóm dữ liệu phòng khám không phát sinh (xét nghiệm, chuyển viện, phẫu thuật…) được để rỗng.</div></div>
      <div class="form-actions full">
        <button class="btn" onclick="App.closeModal()">Đóng</button>
        <button class="btn primary" onclick="LT.tai('${c.id}','json')">Tải tệp JSON</button>
        <button class="btn primary" onclick="LT.tai('${c.id}','xml')">Tải tệp XML</button></div>`);
  },
  epId: '',
  tai(cid, duoi){
    const c = custById(cid); if (!c) return;
    const ds = Dot.cua(c.id);
    const ep = ds.find(e => e.id === this.epId) || Dot.dangChon(c) || ds[0] || null;
    const noi = duoi === 'xml' ? this.xml(c, ep) : this.json(c, ep);
    this.taiVe(this.tenTep(c, ep, duoi), noi, duoi === 'xml' ? 'application/xml' : 'application/json');
    if (typeof Vet !== 'undefined')
      Vet.ghi('xuat', 'Kết xuất liên thông ' + duoi.toUpperCase() + ' — ' + (c.name || '') +
        ' · số vào viện ' + this.soVaoVien(c, ep), {tbl: 'customers', rid: c.id, khach: c.id});
    App.toast('Đã tải tệp ' + duoi.toUpperCase() + ' ✓');
  },

  /* Kết xuất hàng loạt: mỗi đợt điều trị một hồ sơ, gói chung vào một tệp JSON */
  taiTatCa(){
    const ra = [];
    (db.customers || []).forEach(c => {
      const ds = Dot.cua(c.id);
      if (!ds.length) { ra.push(this.hoSo(c, null)); return; }
      ds.forEach(e => ra.push(this.hoSo(c, e)));
    });
    this.taiVe('HSBA-toan-bo-' + todayISO() + '.json',
      JSON.stringify({DanhSachHoSoBenhAn: ra}, null, 2), 'application/json');
    if (typeof Vet !== 'undefined')
      Vet.ghi('xuat', 'Kết xuất liên thông toàn bộ — ' + ra.length + ' hồ sơ bệnh án');
    App.toast('Đã tải ' + ra.length + ' hồ sơ ✓');
  },
};
