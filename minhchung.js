/* Hồ sơ minh chứng cho từng khoản lương, hỗ trợ, thưởng, khấu trừ.

   Thanh tra lao động, BHXH, thuế hỏi một khoản tiền thì phải trả lời được ba câu: trả theo
   văn bản nào (quy chế, hợp đồng), vì sao người này được số tiền đó (số liệu gốc), và người
   lao động đã nhận đúng chưa (ký nhận, chuyển khoản). Mỗi khoản trên phiếu lương vì vậy
   gắn với một danh mục giấy tờ:
   - TỰ ĐỘNG: phần mềm đã có số liệu gốc (chấm công, lịch hẹn, phiếu thu, diễn biến điều
     trị…) — chỉ cần kiểm tra là có dữ liệu.
   - LƯU GIẤY: văn bản có chữ ký, quản lý đánh dấu đã có và ghi số hiệu, ngày, nơi lưu.
   Phạm vi lưu: 'cs' cả cơ sở, dùng mãi (quy chế…) · 'cst' cả cơ sở, mỗi tháng một lần ·
   'nv' từng người, dùng mãi (hợp đồng…) · 't' từng người, mỗi tháng.
   Một mục chỉ bắt buộc khi khoản tiền liên quan khác 0 trong tháng. */
'use strict';

const MinhChung = {
  DM: [
    /* ---- Cơ sở, dùng mãi ---- */
    {id: 'cs_qc', pv: 'cs', ten: 'Quy chế lương, thưởng và quyết định ban hành, sửa đổi', goiY: 'QĐ 05/2026/QĐ-HB-GQ, QĐ 10/2026/QĐ-HB-GQ, có chữ ký, đóng dấu',
      khoan: ['anCa', 'xangXe', 'dienThoai', 'hoaHong', 'htdt', 'ptkh', 'thuNo', 'chuyenCan', 'hieuQua', 'phuCa', 'chungChi', 'dungHen', 'khachMoi', 'vuotDT', 'kyThuat', 'mucTieu']},
    {id: 'cs_bb', pv: 'cs', ten: 'Biên bản tham khảo ý kiến tập thể người lao động về quy chế', goiY: 'BB 01, BB 02/2026/BB-HB-GQ, có danh sách ký tên (Điều 93, 104 BLLĐ)', khoan: ['*thuong']},
    {id: 'cs_ny', pv: 'cs', ten: 'Minh chứng công khai quy chế tại nơi làm việc', goiY: 'Ảnh chụp bảng niêm yết có ngày, hoặc biên bản phổ biến có chữ ký', khoan: ['*thuong']},
    {id: 'cs_tbl', pv: 'cs', ten: 'Thang lương, bảng lương của Công ty', goiY: 'Bản đã ban hành, mức lương chức danh không thấp hơn lương tối thiểu vùng', dk: 'coThu', khoan: ['luong']},
    {id: 'cs_nq', pv: 'cs', ten: 'Nội quy lao động đã đăng ký', goiY: 'Căn cứ trừ chuyên cần, kỷ luật, bồi thường', khoan: ['chuyenCan', 'khauTru']},
    {id: 'cs_dmkt', pv: 'cs', ten: 'Danh mục kỹ thuật được phê duyệt của cơ sở', goiY: 'Quyết định phê duyệt danh mục kỹ thuật (implant, chỉnh nha) của Sở Y tế', khoan: ['kyThuat']},

    /* ---- Cơ sở, mỗi tháng ---- */
    {id: 'cst_cc', pv: 'cst', ten: 'Bảng chấm công tháng có xác nhận', goiY: 'In từ tab Chấm công, người phụ trách và Giám đốc ký', auto: 'chamCongCS', khoan: ['luong', 'anCa', 'xangXe', 'chuyenCan']},
    {id: 'cst_btt', pv: 'cst', ten: 'Bảng thanh toán tiền lương có ký nhận hoặc chứng từ chuyển khoản', goiY: 'In "Bảng lương", từng người ký nhận; hoặc ủy nhiệm chi, sao kê ngân hàng', dk: 'coThu', khoan: ['luong']},
    {id: 'cst_dt', pv: 'cst', ten: 'Báo cáo doanh thu thuần tháng của cơ sở', goiY: 'Thực thu trừ tiền lab, kế toán ký xác nhận (mục 9.2)', auto: 'doanhThu', khoan: ['hoaHong', 'htdt', 'ptkh', 'vuotDT', 'mucTieu']},
    {id: 'cst_th', pv: 'cst', ten: 'Bảng tổng hợp số liệu tính thưởng có ký', goiY: 'In ở tab "Tổng hợp tháng", người kiểm tra và Giám đốc ký', khoan: ['htdt', 'ptkh', 'phuCa', 'dungHen', 'khachMoi', 'vuotDT', 'kyThuat', 'mucTieu']},
    {id: 'cst_bh', pv: 'cst', ten: 'Hồ sơ đóng BHXH tháng', goiY: 'Thông báo kết quả đóng (C12-TS), chứng từ nộp tiền', khoan: ['bhxh']},
    {id: 'cst_thue', pv: 'cst', ten: 'Tờ khai khấu trừ thuế TNCN của kỳ', goiY: 'Tờ khai 05/KK-TNCN và chứng từ nộp', khoan: ['thue']},

    /* ---- Từng người, dùng mãi ---- */
    {id: 'nv_hd', pv: 'nv', ten: 'Hợp đồng lao động còn hiệu lực', goiY: 'Ghi đúng chức danh, mức lương chức danh; ghi ngày hết hạn để phần mềm cảnh báo', han: true, dk: 'coThu', khoan: ['luong']},
    {id: 'nv_tk', pv: 'nv', ten: 'Bản tự khai nơi ở, hỗ trợ đi lại có ký', goiY: 'Mẫu tự khai nơi ở; khoảng cách đối chiếu Google Maps (mục 8.4)', auto: 'km', khoan: ['xangXe']},
    {id: 'nv_dt', pv: 'nv', ten: 'Văn bản giao nhiệm vụ phải liên lạc thường xuyên', goiY: 'Mô tả công việc hoặc phụ lục hợp đồng ghi nhiệm vụ liên lạc người bệnh (mục 8.5)', khoan: ['dienThoai']},
    {id: 'nv_bhk', pv: 'nv', ten: 'Xác nhận đã tham gia BHXH tại nơi khác', goiY: 'Chỉ cần với người không đóng BHXH tại Công ty: bản sao xác nhận hoặc tra cứu, kèm cam kết', dk: 'khongBHXH', khoan: []},
    {id: 'nv_mst', pv: 'nv', ten: 'Mã số thuế cá nhân, đăng ký người phụ thuộc (nếu có)', goiY: 'Bản đăng ký giảm trừ gia cảnh có ký', khoan: ['thue']},

    /* ---- Từng người, mỗi tháng ---- */
    {id: 't_cong', pv: 't', ten: 'Dữ liệu chấm công cá nhân', goiY: 'Giờ vào, giờ ra từng ngày trên phần mềm', auto: 'cong', khoan: ['luong', 'anCa', 'xangXe', 'dienThoai', 'chuyenCan']},
    {id: 't_nghi', pv: 't', ten: 'Xác nhận ngày nghỉ không phép', goiY: 'Biên bản hoặc xác nhận của người quản lý, có chữ ký người lao động', dk: 'nghiKP', khoan: ['chuyenCan']},
    {id: 't_hh', pv: 't', ten: 'Bảng kê hoa hồng theo công đoạn điều trị', goiY: 'Tab Hoa hồng: công đoạn, người bệnh, phiếu thu', auto: 'hoaHong', khoan: ['hoaHong']},
    {id: 't_dg', pv: 't', ten: 'Phiếu đánh giá / phiếu KPI tháng có chữ ký', goiY: 'Người đánh giá và người lao động ký; Giám đốc duyệt (mục 18.4, 18.8)', auto: 'danhGia', khoan: ['hieuQua']},
    {id: 't_ca', pv: 't', ten: 'Danh sách ca phụ có ghi tên người phụ', goiY: 'Diễn biến điều trị ghi người phụ ca', auto: 'phuCa', khoan: ['phuCa']},
    {id: 't_ccc', pv: 't', ten: 'Bản sao chứng chỉ, chứng nhận mới được cấp', goiY: 'Ghi số chứng chỉ, nơi cấp, ngày cấp', khoan: ['chungChi']},
    {id: 't_hen', pv: 't', ten: 'Dữ liệu lịch hẹn và lượt đến đúng hẹn', goiY: 'Lịch hẹn trên phần mềm, lượt hủy có ghi nhận', auto: 'dungHen', khoan: ['dungHen']},
    {id: 't_km', pv: 't', ten: 'Danh sách người bệnh mới: nguồn, người đặt hẹn, phiếu thu', goiY: 'Tab Tổng hợp tháng; khách bị loại, gán lại có lý do', auto: 'khachMoi', khoan: ['khachMoi']},
    {id: 't_no', pv: 't', ten: 'Xác nhận của kế toán về khoản nợ quá hạn đã thu', goiY: 'Danh sách người bệnh, số tiền, ngày thu, kế toán ký', khoan: ['thuNo']},
    {id: 't_kt', pv: 't', ten: 'Danh sách ca kỹ thuật cao kèm hồ sơ bệnh án', goiY: 'Ca implant, tháo mắc cài trong tháng', auto: 'kyThuat', khoan: ['kyThuat']},
    {id: 't_thk', pv: 't', ten: 'Quyết định khen thưởng, thưởng khác', goiY: 'Thưởng lễ, Tết, thâm niên, sáng kiến: quyết định hoặc danh sách được duyệt', khoan: ['thuongKhac']},
    {id: 't_tu', pv: 't', ten: 'Giấy đề nghị và phiếu chi tạm ứng có ký', goiY: 'Người lao động ký nhận tiền tạm ứng', khoan: ['tamUng']},
    {id: 't_bt', pv: 't', ten: 'Biên bản xác định thiệt hại và mức bồi thường', goiY: 'Có ý kiến người lao động; mỗi tháng trừ không quá 30% lương (Điều 102, 129 BLLĐ)', khoan: ['khauTru']},
    {id: 't_sua', pv: 't', ten: 'Lý do các khoản quản lý điều chỉnh tay', goiY: 'Lý do và người sửa lưu trong lịch sử phiếu lương', auto: 'sua', dk: 'sua', khoan: []},
  ],
  /* Mục tự động nhưng vẫn phải có giấy ký kèm */
  CA_HAI: ['chamCongCS', 'doanhThu', 'danhGia', 'km'],
  canGhi(m){ return !m.auto || this.CA_HAI.includes(m.auto) || !!m.han; },
  THUONG: ['hoaHong', 'htdt', 'ptkh', 'thuNo', 'chuyenCan', 'hieuQua', 'phuCa', 'chungChi', 'dungHen', 'khachMoi', 'vuotDT', 'kyThuat', 'mucTieu'],

  khoanCua(m){ return m.khoan.includes('*thuong') ? this.THUONG : m.khoan; },

  /* ---------- Nơi lưu ---------- */
  csBen(){ return (db.bangLuong || []).find(r => r.id === 'mc_cs') || {mc: {}}; },
  ghiCua(m, st, M){
    if (m.pv === 'cs') return (this.csBen().mc || {})[m.id];
    if (m.pv === 'cst') return (Luong.coSo(M).mc || {})[m.id];
    if (m.pv === 'nv') return ((st && st.hoSo) || {})[m.id];
    const p = st && Luong.phieu(st.id, M);
    return ((p && p.mc) || {})[m.id];
  },

  /* ---------- Kiểm tra tự động ---------- */
  AUTO: {
    chamCongCS(m, st, M){ const n = (db.attLog || []).filter(l => monthOf(l.date) === M && l.inAt).length;
      return {ok: n > 0, ghi: n ? n + ' lượt chấm công trong tháng' : 'Chưa có dữ liệu chấm công'}; },
    doanhThu(m, st, M){ const d = Luong.dtThuan(M);
      return {ok: d.soPhieu > 0, ghi: `${d.soPhieu} phiếu thu, thực thu ${money(d.thu)}, lab ${money(d.lab)}, thuần ${money(d.thuan)}`}; },
    km(m, st){ const km = +(st.pl || {}).km || 0;
      return {ok: km > 0, ghi: km ? 'Khoảng cách đã khai: ' + km + ' km' : 'Chưa nhập km trong Cài đặt lương'}; },
    cong(m, st, M, k){ return {ok: k.cg.ngay > 0, ghi: `${k.cg.ngay} ngày có mặt, ${k.cg.cong} công, trễ ${k.cg.tre}, sớm ${k.cg.som}`}; },
    hoaHong(m, st, M, k){ return {ok: true, ghi: 'Tính từ công đoạn đã ghi ở tab Điều trị: ' + money(k.d.hoaHong)}; },
    danhGia(m, st, M, k){
      if (k.nhom === 'trothu') {
        const p = Luong.phieu(st.id, M) || {}, kp = Luong.kpiTinh(p.kpi);
        const thieuMC = kp.rows.filter(r => r.tl != null && !r.m).map(r => 'TC' + r.stt);
        const ok = kp.du > 0 && !!p.kpiNguoiCham && !thieuMC.length;
        return {ok, ghi: `Đã chấm ${kp.du}/12 tiêu chí` + (p.kpiNguoiCham ? ', người đánh giá: ' + p.kpiNguoiCham : ', CHƯA ghi người đánh giá')
          + (thieuMC.length ? ', thiếu mã minh chứng ở ' + thieuMC.join(', ') : '')};
      }
      return {ok: true, ghi: (k.cc.hieuQua || [])[0] || ''};
    },
    phuCa(m, st, M, k){ return {ok: true, ghi: (k.cc.phuCa || []).length + ' ca ghi tên người này'}; },
    dungHen(m, st, M, k){ return {ok: true, ghi: (k.cc.dungHen || [])[0] || ''}; },
    khachMoi(m, st, M, k){ return {ok: true, ghi: (k.cc.khachMoi || []).length + ' người bệnh mới được tính'}; },
    kyThuat(m, st, M, k){ return {ok: true, ghi: (k.cc.kyThuat || []).length + ' ca'}; },
    sua(m, st, M, k){ const n = Object.keys(k.sua || {}).length;
      return {ok: Object.values(k.sua || {}).every(s => s.lyDo), ghi: n + ' khoản sửa tay, đều có lý do và người sửa'}; },
  },

  /* Mục có bắt buộc với người này trong tháng không */
  canCo(m, st, M, k){
    if (m.dk === 'khongBHXH') return !!(st && (st.pl || {}).khongBHXH) && k.cg.cong > 0;
    if (m.dk === 'nghiKP') return +((Luong.phieu(st.id, M) || {}).nhap || {}).nghiKP > 0;
    if (m.dk === 'sua') return Object.keys(k.sua || {}).length > 0;
    if (m.dk === 'coThu') return k.thu > 0;
    return this.khoanCua(m).some(x => k.v[x]);
  },
  /* Trạng thái một mục: ok / thiếu / hết hạn, kèm dòng mô tả */
  trangThai(m, st, M, k){
    const g = this.ghiCua(m, st, M);
    const tu = m.auto ? this.AUTO[m.auto].call(this, m, st, M, k) : null;
    let ok = m.auto && !m.han ? tu.ok : !!(g && g.co);
    let ghi = [];
    if (tu) ghi.push(tu.ghi);
    if (g && g.co) ghi.push(['Đã có', g.so, g.ngay ? 'ngày ' + fmtD(g.ngay) : '', g.noi ? 'lưu: ' + g.noi : '',
      (g.tep || []).length ? (g.tep || []).length + ' file scan' : ''].filter(Boolean).join(' · '));
    /* Mục tự động nhưng có giấy ký kèm (chấm công, doanh thu, phiếu đánh giá): cần cả hai */
    if (m.auto && this.CA_HAI.includes(m.auto)) ok = tu.ok && !!(g && g.co);
    if (m.han && g && g.co && g.hetHan && g.hetHan < M + '-01') { ok = false; ghi.push('ĐÃ HẾT HẠN ' + fmtD(g.hetHan)); }
    return {ok, ghi: ghi.join(' — '), g, tu};
  },
  /* Danh sách mục bắt buộc của một người trong tháng (gồm cả mục cấp cơ sở liên quan) */
  cua(st, M, k){
    k = k || Luong.tinh(st, M);
    return this.DM.filter(m => this.canCo(m, st, M, k)).map(m => Object.assign({m}, this.trangThai(m, st, M, k)));
  },
  /* Mục còn thiếu theo từng khoản (cho phiếu lương) */
  thieuTheoKhoan(st, M, k){
    const ra = {};
    this.cua(st, M, k).forEach(x => this.khoanCua(x.m).filter(kk => k.v[kk]).forEach(kk => {
      (ra[kk] = ra[kk] || {du: [], thieu: []})[x.ok ? 'du' : 'thieu'].push(x.m.ten);
    }));
    return ra;
  },
  nhan(x){ return x.m.auto ? (this.CA_HAI.includes(x.m.auto) ? 'Tự động + giấy ký' : 'Tự động') : 'Lưu giấy'; },
  PV: {cs: 'Cơ sở · dùng chung', cst: 'Cơ sở · tháng', nv: 'Cá nhân · dùng chung', t: 'Cá nhân · tháng'},

  /* ---------- Tab Hồ sơ minh chứng ---------- */
  tab(){
    Luong.moi();
    this.guiCho();
    const M = Luong.M(), ql = Luong.quanLy(), ds = Luong.dsNV(M);
    const rows = ds.map(st => { const k = Luong.tinh(st, M), c = this.cua(st, M, k); return {st, k, c, thieu: c.filter(x => !x.ok)}; });
    const csMuc = this.DM.filter(m => m.pv === 'cs' || m.pv === 'cst');
    const coDung = m => rows.some(r => r.c.some(x => x.m.id === m.id));
    const csRows = csMuc.map(m => { const t = this.trangThai(m, null, M, {cg: {}, v: {}, d: {}, cc: {}, sua: {}});
      const dung = coDung(m);
      return `<tr${dung ? '' : ' style="opacity:.55"'}><td><b>${h(m.ten)}</b><br><span class="sub-line">${h(m.goiY)}</span></td>
        <td class="sub-line">${h(this.PV[m.pv])}</td>
        <td>${!dung ? '<span class="pill">Tháng này không cần</span>' : t.ok ? '<span class="pill ok">Đủ</span>' : '<span class="pill warn">Thiếu</span>'}<br><span class="sub-line">${h(t.ghi)}</span> ${this.linkTep(t.g)}</td>
        <td>${ql ? `<button class="btn small" onclick="MinhChung.sua('${m.id}','')">Cập nhật</button>` : ''}</td></tr>`; }).join('');
    const nvRows = rows.map(r => `<tr class="clickable" onclick="MinhChung.nguoi('${r.st.id}')">
      <td><b>${h(r.st.name)}</b><br><span class="sub-line">${h(Luong.NHOM[r.k.nhom].ten)}</span></td>
      <td class="r num">${r.c.length - r.thieu.length}/${r.c.length}</td>
      <td>${r.thieu.length ? r.thieu.map(x => `<span class="pill warn" style="margin:1px">${h(x.m.ten)}</span>`).join(' ') : '<span class="pill ok">Đủ hồ sơ</span>'}</td>
      <td><button class="btn small" onclick="event.stopPropagation();MinhChung.nguoi('${r.st.id}')">Xem · cập nhật</button></td></tr>`).join('');
    const tong = rows.reduce((s, r) => s + r.c.length, 0), thieu = rows.reduce((s, r) => s + r.thieu.length, 0);
    return `
    <div class="page-head" style="margin-bottom:12px">${Luong.chonThang()}<span class="spacer"></span>
      <button class="btn primary" onclick="MinhChung.inBangKe()">${IC.print} In bảng kê hồ sơ minh chứng</button></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="k-label">Mục minh chứng phải có</div><div class="k-value num">${tong}</div><div class="k-note">theo các khoản phát sinh trong tháng</div></div>
      <div class="card kpi"><div class="k-label">Còn thiếu</div><div class="k-value num" style="color:${thieu ? 'var(--danger)' : 'var(--ok)'}">${thieu}</div><div class="k-note">${rows.filter(r => r.thieu.length).length} người chưa đủ hồ sơ</div></div>
      <div class="card kpi"><div class="k-label">Giấy tờ cấp cơ sở</div><div class="k-value num">${csMuc.filter(m => coDung(m) && this.trangThai(m, null, M, {cg: {}, v: {}, d: {}, cc: {}, sua: {}}).ok).length}/${csMuc.filter(coDung).length}</div><div class="k-note">quy chế, biên bản, chấm công, bảng lương…</div></div>
    </div>
    <div class="card mb"><div class="card-h"><h2>Giấy tờ cấp cơ sở</h2><span class="hint">dùng chung cho mọi người</span></div>
      <div class="tbl-wrap"><table style="min-width:820px"><thead><tr><th>Giấy tờ</th><th>Phạm vi</th><th>Tình trạng</th><th></th></tr></thead>
        <tbody>${csRows}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Hồ sơ từng người — tháng ${Luong.nhanThang(M)}</h2><span class="hint">bấm tên để xem theo từng khoản</span></div>
      <div class="tbl-wrap"><table style="min-width:820px"><thead><tr><th>Nhân viên</th><th class="r">Đủ</th><th>Còn thiếu</th><th></th></tr></thead>
        <tbody>${nvRows || '<tr><td colspan="4" class="sub-line">Chưa có nhân viên.</td></tr>'}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Mỗi khoản tiền phải trả lời được: <b>trả theo văn bản nào</b> (quy chế, hợp đồng),
      <b>vì sao người này được số đó</b> (số liệu gốc), và <b>đã nhận chưa</b> (ký nhận, chuyển khoản).
      Mục "Tự động" phần mềm tự kiểm dữ liệu; mục "Lưu giấy" quản lý ghi số hiệu, ngày và nơi cất bản gốc.
      Giấy tờ có thông tin người bệnh chỉ ghi mã khách, mã ca.</div>`;
  },

  /* Hồ sơ một người: theo từng khoản trên phiếu lương */
  nguoi(stId){
    const M = Luong.M(), st = staffById(stId); if (!st) return;
    const k = Luong.tinh(st, M), c = this.cua(st, M, k), ql = Luong.quanLy();
    const theoKhoan = Luong.KHOAN.filter(K => k.v[K.k] || k.sua[K.k]).map(K => {
      const muc = c.filter(x => this.khoanCua(x.m).includes(K.k));
      return `<tr><td><b>${h(K.ten)}</b><br><span class="sub-line">${h(K.cc)} · ${K.loai === 'tru' ? '−' : ''}${money(k.v[K.k])}</span></td>
        <td>${muc.map(x => `<div style="margin-bottom:4px">${x.ok ? '<span class="pill ok">Đủ</span>' : '<span class="pill warn">Thiếu</span>'}
          <b>${h(x.m.ten)}</b> <span class="sub-line">(${this.nhan(x)})</span><br><span class="sub-line">${h(x.ghi || x.m.goiY)}</span> ${this.linkTep(x.g)}
          ${ql && this.canGhi(x.m) ? ` <button type="button" class="link-btn" onclick="MinhChung.sua('${x.m.id}','${stId}')">cập nhật</button>` : ''}</div>`).join('')
          || '<span class="sub-line">—</span>'}</td></tr>`;
    }).join('');
    const khac = c.filter(x => !this.khoanCua(x.m).length).map(x => `<div>${x.ok ? '<span class="pill ok">Đủ</span>' : '<span class="pill warn">Thiếu</span>'}
      <b>${h(x.m.ten)}</b><br><span class="sub-line">${h(x.ghi || x.m.goiY)}</span>
      ${ql && this.canGhi(x.m) ? ` <button type="button" class="link-btn" onclick="MinhChung.sua('${x.m.id}','${stId}')">cập nhật</button>` : ''}</div>`).join('');
    App.modal(`Hồ sơ minh chứng ${Luong.nhanThang(M)} — ${st.name}`, `
      <div class="note-block mb">${h(Luong.NHOM[k.nhom].ten)} · ${c.filter(x => x.ok).length}/${c.length} mục đủ
        · <button type="button" class="link-btn" onclick="Luong.chiTiet('${stId}')">Mở phiếu lương</button></div>
      <div class="tbl-wrap"><table style="min-width:760px"><thead><tr><th style="width:28%">Khoản</th><th>Minh chứng</th></tr></thead>
        <tbody>${theoKhoan || '<tr><td colspan="2" class="sub-line">Tháng này chưa phát sinh khoản nào.</td></tr>'}</tbody></table></div>
      ${khac ? `<div class="card" style="padding:10px;margin-top:10px">${khac}</div>` : ''}
      <div class="form-actions"><span class="spacer"></span><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },

  /* Ghi nhận một giấy tờ */
  sua(id, stId){
    if (!Luong.quanLy()) return;
    const m = this.DM.find(x => x.id === id), M = Luong.M(), st = stId ? staffById(stId) : null;
    const g = this.ghiCua(m, st, M) || {};
    if (m.pv === 't' && (Luong.phieu(st.id, M) || {}).chot) { App.toast('Phiếu lương đã chốt — mở chốt trước khi sửa minh chứng tháng'); return; }
    this._dsTep = (g.tep || []).slice();
    App.modal('Minh chứng: ' + m.ten + (st ? ' — ' + st.name : ''), `
    <form class="form-grid" onsubmit="MinhChung.luu(event,'${id}','${stId}')">
      <div class="note-block full">${h(m.goiY)}<br><span class="sub-line">Phạm vi: ${h(this.PV[m.pv])}${m.pv === 'cst' || m.pv === 't' ? ' ' + Luong.nhanThang(M) : ''}</span></div>
      <div class="f full"><label><input type="checkbox" name="co" ${g.co ? 'checked' : ''}> Đã có bản gốc / bản ký, đã kiểm tra nội dung</label></div>
      <div class="f"><label>Số hiệu, ký hiệu</label><input name="so" value="${h(g.so || '')}" placeholder="VD: 10/2026/QĐ-HB-GQ"></div>
      <div class="f"><label>Ngày văn bản</label><input type="date" name="ngay" value="${h(g.ngay || '')}"></div>
      ${m.han ? `<div class="f"><label>Ngày hết hạn (để trống nếu không xác định thời hạn)</label><input type="date" name="hetHan" value="${h(g.hetHan || '')}"></div>` : ''}
      <div class="f full"><label>Nơi lưu bản gốc</label><input name="noi" value="${h(g.noi || '')}" placeholder="VD: bìa hồ sơ lương T11, tủ kế toán"></div>
      <div class="f full"><label>File scan, ảnh chụp (PDF hoặc ảnh, chọn được nhiều file)</label>
        <input type="file" accept="image/*,application/pdf" multiple onchange="MinhChung.themTep(this)">
        <div class="combo-hint">Ảnh tự nén cho nhẹ nhưng vẫn đọc rõ chữ; PDF tối đa ${this.PDF_MAX_MB} MB/file. File lưu trên máy chủ, không làm đầy bộ nhớ của app.</div>
        <div id="mcTep" style="margin-top:6px">${this.htmlTep()}</div></div>
      ${g.ai ? `<div class="sub-line full">Cập nhật lần cuối: ${h(g.ai)}, ${h(g.luc)}</div>` : ''}
      <div class="form-actions full"><button type="button" class="btn" onclick="${stId ? `MinhChung.nguoi('${stId}')` : 'App.closeModal()'}">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  luu(ev, id, stId){
    ev.preventDefault();
    if (!Luong.quanLy()) return;
    const f = ev.target, m = this.DM.find(x => x.id === id), M = Luong.M(), st = stId ? staffById(stId) : null;
    if (this._dangXuLy) { App.toast('Đang xử lý file, chờ chút rồi bấm Lưu'); return; }
    const moi = {co: f.co.checked, so: f.so.value.trim(), ngay: f.ngay.value, noi: f.noi.value.trim(), ai: Luong.ai(), luc: Luong.luc(),
                 tep: (this._dsTep || []).slice()};
    if (f.hetHan) moi.hetHan = f.hetHan.value;
    const cu = (this.ghiCua(m, st, M) || {}).tep || [];
    const them = moi.tep.filter(t => !cu.some(x => x.id === t.id)), bo = cu.filter(t => !moi.tep.some(x => x.id === t.id));
    const viec = `Minh chứng "${m.ten}"${st ? ' (' + st.name + ')' : ''}: ${moi.co ? 'đã có' : 'chưa có'}${moi.so ? ', ' + moi.so : ''}`
      + (them.length ? '; đính kèm ' + them.map(t => t.ten).join(', ') : '') + (bo.length ? '; gỡ file ' + bo.map(t => t.ten).join(', ') : '');
    if (m.pv === 'cs') {
      if (!db.bangLuong) db.bangLuong = [];
      let r = db.bangLuong.find(x => x.id === 'mc_cs');
      if (!r) { r = {id: 'mc_cs', mc: {}, lichSu: []}; db.bangLuong.push(r); }
      r.mc = r.mc || {}; r.mc[id] = moi; (r.lichSu = r.lichSu || []).push({ai: moi.ai, luc: moi.luc, viec}); r._up = Date.now();
    } else if (m.pv === 'cst') {
      const r = Luong.coSoMoi(M); r.mc = r.mc || {}; r.mc[id] = moi; (r.lichSu = r.lichSu || []).push({ai: moi.ai, luc: moi.luc, viec}); r._up = Date.now();
    } else if (m.pv === 'nv') {
      st.hoSo = st.hoSo || {}; st.hoSo[id] = moi; st._up = Date.now();
      const p = Luong.phieuMoi(st.id, M); (p.lichSu = p.lichSu || []).push({ai: moi.ai, luc: moi.luc, viec}); p._up = Date.now();
    } else {
      const p = Luong.phieuMoi(st.id, M);
      if (p.chot) { App.toast('Phiếu lương đã chốt — mở chốt trước khi sửa minh chứng tháng'); return; }
      p.mc = p.mc || {}; p.mc[id] = moi; (p.lichSu = p.lichSu || []).push({ai: moi.ai, luc: moi.luc, viec}); p._up = Date.now();
    }
    save(); App.render();
    if (stId) this.nguoi(stId); else App.closeModal();
    App.toast('Đã lưu minh chứng ✓');
    bo.forEach(t => this.xoaTep(t.id));
    this.guiCho().then(n => { if (n) App.toast('Đã gửi ' + n + ' file scan lên máy chủ ✓'); });
  },

  /* Bảng kê nộp kèm hồ sơ lương khi thanh tra hỏi */
  inBangKe(){
    Luong.moi();
    const M = Luong.M(), ds = Luong.dsNV(M);
    const csMuc = this.DM.filter(m => m.pv === 'cs' || m.pv === 'cst');
    const rong = {cg: {}, v: {}, d: {}, cc: {}, sua: {}};
    const tt = ok => ok ? 'Đủ' : '<b>THIẾU</b>';
    const html = `<div style="font-size:10px">${Luong.dau('BẢNG KÊ HỒ SƠ MINH CHỨNG TIỀN LƯƠNG, THƯỞNG THÁNG ' + Luong.nhanThang(M))}
      <p style="text-align:center;margin:0 0 8px"><i>Kèm Bảng thanh toán tiền lương tháng ${Luong.nhanThang(M)} — căn cứ Quy chế lương, thưởng ${h(DanhGia.qc() || '')}</i></p>
      <h3 style="margin:8px 0 4px">I. Giấy tờ cấp cơ sở</h3>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="3">
        <tr><th>TT</th><th>Giấy tờ</th><th>Số hiệu, ngày, nơi lưu / số liệu</th><th>Tình trạng</th></tr>
        ${csMuc.map((m, i) => { const t = this.trangThai(m, null, M, rong);
          return `<tr><td>${i + 1}</td><td>${h(m.ten)}</td><td>${h(t.ghi || '')}</td><td>${tt(t.ok)}</td></tr>`; }).join('')}</table>
      <h3 style="margin:10px 0 4px">II. Theo từng người lao động</h3>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="3">
        <tr><th>TT</th><th>Họ tên</th><th>Khoản</th><th>Số tiền</th><th>Minh chứng</th><th>Số hiệu, ngày, nơi lưu / số liệu</th><th>Tình trạng</th></tr>
        ${ds.map((st, i) => { const k = Luong.tinh(st, M), c = this.cua(st, M, k).filter(x => x.m.pv === 'nv' || x.m.pv === 't');
          const dong = [];
          Luong.KHOAN.filter(K => k.v[K.k]).forEach(K => c.filter(x => this.khoanCua(x.m).includes(K.k))
            .forEach(x => dong.push({K, x})));
          c.filter(x => !this.khoanCua(x.m).length).forEach(x => dong.push({K: null, x}));
          if (!dong.length) return '';
          return dong.map((r, j) => `<tr>${j ? '' : `<td rowspan="${dong.length}">${i + 1}</td><td rowspan="${dong.length}"><b>${h(st.name)}</b><br>${h(Luong.NHOM[k.nhom].ten)}</td>`}
            <td>${r.K ? h(r.K.ten) : '—'}</td><td style="text-align:right;white-space:nowrap">${r.K ? money(k.v[r.K.k]) : ''}</td>
            <td>${h(r.x.m.ten)}</td><td>${h(r.x.ghi || '')}</td><td>${tt(r.x.ok)}</td></tr>`).join('');
        }).join('')}</table>
      <p style="font-size:9.5px"><i>Bản gốc các giấy tờ lưu theo "nơi lưu" ghi ở trên. Số liệu tự động trích từ phần mềm quản lý phòng khám
        (chấm công, lịch hẹn, hồ sơ người bệnh, diễn biến điều trị, phiếu thu); thông tin người bệnh chỉ thể hiện bằng mã.</i></p>
      ${Luong.kyTen('Kế toán', 'Giám đốc')}</div>`;
    App.print(html, 'A4N', 'Bảng kê minh chứng ' + Luong.nhanThang(M));
  },
};

/* ================= FILE SCAN ĐÍNH KÈM =================
   Không để file trong localStorage: trình duyệt chỉ cho khoảng 5MB, dùng chung với bệnh
   án — vài bản scan là đầy, mất dữ liệu. Nên:
   - Bản ghi minh chứng chỉ giữ THÔNG TIN file (tên, cỡ, loại) → đồng bộ như mọi dữ liệu.
   - Nội dung file nằm ở IndexedDB của máy (dung lượng lớn) và một dòng riêng trong bảng
     records trên Supabase (tbl = 'tepMC'). Đồng bộ thường bỏ qua dòng này (sync.js), máy
     khác chỉ tải file về khi bấm xem.
   - Chưa đăng nhập / mất mạng thì file chờ trong IndexedDB, lần sau tự gửi lên. */
Object.assign(MinhChung, {
  PDF_MAX_MB: 4,
  ANH_CANH: 1800,      /* đủ đọc chữ trên giấy A4 chụp bằng điện thoại */
  ANH_CHAT: 0.72,
  TEN_IDB: 'nkhb-tep-mc',
  _dsTep: [],
  _dangXuLy: false,

  idb(){
    return this._idb || (this._idb = new Promise((ok, loi) => {
      const y = indexedDB.open(this.TEN_IDB, 1);
      y.onupgradeneeded = () => y.result.createObjectStore('tep', {keyPath: 'id'});
      y.onsuccess = () => ok(y.result);
      y.onerror = () => loi(y.error);
    }));
  },
  async idbLam(che, fn){
    const d = await this.idb();
    return new Promise((ok, loi) => {
      const tx = d.transaction('tep', che), r = fn(tx.objectStore('tep'));
      tx.oncomplete = () => ok(r && r.result);
      tx.onerror = () => loi(tx.error);
    });
  },
  layIdb(id){ return this.idbLam('readonly', s => s.get(id)); },
  ghiIdb(o){ return this.idbLam('readwrite', s => s.put(o)); },
  boIdb(id){ return this.idbLam('readwrite', s => s.delete(id)); },
  tatCaIdb(){ return this.idbLam('readonly', s => s.getAll()); },

  docFile(file){
    return new Promise((ok, loi) => {
      const fr = new FileReader();
      fr.onerror = () => loi(new Error('Không đọc được ' + file.name));
      fr.onload = () => ok(fr.result);
      fr.readAsDataURL(file);
    });
  },
  async nenAnh(file){
    const url = await this.docFile(file);
    return new Promise((ok, loi) => {
      const im = new Image();
      im.onerror = () => loi(new Error('Ảnh hỏng: ' + file.name));
      im.onload = () => {
        const tl = Math.min(1, this.ANH_CANH / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * tl); cv.height = Math.round(im.height * tl);
        const c = cv.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);   /* PNG trong suốt → nền trắng */
        c.drawImage(im, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL('image/jpeg', this.ANH_CHAT));
      };
      im.src = url;
    });
  },
  kb(dataUrl){ return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75 / 1024); },

  htmlTep(){
    const ds = this._dsTep || [];
    if (!ds.length) return '<span class="sub-line">Chưa đính kèm file nào.</span>';
    return ds.map(t => `<div style="display:flex;gap:8px;align-items:center;margin:3px 0">
      <span class="pill ${t.loai === 'pdf' ? 'info' : ''}">${t.loai === 'pdf' ? 'PDF' : 'Ảnh'}</span>
      <a href="#" onclick="event.preventDefault();MinhChung.xemTep('${t.id}')">${h(t.ten)}</a>
      <span class="sub-line">${t.kb} KB</span>
      <button type="button" class="link-btn" onclick="MinhChung.goTep('${t.id}')">gỡ</button></div>`).join('');
  },
  async themTep(inp){
    const o = document.getElementById('mcTep'), files = [...(inp.files || [])];
    if (!files.length) return;
    this._dangXuLy = true;
    if (o) o.innerHTML = '<span class="sub-line">Đang xử lý ' + files.length + ' file…</span>';
    const loi = [];
    for (const file of files) {
      try {
        let du, loai;
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          if (file.size > this.PDF_MAX_MB * 1048576) throw new Error(file.name + ' lớn hơn ' + this.PDF_MAX_MB + ' MB — xuất lại PDF chất lượng thấp hơn hoặc tách trang');
          du = await this.docFile(file); loai = 'pdf';
          if (!/^data:application\/pdf/.test(du)) du = 'data:application/pdf;base64,' + du.split(',')[1];
        } else if (/^image\//.test(file.type)) {
          du = await this.nenAnh(file); loai = 'anh';
        } else throw new Error(file.name + ': chỉ nhận PDF hoặc ảnh');
        const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const ten = loai === 'anh' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;
        const meta = {id, ten, loai, kb: this.kb(du), ngay: todayISO(), ai: Luong.ai()};
        await this.ghiIdb(Object.assign({du, daGui: false}, meta));
        this._dsTep.push(meta);
      } catch(e){ loi.push(e.message); }
    }
    this._dangXuLy = false;
    inp.value = '';
    const f = inp.form;
    if (f && f.co && this._dsTep.length && !f.co.checked) f.co.checked = true;
    if (o) o.innerHTML = this.htmlTep() + (loi.length ? `<div class="sub-line" style="color:var(--danger)">${loi.map(h).join('<br>')}</div>` : '');
  },
  goTep(id){
    if (!confirm('Gỡ file này khỏi minh chứng? Bấm Lưu thì file bị xóa hẳn.')) return;
    this._dsTep = this._dsTep.filter(t => t.id !== id);
    const o = document.getElementById('mcTep'); if (o) o.innerHTML = this.htmlTep();
  },

  /* ---------- Gửi lên / tải về máy chủ ---------- */
  dongMay(id){ return 'tepMC:' + id; },
  async guiCho(){
    if (!(Cloud.configured() && Cloud.loggedIn()) || this._dangGui) return 0;
    this._dangGui = true;
    let n = 0;
    try {
      const ds = (await this.tatCaIdb()).filter(x => !x.daGui);
      for (const x of ds) {
        const data = Object.assign({}, x); delete data.daGui;
        await Cloud.auth('/rest/v1/records?on_conflict=id', {method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
          body: [{id: this.dongMay(x.id), tbl: 'tepMC', data, deleted: false, updated_at: new Date().toISOString()}], timeout: 120000});
        x.daGui = true; await this.ghiIdb(x); n++;
      }
    } catch(e){ console.warn('Gửi file minh chứng chưa được:', e.message); }
    finally { this._dangGui = false; }
    return n;
  },
  async layTep(id){
    let x = null;
    try { x = await this.layIdb(id); } catch(e){}
    if (x && x.du) return x;
    if (!(Cloud.configured() && Cloud.loggedIn())) throw new Error('File chưa có trên máy này — đăng nhập đám mây để tải về');
    const r = await Cloud.auth('/rest/v1/records?select=data&id=eq.' + encodeURIComponent(this.dongMay(id)), {timeout: 120000});
    if (!r || !r[0] || !r[0].data || !r[0].data.du) throw new Error('Chưa có file trên máy chủ — máy đã đính kèm cần mở app khi có mạng để gửi lên');
    x = Object.assign({}, r[0].data, {daGui: true});
    try { await this.ghiIdb(x); } catch(e){}
    return x;
  },
  async xemTep(id){
    App.toast('Đang mở file…');
    try {
      const x = await this.layTep(id);
      const bin = atob(x.du.split(',')[1]), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], {type: x.loai === 'pdf' ? 'application/pdf' : 'image/jpeg'}));
      const w = window.open(url, '_blank');
      if (!w) {   /* trình duyệt chặn cửa sổ mới → tải về */
        const a = document.createElement('a'); a.href = url; a.download = x.ten; document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch(e){ App.toast(e.message); }
  },
  async xoaTep(id){
    try { await this.boIdb(id); } catch(e){}
    if (Cloud.configured() && Cloud.loggedIn()) {
      try { await Cloud.auth('/rest/v1/records?id=eq.' + encodeURIComponent(this.dongMay(id)), {method: 'DELETE'}); } catch(e){}
    }
  },
  /* Link mở file trong một minh chứng */
  linkTep(g){
    return ((g && g.tep) || []).map(t => `<a href="#" onclick="event.preventDefault();MinhChung.xemTep('${t.id}')">📎 ${h(t.ten)}</a>`).join(' ');
  },
});
