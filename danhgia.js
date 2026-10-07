/* Phiếu đánh giá thưởng hiệu quả công việc hằng tháng của bác sĩ.
   Căn cứ Điều 18 Quy chế lương, thưởng (QĐ 08/2026/QĐ-HB-TĐ): 05 tiêu chí × 20 điểm,
   từ 90 điểm thưởng 900.000đ, 75 → 600.000đ, 60 → 300.000đ, dưới 60 không thưởng;
   bị kỷ luật từ khiển trách trở lên trong tháng thì không thưởng.

   Điểm được TÍNH TỪ DỮ LIỆU CÓ SẴN trong phần mềm chứ không gõ tay:
   - Tiêu chí 1 (hồ sơ bệnh án) soát chẩn đoán, diễn biến, chỉ định và đối chiếu ngày
     thu tiền với ngày ghi diễn biến;
   - Tiêu chí 4 (tái khám) lấy từ lịch hẹn;
   - Tiêu chí 2, 3, 5 và kỷ luật lấy từ "Sổ ghi nhận" — sự việc phải được ghi ngay khi
     xảy ra, có ngày, có người ghi. Đó chính là minh chứng khi cơ quan BHXH hỏi vì sao
     tháng này thưởng 900.000đ mà tháng kia chỉ 300.000đ.
   Cuối tháng chỉ cần soát, chốt và in. Chốt xong thì số liệu đóng băng, tiền thưởng
   tự vào bảng lương (bảng bonuses) của tháng đó. */
'use strict';

const DanhGia = {
  thang: null,

  TIEU_CHI: [
    {ten: 'Hồ sơ bệnh án ghi chép đầy đủ, đúng thời hạn',
     cach: 'Kiểm tra ngẫu nhiên tối thiểu 10 hồ sơ của người được đánh giá trong tháng. Trừ 05 điểm cho mỗi hồ sơ ghi thiếu nội dung bắt buộc hoặc hoàn thiện chậm so với quy định.'},
    {ten: 'Tuân thủ quy trình kiểm soát nhiễm khuẩn, an toàn người bệnh',
     cach: 'Căn cứ sổ giám sát, bảng kiểm KSNK. Trừ 05 điểm cho mỗi lần vi phạm được ghi nhận. Để xảy ra sự cố y khoa do lỗi chuyên môn: 0 điểm.'},
    {ten: 'Không có khiếu nại của người bệnh được xác định là có căn cứ',
     cach: 'Trừ 10 điểm cho mỗi khiếu nại được Công ty xác minh là có căn cứ. Khiếu nại không có căn cứ không bị trừ điểm.'},
    {ten: 'Người bệnh quay lại tái khám, tiếp tục điều trị theo lịch hẹn',
     cach: 'Tỷ lệ = số lượt người bệnh đến đúng hẹn (chênh không quá 03 ngày) ÷ tổng số lượt hẹn trong tháng, theo sổ hẹn/phần mềm. Từ 90% trở lên: 20 điểm; 80% – dưới 90%: 15; 70% – dưới 80%: 10; dưới 70%: 05.'},
    {ten: 'Hướng dẫn, phối hợp với phụ tá; chấp hành lịch phân ca',
     cach: 'Trừ 05 điểm cho mỗi lần không chấp hành lịch phân ca hoặc không hướng dẫn, phối hợp với phụ tá được ghi nhận bằng văn bản.'},
  ],
  MUC: [[90, 900000], [75, 600000], [60, 300000]],
  SO_HS_KIEM: 10,

  /* Các loại sự việc trong sổ ghi nhận. tc = tiêu chí bị trừ (1..5) */
  LOAI: {
    hoso:     {ten: 'Hồ sơ bệnh án ghi thiếu / hoàn thiện chậm', tc: 1, tru: 5},
    ksnk:     {ten: 'Vi phạm quy trình kiểm soát nhiễm khuẩn',    tc: 2, tru: 5},
    suco:     {ten: 'Sự cố y khoa do lỗi chuyên môn',             tc: 2, veKhong: true},
    khieunai: {ten: 'Khiếu nại của người bệnh',                    tc: 3, tru: 10, xacMinh: true},
    phanca:   {ten: 'Không chấp hành lịch phân ca',               tc: 5, tru: 5},
    phoihop:  {ten: 'Không hướng dẫn, phối hợp với phụ tá',        tc: 5, tru: 5},
    kyluat:   {ten: 'Bị xử lý kỷ luật lao động (khiển trách trở lên)', kyLuat: true},
  },
  KET_QUA: {cho: 'Chờ xác minh', cocancu: 'Có căn cứ', khongcancu: 'Không có căn cứ'},

  /* ---------- Tiện ích ---------- */
  macDinhThang(){
    /* Mười ngày đầu tháng là lúc chấm cho tháng trước */
    const d = new Date();
    if (d.getDate() <= 10) d.setMonth(d.getMonth() - 1, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  M(){ return this.thang || (this.thang = this.macDinhThang()); },
  ngayCuoi(M){ const [y, m] = M.split('-').map(Number); return isoOf(new Date(y, m, 0)); },
  nhanThang(M){ return M.slice(5) + '/' + M.slice(0, 4); },
  cachNgay(a, b){ return Math.round((new Date(a + 'T00:00') - new Date(b + 'T00:00')) / 86400000); },
  bam(s){ let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; },
  tienCua(tong){ const m = this.MUC.find(([d]) => tong >= d); return m ? m[1] : 0; },
  bacSi(){
    const M = this.M();
    return db.staff.filter(s => (s.role || '').includes('Bác sĩ')
      && (s.active !== false || (db.danhGia || []).some(r => r.staffId === s.id && r.thang === M)));
  },
  phieu(stId, M){ return (db.danhGia || []).find(r => r.id === 'dg_' + stId + '_' + M); },
  phieuMoi(stId, M){
    if (!db.danhGia) db.danhGia = [];
    let r = this.phieu(stId, M);
    if (!r) { r = {id: 'dg_' + stId + '_' + M, staffId: stId, thang: M, congLich: 26, hsDat: {}, henLoai: {}, sua: {}, yKien: 'dongy', yKienText: ''}; db.danhGia.push(r); }
    return r;
  },
  /* Số quyết định ban hành quy chế lương, thưởng — mỗi công ty một số */
  qc(){
    const cl = db.clinic || {};
    return cl.qcLuongThuong || (/Thời Đại/i.test((cl.legal || '') + (cl.name || '')) ? '08/2026/QĐ-HB-TĐ' : '');
  },
  doiQC(v){ db.clinic.qcLuongThuong = String(v || '').trim(); save(); App.render(); },
  /* Địa danh ghi ở dòng ngày tháng: theo địa chỉ cơ sở, chưa có địa chỉ thì theo tên */
  noiKy(){ const cl = db.clinic || {}; return /Gò Quao/i.test(cl.addr || cl.name || '') ? 'Gò Quao' : 'Rạch Giá'; },
  ghiNhanThang(stId, M){ return (db.ghiNhan || []).filter(g => g.staffId === stId && monthOf(g.date) === M); },

  /* ---------- Tiêu chí 1: soát hồ sơ bệnh án ---------- */
  hoSo(st, M, p){
    const gap = {};
    const them = cid => { if (!gap[cid]) gap[cid] = {db: [], thu: []}; return gap[cid]; };
    db.customers.forEach(c => ((c.record && c.record.dienBien) || []).forEach(v => {
      if (v.doctorId === st.id && monthOf(v.date) === M) them(c.id).db.push(v);
    }));
    db.receipts.forEach(r => {
      if (r.doctorId === st.id && monthOf(r.date) === M && !r.old && r.customerId) them(r.customerId).thu.push(r);
    });
    const ds = Object.keys(gap).map(cid => {
      const c = custById(cid); if (!c) return null;
      const g = gap[cid], loi = [];
      if (!(c.record && c.record.chanDoan)) loi.push('chưa có chẩn đoán (ICD)');
      if (g.db.some(v => !String(v.db || '').trim())) loi.push('có buổi để trống diễn biến');
      if (g.db.some(v => !String(v.xt || '').trim())) loi.push('có buổi thiếu chỉ định – xử trí');
      const ngayGhi = new Set(((c.record && c.record.dienBien) || []).map(v => v.date));
      const thieu = [...new Set(g.thu.map(r => r.date))].filter(d => !ngayGhi.has(d));
      if (thieu.length) loi.push('thu tiền ngày ' + thieu.map(fmtD).join(', ') + ' nhưng không ghi diễn biến');
      return {c, loi, dat: !!(p && p.hsDat && p.hsDat[cid])};
    }).filter(Boolean);
    /* Chọn mẫu cố định theo bác sĩ + tháng: mở lại bao nhiêu lần cũng ra đúng 10 hồ sơ đó */
    ds.sort((a, b) => this.bam(st.id + M + a.c.id) - this.bam(st.id + M + b.c.id));
    const mau = ds.slice(0, this.SO_HS_KIEM);
    const loiHS = mau.filter(x => x.loi.length && !x.dat).length;
    return {tong: ds.length, mau, loiHS};
  },

  /* ---------- Tiêu chí 4: tái khám theo lịch hẹn ---------- */
  coDen(cid, ngay){
    const c = custById(cid);
    const gan = d => d && Math.abs(this.cachNgay(d, ngay)) <= 3;
    return ((c && c.record && c.record.dienBien) || []).some(v => gan(v.date))
      || db.receipts.some(r => r.customerId === cid && gan(r.date));
  },
  taiKham(st, M, p){
    const T = todayISO();
    const hen = db.appointments.filter(a => a.doctorId === st.id && a.customerId && monthOf(a.date) === M
      && a.date <= T && !String(a.id).startsWith('busy'));
    const ds = hen.map(a => ({a, c: custById(a.customerId),
      den: ['Đang điều trị', 'Hoàn tất'].includes(a.status) || this.coDen(a.customerId, a.date),
      loai: !!(p && p.henLoai && p.henLoai[a.id])}));
    const tinh = ds.filter(x => !x.loai), den = tinh.filter(x => x.den).length;
    const tyLe = tinh.length ? den / tinh.length : null;
    const diem = tyLe === null ? 20 : tyLe >= 0.9 ? 20 : tyLe >= 0.8 ? 15 : tyLe >= 0.7 ? 10 : 5;
    return {ds, tong: tinh.length, den, tyLe, diem};
  },

  /* ---------- Tổng hợp cả phiếu ---------- */
  tinh(st, M){
    const p = this.phieu(st.id, M);
    if (p && p.chot && p.snap) return Object.assign({daChot: true, p}, p.snap);
    const gn = this.ghiNhanThang(st.id, M);
    const dem = loai => gn.filter(g => g.loai === loai && (!this.LOAI[loai].xacMinh || g.ketQua === 'cocancu')).length;
    const hs = this.hoSo(st, M, p), tk = this.taiKham(st, M, p);
    const tu = [
      20 - 5 * (hs.loiHS + dem('hoso')),
      dem('suco') ? 0 : 20 - 5 * dem('ksnk'),
      20 - 10 * dem('khieunai'),
      tk.diem,
      20 - 5 * (dem('phanca') + dem('phoihop')),
    ].map(x => Math.max(0, x));
    const sua = (p && p.sua) || {};
    const diem = tu.map((x, i) => sua[i] && sua[i].diem !== '' && sua[i].diem != null ? Math.max(0, Math.min(20, Number(sua[i].diem))) : x);
    const tong = diem.reduce((s, x) => s + x, 0);
    const kyLuat = gn.some(g => g.loai === 'kyluat');
    const cho = gn.filter(g => g.loai === 'khieunai' && (g.ketQua || 'cho') === 'cho').length;
    const at = Att.summary(st.id, M);
    const minhChung = [
      `Soát ${hs.mau.length}/${hs.tong} hồ sơ, ${hs.loiHS} hồ sơ thiếu` + (dem('hoso') ? `; ${dem('hoso')} lần ghi nhận` : ''),
      dem('suco') ? `${dem('suco')} sự cố y khoa` : `${dem('ksnk')} lần vi phạm`,
      `${dem('khieunai')} khiếu nại có căn cứ`,
      tk.tyLe === null ? 'Không có lịch hẹn trong tháng' : `${tk.den}/${tk.tong} lượt đúng hẹn (${Math.round(tk.tyLe * 100)}%)`,
      `${dem('phanca') + dem('phoihop')} lần ghi nhận`,
    ].map((x, i) => sua[i] && sua[i].lyDo ? x + '. Điều chỉnh: ' + sua[i].lyDo : x);
    return {daChot: false, p, tu, diem, tong, kyLuat, cho, hs, tk,
      tien: kyLuat ? 0 : this.tienCua(tong), minhChung,
      congTT: at.cong ? Number(at.cong.toFixed(2)) : 0, congLich: (p && p.congLich) || 26};
  },

  /* ---------- Màn hình trong tab Nhân sự ---------- */
  tab(){
    const M = this.M(), bs = this.bacSi();
    const rows = bs.map(st => {
      const k = this.tinh(st, M);
      return `<tr><td><b>${h(st.name)}</b><br><span class="sub-line">${h(st.role || '')}</span></td>
        ${k.diem.map(x => `<td class="r num">${x}</td>`).join('')}
        <td class="r num" style="font-weight:700">${k.tong}</td>
        <td class="r num" style="font-weight:700;color:var(--ok)">${k.kyLuat ? '<span class="pill danger">kỷ luật</span>' : money(k.tien)}</td>
        <td>${k.daChot ? '<span class="pill ok">Đã chốt</span>' : '<span class="pill warn">Tạm tính</span>'}
          ${k.cho ? `<br><span class="pill danger">${k.cho} khiếu nại chờ xác minh</span>` : ''}</td>
        <td style="white-space:nowrap"><button class="btn small" onclick="DanhGia.chiTiet('${st.id}')">Chấm</button>
          <button class="btn small" onclick="DanhGia.in('${st.id}')">${IC.print} In</button></td></tr>`;
    }).join('') || `<tr><td colspan="10" class="sub-line">Chưa có nhân viên nào có chức danh "Bác sĩ".</td></tr>`;
    const gn = (db.ghiNhan || []).filter(g => monthOf(g.date) === M).sort((a, b) => a.date < b.date ? -1 : 1);
    const gnRows = gn.map(g => {
      const L = this.LOAI[g.loai] || {ten: g.loai};
      return `<tr><td class="num">${fmtD(g.date)}</td><td>${h((staffById(g.staffId) || {}).name || '')}</td>
        <td>${h(L.ten)}${L.xacMinh ? `<br><span class="pill ${g.ketQua === 'cocancu' ? 'danger' : g.ketQua === 'khongcancu' ? 'ok' : 'warn'}">${this.KET_QUA[g.ketQua || 'cho']}</span>` : ''}</td>
        <td>${h(g.moTa || '')}<br><span class="sub-line">ghi bởi ${h(g.nguoiGhi || '—')}</span></td>
        <td><button class="btn small" onclick="DanhGia.ghiForm('${g.id}')">Sửa</button></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="sub-line">Tháng này chưa ghi nhận sự việc nào.</td></tr>';
    return `
    <div class="page-head" style="margin-bottom:12px">
      <label class="sub-line" style="display:flex;align-items:center;gap:8px">Tháng chấm
        <input type="month" value="${M}" onchange="DanhGia.thang=this.value||null;App.render()"></label>
      <label class="sub-line" style="display:flex;align-items:center;gap:8px">Quy chế lương, thưởng số
        <input value="${h(this.qc())}" placeholder="08/2026/QĐ-HB-TĐ" style="width:170px" ${Perm.can('caidat') ? '' : 'disabled'}
          onchange="DanhGia.doiQC(this.value)"></label>
      <span class="spacer"></span>
      <button class="btn" onclick="DanhGia.ghiForm()">${IC.plus} Ghi nhận sự việc</button>
      <button class="btn primary" onclick="DanhGia.inTatCa()">${IC.print} In tất cả phiếu tháng ${this.nhanThang(M)}</button>
    </div>
    <div class="card mb"><div class="card-h"><h2>Thưởng hiệu quả công việc — tháng ${this.nhanThang(M)}</h2>
      <span class="hint">Điều 18 Quy chế lương, thưởng · điểm tự tính từ hồ sơ, lịch hẹn và sổ ghi nhận</span></div>
      <div class="tbl-wrap"><table style="min-width:860px">
        <thead><tr><th>Bác sĩ</th><th class="r">Hồ sơ</th><th class="r">KSNK</th><th class="r">Khiếu nại</th><th class="r">Tái khám</th><th class="r">Phối hợp</th>
          <th class="r">Tổng</th><th class="r">Thưởng</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Sổ ghi nhận sự việc — tháng ${this.nhanThang(M)}</h2>
      <span class="hint">ghi ngay khi xảy ra: vi phạm KSNK, sự cố, khiếu nại, phân ca, kỷ luật</span>
      <span class="spacer"></span><button class="btn small" onclick="DanhGia.ghiForm()">${IC.plus} Thêm</button></div>
      <div class="tbl-wrap"><table style="min-width:640px">
        <thead><tr><th>Ngày</th><th>Nhân viên</th><th>Loại</th><th>Nội dung</th><th></th></tr></thead>
        <tbody>${gnRows}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Mỗi tháng: <b>(1)</b> ghi sự việc vào sổ ngay khi xảy ra →
      <b>(2)</b> mười ngày đầu tháng sau bấm <b>Chấm</b> từng bác sĩ, soát các hồ sơ bị đánh dấu thiếu →
      <b>(3)</b> <b>Chốt</b> — tiền thưởng tự vào bảng lương tháng đó → <b>(4)</b> <b>In</b>, hai bên ký, lưu kèm bảng lương.</div>`;
  },

  /* ---------- Chấm chi tiết một bác sĩ ---------- */
  chiTiet(stId){
    const st = staffById(stId), M = this.M(), k = this.tinh(st, M);
    if (k.daChot) {
      App.modal('Phiếu đã chốt — ' + st.name + ' · tháng ' + this.nhanThang(M), `
        <p>Phiếu đã chốt ngày <b>${fmtD(k.p.ngayChot)}</b> bởi ${h(k.p.nguoiChot || '')}: <b>${k.tong} điểm</b>,
          thưởng <b>${money(k.tien)}</b>. Số liệu đã đóng băng, khoản thưởng đã vào bảng lương tháng ${this.nhanThang(M)}.</p>
        <div class="form-actions"><button class="btn danger" onclick="DanhGia.moChot('${stId}')">Mở chốt để chấm lại</button>
          <span class="spacer"></span><button class="btn" onclick="App.closeModal()">Đóng</button>
          <button class="btn primary" onclick="DanhGia.in('${stId}')">${IC.print} In phiếu</button></div>`);
      return;
    }
    const p = k.p || {}, sua = p.sua || {};
    const hsRows = k.hs.mau.map(x => `<tr><td>${h(x.c.code || '')} · ${h(x.c.name)}</td>
      <td>${x.loi.length ? x.loi.map(l => `<span class="pill ${x.dat ? 'mutedp' : 'danger'}">${h(l)}</span>`).join(' ') : '<span class="pill ok">đủ</span>'}</td>
      <td>${x.loi.length ? `<label class="sub-line"><input type="checkbox" ${x.dat ? 'checked' : ''}
        onchange="DanhGia.danhDau('${stId}','hsDat','${x.c.id}',this.checked)"> đã soát, tính là đạt</label>` : ''}</td></tr>`).join('')
      || '<tr><td colspan="3" class="sub-line">Tháng này không có hồ sơ nào mang tên bác sĩ này.</td></tr>';
    const henRows = k.tk.ds.filter(x => !x.den || x.loai).map(x => `<tr><td class="num">${fmtD(x.a.date)} ${h(x.a.time || '')}</td>
      <td>${h((x.c && x.c.name) || '')}</td><td>${h(x.a.status || '')}</td>
      <td><label class="sub-line"><input type="checkbox" ${x.loai ? 'checked' : ''}
        onchange="DanhGia.danhDau('${stId}','henLoai','${x.a.id}',this.checked)"> loại trừ (phòng khám đổi/hủy lịch)</label></td></tr>`).join('')
      || '<tr><td colspan="4" class="sub-line">Không có lượt hẹn nào bị lỡ.</td></tr>';
    const gn = this.ghiNhanThang(stId, M).map(g => `<li>${fmtD(g.date)} — ${h((this.LOAI[g.loai] || {}).ten || g.loai)}${
      this.LOAI[g.loai] && this.LOAI[g.loai].xacMinh ? ' (' + this.KET_QUA[g.ketQua || 'cho'] + ')' : ''}: ${h(g.moTa || '')}</li>`).join('');
    App.modal('Chấm điểm — ' + st.name + ' · tháng ' + this.nhanThang(M), `
    <form onsubmit="DanhGia.luu(event,'${stId}',false)">
      <div class="form-grid">
        <div class="f"><label>Ngày công theo lịch phân ca</label><input name="congLich" type="number" min="0" max="31" step="0.5" value="${k.congLich}"></div>
        <div class="f"><label>Ngày công thực tế (từ chấm công)</label><input value="${k.congTT}" disabled></div>
      </div>
      ${k.kyLuat ? '<div class="note-block" style="border-color:var(--danger)"><b>Có ghi nhận kỷ luật trong tháng → không được thưởng</b> (điểm 18.3 Quy chế).</div>' : ''}
      ${k.cho ? `<div class="note-block" style="border-color:var(--warn)">Còn <b>${k.cho} khiếu nại chờ xác minh</b> — chưa trừ điểm. Nên xác minh xong rồi mới chốt.</div>` : ''}
      <h3 style="margin:14px 0 6px">1. Hồ sơ bệnh án — soát ${k.hs.mau.length}/${k.hs.tong} hồ sơ (chọn ngẫu nhiên, cố định theo tháng)</h3>
      <div class="tbl-wrap"><table><thead><tr><th>Khách</th><th>Kết quả soát</th><th></th></tr></thead><tbody>${hsRows}</tbody></table></div>
      <h3 style="margin:14px 0 6px">4. Tái khám — ${k.tk.tyLe === null ? 'không có lịch hẹn' : `${k.tk.den}/${k.tk.tong} lượt đúng hẹn (${Math.round(k.tk.tyLe * 100)}%)`}</h3>
      <div class="tbl-wrap"><table><thead><tr><th>Hẹn</th><th>Khách</th><th>Trạng thái</th><th></th></tr></thead><tbody>${henRows}</tbody></table></div>
      <h3 style="margin:14px 0 6px">2, 3, 5. Sổ ghi nhận trong tháng</h3>
      ${gn ? `<ul style="margin:0 0 0 18px">${gn}</ul>` : '<div class="sub-line">Không có sự việc nào được ghi nhận.</div>'}
      <h3 style="margin:14px 0 6px">Điểm</h3>
      <div class="tbl-wrap"><table><thead><tr><th>Tiêu chí</th><th class="r">Tự tính</th><th>Điều chỉnh (nếu cần)</th><th>Lý do điều chỉnh</th></tr></thead><tbody>
        ${this.TIEU_CHI.map((t, i) => `<tr><td>${i + 1}. ${h(t.ten)}</td><td class="r num"><b>${k.tu[i]}</b></td>
          <td><input name="d${i}" type="number" min="0" max="20" style="width:80px" value="${sua[i] && sua[i].diem != null ? h(sua[i].diem) : ''}" placeholder="—"></td>
          <td><input name="l${i}" value="${h((sua[i] && sua[i].lyDo) || '')}" placeholder="bắt buộc nếu điều chỉnh"></td></tr>`).join('')}
        <tr><td><b>Tổng</b></td><td class="r num"><b>${k.tong}</b></td><td colspan="2"><b>${k.kyLuat ? 'Không thưởng (kỷ luật)' : money(k.tien)}</b></td></tr>
      </tbody></table></div>
      <div class="form-grid" style="margin-top:12px">
        <div class="f"><label>Ý kiến người lao động</label><select name="yKien">
          <option value="dongy"${p.yKien !== 'xemlai' ? ' selected' : ''}>Đồng ý với kết quả</option>
          <option value="xemlai"${p.yKien === 'xemlai' ? ' selected' : ''}>Đề nghị xem xét lại</option></select></div>
        <div class="f"><label>Nội dung đề nghị (nếu có)</label><input name="yKienText" value="${h(p.yKienText || '')}"></div>
      </div>
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Đóng</button><span class="spacer"></span>
        <button class="btn">Lưu tạm</button>
        <button type="button" class="btn primary" onclick="DanhGia.luu(event,'${stId}',true)">Chốt phiếu</button></div>
    </form>`);
  },
  danhDau(stId, truong, key, val){
    const p = this.phieuMoi(stId, this.M());
    p[truong] = Object.assign({}, p[truong] || {});
    if (val) p[truong][key] = true; else delete p[truong][key];
    save(); this.chiTiet(stId); App.render();
  },
  luu(ev, stId, chot){
    ev.preventDefault();
    const f = ev.target.tagName === 'FORM' ? ev.target : ev.target.form;
    const d = Object.fromEntries(new FormData(f).entries());
    const sua = {};
    for (let i = 0; i < 5; i++) {
      const v = (d['d' + i] || '').trim(), l = (d['l' + i] || '').trim();
      if (v !== '') {
        if (!l) { App.toast('Điều chỉnh điểm tiêu chí ' + (i + 1) + ' thì phải ghi lý do'); return; }
        sua[i] = {diem: Number(v), lyDo: l};
      }
    }
    const M = this.M(), p = this.phieuMoi(stId, M);
    Object.assign(p, {congLich: Number(d.congLich) || 0, sua, yKien: d.yKien, yKienText: d.yKienText || ''});
    if (chot) {
      const st = staffById(stId), k = this.tinh(st, M);
      if (k.cho && !confirm('Còn ' + k.cho + ' khiếu nại chưa xác minh. Vẫn chốt?')) { save(); return; }
      const {tu, diem, tong, kyLuat, tien, minhChung, congTT, congLich} = k;
      p.snap = {tu, diem, tong, kyLuat, tien, minhChung, congTT, congLich,
        hs: {tong: k.hs.tong, mau: k.hs.mau.length, loiHS: k.hs.loiHS}, tk: {tong: k.tk.tong, den: k.tk.den, tyLe: k.tk.tyLe}};
      p.chot = true; p.ngayChot = todayISO();
      const me = Perm.me && Perm.me(); p.nguoiChot = (me && me.name) || (Cloud.who && Cloud.who()) || '';
      this.datThuong(st, M, tien, tong);
    }
    save(); App.closeModal(); App.render();
    App.toast(chot ? 'Đã chốt phiếu ✓ — thưởng đã vào bảng lương' : 'Đã lưu tạm ✓');
  },
  /* Khoản thưởng nằm trong bảng bonuses với mã cố định, chốt lại thì ghi đè chứ không cộng dồn */
  datThuong(st, M, tien, tong){
    const id = 'dg_' + st.id + '_' + M;
    db.bonuses = (db.bonuses || []).filter(b => b.id !== id);
    if (tien > 0) db.bonuses.push({id, date: this.ngayCuoi(M), staffId: st.id, amount: tien,
      reason: 'Thưởng hiệu quả công việc tháng ' + this.nhanThang(M) + ' (' + tong + ' điểm)'});
  },
  moChot(stId){
    if (!confirm('Mở chốt sẽ gỡ khoản thưởng khỏi bảng lương cho tới khi chốt lại. Tiếp tục?')) return;
    const M = this.M(), p = this.phieu(stId, M); if (!p) return;
    p.chot = false; delete p.snap; delete p.ngayChot;
    db.bonuses = (db.bonuses || []).filter(b => b.id !== p.id);
    save(); App.closeModal(); App.render(); App.toast('Đã mở chốt');
  },

  /* ---------- Sổ ghi nhận ---------- */
  ghiForm(id){
    const g = id ? (db.ghiNhan || []).find(x => x.id === id) : {date: todayISO(), loai: 'ksnk', ketQua: 'cho'};
    App.modal(id ? 'Sửa ghi nhận' : 'Ghi nhận sự việc', `
    <form class="form-grid" onsubmit="DanhGia.ghiLuu(event,'${id || ''}')">
      <div class="f"><label>Ngày xảy ra</label><input type="date" name="date" required value="${h(g.date)}"></div>
      <div class="f"><label>Nhân viên</label><select name="staffId">${db.staff.filter(s => s.active !== false || s.id === g.staffId)
        .map(s => `<option value="${s.id}"${g.staffId === s.id ? ' selected' : ''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f full"><label>Loại sự việc</label><select name="loai" onchange="document.getElementById('oXacMinh').style.display=this.value==='khieunai'?'':'none'">
        ${Object.entries(this.LOAI).map(([k, v]) => `<option value="${k}"${g.loai === k ? ' selected' : ''}>${h(v.ten)}</option>`).join('')}</select></div>
      <div class="f full" id="oXacMinh" style="${g.loai === 'khieunai' ? '' : 'display:none'}"><label>Kết quả xác minh khiếu nại</label>
        <select name="ketQua">${Object.entries(this.KET_QUA).map(([k, v]) => `<option value="${k}"${(g.ketQua || 'cho') === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <div class="combo-hint">Chỉ khiếu nại <b>có căn cứ</b> mới bị trừ 10 điểm.</div></div>
      <div class="f full"><label>Nội dung, minh chứng</label><textarea name="moTa" rows="3" required placeholder="Việc gì, khách nào, ai chứng kiến, số biên bản/bảng kiểm…">${h(g.moTa || '')}</textarea></div>
      <div class="form-actions full">
        ${id ? `<button type="button" class="btn danger" onclick="DanhGia.ghiXoa('${id}')">Xóa</button><span class="spacer"></span>` : ''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  ghiLuu(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (this.phieu(d.staffId, monthOf(d.date)) && this.phieu(d.staffId, monthOf(d.date)).chot) {
      App.toast('Phiếu tháng ' + this.nhanThang(monthOf(d.date)) + ' của người này đã chốt — mở chốt trước khi ghi thêm'); return;
    }
    if (d.loai !== 'khieunai') delete d.ketQua;
    if (!db.ghiNhan) db.ghiNhan = [];
    if (id) Object.assign(db.ghiNhan.find(x => x.id === id), d);
    else {
      const me = Perm.me && Perm.me();
      db.ghiNhan.push(Object.assign({id: uid(), nguoiGhi: (me && me.name) || (Cloud.who && Cloud.who()) || ''}, d));
    }
    save(); App.closeModal(); App.render(); App.toast('Đã ghi nhận ✓');
  },
  ghiXoa(id){
    const g = (db.ghiNhan || []).find(x => x.id === id); if (!g) return;
    const p = this.phieu(g.staffId, monthOf(g.date));
    if (p && p.chot) { App.toast('Phiếu tháng đó đã chốt — mở chốt trước khi xóa'); return; }
    if (!confirm('Xóa ghi nhận này?')) return;
    db.ghiNhan = db.ghiNhan.filter(x => x.id !== id);
    save(); App.closeModal(); App.render();
  },

  /* ---------- In phiếu: đúng mẫu "MAU PHIEU DANH GIA THUONG HIEU QUA THANG.docx" ---------- */
  html(st, M){
    const k = this.tinh(st, M), p = k.p || {}, cl = db.clinic || {};
    const o = v => `<span class="o-tick">${v ? '☒' : '☐'}</span>`;
    const muc = k.kyLuat ? -1 : this.MUC.findIndex(([d]) => k.tong >= d);
    const muc4 = [...this.MUC.map(([d, t], i) => [`Từ ${d}${i ? ' đến dưới ' + this.MUC[i - 1][0] + ' điểm' : ' điểm trở lên'}: ${money(t).replace(' ₫', ' đồng')}`, muc === i]),
      ['Dưới 60 điểm, hoặc bị kỷ luật từ khiển trách trở lên trong tháng: không thưởng', muc === -1]];
    const [y, m] = M.split('-');
    return `
    <table class="no-border pa-dau"><tr>
      <td style="width:42%;text-align:center;vertical-align:top"><b>${h((cl.legal || cl.name || '').toUpperCase())}</b><br>__________</td>
      <td style="width:58%;text-align:center;vertical-align:top"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b>Độc lập - Tự do - Hạnh phúc</b><br>________________________</td>
    </tr></table>
    <h1 style="margin-top:14px">PHIẾU ĐÁNH GIÁ<br>THƯỞNG HIỆU QUẢ CÔNG VIỆC HẰNG THÁNG</h1>
    <div style="text-align:center"><b>Tháng ${m} năm ${y}</b><br>
      <i>(Theo Điều 18 Quy chế lương, thưởng ban hành kèm Quyết định số ${h(this.qc() || '……………………')})</i></div>
    <h2>I. THÔNG TIN CHUNG</h2>
    <p>Họ và tên người được đánh giá: <b>${h(st.name)}</b></p>
    <p>Chức danh: ${h(st.role || 'Bác sĩ Răng Hàm Mặt')}${st.soHD ? ' &nbsp;&nbsp; Số HĐLĐ: ' + h(st.soHD) : ''}</p>
    <p>Người đánh giá: ${h(p.nguoiChot || '…………………………')}</p>
    <p>Số ngày công theo lịch phân ca: <b>${k.congLich}</b> ngày. &nbsp; Số ngày công thực tế: <b>${k.congTT}</b> ngày.</p>
    <p>Bị xử lý kỷ luật lao động từ khiển trách trở lên trong tháng: ${o(!k.kyLuat)} Không &nbsp; ${o(k.kyLuat)} Có (<b>không thưởng</b>)</p>
    <h2>II. CHẤM ĐIỂM</h2>
    <table><thead><tr><th style="width:5%">TT</th><th style="width:22%">Tiêu chí</th><th>Cách chấm điểm</th>
      <th style="width:8%">Điểm tối đa</th><th style="width:8%">Điểm chấm</th><th style="width:20%">Minh chứng</th></tr></thead><tbody>
      ${this.TIEU_CHI.map((t, i) => `<tr><td style="text-align:center">${i + 1}</td><td><b>${h(t.ten)}</b></td>
        <td style="font-size:11px;text-align:justify">${h(t.cach)}</td><td style="text-align:center">20</td>
        <td style="text-align:center"><b>${k.diem[i]}</b></td><td style="font-size:11px">${h(k.minhChung[i])}</td></tr>`).join('')}
      <tr><td colspan="3" style="text-align:center"><b>TỔNG ĐIỂM</b> (điểm mỗi tiêu chí không thấp hơn 0)</td>
        <td style="text-align:center"><b>100</b></td><td style="text-align:center"><b>${k.tong}</b></td><td></td></tr>
    </tbody></table>
    <div class="ngat-trang"></div>
    <h2>III. KẾT QUẢ VÀ MỨC THƯỞNG</h2>
    ${muc4.map(([t, v]) => `<p style="margin-left:24px">${o(v)} ${t}</p>`).join('')}
    <p><b>Số tiền thưởng:</b> ${money(k.tien).replace(' ₫', '')} đồng</p>
    <p>Bằng chữ: ${h(this.bangChu(k.tien))}</p>
    <h2>IV. Ý KIẾN CỦA NGƯỜI LAO ĐỘNG</h2>
    <p style="margin-left:24px">${o(p.yKien !== 'xemlai')} Đồng ý với kết quả đánh giá.</p>
    <p style="margin-left:24px">${o(p.yKien === 'xemlai')} Đề nghị xem xét lại (nêu tiêu chí và lý do): ${h(p.yKienText || '')}</p>
    ${p.yKienText ? '' : '<p>……………………………………………………………………………………………</p>'}
    <p style="font-size:11px"><i>Ghi chú: Phiếu lập trong 05 ngày làm việc đầu tháng kế tiếp và trước kỳ trả lương; người lao động có quyền đề nghị xem xét lại trong 03 ngày làm việc kể từ ngày nhận phiếu. Phiếu được lưu kèm bảng thanh toán tiền lương của tháng. Tiền thưởng hiệu quả công việc là tiền thưởng theo Điều 104 Bộ luật Lao động 2019, mức thưởng thay đổi theo kết quả đánh giá từng tháng; việc không được thưởng không phải hình thức phạt tiền, cắt lương.</i></p>
    <p style="text-align:right"><i>${this.noiKy()}, ${HoSo.ngayChu(p.ngayChot || todayISO()).replace('Ngày', 'ngày')}</i></p>
    <div class="sign"><div><b>NGƯỜI LAO ĐỘNG</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br><br><b>${h(st.name.toUpperCase())}</b></div>
      <div><b>NGƯỜI ĐÁNH GIÁ</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br><br><b>${h((p.nguoiChot || '').toUpperCase())}</b></div></div>
    ${k.daChot ? '' : '<p style="text-align:center;font-size:11px;color:#a00"><i>BẢN TẠM TÍNH — CHƯA CHỐT</i></p>'}`;
  },
  in(stId){
    const st = staffById(stId), M = this.M();
    App.print(this.html(st, M), 'A4', 'Phiếu đánh giá thưởng hiệu quả ' + st.name + ' tháng ' + this.nhanThang(M));
  },
  inTatCa(){
    const M = this.M(), ds = this.bacSi();
    if (!ds.length) { App.toast('Chưa có bác sĩ nào'); return; }
    const chua = ds.filter(st => !(this.phieu(st.id, M) || {}).chot);
    if (chua.length && !confirm(chua.map(s => s.name).join(', ') + ' chưa chốt — phiếu in ra là bản tạm tính. Vẫn in?')) return;
    App.print(ds.map(st => this.html(st, M)).join('<div class="ngat-trang"></div>'), 'A4', 'Phiếu đánh giá thưởng hiệu quả tháng ' + this.nhanThang(M));
  },

  /* ---------- Số tiền bằng chữ ---------- */
  bangChu(n){
    n = Math.round(n || 0);
    if (!n) return 'Không đồng.';
    const so = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const ba = (x, du) => {
      const t = Math.floor(x / 100), c = Math.floor(x % 100 / 10), d = x % 10, r = [];
      if (du || t) r.push(so[t] + ' trăm');
      if (c > 1) r.push(so[c] + ' mươi');
      else if (c === 1) r.push('mười');
      else if (d && (du || t)) r.push('lẻ');
      if (d) r.push(c > 1 && d === 1 ? 'mốt' : c && d === 5 ? 'lăm' : c > 1 && d === 4 ? 'tư' : so[d]);
      return r.join(' ');
    };
    const dv = ['', ' nghìn', ' triệu', ' tỷ'], nhom = [];
    while (n > 0) { nhom.push(n % 1000); n = Math.floor(n / 1000); }
    const kq = [];
    for (let i = nhom.length - 1; i >= 0; i--) if (nhom[i]) kq.push(ba(nhom[i], i < nhom.length - 1) + dv[i]);
    const s = kq.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng.';
  },
};
