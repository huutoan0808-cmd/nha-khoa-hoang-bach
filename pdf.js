/* ================= XUẤT HỒ SƠ BỆNH ÁN RA PDF =================
   Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.1.a, gạch cuối:
   "Phần mềm hỗ trợ xem được thông tin hồ sơ bệnh án điện tử tối thiểu với tập tin
   định dạng .pdf."

   Cách làm: dựng TOÀN BỘ hồ sơ thành một bản in liền mạch — bìa, bệnh án, các phiếu
   của đợt, khối chữ ký điện tử, và nhật ký thao tác — rồi để trình duyệt kết xuất
   ra PDF.

   Vì sao không tự sinh tệp PDF bằng thư viện: muốn viết chữ tiếng Việt có dấu vào
   PDF thì phải nhúng nguyên một bộ phông Unicode vào phần mềm, và các biểu mẫu của
   phòng khám toàn bảng nhiều cột — thư viện sẽ phải dựng lại layout từ đầu hoặc
   chụp ảnh trang, cả hai đều cho ra bản xấu hơn hẳn. Bộ máy in của trình duyệt vốn
   đã dựng đúng những biểu mẫu này, chữ nét và chọn được cỡ giấy. */
'use strict';

const PDF = {
  NHAC_KEY: 'nkhb_pdf_nhac',

  /* ---------- Bìa hồ sơ ---------- */
  bia(c, ep, giay){
    const cl = db.clinic || {};
    const sv = (typeof LT !== 'undefined') ? LT.soVaoVien(c, ep) : (c.code || '');
    const ai = (typeof Vet !== 'undefined') ? Vet.ai() : {ten: ''};
    const d = new Date();
    const hai = n => String(n).padStart(2, '0');
    const luc = hai(d.getDate()) + '/' + hai(d.getMonth()+1) + '/' + d.getFullYear() +
                ' ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
    return `
      <table class="no-border pa-dau"><tr>
        <td style="width:34%;vertical-align:top">${h(cl.authority || 'Sở Y tế An Giang')}<br><b>${h(cl.legal || cl.name || '')}</b></td>
        <td style="width:36%;text-align:center;vertical-align:top"><h1>HỒ SƠ BỆNH ÁN ĐIỆN TỬ</h1>
          <div style="font-size:11.5px">Bản kết xuất đầy đủ</div></td>
        <td style="width:30%;vertical-align:top;font-size:11px">Số HS: ${h(c.soHS || '—')}<br>
          Mã KH: ${h(c.code || '—')}<br>Số vào viện: ${h(sv)}</td>
      </tr></table>
      <table style="margin-top:10px">
        <tr><td style="width:26%">Họ và tên</td><td><b>${h((c.name||'').toUpperCase())}</b></td>
            <td style="width:16%">Giới tính</td><td style="width:18%">${h(c.gender||'—')}</td></tr>
        <tr><td>Ngày sinh</td><td>${c.dob ? fmtD(c.dob) : '—'}</td>
            <td>Số căn cước</td><td>${h(c.cccd||'—')}</td></tr>
        <tr><td>Địa chỉ</td><td colspan="3">${h([c.addr, c.ward, c.province].filter(Boolean).join(', ') || '—')}</td></tr>
        <tr><td>Điện thoại</td><td>${h(c.phone||'—')}</td>
            <td>Đối tượng</td><td>${h(c.doiTuong||'Dịch vụ')}</td></tr>
        <tr><td>Khoa điều trị</td><td colspan="3">Răng Hàm Mặt — ${h(cl.name||'')}</td></tr>
        ${ep ? `<tr><td>Đợt điều trị</td><td colspan="3">${h(ep.ten||'(chưa đặt tên)')} · mở ngày ${fmtD(ep.tuNgay)}${ep.status?' · '+h(ep.status):''}</td></tr>` : ''}
      </table>
      <h2>Danh mục giấy tờ trong bản kết xuất này</h2>
      <table><thead><tr><th style="width:8%">TT</th><th>Tên giấy tờ</th><th style="width:30%">Ký, xác nhận điện tử</th></tr></thead>
        <tbody>${giay.map((g, i) => `<tr><td>${i+1}</td><td>${h(g.ten)}</td><td>${g.ky || 'Chưa ký'}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:12px;font-size:11.5px"><i>Bản kết xuất lúc ${h(luc)} — người kết xuất: ${h(ai.ten || '—')}.
        Mọi thao tác trên hồ sơ này được ghi trong nhật ký lưu vết ở trang cuối.</i></p>`;
  },

  /* ---------- Nhật ký thao tác trên đúng hồ sơ này ---------- */
  nhatKy(c){
    if (typeof Vet === 'undefined') return '';
    const ds = (db.vet || []).filter(x => x.khach === c.id)
      .sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 60);
    if (!ds.length) return '';
    return `<div class="ngat-trang"><h2>Nhật ký thao tác trên hồ sơ</h2>
      <table><thead><tr><th style="width:20%">Thời điểm</th><th style="width:22%">Người làm</th>
        <th style="width:14%">Việc</th><th>Nội dung</th></tr></thead>
      <tbody>${ds.map(v => `<tr><td>${h(Vet.gio(v.at))}</td><td>${h(v.ten||'')}</td>
        <td>${h(VET_ACT[v.act] || v.act)}</td><td>${h(v.nhan||'')}</td></tr>`).join('')}</tbody></table>
      ${ds.length >= 60 ? '<p style="font-size:11px"><i>Hiện 60 dòng gần nhất. Bản đầy đủ xem trong Cài đặt → Nhật ký lưu vết.</i></p>' : ''}
    </div>`;
  },

  /* ---------- Dựng toàn bộ hồ sơ ---------- */
  dung(c, ep){
    const phan = [];
    const giay = [];
    HoSo.DS.forEach(d => {
      const laKhach = HoSo.cuaKhach(d.k);
      /* Bệnh án của khách thì luôn in; phiếu của đợt chỉ in khi đã lập, để bản
         kết xuất không đầy những trang trắng. */
      const co = laKhach || !!(ep && ep.phieu && ep.phieu[d.k] && ep.phieu[d.k]._at);
      if (!co) return;
      const fn = HoSo['p_' + d.k];
      if (!fn) return;
      const kyHTML = (typeof Ky !== 'undefined') ? Ky.khoiIn(c, d.k) : '';
      const o = (typeof Ky !== 'undefined') ? Ky.oGiay(c, d.k) : null;
      const nv = (typeof Ky !== 'undefined' && o) ? Ky.cuaNhanVien(o) : [];
      giay.push({ten: d.ten, ky: nv.length ? h(nv.map(x => x.ten).join(', ')) : ''});
      phan.push('<div class="ngat-trang">' + fn.call(HoSo, c, ep || {}) + kyHTML + '</div>');
    });
    return this.bia(c, ep, giay) + phan.join('') + this.nhatKy(c);
  },

  /* ---------- Xuất ---------- */
  xuat(cid, epId){
    const c = custById(cid || App.state.custSel);
    if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const ds = (typeof Dot !== 'undefined') ? Dot.cua(c.id) : [];
    const ep = ds.find(e => e.id === epId) || Dot.dangChon(c) || ds[0] || null;
    const noi = this.dung(c, ep);
    if (typeof Vet !== 'undefined')
      Vet.ghi('in', 'Kết xuất PDF hồ sơ bệnh án đầy đủ — ' + (c.name || ''),
        {tbl: 'customers', rid: c.id, khach: c.id});
    App.print(noi, undefined, 'Hồ sơ bệnh án điện tử — ' + (c.name || ''));
  },

  /* Nhắc chọn đúng chỗ lưu. Trình duyệt không cho phần mềm tự chọn "Lưu thành PDF",
     nên phải nói rõ một lần; ai đã quen thì tắt nhắc. */
  hop(cid){
    const c = custById(cid || App.state.custSel);
    if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    let tat = false;
    try { tat = localStorage.getItem(this.NHAC_KEY) === 'tat'; } catch(e){}
    if (tat) { this.xuat(c.id); return; }
    const ds = (typeof Dot !== 'undefined') ? Dot.cua(c.id) : [];
    App.modal('Xuất hồ sơ bệnh án ra PDF — ' + c.name, `
      <div class="note-block">Bản kết xuất gồm: bìa hồ sơ, bệnh án ngoại trú, các phiếu đã lập của đợt,
        khối chữ ký điện tử của từng giấy tờ, và nhật ký thao tác trên hồ sơ.</div>
      ${ds.length > 1 ? `<div class="f full"><label>Đợt điều trị</label>
        <select id="pdfDot">${ds.map(e => `<option value="${e.id}"${(Dot.dangChon(c)||{}).id===e.id?' selected':''}>
          ${h(e.ten||'(chưa đặt tên)')} — ${fmtD(e.tuNgay)}</option>`).join('')}</select></div>` : ''}
      <div class="note-block warn-block"><b>Trong hộp thoại in sắp hiện ra, chọn nơi in là "Lưu thành PDF"</b>
        (tiếng Anh: <i>Save as PDF</i>), rồi bấm Lưu.
        <br>Khổ giấy để A4. Phần mềm không tự chọn giúp chỗ này được — đó là hộp thoại của trình duyệt.</div>
      <label class="tick-d" style="margin:8px 0"><input type="checkbox" id="pdfTat"> Đã hiểu, lần sau khỏi nhắc</label>
      <div class="form-actions full">
        <button class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary" onclick="PDF.chay('${c.id}')">Mở hộp thoại in</button></div>`);
  },
  chay(cid){
    const o = document.getElementById('pdfTat');
    if (o && o.checked) { try { localStorage.setItem(this.NHAC_KEY, 'tat'); } catch(e){} }
    const s = document.getElementById('pdfDot');
    const epId = s ? s.value : '';
    App.closeModal();
    setTimeout(() => this.xuat(cid, epId), 60);
  },
};
