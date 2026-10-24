/* Nha Khoa Hoàng Bách - Thời Đại — ứng dụng quản lý phòng khám (v1, dữ liệu lưu trên thiết bị) */
'use strict';

/* ================= Tiện ích ================= */
const $ = s => document.querySelector(s);
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = n => (Math.round(n) || 0).toLocaleString('vi-VN') + ' ₫';
const todayISO = () => isoOf(new Date());
/* Cộng ngày theo giờ địa phương. Không dùng toISOString() vì ở múi giờ Việt Nam
   nó quy về UTC và trả về sai 1 ngày. */
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const isoAdd = (iso, days) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + days); return isoOf(d); };
const fmtD = iso => iso ? iso.slice(8,10) + '/' + iso.slice(5,7) + '/' + iso.slice(0,4) : '—';
const monthOf = iso => iso ? iso.slice(0,7) : '';
const WEEKD = ['CN','T2','T3','T4','T5','T6','T7'];
const num = v => {
  let s = String(v == null ? '' : v).replace(/\s/g, '');
  /* Ô tiền cho gõ kiểu Việt Nam "2.500.000". Chỉ bỏ dấu chấm khi đúng dạng nhóm ba
     chữ số, để "2.5" vẫn hiểu là hai phẩy năm chứ không thành hai mươi lăm. */
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

/* Ô nhập tiền: vừa gõ vừa tự chấm ngăn hàng nghìn cho dễ đọc */
const Tien = {
  o(name, val, them){
    const v = (val == null || val === '') ? '' : this.dinh(String(val));
    return `<input type="text" inputmode="numeric" name="${h(name)}" value="${h(v)}" autocomplete="off"
      class="o-tien" oninput="Tien.go(this)" ${them || ''}>`;
  },
  dinh(s){
    const am = /^-/.test(String(s));
    const d = String(s).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    return (am && d ? '-' : '') + (d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
  },
  go(el){
    const cu = el.value, tai = el.selectionStart;
    const soChuSoTruoc = cu.slice(0, tai).replace(/\D/g, '').length;
    el.value = this.dinh(cu);
    /* Đặt lại con trỏ theo SỐ CHỮ SỐ đứng trước nó, không theo vị trí ký tự —
       vì thêm bớt dấu chấm sẽ làm lệch vị trí ký tự. */
    let i = 0, dem = 0;
    while (i < el.value.length && dem < soChuSoTruoc) { if (/\d/.test(el.value[i])) dem++; i++; }
    try { el.setSelectionRange(i, i); } catch(e){}
  },
};

/* ================= Danh mục ================= */

/* Danh mục ICD-10 thường dùng trong răng hàm mặt */
const ICD = [
  ['K00.0','Thiếu răng bẩm sinh (không mọc răng)'],['K00.1','Răng thừa'],['K00.2','Bất thường kích thước và hình dạng răng'],
  ['K00.3','Răng nhiễm màu (răng đốm)'],['K00.4','Rối loạn hình thành răng'],['K00.6','Rối loạn mọc răng'],['K00.7','Hội chứng mọc răng'],
  ['K01.0','Răng ngầm'],['K01.1','Răng kẹt (răng khôn lệch)'],
  ['K02.0','Sâu men răng'],['K02.1','Sâu ngà răng'],['K02.2','Sâu xương răng (cement)'],['K02.3','Sâu răng ngừng tiến triển'],
  ['K02.5','Sâu răng có lộ tủy'],['K02.8','Sâu răng khác'],['K02.9','Sâu răng, không đặc hiệu'],
  ['K03.0','Mòn răng do nghiến (mòn mặt nhai)'],['K03.1','Mòn răng do chải răng, cơ học'],['K03.2','Mòn hóa học men răng'],
  ['K03.3','Tiêu răng bệnh lý'],['K03.4','Tăng sản xê măng'],['K03.6','Cao răng (vôi răng), mảng bám'],['K03.7','Đổi màu mô cứng sau mọc'],
  ['K04.0','Viêm tủy răng'],['K04.1','Hoại tử tủy'],['K04.2','Thoái hóa tủy'],['K04.3','Tạo mô cứng bất thường trong tủy'],
  ['K04.4','Viêm quanh chóp cấp do tủy'],['K04.5','Viêm quanh chóp mạn (u hạt quanh chóp)'],
  ['K04.6','Áp xe quanh chóp có lỗ dò'],['K04.7','Áp xe quanh chóp không lỗ dò'],['K04.8','Nang chân răng'],
  ['K05.0','Viêm nướu (lợi) cấp'],['K05.1','Viêm nướu (lợi) mạn'],['K05.2','Viêm nha chu cấp (áp xe nha chu)'],
  ['K05.3','Viêm nha chu mạn'],['K05.4','Thoái hóa nha chu'],['K05.5','Bệnh nha chu khác'],
  ['K06.0','Tụt nướu (co lợi)'],['K06.1','Phì đại nướu'],['K06.2','Tổn thương nướu do chấn thương'],
  ['K07.0','Bất thường kích thước xương hàm'],['K07.1','Bất thường tương quan hàm - nền sọ'],['K07.2','Bất thường tương quan hai cung răng'],
  ['K07.3','Lệch lạc răng (sai khớp cắn)'],['K07.6','Rối loạn khớp thái dương hàm'],
  ['K08.1','Mất răng do tai nạn, nhổ răng, bệnh nha chu'],['K08.2','Teo sống hàm mất răng'],['K08.3','Chân răng còn sót'],
  ['K09.0','Nang do mọc răng'],['K09.1','Nang phát triển vùng miệng'],
  ['K10.2','Viêm xương hàm (viêm tủy xương hàm)'],['K10.3','Viêm ổ răng khô (sau nhổ răng)'],
  ['K11.5','Sỏi tuyến nước bọt'],['K12.0','Loét áp-tơ miệng tái diễn'],['K12.1','Viêm miệng thể khác'],
  ['K12.2','Viêm mô tế bào và áp xe vùng miệng'],['K13.0','Bệnh của môi (viêm môi, nứt mép)'],
  ['K13.2','Bạch sản niêm mạc miệng'],['K13.7','Tổn thương khác của niêm mạc miệng'],
  ['K14.0','Viêm lưỡi'],['K14.3','Phì đại gai lưỡi (lưỡi bản đồ)'],
  ['S02.5','Gãy răng (chấn thương)'],['S03.0','Trật khớp hàm'],
  ['Z01.2','Khám răng miệng định kỳ'],['Z46.3','Lắp và điều chỉnh hàm giả'],['Z46.4','Lắp và điều chỉnh khí cụ chỉnh nha'],
  ['Z97.2','Mang hàm giả tháo lắp']
];
/* Tách mã ICD từ chuỗi hiển thị "K04.0 — Viêm tủy răng"; gõ tự do thì giữ nguyên */
const icdCode = s => { s = String(s||'').trim(); const m = s.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*[—-]/); return m ? m[1] : s; };
const icdOptions = () => ICD.map(([c,n]) => ({t: c + ' — ' + n, s: c}));

const DRUGS = ['Amoxicillin 500mg','Spiramycin 3 M.IU','Metronidazol 250mg','Paracetamol 500mg','Ibuprofen 400mg','Alphachymotrypsin 4,2mg','Cefuroxim 500mg','Nước súc miệng Chlorhexidine 0,12%','Vitamin C 500mg','Efferalgan 500mg'];

/* Danh mục tỉnh + xã/phường nằm ở wards.js (WARDS, PROVINCES) */
const LABS = ['Lab Việt Tiên (Cần Thơ)','Lab Nha Việt (TP.HCM)','Lab Đại Nam (TP.HCM)','Lab Rạng Đông (Long Xuyên)'];
const LAB_TYPES = ['Mão sứ Zirconia','Mão sứ Titan','Mão toàn sứ Emax','Dán sứ Veneer','Hàm khung','Hàm nhựa dẻo','Máng tẩy trắng','Máng chỉnh nha','Cầu răng sứ'];
const CHAIRS = ['Ghế 1','Ghế 2'];
const TEETH_UP = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const TEETH_DN = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
/* Tình trạng chính của một răng. Nội nha là ô tick riêng (nn) chứ không phải một
   trạng thái, vì răng đã nội nha rồi bọc sứ là chuyện thường ngày — gộp làm một
   thì mất thông tin. Các mặt sâu/trám để trong mảng `mat`. */
const TOOTH_STATES = [
  ['ok',      'Bình thường'],
  ['khac',    'Khác — tự ghi'],
  ['sau',     'Sâu răng'],
  ['lunglay', 'Lung lay'],
  ['filled',  'Đã trám'],
  ['noinha',  'Đã nội nha'],
  ['crown',   'Răng sứ'],
  ['thaolap', 'Răng tháo lắp'],
  ['implant', 'Implant'],
  ['missing', 'Mất răng'],
  ['chanrang','Chân răng'],
];
/* Dịch vụ cơ bản phòng khám làm thường xuyên. Bản cài cũ thiếu món nào thì tự thêm
   với giá 0 để quản lý điền — KHÔNG đụng vào giá của những món đã có. */
const DV_CO_BAN = [
  ['Trám răng',            'Trám răng'],
  ['Nha chu',              'Cạo vôi răng'],
  ['Nhổ răng',             'Nhổ răng vĩnh viễn'],
  ['Nhổ răng',             'Nhổ răng sữa'],
  ['Nhổ răng',             'Nhổ răng tiểu phẫu'],
  ['Điều trị tủy',         'Điều trị tủy'],
  ['Điều trị tủy',         'Điều trị tủy lại'],
  ['Điều trị tủy',         'Cắt chóp răng nhiễm trùng'],
  ['Thẩm mỹ',              'Đính đá răng'],
  ['Thẩm mỹ',              'Tẩy trắng răng'],
  ['Phục hình sứ',         'Phục hình răng sứ'],
  ['Phục hình tháo lắp',   'Phục hình tháo lắp — hàm khung'],
  ['Phục hình tháo lắp',   'Phục hình tháo lắp — mắc cài'],
  ['Phục hình tháo lắp',   'Phục hình tháo lắp — móc dẻo'],
  ['Phục hình tháo lắp',   'Phục hình tháo lắp — nhựa cường lực'],
];

/* Chỉ những tình trạng này mới còn thân răng để nói tới chuyện nội nha.
   Mất răng / implant / răng tháo lắp thì không có tủy mà điều trị. */
const trangThaiMau = s => s === 'Hoàn tất' ? 'ok' : s === 'Đang điều trị' ? 'info'
  : s === 'Chưa điều trị' ? 'warn' : 'mutedp';
/* 'crown' chỉ là mục để CHỌN trong ô tình trạng; lưu xuống vẫn là crownKL hoặc
   crownTS như cũ, nên sơ đồ, bản in và hồ sơ đã nhập không phải đổi gì. */
/* "Sâu răng" là một mục lớn; nông hay sâu hay đã vỡ đến tủy là mức độ bên trong,
   hỏi riêng cho gọn danh sách. Lưu xuống vẫn là sauNong / sauSau / sauTuy. */
/* Độ lung lay theo cách bảng nha chu vẫn ghi: I lắc ngang nhẹ, II lắc ngang rõ,
   III lắc được cả theo chiều dọc — răng độ III thường là chỉ định nhổ. */
const LL_MUC = [
  ['ll1', 'Độ I — lắc ngang nhẹ (dưới 1mm)'],
  ['ll2', 'Độ II — lắc ngang rõ (trên 1mm)'],
  ['ll3', 'Độ III — lắc được cả chiều dọc'],
];
const laLungLay = s => s === 'lunglay' || s === 'll1' || s === 'll2' || s === 'll3';
const oMucLungLay = sNay => `<div class="f full" id="oMucLL" style="display:${laLungLay(sNay) ? '' : 'none'}">
  <label>Độ lung lay</label><div class="check-row">${LL_MUC.map(([k, l]) =>
    `<label><input type="radio" name="mucLL" value="${k}"${(sNay === k || (!laLungLay(sNay) && k === 'll1')) ? ' checked' : ''}> ${l}</label>`).join('')}</div></div>`;

const SAU_MUC = [
  ['sauNong', 'Sâu ngà nông'],
  ['sauSau',  'Sâu ngà sâu'],
  ['sauTuy',  'Sâu đến tủy'],
];
const oMucSau = sNay => {
  const ds = SAU_MUC.concat(sNay === 'caries' ? [['caries', 'Chưa phân độ (hồ sơ cũ)']] : []);
  return `<div class="f full" id="oMucSau" style="display:${laSau(sNay) ? '' : 'none'}">
    <label>Mức độ sâu</label><div class="check-row">${ds.map(([k, l]) =>
      `<label><input type="radio" name="mucSau" value="${k}"${(sNay === k || (!laSau(sNay) && k === 'sauNong')) ? ' checked' : ''}
        onchange="Cust.doiMucSau()"> ${l}</label>`).join('')}</div></div>`;
};

const SU_LOAI = [['crownKL', 'Kim loại'], ['crownTS', 'Toàn sứ']];
/* Một cái răng sứ trong miệng luôn ở một trong hai vai: nó là RĂNG TRỤ (răng thật
   được mài rồi bọc) hay là NHỊP CẦU (răng giả treo giữa hai trụ, bên dưới không có
   chân răng). Hỏi riêng thay vì bắt chọn trong danh sách tình trạng, vì hai chuyện
   này độc lập: nhịp cầu cũng có loại kim loại hay toàn sứ như thường. */
const SU_VAI = [['tru', 'Răng trụ (răng thật bọc sứ)'], ['nhipcau', 'Nhịp cầu (răng giả treo)']];
/* TOOTH_STATES chỉ chứa MỤC LỚN. Tên đầy đủ của từng giá trị lưu xuống nằm ở đây —
   thiếu bảng này thì câu mô tả của răng sâu hay răng sứ bị rỗng. */
const TEN_TT = {
  ok: 'Bình thường', filled: 'Đã trám', noinha: 'Đã nội nha', thaolap: 'Răng tháo lắp',
  implant: 'Implant', missing: 'Mất răng', chanrang: 'Chân răng',
  sauNong: 'Sâu ngà nông', sauSau: 'Sâu ngà sâu', sauTuy: 'Sâu đến tủy',
  ll1: 'Lung lay độ I', ll2: 'Lung lay độ II', ll3: 'Lung lay độ III',
  crownKL: 'Răng sứ kim loại', crownTS: 'Răng sứ toàn sứ',
  caries: 'Sâu răng', pontic: 'Nhịp cầu',
};
const laSu = s => s === 'crown' || s === 'crownKL' || s === 'crownTS';
const laSau = s => s === 'sau' || s === 'sauNong' || s === 'sauSau' || s === 'sauTuy' || s === 'caries';
/* Giá trị hiện trong ô chọn mục lớn — mọi mức sâu gom về 'sau', mọi loại sứ về 'crown' */
const sChon = s => laSu(s) ? 'crown' : (laSau(s) ? 'sau' : (laLungLay(s) ? 'lunglay' : s));

/* Ba mức sâu răng — dùng ở chỗ nào chỉ cần biết "răng này đang sâu" */
const TT_SAU = ['sau', 'sauNong', 'sauSau', 'sauTuy', 'caries'];
/* Chọn được mặt răng: sâu ngà nông, sâu ngà sâu, đã trám. Răng vỡ lớn đến tủy thì
   mô răng gần như không còn, đánh dấu từng mặt không còn ý nghĩa. */
const TT_CO_MAT = ['sauNong', 'sauSau', 'filled', 'caries'];
/* Chân răng còn sót và răng đã nội nha cũng có thể nhiễm trùng vùng chóp */
/* Lỗ dò và sưng đáy hành lang là dấu nhiễm trùng vùng chóp — chỉ hỏi ở răng đã hở
   tủy và ở răng sứ (răng sứ đã chữa tủy vẫn có thể tái nhiễm). */
const TT_CO_CHOP = ['sauNong', 'sauSau', 'sauTuy', 'caries',
  'noinha', 'chanrang', 'crown', 'crownKL', 'crownTS'];
/* Nội nha nay là một MỤC LỚN riêng, nên không hỏi lại ở răng sâu hay răng đã trám —
   răng vừa sâu vừa đã chữa tủy thì chọn thẳng mục "Đã nội nha". Chỉ còn răng sứ giữ
   ô này, vì "đã nội nha rồi bọc sứ" là chuyện thường ngày. */
const TT_CO_NOI_NHA = ['crown', 'crownKL', 'crownTS'];
/* Hồ sơ cũ ghi 'caries' (sâu răng chưa phân độ). Không tự gán bừa một mức nào —
   giữ nguyên, chỉ cho hiện lại trong ô chọn của đúng cái răng đó, để lỡ mở ra
   lưu lại thì không bị nhảy về "Bình thường". */
/* Ngoài danh sách gợi ý còn cho tự ghi: bảng này không bao giờ phủ hết được mọi thứ
   gặp ở ghế. Chọn "Khác — tự ghi" rồi gõ vào ô bên cạnh; sơ đồ vẽ răng trung tính
   còn chữ tự ghi thì hiện nguyên văn ở phần mô tả. */
const oTinhTrang = (sNay, them, tuGhi) => {
  const v = sChon(sNay);
  const khac = v === 'khac';
  return `<select name="s"${them || ''}>${TOOTH_STATES
      .map(([k, l]) => `<option value="${k}"${v === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <input name="sKhac" value="${h(tuGhi || '')}" placeholder="Tự ghi tình trạng, vd: nứt dọc thân răng"
      style="margin-top:8px;display:${khac ? '' : 'none'}" id="oTuGhi">`;
};
const oLoaiSu = (sNay, tNay) => `<div class="f full" id="oLoaiSu" style="display:${laSu(sNay) ? '' : 'none'}">
  <label>Loại răng sứ</label><div class="check-row">${SU_LOAI.map(([k, l]) =>
    `<label><input type="radio" name="loaiSu" value="${k}"${(sNay === k || (!laSu(sNay) && k === 'crownTS')) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
  <label style="margin-top:8px">Vai trò trên cung hàm</label><div class="check-row">${SU_VAI.map(([k, l]) =>
    `<label><input type="radio" name="vaiSu" value="${k}"${((tNay && tNay.nhipCau ? 'nhipcau' : 'tru') === k) ? ' checked' : ''}> ${l}</label>`).join('')}</div></div>`;

/* 6 mặt răng. k = mã lưu, l = tên đầy đủ, z = vùng vẽ trên sơ đồ */
/* Mặt nhai đứng đầu vì sâu mặt nhai là thứ gặp nhiều nhất — để cuối thì lần nào
   cũng phải rê mắt qua năm mặt khác mới tới. */
const TOOTH_SURF = [
  ['NH', 'Mặt nhai',  'nhai'],
  ['G',  'Mặt gần',   'gan'],
  ['X',  'Mặt xa',    'xa'],
  ['N',  'Mặt ngoài', 'ngoai'],
  ['T',  'Mặt trong', 'trong'],
  ['C',  'Cổ răng',   'co'],
];
const APPT_STATUS = ['Chờ xác nhận','Đã xác nhận','Đang điều trị','Hoàn tất','Hủy'];
const TREAT_STATUS = ['Báo giá','Chưa điều trị','Đang điều trị','Hoàn tất'];
/* Ba trạng thái của TIẾN TRÌNH làm răng — "Báo giá" đứng ngoài vì đó là lúc chưa
   chốt, chưa tính vào công nợ. Bấm vào răng ở tab Điều trị thì chỉ thấy ba cái này. */
const TIEN_DO = [
  ['Chưa điều trị', 'warn'],
  ['Đang điều trị', 'info'],
  ['Hoàn tất',      'ok'],
];
const PAY_METHODS = ['Tiền mặt','Chuyển khoản','Quẹt thẻ'];

/* ================= Dữ liệu ================= */
const DB_KEY = 'nkhb_v1';
let db = null;

function seed() {
  /* Bản mới tinh: chỉ có bảng giá dịch vụ mẫu để dùng ngay, không có bệnh nhân giả. */
  const services = [];
  const svc = (group, name, price) => services.push({id: uid() + services.length, group, name, price});
  svc('Phục hình sứ','Mão sứ Zirconia',4500000); svc('Phục hình sứ','Mão sứ Titan',2500000);
  svc('Phục hình sứ','Mão toàn sứ Emax',6000000); svc('Phục hình sứ','Dán sứ Veneer',6000000);
  svc('Phục hình sứ','Cầu răng sứ (3 đơn vị)',10500000);
  svc('Phục hình tháo lắp','Hàm khung kim loại',3500000); svc('Phục hình tháo lắp','Hàm nhựa dẻo',2500000);
  svc('Phục hình tháo lắp','Răng tháo lắp (1 đơn vị)',500000);
  svc('Trám răng','Trám composite',450000); svc('Trám răng','Trám GIC',300000); svc('Trám răng','Trám cổ răng',350000);
  svc('Nhổ răng','Nhổ răng sữa',100000); svc('Nhổ răng','Nhổ răng vĩnh viễn',500000);
  svc('Nhổ răng','Nhổ răng khôn',1500000); svc('Nhổ răng','Tiểu phẫu răng khôn lệch',2500000);
  svc('Điều trị tủy','Điều trị tủy răng cửa',1200000); svc('Điều trị tủy','Điều trị tủy răng cối nhỏ',1800000);
  svc('Điều trị tủy','Điều trị tủy răng cối lớn',2500000);
  svc('Implant','Implant Hàn Quốc (trụ + mão)',16000000); svc('Implant','Implant Thụy Sĩ (trụ + mão)',25000000);
  svc('Chỉnh nha','Mắc cài kim loại (2 hàm)',30000000); svc('Chỉnh nha','Mắc cài sứ (2 hàm)',42000000);
  svc('Chỉnh nha','Máng trong suốt',60000000);
  svc('Nha chu','Cạo vôi răng + đánh bóng',300000); svc('Nha chu','Nạo túi nha chu (1 vùng)',800000);
  svc('Thẩm mỹ','Tẩy trắng răng tại ghế',1500000); svc('Thẩm mỹ','Gắn hột (đá) thẩm mỹ',800000);
  svc('Khác','Khám + tư vấn + chụp phim',150000); svc('Khác','Cắt chỉ / tái khám',0);

  return {ver: 1,
    clinic: {name:'Nha Khoa Hoàng Bách - Thời Đại', legal:'Công ty TNHH Nha Khoa Hoàng Bách – Thời Đại',
             authority:'Sở Y tế An Giang', addr:'C22 đường Lê Hồng Phong, phường Rạch Giá, tỉnh An Giang',
             phone:'0986 262 242', taxCode:'1702345688', maCSKCB:'',
             phone2:'0707 262 242',
             caSangVao:'07:00', caSangRa:'12:00', caChieuVao:'13:00', caChieuRa:'17:00',
             treCho:5, wifiIp:''},
    seq: {cust: 1, receipt: 1},
    services, staff: [], customers: [], treatments: [], receipts: [], rx: [],
    inventory: [], appointments: [], labs: [], attLog: [], bonuses: [], datlich: []};
}

function load() {
  db = null;
  let raw = '';
  try { raw = localStorage.getItem(DB_KEY) || ''; } catch(e){}
  /* Bản trên máy đang mã hóa: chưa mở khóa thì chưa có dữ liệu thật. Tuyệt đối
     KHÔNG gọi save() ở nhánh này — save() sẽ ghi đè bản mã hóa bằng dữ liệu rỗng. */
  if (typeof Mahoa !== 'undefined' && Mahoa.laGoi(raw)) {
    db = seed(); migrate();
    App.choMoKhoa = true;
    return;
  }
  try { if (raw) db = JSON.parse(raw); } catch(e){ db = null; }
  if (!db || !Array.isArray(db.customers)) db = seed();
  migrate(); save();
}
function save() {
  /* Bảng phân bổ tiền đã thu tính sẵn cho nhanh — dữ liệu đổi thì phải tính lại */
  if (typeof QT !== 'undefined') QT._thu = null;
  /* Ghi vết trước khi lưu: quet() so dữ liệu với bản chụp lần trước rồi thêm dòng
     vào db.vet, nên phải chạy trước khi đóng gói db xuống localStorage. */
  if (typeof Vet !== 'undefined') { try { Vet.quet(); } catch(e){} }
  /* Hẹn đẩy lên đám mây — gom nhiều lần lưu liên tiếp thành một lần */
  if (typeof Sync !== 'undefined' && Sync.hen) { try { Sync.hen(); } catch(e){} }
  const chuoi = JSON.stringify(db);
  if (typeof Mahoa !== 'undefined' && Mahoa.bat()) { Mahoa.ghi(chuoi); return; }
  try {
    localStorage.setItem(DB_KEY, chuoi);
  } catch(e) {
    /* Kho trên máy đầy. Thứ ĐƯỢC PHÉP mất là nhật ký, không phải hồ sơ bệnh nhân —
       nên bỏ bớt nhật ký rồi ghi lại. Im lặng nuốt lỗi ở đây là mất dữ liệu mà không
       ai biết, nên vẫn phải báo ra một lần. */
    let cuu = false;
    if (db.vet && db.vet.length > 200) {
      db.vet = db.vet.slice(-200);
      try { localStorage.setItem(DB_KEY, JSON.stringify(db)); cuu = true; } catch(e2){}
    }
    if (!App._daBaoDay) {
      App._daBaoDay = true;
      setTimeout(() => App.modal(cuu ? 'Kho dữ liệu trên máy đã đầy' : 'KHÔNG LƯU ĐƯỢC DỮ LIỆU', `
        <div class="note-block warn-block">${cuu
          ? 'Máy này hết chỗ lưu nên phần mềm đã <b>rút gọn nhật ký lưu vết</b> để giữ lại hồ sơ bệnh nhân. Hồ sơ không mất.'
          : '<b>Máy này hết chỗ lưu và phần mềm không ghi xuống được.</b> Những gì vừa nhập chỉ đang nằm trong bộ nhớ tạm — tải lại trang là mất.'}</div>
        <div class="note-block">Làm ngay theo thứ tự:<br>
          1. Bấm nút <b>⟳ đồng bộ</b> trên thanh đầu để đẩy dữ liệu lên đám mây.<br>
          2. Bấm nút <b>⬇ sao lưu</b> để tải một bản về máy.<br>
          3. Rồi mới tải lại trang.</div>
        <div class="form-actions"><button class="btn primary" onclick="App.closeModal()">Đã hiểu</button></div>`), 50);
    }
  }
}
/* Nâng cấp dữ liệu cũ về một ô địa chỉ duy nhất (số nhà + đường gộp chung) */
/* Phần mềm chạy thử xong ở Gò Quao, nay chuyển sang chi nhánh Thời Đại (Rạch Giá).
   Chỉ thay những ô còn ĐÚNG giá trị cũ — ô nào quản lý đã tự sửa thì giữ nguyên, vì
   sửa đè lên thứ người ta cố ý đặt là mất dữ liệu thật. Gọi cả sau khi kéo cài đặt từ
   đám mây, vì đám mây có thể còn giữ bản Gò Quao của máy chưa cập nhật.
   Trả về true nếu có đổi. */
function veThoiDai() {
  const cl = db.clinic || (db.clinic = {});
  const ve = [
    ['name',    'Nha Khoa Hoàng Bách - Gò Quao', 'Nha Khoa Hoàng Bách - Thời Đại'],
    ['legal',   'Công ty TNHH Nha Khoa Hoàng Bách – Gò Quao', 'Công ty TNHH Nha Khoa Hoàng Bách – Thời Đại'],
    ['addr',    'Số 33 đường 3/2, Xã Gò Quao, An Giang', 'C22 đường Lê Hồng Phong, phường Rạch Giá, tỉnh An Giang'],
    ['phone',   '0776 262 242', '0986 262 242'],
    ['taxCode', '', '1702345688'],
  ];
  let doi = false;
  ve.forEach(([k, cu, moi]) => { if ((cl[k] || '') === cu) { cl[k] = moi; doi = true; } });
  if (cl.tenGQ) { delete cl.tenGQ; doi = true; }
  return doi;
}

function migrate() {
  /* Trước đây chỉ có một mốc "giờ vào ca". Nay là hai buổi: sáng 7–12, chiều 13–17. */
  const cl = db.clinic || (db.clinic = {});
  if (!cl.caSangVao) {
    cl.caSangVao  = '07:00';   /* giờ thật của phòng khám, không lấy mốc 08:00 cũ */
    cl.caSangRa   = '12:00';
    cl.caChieuVao = '13:00';
    cl.caChieuRa  = '17:00';
  }
  if (cl.treCho == null) cl.treCho = 5;
  /* Đổi tên và địa chỉ phòng khám một lần cho các máy đã cài. Đánh dấu để lần sau
     không đè lên nữa — quản lý vẫn sửa lại được trong Cài đặt. */
  if (!cl.tenTD) {
    cl.name = 'Nha Khoa Hoàng Bách - Thời Đại';
    cl.addr = 'C22 đường Lê Hồng Phong, phường Rạch Giá, tỉnh An Giang';
    cl.tenTD = 1;
  }
  veThoiDai();
  /* Giờ thật của cơ sở Thời Đại từ 04/10/2026: thứ Hai–thứ Sáu đóng cửa 19:00,
     thứ Bảy và Chủ nhật đóng cửa 17:00; nghỉ trưa 12:00–13:30 mọi ngày.
     Đặt một lần rồi đánh dấu, sau đó quản lý tự sửa trong Nhân sự → Chấm công. */
  if (!cl.caTD) {
    cl.caSangVao = '08:00'; cl.caSangRa = '12:00';
    cl.caChieuVao = '13:30'; cl.caChieuRa = '19:00';
    const tuan = {};
    for (let i = 0; i < 7; i++) {
      tuan[String(i)] = {sangVao:'08:00', sangRa:'12:00', chieuVao:'13:30',
                         chieuRa: (i === 0 || i === 6) ? '17:00' : '19:00'};
    }
    cl.caTuan = tuan;
    cl.caTD = 1;
  }
  /* Số điện thoại phòng khám — điền một lần cho máy nào chưa có */
  if (!cl.phone) cl.phone = '0986 262 242';
  if (!cl.phone2) cl.phone2 = '0707 262 242';
  delete cl.shiftStart;
  /* Sơ đồ răng cũ chỉ có một trạng thái mỗi răng: 'rct' (điều trị tủy) và 'crown'
     (bọc sứ chung). Nay nội nha là ô tick riêng, còn răng sứ tách kim loại / toàn sứ.
     Bản cũ không ghi rõ loại sứ nên chuyển tạm về "toàn sứ" — cần thì sửa lại tay. */
  (db.customers || []).forEach(c => {
    ['teeth', 'teethKH', 'teethST'].forEach(lop => {
      if (!c[lop]) return;
      Object.keys(c[lop]).forEach(n => {
        const t = c[lop][n]; if (!t) return;
        /* 'rct' cũ = đã điều trị tủy. Nội nha nay là ô tick, mà ô này chỉ mở với răng
           còn thân để phục hồi — răng đã nội nha thì luôn có phục hồi, nên xếp vào
           "đã trám"; răng nào thực tế bọc sứ thì sửa lại tay. */
        if (t.s === 'rct') { t.s = 'filled'; t.nn = true; }
        if (t.s === 'crown') t.s = 'crownTS';
        if (!Array.isArray(t.mat)) t.mat = [];
        /* Răng mất / implant / tháo lắp thì không còn tủy để nội nha */
        if (t.nn && !TT_CO_NOI_NHA.includes(t.s)) t.nn = false;
      });
    });
  });
  /* Thứ tự nhân viên do quản lý tự kéo thả. Phải lưu thành số trên từng người thì
     các máy khác đồng bộ về mới giữ đúng thứ tự — thứ tự trong mảng không đồng bộ được. */
  if (Array.isArray(db.staff)) {
    db.staff.forEach((st, i) => { if (typeof st.thuTu !== 'number') st.thuTu = i; });
    db.staff.sort((a, b) => a.thuTu - b.thuTu);
  }
  /* Quy trình công đoạn: lần đầu thì nạp bảng gốc của phòng khám. Đã có rồi thì chỉ
     bổ sung quy trình mới, KHÔNG đè lên tỷ lệ quản lý đã chỉnh. */
  /* "Nhịp cầu" trước là một tình trạng riêng, nay là VAI TRÒ của răng sứ. Bản cũ
     không ghi rõ sứ loại gì nên tạm để toàn sứ — sửa lại tay nếu là kim loại. */
  (db.customers || []).forEach(c => ['teeth','teethKH','teethST'].forEach(lop => {
    Object.values(c[lop] || {}).forEach(t => {
      if (t && t.s === 'pontic') { t.s = 'crownTS'; t.nhipCau = true; }
    });
  }));
  /* Trước đây gọi là "Chờ điều trị" — phòng khám quen nói "Chưa điều trị" */
  (db.treatments || []).forEach(t => { if (t.status === 'Chờ điều trị') t.status = 'Chưa điều trị'; });
  if (!db.quyTrinh) db.quyTrinh = [];
  /* Chẩn đoán ghi trên sơ đồ kế hoạch TRƯỚC bản v128 chưa có dòng tương ứng trong
     bảng Chẩn đoán, vì lúc đó hai chỗ còn là hai kho rời nhau. Dựng lại một lần cho
     hồ sơ cũ, rồi đánh dấu để lần sau không dựng lại những dòng đã bị xóa có chủ ý. */
  if (!db.donCD) {
    let dem = 0;
    (db.customers || []).forEach(c => {
      const kho = c.teethKH || {};
      Object.keys(kho).forEach(n => {
        const icd = kho[n] && kho[n].chanDoan;
        if (!icd) return;
        const ds = ((c.record || {}).vanDe) || [];
        if (ds.some(v => String(v.rang) === String(n) && v.icd === icd)) return;
        Cust.vanDeTuRang(c, n, icd);
        dem++;
      });
      if (dem) Cust.dongBoChanDoan(c);
    });
    db.donCD = 1;
    if (dem) setTimeout(() => App.toast('Đã đưa ' + dem + ' chẩn đoán cũ trên sơ đồ vào bảng Chẩn đoán'), 1200);
  }
  /* Kế hoạch lập trước v129 chưa có hạng mục điều trị, vì hồi đó còn phải bấm "Đưa
     vào điều trị" từng dòng. Nay nút đó bỏ rồi nên phải dựng nốt cho hồ sơ cũ, không
     thì mấy dòng đó mắc kẹt mãi trong kế hoạch mà không vào được công nợ. */
  /* Máy đã cài trước v139 thì qt_noinha và qt_tram đã có sẵn, vòng nạp chỉ thêm kỹ
     thuật CÒN THIẾU nên không đụng tới phần danh mục riêng của chúng. Bổ sung một lần. */
  if (!db.donTreEm) {
    [['qt_noinha', 'Điều trị tủy + trám răng sữa'], ['qt_tram', 'Trám răng sữa (GIC)']].forEach(([id, ten]) => {
      const q = (db.quyTrinh || []).find(x => x.id === id); if (!q) return;
      q.dv = q.dv || [];
      if (!q.dv.some(x => Combo.norm(x) === Combo.norm(ten))) { q.dv.push(ten); q._up = Date.now(); }
    });
    db.donTreEm = 1;
  }
  if (!db.donHM) {
    let them = 0;
    (db.customers || []).forEach(c => {
      const kho = c.teethKH || {};
      Object.keys(kho).forEach(n => {
        const ten = kho[n] && kho[n].dichVu;
        if (!ten) return;
        if (Cust.hangMucCua(c, n)) return;
        /* Nút cũ tạo hạng mục KHÔNG kèm dấu tuRang — nhận lại chính nó thay vì đẻ bản sao */
        const cu = (db.treatments || []).find(t => t.customerId === c.id && !t.tuRang
          && String(t.tooth || '') === String(n) && Combo.norm(t.name || '') === Combo.norm(ten));
        if (cu) { cu.tuRang = String(n); return; }
        const dv = (db.services || []).find(x => Combo.norm(x.name || '') === Combo.norm(ten));
        const gia = dv ? (+dv.price || 0) : 0;
        db.treatments.push({id: uid(), customerId: c.id, tuRang: String(n), tooth: String(n),
          name: dv ? dv.name : ten, group: dv ? dv.group : 'Khác', serviceId: dv ? dv.id : '',
          donGia: gia, sl: 1, giamPct: 0, giamTien: 0, price: gia,
          status: 'Chưa điều trị', doctorId: '', assistantId: '', date: todayISO(), cd: []});
        them++;
      });
      (c.keHoachKhac || []).forEach(k => {
        if (!k.dichVu || Cust.hangMucKH(c, k.id)) return;
        const dv = (db.services || []).find(x => Combo.norm(x.name || '') === Combo.norm(k.dichVu));
        const gia = dv ? (+dv.price || 0) : 0;
        db.treatments.push({id: uid(), customerId: c.id, tuKH: k.id, tooth: '',
          name: dv ? dv.name : k.dichVu, group: dv ? dv.group : 'Khác', serviceId: dv ? dv.id : '',
          donGia: gia, sl: 1, giamPct: 0, giamTien: 0, price: gia,
          status: 'Chưa điều trị', doctorId: '', assistantId: '', date: todayISO(), cd: []});
        them++;
      });
    });
    db.donHM = 1;
    if (them) setTimeout(() => App.toast('Đã lập ' + them + ' hạng mục điều trị cho kế hoạch cũ'), 1800);
  }
  /* Sổ ghi nhận sự việc và phiếu đánh giá thưởng hiệu quả tháng (danhgia.js) */
  if (!db.ghiNhan) db.ghiNhan = [];
  if (!db.danhGia) db.danhGia = [];
  /* Bảng giá gia công lab: lần đầu nạp bảng mặc định, sau đó để quản lý tự sửa */
  if (!db.giaLab) db.giaLab = GiaLab.MAC_DINH.map(x => Object.assign({id: uid()}, x));
  QT.MAU.forEach(m => {
    if (!db.quyTrinh.some(q => q.id === m.id)) db.quyTrinh.push(JSON.parse(JSON.stringify(m)));
  });
  /* Danh sách 15 dịch vụ cơ bản trước đây được TỰ THÊM LẠI mỗi lần mở app nếu thiếu.
     Nay đã có bảng giá chính thức 140 món thay thế, nên bỏ hẳn việc tự thêm — không thì
     mỗi lần mở app nó lại dựng lại 15 món giá 0 trùng tên với bảng giá, làm ô gợi ý
     đầy dòng na ná nhau. Món nào đã lỡ thêm thì gom lại một lần ở dưới. */
  if (Array.isArray(db.services) && !db.donDV) {
    const chinh = (typeof BANG_GIA !== 'undefined') ? new Set(BANG_GIA.map(x => Combo.norm(x.n))) : null;
    if (chinh) {
      /* Bỏ những món giá 0 do bản cũ tự thêm, khi bảng giá chính thức đã có món tương ứng */
      db.services = db.services.filter(x => x.price || x.mienPhi || !DV_CO_BAN.some(([, t]) => Combo.norm(t) === Combo.norm(x.name || '')));
      db.donDV = 1;
    }
  }
  /* Gộp dịch vụ trùng tên (bỏ dấu), giữ bản có giá */
  if (Array.isArray(db.services)) {
    const giu = new Map();
    db.services.forEach(x => {
      const k = Combo.norm(x.name || ''); if (!k) return;
      const cu = giu.get(k);
      if (!cu || (!cu.price && x.price)) giu.set(k, x);
    });
    if (giu.size !== db.services.length) db.services = [...giu.values()];
  }
  /* Trước đây BA-18 lưu theo TỪNG ĐỢT, nên một khách nhiều đợt là nhiều bệnh án —
     sai với quy định (mỗi người bệnh chỉ có một bệnh án ngoại trú). Gộp về bệnh án
     chung của khách: lấy bản mới nhất, chỉ điền vào ô nào bệnh án chung còn trống.
     KHÔNG xóa bản cũ trong đợt, để còn đối chiếu. */
  if (!db.gopBA18) {
    (db.episodes || []).slice()
      .sort((a, b) => (a.tuNgay || '') < (b.tuNgay || '') ? -1 : 1)
      .forEach(ep => {
        const d = (ep.phieu || {}).ba18; if (!d) return;
        const c = (db.customers || []).find(x => x.id === ep.customerId); if (!c) return;
        if (!c.record) c.record = {};
        Object.keys(d).forEach(k => {
          if (k === '_at' || k === 'dienBien' || k === 'vanDe') return;
          if (d[k] !== '' && d[k] != null && (c.record[k] === '' || c.record[k] == null)) c.record[k] = d[k];
        });
        c._up = Date.now();
      });
    db.gopBA18 = 1;
  }
  /* Chẩn đoán cũ chỉ là hai dòng chữ. Dựng thành danh sách vấn đề để thêm bớt được. */
  (db.customers || []).forEach(c => {
    const r = c.record; if (!r || r.vanDe) return;
    r.vanDe = [];
    if (r.chanDoan) r.vanDe.push({id: uid(), icd: r.chanDoan, rang: '', ngay: c.createdAt || '', tinhTrang: 'Đang điều trị', note: ''});
  });
  /* Diễn biến điều trị cũ (kể cả bản nhập từ sổ Google Sheet) chưa có mã riêng,
     nên không sửa từng dòng được. Gắn mã cho chúng. */
  (db.customers || []).forEach(c => {
    ((c.record || {}).dienBien || []).forEach(v => { if (v && !v.id) v.id = uid(); });
  });
  (db.customers || []).forEach(c => {
    if (c.addr1 && !c.street) { c.street = String(c.addr1).trim(); }
    delete c.addr1;
    if (c.houseNo) {
      c.street = [String(c.houseNo).trim(), String(c.street || '').trim()].filter(Boolean).join(' ');
      delete c.houseNo;
    }
  });
}

/* Truy vấn */
const custById = id => db.customers.find(c => c.id === id);
/* Địa chỉ đầy đủ, viết theo lối quen thuộc: số nhà → đường → phường/xã → tỉnh */
/* Địa chỉ theo địa giới mới; nếu hồ sơ đến từ sổ cũ thì ghi kèm địa chỉ cũ trong ngoặc */
const fullAddr = c => {
  const now = [c.street, c.ward, c.province].filter(Boolean).join(', ');
  return c.oldAddr ? (now + ' (trước: ' + c.oldAddr + ')') : now;
};
/* Ô tìm khách hàng: gõ tên, số điện thoại hoặc mã KH đều ra */
const custLabel = c => c ? c.name + ' · ' + c.code : '';
const custOptions = () => db.customers.map(c => ({t: custLabel(c), s: c.phone || ''}));
function pickCustomerInto(v, inp){
  const code = String(v).split('·').pop().trim();
  const c = db.customers.find(x => x.code === code) || db.customers.find(x => custLabel(x) === v);
  const hid = inp.form && inp.form.querySelector('[name=customerId]');
  if (hid) hid.value = c ? c.id : '';
}
const staffById = id => db.staff.find(s => s.id === id);
const custDebt = c => {
  const billed = db.treatments.filter(t => t.customerId === c.id && t.status !== 'Báo giá').reduce((s,t) => s + t.price, 0);
  /* Bỏ qua phiếu thu nhập từ sổ cũ: khoản nợ mang sang đã là số còn lại sau những lần thu đó */
  const paid = db.receipts.filter(r => r.customerId === c.id && !r.old).reduce((s,r) => s + r.amount, 0);
  return Math.max(0, billed - paid);
};
const custLastVisit = c => { const ds = db.receipts.filter(r => r.customerId===c.id).map(r=>r.date).concat(db.appointments.filter(a=>a.customerId===c.id && a.date<=todayISO()).map(a=>a.date)); return ds.sort().pop() || ''; };
const icdName = code => { const f = ICD.find(i => i[0] === code); return f ? f[0]+' — '+f[1] : (code || ''); };
/* Đọc số tiền thành chữ — phiếu thu bắt buộc có dòng "bằng chữ" */
const DOC_SO = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function doc3(n, dayDu) {
  const tram = Math.floor(n/100), chuc = Math.floor(n/10)%10, dv = n%10;
  let s = '';
  if (tram || dayDu) { s += DOC_SO[tram] + ' trăm'; if (!chuc && dv) s += ' linh'; }
  if (chuc > 1) {
    s += ' ' + DOC_SO[chuc] + ' mươi';
    if (dv === 1) s += ' mốt'; else if (dv === 5) s += ' lăm'; else if (dv) s += ' ' + DOC_SO[dv];
  } else if (chuc === 1) {
    s += ' mười';
    if (dv === 5) s += ' lăm'; else if (dv) s += ' ' + DOC_SO[dv];
  } else if (dv) s += ' ' + DOC_SO[dv];
  return s.trim();
}
function docTien(v) {
  let n = Math.round(Math.abs(+v || 0));
  if (!n) return 'Không đồng';
  const bac = ['', ' nghìn', ' triệu', ' tỷ'];
  const nhom = [];
  while (n > 0) { nhom.push(n % 1000); n = Math.floor(n / 1000); }
  let s = '';
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (!nhom[i]) continue;                       /* nhóm rỗng thì bỏ qua */
    s += (s ? ' ' : '') + doc3(nhom[i], i < nhom.length - 1 && !!s) + (bac[i] || '');
  }
  return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
}

function invStatus(it) {
  const T = todayISO();
  if (it.expiry && it.expiry < T) return ['danger','Quá hạn'];
  if (it.stock <= it.min) return ['danger','Dưới định mức'];
  if (it.expiry && it.expiry <= isoAdd(T,60)) return ['warn','Sắp hết hạn'];
  if (it.stock <= it.min*1.5) return ['warn','Sắp hết'];
  return ['ok','Đủ hàng'];
}
function labStatus(l) {
  if (l.received) return ['ok','Đã nhận'];
  if (l.due && l.due < todayISO()) return ['danger','Trễ hẹn'];
  return ['info','Đã gởi'];
}

/* ================= Điều hướng & khung ================= */
const IC = {
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
  cust:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M17 8h5M19.5 5.5v5"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  treat:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><path d="m14 4 6 6"/><path d="M19.5 3.5a2.1 2.1 0 0 1 3 3L12 17l-4 1 1-4Z"/></svg>',
  inv:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5v8l9 5 9-5Z"/><path d="m3.3 8.7 8.7 4.8 8.7-4.8M12 22V13.5"/></svg>',
  hr:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 16.5c.5-2 2-3 3.5-3s3 1 3.5 3"/><path d="M15 9h4M15 13h4"/></svg>',
  lab:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M8 3h8M7 15h10"/></svg>',
  rep:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="M7 14v3M12 9v8M17 5v12"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
};
const NAV = [
  {id:'dashboard', label:'Tổng quan', icon:IC.dash},
  {id:'customers', label:'Khách hàng', icon:IC.cust},
  {id:'calendar', label:'Lịch hẹn', icon:IC.cal},
  {id:'treatment', label:'Điều trị', icon:IC.treat},
  {id:'benhan', label:'Bệnh án điện tử', icon:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>'},
  {id:'inventory', label:'Kho', icon:IC.inv},
  {id:'work', label:'Công việc', icon:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 7-7"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>'},
  {id:'hr', label:'Nhân sự', icon:IC.hr},
  {id:'lab', label:'Lab', icon:IC.lab},
  {id:'reports', label:'Báo cáo', icon:IC.rep},
  {id:'settings', label:'Cài đặt', icon:IC.cog},
];

const App = {
  cur:'dashboard',
  state:{calDate:todayISO(), custSel:'c1', custQ:'', treatCust:'c1', hrTab:'payroll', invQ:'', rp:{type:'month', y:(new Date()).getFullYear(), m:(new Date()).getMonth()+1, q:Math.floor((new Date()).getMonth()/3)+1}, toothSel:null},

  /* Cả phần mềm chỉ có MỘT khách đang xem. Trước đây tab Khách hàng giữ custSel còn
     tab Điều trị giữ treatCust riêng, nên chọn khách bên này rồi bấm sang bên kia là
     nó hiện người đầu danh sách. Mọi chỗ chọn khách đều đi qua đây. */
  chonKhach(id){
    if (!id) return;
    this.state.custSel = id;
    this.state.treatCust = id;
  },
  go(id){
    if (!Perm.tabs().includes(id)) { App.toast('Bạn không có quyền vào mục này'); return; }
    this.cur = id; this.closeSheet(); this.render(); window.scrollTo({top:0});
  },
  render(){
    /* Máy đã nối vào phòng khám thì BẮT BUỘC đăng nhập mới xem được dữ liệu.
       Trước đây còn xét thêm !db.customers.length, nên máy nào đã có sẵn dữ liệu thì
       đăng xuất xong vẫn vào thẳng app — đó là lỗ hổng, nay bỏ hẳn điều kiện đó.
       Máy chưa nối (dùng riêng, không có đám mây) thì vẫn cho dùng như cũ. */
    /* Trang đặt hẹn của khách: ai mở cũng vào được, không bắt đăng nhập */
    if (location.hash.slice(0,5) === '#book') {
      document.querySelector('.app').classList.add('solo');
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
      $('#mainArea').innerHTML = DatHen.trangKhach();
      return;
    }
    const quaQR = location.hash.slice(0,3) === '#cc';
    const chuaSanSang = !quaQR && (Cloud.configured()
      ? !Cloud.loggedIn()
      : (!App.state.skipWelcome && !db.customers.length));
    if (chuaSanSang) {
      document.querySelector('.app').classList.add('solo');
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
      $('#mainArea').innerHTML = Att.welcomeScreen();
      return;
    }
    document.querySelector('.app').classList.remove('solo');
    document.querySelector('.sidebar').style.display = '';
    document.querySelector('.bottom-nav').style.display = '';

    /* Mở từ mã QR của phòng khám → chỉ hiện màn hình chấm công */
    if (location.hash.slice(0,3) === '#cc') {
      document.querySelector('.app').classList.add('solo');
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
      $('#mainArea').innerHTML = Att.checkinScreen();
      return;
    }
    /* Chữ trên nút tròn góc trên = tên người đang đăng nhập */
    const meBtn = document.getElementById('meBtn');
    if (meBtn) {
      const me = Att.myStaff();
      const nm = (me && me.name) || Cloud.who() || '';
      meBtn.textContent = nm ? nm.split(/[\s@.]+/).filter(Boolean).slice(-1)[0].slice(0,2).toUpperCase() : '?';
      meBtn.title = nm ? nm + ' — ' + Perm.label() : 'Chưa đăng nhập';
    }
    const NAVOK = NAV.filter(n => Perm.tabs().includes(n.id));
    if (!Perm.tabs().includes(this.cur)) this.cur = NAVOK[0] ? NAVOK[0].id : 'dashboard';
    $('#sideNav').innerHTML = NAVOK.map(n => `<button class="nav-item ${n.id===this.cur?'active':''}" onclick="App.go('${n.id}')">${n.icon} ${n.label}</button>`).join('') +
      `<div class="nav-foot">${(() => { const st = Sync.status(); return `<span class="pill ${st.k}">${st.t}</span>`; })()}<br>
        <span style="font-size:11px">Nút ⟳ ở góc trên để đồng bộ ngay.</span>
        <div style="margin-top:6px">Vai trò: <b>${h(Perm.label())}</b>${Cloud.loggedIn()?' · '+h(Cloud.who()):''}</div></div>`;
    const first4 = NAVOK.slice(0,4), rest = NAVOK.slice(4);
    $('#bottomNav').innerHTML = first4.map(n => `<button class="bnav-item ${n.id===this.cur?'active':''}" onclick="App.go('${n.id}')">${n.icon}<span>${n.label}</span></button>`).join('') +
      `<button class="bnav-item ${rest.some(n=>n.id===this.cur)?'active':''}" onclick="App.openSheet()">${IC.more}<span>Thêm</span></button>`;
    $('#moreSheet').innerHTML = `<div class="sheet-grid">` + rest.map(n => `<button class="sheet-item ${n.id===this.cur?'active':''}" onclick="App.go('${n.id}')">${n.icon}<span>${n.label}</span></button>`).join('') + `</div>`;
    if (typeof CV !== 'undefined') { try { CV.veChuong(); } catch(e){} }
    $('#mainArea').innerHTML = SCREENS[this.cur]();
  },
  openSheet(){ $('#sheetBack').classList.add('show'); $('#moreSheet').classList.add('show'); },
  closeSheet(){ $('#sheetBack').classList.remove('show'); $('#moreSheet').classList.remove('show'); },

  modal(title, bodyHTML){ $('#modalTitle').textContent = title; $('#modalBody').innerHTML = bodyHTML; $('#modalBack').classList.add('show'); },
  closeModal(){ $('#modalBack').classList.remove('show'); },

  toastT:null,
  toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this.toastT); this.toastT = setTimeout(()=>t.classList.remove('show'), 2200); },

  dedupeForm(){
    const r = Sync.dedupeReport();
    if (!r.maTrung && !r.phieuThuThua) {
      App.modal('Dọn trùng lặp', `<div class="alert-line"><span class="alert-ico info">✓</span>
        <div>Không tìm thấy hồ sơ hay phiếu thu nào bị trùng. Dữ liệu đang sạch.</div></div>
        <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
      return;
    }
    App.modal('Dọn trùng lặp', `
      <div class="card mb"><div class="card-b">
        <div class="alert-line"><span class="alert-ico warn">!</span><div><b>${r.maTrung}</b> mã khách hàng bị lặp — thừa <b>${r.hoSoThua}</b> hồ sơ</div></div>
        ${r.phieuThuThua ? `<div class="alert-line"><span class="alert-ico warn">!</span><div>Thừa <b>${r.phieuThuThua}</b> phiếu thu trùng số</div></div>` : ''}
        ${r.maDungChung ? `<div class="note-block warn-block" style="margin-top:10px">
          <b>${r.maDungChung} mã khách đang dùng cho nhiều NGƯỜI KHÁC NHAU</b> — tổng cộng
          ${r.nguoiBiDungChungMa} người bị trùng mã với người khác. Hay gặp ở dữ liệu nhập từ file cũ.<br>
          Những hồ sơ này <b>không được gộp</b> vì chúng là bệnh nhân khác nhau. Bấm
          <b>Đánh lại mã</b> để phần mềm cấp mã mới cho người bị trùng, giữ nguyên hồ sơ.</div>` : ''}
      </div></div>
      <div class="note-block">Phần mềm sẽ giữ lại hồ sơ có <b>nhiều lịch sử điều trị nhất</b> của mỗi mã khách,
        và <b>chuyển toàn bộ</b> điều trị, phiếu thu, lịch hẹn, phiếu lab của hồ sơ thừa sang hồ sơ được giữ.
        Không mất dữ liệu điều trị nào.</div>
      <div class="note-block" style="background:var(--warn-soft);color:var(--warn)">
        Nên <b>sao lưu</b> (nút ⬇ góc trên) trước khi dọn, để lỡ có gì còn quay lại được.</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        ${r.maDungChung ? `<button class="btn" onclick="App.danhLaiMaRun()">Đánh lại mã (${r.nguoiBiDungChungMa})</button>` : ''}
        <button type="button" class="btn primary" onclick="App.dedupeRun()">Dọn ngay</button></div>`);
  },
  danhLaiMaRun(){
    const n = Sync.danhLaiMa();
    save(); App.render();
    App.modal('Đã đánh lại mã', `
      <div class="alert-line"><span class="alert-ico info">✓</span>
        <div>Đã cấp mã mới cho <b>${n}</b> người bị trùng mã với người khác. Hồ sơ giữ nguyên, không mất gì.</div></div>
      <div class="form-actions"><button class="btn primary" onclick="App.dedupeForm()">Xem lại</button></div>`);
  },
  async dedupeRun(){
    if (!confirm('Bắt đầu dọn trùng lặp? Nên sao lưu trước.')) return;
    const k = Sync.dedupe();
    save(); App.closeModal(); App.render();
    App.modal('Đã dọn xong', `
      <div class="alert-line"><span class="alert-ico info">✓</span><div>Gộp <b>${k.hoSoDaGop}</b> hồ sơ thừa</div></div>
      <div class="alert-line"><span class="alert-ico info">✓</span><div>Chuyển <b>${k.banGhiChuyenSang}</b> bản ghi sang hồ sơ được giữ</div></div>
      <div class="alert-line"><span class="alert-ico info">✓</span><div>Bỏ <b>${k.phieuThuDaBo}</b> phiếu thu trùng</div></div>
      <div class="note-block" style="margin-top:10px">Còn lại <b>${db.customers.length}</b> hồ sơ khách hàng.
        Bấm Đồng bộ để cập nhật lên đám mây cho các máy khác.</div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button>
        <button class="btn primary" onclick="App.closeModal();App.syncNow()">Đồng bộ ngay</button></div>`);
  },
  /* Menu tài khoản ở nút tròn góc trên — ai cũng vào được, kể cả không phải quản lý */
  accountMenu(){
    const st = Att.myStaff();
    const stt = Sync.status();
    const chuaDangNhap = !Cloud.configured() || !Cloud.loggedIn();
    App.modal('Tài khoản', `
      <div class="card mb"><div class="card-b">
        ${chuaDangNhap
          ? `<div class="sub-line">Chưa đăng nhập — máy này đang dùng riêng, dữ liệu không dùng chung với ai.</div>`
          : `<div style="display:flex;align-items:center;gap:12px">
               <span class="avatar" style="width:44px;height:44px;font-size:16px">${h(((st&&st.name)||Cloud.who()||'?').split(' ').slice(-1)[0].slice(0,2))}</span>
               <div><b style="font-size:15px">${h((st&&st.name)||Cloud.who())}</b>
                 <div class="sub-line">${h(Perm.label())}${st&&st.role?' · '+h(st.role):''}</div>
                 <div class="sub-line num">${h(Cloud.who())}</div></div>
             </div>`}
        <div style="margin-top:12px"><span class="pill ${stt.k}">${h(stt.t)}</span></div>
      </div></div>
      <div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap">
        <button class="btn" onclick="App.closeModal();App.go('settings')">Cài đặt</button>
        ${!chuaDangNhap ? `<button class="btn" onclick="App.closeModal();App.syncNow()">Đồng bộ ngay</button>
        <button class="btn" onclick="App.passwordForm()">Đổi mật khẩu</button>` : ''}
        ${Cloud.configured() && !Cloud.loggedIn() ? `<button class="btn primary" onclick="App.closeModal();Att.loginForm()">Đăng nhập</button>` : ''}
        <span class="spacer"></span>
        ${Cloud.loggedIn() ? `<button class="btn danger" onclick="App.doLogout()">Đăng xuất</button>` : ''}
      </div>
      ${Cloud.loggedIn() ? `<div class="combo-hint">Đăng xuất chỉ thoát khỏi máy này. Dữ liệu trên đám mây vẫn nguyên,
        đăng nhập lại là có đủ. Dữ liệu chưa kịp đồng bộ sẽ được đẩy lên trước khi thoát.</div>` : ''}`);
  },
  /* Ai cũng tự đổi được mật khẩu của chính mình */
  passwordForm(){
    App.modal('Đổi mật khẩu', `
    <form class="form-grid" onsubmit="App.passwordSave(event)">
      <div class="f full"><label>Mật khẩu mới</label>
        <input name="p1" type="password" required minlength="6" autocomplete="new-password"></div>
      <div class="f full"><label>Gõ lại mật khẩu mới</label>
        <input name="p2" type="password" required minlength="6" autocomplete="new-password"></div>
      <div class="note-block full">Tối thiểu 6 ký tự. Đổi xong vẫn dùng email cũ để đăng nhập.
        Các máy khác đang đăng nhập sẵn không bị thoát ra.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Đổi mật khẩu</button></div>
    </form>`);
  },
  async passwordSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (d.p1 !== d.p2) { App.toast('Hai ô mật khẩu chưa giống nhau'); return; }
    if (String(d.p1).length < 6) { App.toast('Mật khẩu phải từ 6 ký tự trở lên'); return; }
    App.toast('Đang đổi…');
    try { await Cloud.changePassword(d.p1); App.closeModal(); App.toast('Đã đổi mật khẩu ✓'); }
    catch(e){ App.toast('Không đổi được: ' + e.message); }
  },

  async doLogout(){
    if (!confirm('Đăng xuất khỏi máy này?\n\nDữ liệu sẽ được đẩy lên đám mây rồi xóa khỏi máy này, để người khác cầm máy không xem được. Lần sau đăng nhập sẽ tự tải về lại.')) return;
    App.closeModal();
    App.toast('Đang đẩy nốt dữ liệu lên…');
    let xong = false;
    try { xong = !!(await Sync.run(true)); } catch(e){ xong = false; }
    /* Đẩy không được (mất mạng) thì GIỮ dữ liệu trên máy, đừng xóa kẻo mất phần vừa nhập */
    if (!xong && !confirm('Chưa đẩy được dữ liệu lên đám mây — có thể do mất mạng.\n\nVẫn đăng xuất? Phần vừa nhập sẽ được giữ lại trên máy, lần sau đăng nhập vào sẽ đẩy lên tiếp.')) return;
    /* Đăng xuất có thể xóa sạch dữ liệu trên máy — đẩy nhật ký lên trước, nếu không
       là mất vết của cả phiên làm việc. */
    if (typeof Vet !== 'undefined') {
      Vet.ghi('dangxuat', 'Đăng xuất khỏi ' + Vet.may());
      try { await Vet.day(); } catch(e){}
    }
    Cloud.logout();
    if (xong) { try { localStorage.removeItem(DB_KEY); } catch(e){} }
    /* Nạp lại trang, bỏ luôn phần #… trên địa chỉ để ra thẳng ô đăng nhập */
    location.replace(location.pathname + location.search);
  },

  async syncNow(){
    if (!Cloud.configured()) { App.toast('Chưa kết nối đám mây — vào Nhân sự → Chấm công → Cài đặt'); Att.wizard(); return; }
    if (!Cloud.loggedIn()) { App.toast('Hãy đăng nhập trước'); Att.loginForm(); return; }
    const b = document.getElementById('syncBtn');
    if (b) b.style.opacity = '.4';
    await Sync.run(false);
    await Att.sync();
    if (b) b.style.opacity = '';
  },
  backup(){
    const blob = new Blob([JSON.stringify(db, null, 1)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nhakhoa-hoangbach-saoluu-' + todayISO() + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    this.toast('Đã tải file sao lưu ✓ — cất giữ cẩn thận');
  },
  restorePick(){ $('#restoreFile').click(); },
  /* kho: 'A5' cho phiếu thu, mặc định A4 cho bệnh án và đơn thuốc.
     Khổ giấy phải đặt bằng @page, mà @page không nhận class, nên phải bơm một thẻ
     style riêng và đổi nội dung nó trước mỗi lần in. */
  print(html, kho, nhan){
    /* In hồ sơ bệnh án là thao tác phải truy vết được: giấy ra khỏi phòng khám thì
       không thu hồi được nữa. Không có nhãn thì lấy tạm tiêu đề đầu tiên của phiếu. */
    if (typeof Vet !== 'undefined') {
      let t = nhan;
      if (!t) {
        const m = String(html).match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
        t = m ? m[1].replace(/<[^>]+>/g, '').trim().slice(0, 80) : 'Phiếu in';
      }
      try { Vet.ghi('in', t); } catch(e){}
    }
    const a5 = kho === 'A5';
    $('#printArea').innerHTML = html;
    $('#printArea').className = a5 ? 'kho-a5' : '';
    let st = document.getElementById('printPage');
    if (!st) { st = document.createElement('style'); st.id = 'printPage'; document.head.appendChild(st); }
    st.textContent = a5 ? '@page{size:A5 portrait;margin:10mm}' : '@page{size:A4 portrait;margin:14mm}';
    setTimeout(() => window.print(), 60);
  },
};

/* ================= PHÂN QUYỀN THEO VAI TRÒ =================
   Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.1.c: phần mềm phải có chức năng
   "cấu hình phân quyền xem, nhập mới, chỉnh sửa, hủy, khôi phục dữ liệu", và mục
   III.1.1.g: "phân quyền người dùng theo từng vai trò công việc".

   Danh sách tác vụ dưới đây trùng đúng bảng ở Điều 11 Quy chế hồ sơ bệnh án điện tử
   của phòng khám. Mặc định là bảng trong quy chế; quản lý sửa lại được trong
   Cài đặt, và mỗi lần sửa đều vào nhật ký lưu vết. */
const QUYEN = [
  ['xem',       'Xem hồ sơ bệnh án'],
  ['suahoso',   'Lập, sửa bệnh án và phiếu điều trị'],
  ['ky',        'Ký, xác nhận điện tử trên hồ sơ'],
  ['mokhoa',    'Mở khóa hồ sơ đã ký để sửa'],
  ['thu',       'Lập phiếu thu, thu tiền'],
  ['xoa',       'Xóa bản ghi'],
  ['khoiphuc',  'Khôi phục bản ghi đã xóa'],
  ['ketxuat',   'Kết xuất hồ sơ ra XML, JSON, PDF'],
  ['nhatkyall', 'Xem nhật ký lưu vết của toàn phòng khám'],
  ['saoluu',    'Sao lưu, phục hồi dữ liệu'],
  ['taikhoan',  'Tạo, khóa tài khoản; đặt phân quyền'],
  ['caidat',    'Sửa bảng giá, quy trình, cài đặt chung'],
  ['luong',     'Xem và tính lương, hoa hồng'],
  ['giaoviec',  'Giao việc cho người khác'],
  ['baocaoall', 'Xem việc và báo cáo cuối ngày của cả phòng khám'],
];
/* Không cho bỏ hai quyền này của quản lý — bỏ là tự khóa mình ra ngoài, không ai
   vào đặt lại được nữa. */
const QUYEN_GIU = ['taikhoan', 'caidat'];
const ROLE_MAC_DINH = {
  quanly: ['xem','suahoso','ky','mokhoa','thu','xoa','khoiphuc','ketxuat','nhatkyall','saoluu','taikhoan','caidat','luong','giaoviec','baocaoall'],
  bacsi:  ['xem','suahoso','ky','mokhoa','thu','ketxuat','giaoviec'],
  trothu: ['xem'],
  letan:  ['xem','thu'],
};
const ROLES = {
  quanly: {label:'Quản lý'}, bacsi: {label:'Bác sĩ'},
  trothu: {label:'Trợ thủ'}, letan: {label:'Lễ tân'},
};
const ROLE_TABS = {
  quanly: ['dashboard','customers','calendar','treatment','benhan','work','inventory','hr','lab','reports','settings'],
  bacsi:  ['dashboard','customers','calendar','treatment','benhan','work','inventory','hr','lab'],
  trothu: ['dashboard','customers','calendar','treatment','benhan','work','inventory','hr','lab'],
  letan:  ['dashboard','customers','calendar','treatment','benhan','work','inventory','hr','lab'],
};
/* Đoán vai trò từ chức danh cũ nếu chưa đặt rõ */
const guessRole = txt => {
  const t = Combo.norm(txt || '');
  if (/quan ly|giam doc|chu/.test(t)) return 'quanly';
  if (/bac si|bs/.test(t)) return 'bacsi';
  if (/phu ta|tro thu|dieu duong/.test(t)) return 'trothu';
  if (/le tan|tiep tan|thu ngan/.test(t)) return 'letan';
  return 'letan';
};
const Perm = {
  /* Chưa nối đám mây thì đây là máy riêng, dữ liệu chỉ nằm ở máy đó — mở toàn quyền.
     Máy ĐÃ nối phòng khám mà chưa đăng nhập thì KHÔNG có quyền gì: trước đây chỗ này
     cũng trả về toàn quyền, nên đăng xuất xong lại thành quản lý. */
  offline(){ return !Cloud.configured(); },
  me(){
    const email = (Cloud.who() || '').trim().toLowerCase();
    if (!email) return null;
    const s = db.staff.find(x => (x.email || '').trim().toLowerCase() === email);
    return (s && s.active === false) ? null : s;    /* đã nghỉ thì coi như không có quyền */
  },
  role(){
    if (this.offline()) return 'quanly';
    const s = this.me();
    return (s && this.roleOf(s)) || 'letan';
  },
  /* Vai trò của một nhân viên bất kỳ — dùng để lọc danh sách bác sĩ, trợ thủ */
  roleOf(s){ return s ? (s.perm || guessRole(s.role)) : ''; },
  label(){ return (ROLES[this.role()] || ROLES.letan).label; },
  /* Bảng phân quyền đang áp dụng: bản quản lý đã sửa, không có thì lấy mặc định */
  bang(){
    const tu = ((db.clinic || {}).quyen) || {};
    const ra = {};
    Object.keys(ROLE_MAC_DINH).forEach(v => { ra[v] = (tu[v] || ROLE_MAC_DINH[v]).slice(); });
    QUYEN_GIU.forEach(q => { if (!ra.quanly.includes(q)) ra.quanly.push(q); });
    return ra;
  },
  cuaVai(v){ return this.bang()[v] || ROLE_MAC_DINH.letan; },
  can(x){ return this.cuaVai(this.role()).includes(x); },
  /* Chặn một tác vụ và nói rõ vì sao, thay vì im lặng không làm gì */
  chan(x, viec){
    if (this.can(x)) return false;
    App.toast('Vai trò ' + this.label() + ' không được ' + (viec || 'làm việc này') + ' — hỏi quản lý');
    return true;
  },
  tabs(){ return ROLE_TABS[this.role()] || ROLE_TABS.letan; },
  /* Ẩn hẳn phần tử khỏi giao diện khi không đủ quyền */
  only(x, html){ return this.can(x) ? html : ''; },

  /* ---------- Màn hình đặt phân quyền ---------- */
  moTaBang(){
    const b = this.bang();
    return Object.keys(ROLES).map(v => ROLES[v].label + ' ' + b[v].length).join(' · ') +
      (((db.clinic||{}).quyen) ? ' · đã sửa khác mặc định' : ' · đang theo mặc định của quy chế');
  },
  hopQuyen(){
    if (this.chan('taikhoan', 'đặt phân quyền')) return;
    const b = this.bang();
    const vai = Object.keys(ROLES);
    App.modal('Phân quyền theo vai trò', `
      <div class="note-block">Bảng này đúng bằng bảng ở <b>Điều 11 Quy chế hồ sơ bệnh án điện tử</b> của phòng khám.
        Sửa ở đây thì phải sửa cả quy chế cho khớp — khi Sở kiểm tra, hai thứ phải nói giống nhau.</div>
      <form onsubmit="Perm.luuQuyen(event)">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tác vụ trên phần mềm</th>
        ${vai.map(v => `<th style="text-align:center">${h(ROLES[v].label)}</th>`).join('')}</tr></thead>
        <tbody>${QUYEN.map(([k, ten]) => `<tr><td>${h(ten)}</td>
          ${vai.map(v => {
            const giu = v === 'quanly' && QUYEN_GIU.includes(k);
            return `<td style="text-align:center"><input type="checkbox" name="${v}" value="${k}"${
              b[v].includes(k) ? ' checked' : ''}${giu ? ' disabled title="Quản lý luôn giữ quyền này"' : ''}></td>`;
          }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="combo-hint" style="margin-top:8px">Việc mở từng tab (Kho, Nhân sự, Báo cáo…) vẫn theo vai trò như cũ.
        Bảng này quyết định các tác vụ trên hồ sơ bệnh án.</div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="Perm.datLai()">Đặt lại theo quy chế</button>
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu</button></div></form>`);
  },
  luuQuyen(ev){
    ev.preventDefault();
    const f = ev.target, moi = {};
    Object.keys(ROLES).forEach(v => {
      moi[v] = [...f.querySelectorAll(`input[name="${v}"]:checked`)].map(x => x.value);
    });
    QUYEN_GIU.forEach(q => { if (!moi.quanly.includes(q)) moi.quanly.push(q); });
    db.clinic = db.clinic || {};
    db.clinic.quyen = moi;
    save();
    if (typeof Vet !== 'undefined')
      Vet.ghi('sua', 'Đổi bảng phân quyền — ' + Object.keys(ROLES).map(v =>
        ROLES[v].label + ': ' + moi[v].length + ' quyền').join(', '));
    App.closeModal(); App.render();
    App.toast('Đã lưu phân quyền ✓ — nhớ sửa Điều 11 quy chế cho khớp');
  },
  datLai(){
    if (!confirm('Đặt lại toàn bộ phân quyền về đúng bảng trong quy chế?')) return;
    if (db.clinic) delete db.clinic.quyen;
    save();
    if (typeof Vet !== 'undefined') Vet.ghi('sua', 'Đặt lại phân quyền về mặc định theo quy chế');
    App.render(); this.hopQuyen();
    App.toast('Đã đặt lại ✓');
  },
};

/* ================= Ô GÕ-ĐỂ-TÌM ================= */
/* Gõ từ khóa → gợi ý ngay. Không có trong danh sách thì cứ gõ tự do, vẫn lưu được. */
const Combo = {
  reg: {},
  /* opts: mảng chuỗi, hoặc {t:'nội dung', s:'ghi chú phải'} */
  html(id, name, value, opts, ph, onpick, hint){
    this.reg[id] = {opts, onpick};
    return `<div class="combo" id="${id}">
      <input class="combo-input" name="${h(name)}" value="${h(value||'')}" placeholder="${h(ph||'Gõ để tìm…')}"
        autocomplete="off" role="combobox" aria-expanded="false"
        oninput="Combo.open('${id}')" onfocus="Combo.open('${id}')" onblur="Combo.close('${id}')"
        onkeydown="Combo.key('${id}',event)">
      <div class="combo-list" hidden onmousedown="event.preventDefault()"></div>
    </div>${hint?`<div class="combo-hint">${h(hint)}</div>`:''}`;
  },
  setOpts(id, opts){ if (this.reg[id]) this.reg[id].opts = opts; },
  el(id){ const b = document.getElementById(id); return b && {box:b, inp:b.querySelector('.combo-input'), list:b.querySelector('.combo-list')}; },
  /* bỏ dấu để gõ "phuong rach gia" cũng ra "Phường Rạch Giá" */
  norm(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d'); },
  open(id){
    const e = this.el(id), r = this.reg[id]; if (!e || !r) return;
    const q = this.norm(e.inp.value.trim());
    const items = (r.opts||[]).map(o => typeof o === 'string' ? {t:o} : o)
      .filter(o => !q || this.norm(o.t).includes(q) || (o.s && this.norm(o.s).includes(q)))
      .slice(0, 60);
    e.list.innerHTML = items.length
      ? items.map(o => `<button type="button" class="combo-item" onclick="Combo.pick('${id}',this.dataset.v)" data-v="${h(o.t)}"><b>${h(o.t)}</b>${o.s?`<span>${h(o.s)}</span>`:''}</button>`).join('')
      : '<div class="combo-empty">Không có gợi ý — bạn cứ gõ tự do, hệ thống vẫn lưu.</div>';
    e.list.hidden = false; e.inp.setAttribute('aria-expanded','true');
  },
  close(id){ const e = this.el(id); if (e) { e.list.hidden = true; e.inp.setAttribute('aria-expanded','false'); } },
  pick(id, v){
    const e = this.el(id), r = this.reg[id]; if (!e) return;
    e.inp.value = v; this.close(id);
    if (r && r.onpick) r.onpick(v, e.inp);
  },
  key(id, ev){
    const e = this.el(id); if (!e || e.list.hidden) return;
    const items = [...e.list.querySelectorAll('.combo-item')];
    if (!items.length) return;
    let i = items.findIndex(x => x.classList.contains('on'));
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (i >= 0) items[i].classList.remove('on');
      i = ev.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[i].classList.add('on'); items[i].scrollIntoView({block:'nearest'});
    } else if (ev.key === 'Enter' && i >= 0) {
      ev.preventDefault(); this.pick(id, items[i].dataset.v);
    } else if (ev.key === 'Escape') { this.close(id); }
  },
};

/* ================= MÀN HÌNH ================= */
const SCREENS = {};

/* ---------- Tổng quan ---------- */
SCREENS.dashboard = () => {
  const T = todayISO();
  const revToday = db.receipts.filter(r => r.date === T).reduce((s,r)=>s+r.amount,0);
  const apptToday = db.appointments.filter(a => a.date === T && a.status !== 'Hủy');
  const unconfirmed = apptToday.filter(a => a.status === 'Chờ xác nhận').length;
  const newCust = db.customers.filter(c => monthOf(c.createdAt) === monthOf(T)).length;
  const debtTotal = db.customers.reduce((s,c)=>s+custDebt(c),0);
  const debtCount = db.customers.filter(c => custDebt(c) > 0).length;

  // 7 ngày doanh thu
  let bars = '', maxRev = 1;
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = isoAdd(T,-i); const v = db.receipts.filter(r=>r.date===d).reduce((s,r)=>s+r.amount,0); days.push([d,v]); if (v>maxRev) maxRev=v; }
  bars = days.map(([d,v],i) => `<div class="bar-wrap"><div class="bar ${i===6?'today':''}" style="height:${Math.max(3,Math.round(v/maxRev*100))}%" title="${fmtD(d)}: ${money(v)}"></div><span class="x-label">${i===6?'Hôm nay':WEEKD[new Date(d+'T00:00').getDay()]}</span></div>`).join('');

  // Doanh thu nhóm dịch vụ tháng này
  const mRec = db.receipts.filter(r => monthOf(r.date) === monthOf(T));
  const mTotal = mRec.reduce((s,r)=>s+r.amount,0) || 1;
  const byGroup = {};
  mRec.forEach(r => byGroup[r.group||'Khác'] = (byGroup[r.group||'Khác']||0) + r.amount);
  const groupBars = Object.entries(byGroup).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([g,v]) =>
    `<div class="hbar"><div class="hb-top"><b>${h(g)}</b><span class="num">${money(v)} · ${Math.round(v/mTotal*100)}%</span></div><div class="hb-track"><div class="hb-fill" style="width:${Math.round(v/mTotal*100)}%"></div></div></div>`).join('');

  // Cảnh báo
  const alerts = [];
  db.inventory.forEach(it => { const [k,label] = invStatus(it); if (k!=='ok') alerts.push({k, html:`<b>${h(it.name)}</b> — ${label}${it.expiry?` (HSD ${fmtD(it.expiry)})`:''}, tồn ${it.stock} ${h(it.unit)}.`}); });
  db.labs.forEach(l => { if (!l.received) { const a = db.appointments.find(x=>x.id===l.apptId); const [k,label] = labStatus(l);
    if (a && !l.received && a.date <= isoAdd(T,2)) alerts.push({k:'danger', html:`<b>Lab ${label.toLowerCase()}:</b> ${h(l.type)} ${h(l.teeth)} của ${h((custById(l.customerId)||{}).name||'(khách đã xóa)')} — khách hẹn ${fmtD(a.date)} mà hàng chưa về!`});
    else if (k==='danger') alerts.push({k:'danger', html:`<b>Lab trễ hẹn:</b> ${h(l.type)} ${h(l.teeth)} (${h(l.labName)}) — hẹn về ${fmtD(l.due)}.`}); }});
  db.customers.forEach(c => { const d = custDebt(c); if (d > 0) alerts.push({k:'warn', html:`<b>${h(c.name)}</b> còn công nợ ${money(d)}.`}); });

  const upcoming = apptToday.filter(a=>a.status!=='Hoàn tất').sort((a,b)=>a.time<b.time?-1:1).slice(0,5).map(a => {
    const c = custById(a.customerId);
    const st = a.status==='Đã xác nhận'?'ok':a.status==='Chờ xác nhận'?'warn':a.status==='Đang điều trị'?'info':'mutedp';
    return `<div class="row-item"><span class="time-chip num">${a.time}</span><span class="r-main"><b>${h(c?c.name:'?')}</b><span>${h(a.service)} · ${h(a.chair)}</span></span><span class="pill ${st}">${a.status}</span></div>`;
  }).join('') || '<div class="sub-line" style="padding:10px 4px">Chưa có lịch hẹn hôm nay.</div>';

  return `
  <div class="page-head"><h1>Tổng quan</h1><span class="spacer"></span>
    <button class="btn primary" onclick="Cal.form()">${IC.plus} Lịch hẹn mới</button>
    <div class="sub">${WEEKD[new Date().getDay()]}, ${fmtD(T)} · ${apptToday.length} lịch hẹn hôm nay</div></div>
  ${Att.myCardHTML()}
  ${typeof CV !== 'undefined' ? CV.theTongQuan() : ''}
  <div class="kpis">
    ${Perm.can('thu') ? `<div class="card kpi"><div class="k-label">Doanh thu hôm nay</div><div class="k-value num">${money(revToday)}</div><div class="k-note">${db.receipts.filter(r=>r.date===T).length} phiếu thu</div></div>` : ''}
    <div class="card kpi"><div class="k-label">Lịch hẹn hôm nay</div><div class="k-value num">${apptToday.length}</div><div class="k-note">${unconfirmed?`<span class="down">${unconfirmed} chưa xác nhận</span>`:'<span class="up">Đã xác nhận đủ</span>'}</div></div>
    <div class="card kpi"><div class="k-label">Khách mới tháng này</div><div class="k-value num">${newCust}</div><div class="k-note">tổng ${db.customers.length} hồ sơ</div></div>
    ${Perm.can('thu') ? `<div class="card kpi"><div class="k-label">Công nợ phải thu</div><div class="k-value num">${money(debtTotal)}</div><div class="k-note">${debtCount} khách còn nợ</div></div>` : ''}
  </div>
  <div class="grid-2">
    <div class="col">
      <div class="card"><div class="card-h"><h2>Doanh thu 7 ngày gần nhất</h2></div><div class="card-b"><div class="chart">${bars}</div></div></div>
      ${Perm.can('luong') ? `<div class="card"><div class="card-h"><h2>Doanh thu theo nhóm dịch vụ</h2><span class="hint">tháng ${monthOf(T).slice(5)}/${monthOf(T).slice(0,4)}</span></div><div class="card-b hbars">${groupBars || '<span class="sub-line">Chưa có phiếu thu tháng này.</span>'}</div></div>` : ''}
    </div>
    <div class="col">
      <div class="card"><div class="card-h"><h2>Lịch hẹn hôm nay</h2><button class="link-btn" onclick="App.go('calendar')">Xem tất cả →</button></div><div class="card-b row-list">${upcoming}</div></div>
      <div class="card"><div class="card-h"><h2>Cần chú ý</h2></div><div class="card-b">${alerts.slice(0,6).map(a=>`<div class="alert-line"><span class="alert-ico ${a.k}">${a.k==='danger'?'⚠':'❗'}</span><div>${a.html}</div></div>`).join('') || '<span class="sub-line">Không có cảnh báo nào. Tuyệt vời!</span>'}</div></div>
    </div>
  </div>`;
};

/* ---------- Ảnh điều trị (dán link) ---------- */
const PHOTO_KINDS = ['Trước điều trị','Trong quá trình','Sau điều trị','Phim X-quang','Khác'];
const Photo = {
  /* Link Google Drive dạng chia sẻ không hiện được ảnh — đổi sang link xem trực tiếp */
  normalize(u){
    u = String(u || '').trim();
    if (!u) return '';
    let m = u.match(/drive\.google\.com\/file\/d\/([-\w]{10,})/) || u.match(/drive\.google\.com\/open\?id=([-\w]{10,})/)
         || u.match(/drive\.google\.com\/uc\?(?:export=\w+&)?id=([-\w]{10,})/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
    m = u.match(/^https?:\/\/photos\.app\.goo\.gl\//);
    return u;
  },
  form(){
    const c = custById(App.state.custSel);
    App.modal('Thêm ảnh điều trị — ' + c.name, `
    <form class="form-grid" onsubmit="Photo.save(event)">
      <div class="f full"><label>Dán link ảnh (mỗi dòng một link)</label>
        <textarea name="urls" required placeholder="https://drive.google.com/file/d/.../view&#10;https://i.imgur.com/abc.jpg" style="min-height:96px"></textarea></div>
      <div class="f"><label>Loại ảnh</label><select name="kind">${PHOTO_KINDS.map(k=>`<option>${k}</option>`).join('')}</select></div>
      <div class="f"><label>Ngày chụp</label><input type="date" name="date" value="${todayISO()}"></div>
      <div class="f full"><label>Ghi chú (răng, giai đoạn…)</label><input name="note" placeholder="Vd: R36 sau khi bọc sứ"></div>
      <div class="note-block full">Ảnh không lưu trong máy — phần mềm chỉ lưu <b>đường link</b>. Nhớ để ảnh ở chế độ <b>ai có link đều xem được</b> thì mới hiện lên.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Thêm ảnh</button></div>
    </form>`);
  },
  save(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const c = custById(App.state.custSel);
    if (!c.photos) c.photos = [];
    const links = String(d.urls).split(/[\n\s]+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s));
    if (!links.length) { App.toast('Chưa có link hợp lệ (link phải bắt đầu bằng http)'); return; }
    links.forEach(u => c.photos.unshift({id:uid(), url:Photo.normalize(u), raw:u, kind:d.kind, date:d.date, note:d.note}));
    save(); App.closeModal(); App.render();
    App.toast('Đã thêm ' + links.length + ' ảnh ✓');
  },
  del(pid){
    const c = custById(App.state.custSel);
    const p = (c.photos||[]).find(x => x.id === pid);
    if (!p || !confirm('Gỡ ảnh này khỏi hồ sơ? (Ảnh gốc trên mạng không bị xóa)')) return;
    c.photos = c.photos.filter(x => x.id !== pid);
    save(); App.render(); App.toast('Đã gỡ ảnh');
  },
  fail(img){
    const p = img.parentElement;
    const url = img.dataset.raw;
    img.outerHTML = `<div class="photo-broken">Không hiện được ảnh<br>(link riêng tư hoặc chặn nhúng)<a href="${h(url)}" target="_blank" rel="noopener" class="link-btn">Mở link →</a></div>`;
  },
  cardHTML(c){
    const ps = c.photos || [];
    const body = ps.length ? `<div class="photos">${ps.map(p => `
      <div class="photo">
        <a href="${h(p.raw||p.url)}" target="_blank" rel="noopener" title="Mở ảnh gốc">
          <img class="photo-img" src="${h(p.url)}" data-raw="${h(p.raw||p.url)}" alt="${h(p.note||p.kind)}" loading="lazy" onerror="Photo.fail(this)"></a>
        <div class="photo-meta"><span class="pm-main"><b>${h(p.kind||'Ảnh')}</b><span>${fmtD(p.date)}${p.note?' · '+h(p.note):''}</span></span>
          <button class="pm-del" onclick="Photo.del('${p.id}')" title="Gỡ ảnh" aria-label="Gỡ ảnh">✕</button></div>
      </div>`).join('')}</div>`
      : '<div class="photo-empty">Chưa có ảnh. Bấm "Dán link ảnh" để thêm — chụp bằng điện thoại rồi tải lên Google Drive/Photos, copy link dán vào đây.</div>';
    return `<div class="card mb">
      <div class="card-h"><h2>Ảnh điều trị</h2><span class="hint">${ps.length} ảnh</span><span class="spacer"></span>
        <button class="btn small primary" onclick="Photo.form()">${IC.plus} Dán link ảnh</button></div>
      <div class="card-b">${body}</div></div>`;
  },
};

/* ---------- Khách hàng ---------- */
const Cust = {
  /* Ô chọn tỉnh + xã/phường theo địa giới mới, kèm mục "Khác — nhập tay" */
  addrSelects(c){
    const prov = c.province || 'An Giang';
    const wardOpts = WARDS[prov] || [];
    return `
      <div class="f"><label>8. Địa chỉ — Tỉnh, thành phố</label>
        ${Combo.html('cbProvince','province', prov, PROVINCES, 'Gõ tên tỉnh, vd: an giang',
          Cust.onProvincePick, 'Gõ không dấu cũng ra. Không có trong danh sách thì cứ gõ tự do.')}</div>
      <div class="f"><label>Phường, xã</label>
        ${Combo.html('cbWard','ward', c.ward||'', wardOpts, 'Gõ tên phường/xã, vd: rach gia', null,
          wardOpts.length ? wardOpts.length + ' phường/xã của ' + prov : 'Gõ tự do')}</div>`;
  },
  onProvincePick(v){
    Combo.setOpts('cbWard', WARDS[v] || []);
    const w = Combo.el('cbWard');
    if (w) { w.inp.value = ''; w.inp.placeholder = (WARDS[v] ? 'Gõ tên phường/xã của ' + v : 'Nhập phường/xã'); }
  },
  /* Mấy nguồn hay gặp nhất, để lễ tân tick thay vì gõ — gõ tay thì mười người ra
     mười kiểu ("fb", "FB", "face", "Facebook") rồi không thống kê được. */
  NGUON: ['Facebook', 'Zalo', 'TikTok', 'Người quen giới thiệu', 'Tự đến'],
  /* Tick một ô thì điền vào ô chữ bên dưới — ô chữ mới là thứ được lưu */
  chonNguon(v){
    const o = document.querySelector('#custForm [name="source"]');
    if (o) { o.value = v; }
    this.hienGT(v);
  },
  /* Gõ tay thành thứ khác thì bỏ tick, kẻo nhìn vào tưởng đang chọn cái đã tick */
  goNguon(v){
    document.querySelectorAll('#custForm [name="nguonTick"]').forEach(r => {
      r.checked = (r.value === (v || '').trim());
    });
    this.hienGT(v);
  },
  /* Ô tra người giới thiệu chỉ hiện khi nguồn đúng là "Người quen giới thiệu" */
  hienGT(v){
    const box = document.getElementById('gtBox');
    if (box) box.style.display = (v || '').trim() === 'Người quen giới thiệu' ? '' : 'none';
  },

  /* ---------- Người giới thiệu ----------
     Trùng tên là chuyện thường ở phòng khám, nên gợi ý phải kèm MÃ khách thì mới
     biết đúng người nào; số điện thoại để ở dòng phụ nên gõ số cũng tra ra. */
  dsGioiThieu(boId){
    return (db.customers || []).filter(x => x.id !== boId).map(x => ({
      t: (x.name || '') + (x.code ? ' (' + x.code + ')' : ''),
      s: [x.phone, x.province].filter(Boolean).join(' · '),
    }));
  },
  /* Lấy lại hồ sơ khách từ chuỗi "TÊN (MÃ)". Không khớp thì trả null — người giới
     thiệu không phải khách của phòng khám cũng là chuyện bình thường. */
  khachTuChuoi(v){
    const m = String(v || '').match(/\(([^()]+)\)\s*$/);
    if (!m) return null;
    const ma = Combo.norm(m[1].trim());
    return (db.customers || []).find(x => Combo.norm(x.code || '') === ma) || null;
  },
  /* Combo gọi hàm này trần (r.onpick(v, inp)) nên KHÔNG có this — phải gọi Cust. */
  chonGioiThieu(v){
    const f = document.getElementById('custForm'); if (!f) return;
    const c = Cust.khachTuChuoi(v);
    if (f.gtId) f.gtId.value = c ? c.id : '';
    if (c && f.gtPhone) f.gtPhone.value = c.phone || '';
  },
  form(id){
    const c = id ? custById(id) : {doiTuong:'Thu phí'};
    const f = (label, name, val, ph, type) => `<div class="f"><label>${label}</label><input name="${name}" value="${h(val||'')}" placeholder="${ph||''}" type="${type||'text'}"></div>`;
    App.modal(id ? 'Sửa hồ sơ khách hàng' : 'Thêm khách hàng (theo mẫu BA-18)', `
    <form id="custForm" class="form-grid" onsubmit="Cust.save(event,'${id||''}')">
      <div class="f"><label>Mã khách hàng</label>
        <input name="code" value="${h(c.code || Cust.maTiepTheo())}" placeholder="${h(Cust.tienTo())}-1"
          style="text-transform:uppercase" autocomplete="off">
        <div class="combo-hint">${id ? 'Đổi mã thì mọi hồ sơ của khách này vẫn giữ nguyên.'
          : 'Đã điền sẵn mã kế tiếp — sửa được nếu phòng khám đánh số theo cách riêng.'}</div></div>
      <div class="f"><label>Ngày lập hồ sơ</label>
        <input type="date" name="createdAt" value="${h(c.createdAt || todayISO())}"></div>
      <div class="f full"><label>1. Họ và tên (IN HOA)</label><input name="name" required value="${h(c.name||'')}" style="text-transform:uppercase"></div>
      ${f('2. Ngày sinh','dob',c.dob,'','date')}
      <div class="f"><label>3. Giới tính</label><select name="gender"><option${c.gender==='Nam'?' selected':''}>Nam</option><option${c.gender==='Nữ'?' selected':''}>Nữ</option></select></div>
      ${f('4. Điện thoại','phone',c.phone,'09xx xxx xxx')}
      ${f('5. Nghề nghiệp','job',c.job)}
      ${f('Nơi làm việc','noiLamViec',c.noiLamViec,'Mục 8 mẫu 16/BV-01')}
      ${f('6. Dân tộc','ethnic',c.ethnic||'Kinh')}
      ${f('7. Quốc tịch','nation',c.nation||'Việt Nam')}
      ${Cust.addrSelects(c)}
      <div class="f full"><label>Số nhà, đường / ấp, thôn, khóm</label>
        <input name="street" value="${h(c.street||'')}" placeholder="Vd: 25 Nguyễn Trung Trực, hoặc Ấp Hòa Thuận"></div>
      ${c.oldAddr ? `<div class="f full"><label>Địa chỉ cũ (theo sổ trước sáp nhập)</label>
        <input name="oldAddr" value="${h(c.oldAddr)}">
        <div class="combo-hint">Hiện trong ngoặc sau địa chỉ mới. Xác nhận đúng rồi thì xóa trống ô này.</div></div>` : ''}
      <div class="f"><label>9. Đối tượng</label><select name="doiTuong">${['Thu phí','BHYT','Miễn','Khác'].map(o=>`<option${c.doiTuong===o?' selected':''}>${o}</option>`).join('')}</select></div>
      ${f('10. Số thẻ BHYT','bhyt',c.bhyt)}
      ${f('BHYT giá trị đến ngày','bhytDen',c.bhytDen,'','date')}
      ${f('11. Số CCCD / Hộ chiếu / Định danh','cccd',c.cccd)}
      <div class="f full"><label>Nguồn khách — biết phòng khám từ đâu</label>
        <div class="check-list">${this.NGUON.map(n => `<label>
          <input type="radio" name="nguonTick" value="${h(n)}"${(c.source||'').trim() === n ? ' checked' : ''}
                 onchange="Cust.chonNguon(this.value)"> ${h(n)}</label>`).join('')}</div>
        <input name="source" value="${h(c.source||'')}" placeholder="Tick ở trên, hoặc gõ nguồn khác vào đây"
               oninput="Cust.goNguon(this.value)" style="margin-top:8px">
        <div class="combo-hint">Tick một ô là tự điền xuống dưới. Nguồn không có trong danh sách
          thì gõ thẳng vào ô chữ.</div></div>
      <div class="f full" id="gtBox"${(c.source||'').trim() === 'Người quen giới thiệu' ? '' : ' style="display:none"'}>
        <label>Người giới thiệu</label>
        ${Combo.html('cbGioiThieu', 'gtTen', c.gtTen || '', this.dsGioiThieu(id),
          'Gõ tên hoặc số điện thoại người giới thiệu…', Cust.chonGioiThieu,
          'Gõ không dấu cũng ra, gõ số điện thoại cũng ra. Người giới thiệu chưa phải khách của phòng khám thì cứ gõ tên tự do.')}
        <input type="hidden" name="gtId" value="${h(c.gtId||'')}">
        <input name="gtPhone" value="${h(c.gtPhone||'')}" placeholder="Điện thoại người giới thiệu" style="margin-top:8px">
      </div>
      ${f('12. Thân nhân báo tin (họ tên, quan hệ)','kinName',c.kinName)}
      ${f('Điện thoại thân nhân','kinPhone',c.kinPhone)}
      <div class="f full"><label>Địa chỉ thân nhân báo tin</label>
        <input name="kinAddr" value="${h(c.kinAddr||'')}" placeholder="Mẫu 16/BV-01 mục 11 đòi cả địa chỉ, không chỉ tên và số điện thoại"></div>
      <div class="f full"><label>Dị ứng / lưu ý y khoa</label><input name="allergy" value="${h(c.allergy||'')}" placeholder="Vd: dị ứng Penicillin, tăng huyết áp..."></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">${id?'Lưu thay đổi':'Thêm khách hàng'}</button></div>
    </form>`);
  },
  /* ----- Dò khách: kết quả hiện ngay trong lúc gõ -----
     Tuyệt đối không gọi App.render() theo từng phím. Hàm đó vẽ lại cả #mainArea, tức
     là dựng lại chính ô đang gõ — con trỏ nhảy về đầu, chữ viết dở mất. Nên chỉ thay
     ruột bảng kết quả, còn ô nhập giữ nguyên không ai đụng tới.
     Hoãn 120ms kể từ phím cuối: gõ tên 10 chữ thì lọc 1 lần chứ không phải 10 lần, với
     hơn 500 hồ sơ thì khác biệt thấy rõ. */
  goTim(){
    clearTimeout(this._choTim);
    this._choTim = setTimeout(() => Cust.locNgay(), 120);
  },
  /* Đọc ô nhập + các ô tick, lọc, rồi vá tại chỗ ba chỗ trên màn hình */
  locNgay(){
    const i = document.getElementById('oTimKH');
    App.state.custQ = i ? i.value.trim() : '';
    const o = {};
    ['ma', 'ten', 'sdt'].forEach(k => { const x = document.getElementById('tim_' + k); o[k] = x ? x.checked : 1; });
    App.state.custO = o;
    const ds = Cust.locDS();
    const tb = document.getElementById('custRows');
    if (!tb) { App.render(); return; }   /* không ở màn Khách hàng nữa */
    tb.innerHTML = Cust.hangHTML(ds);
    const bc = document.getElementById('custTimBC');
    if (bc) bc.innerHTML = Cust.bcTimHTML(ds.length);
    if (bc) bc.style.display = App.state.custQ ? '' : 'none';
    const xoa = document.getElementById('custBoTim');
    if (xoa) xoa.style.display = App.state.custQ ? '' : 'none';
  },
  timNgay(){ clearTimeout(this._choTim); this.locNgay(); },
  boTim(){
    const i = document.getElementById('oTimKH');
    if (i) { i.value = ''; i.focus(); }
    this.timNgay();
  },

  /* Lọc + sắp xếp. Dùng chung cho lần vẽ cả màn hình và lần vá tại chỗ lúc đang gõ,
     để hai đường không bao giờ cho ra danh sách khác nhau. */
  locDS(){
    const q = Combo.norm(App.state.custQ || '');
    const o = App.state.custO || {ma: 1, ten: 1, sdt: 1};
    /* Dò theo đúng loại đã tick. Gõ "36" mà để cả ba loại thì ra cả khách tên có số 36
       lẫn số điện thoại chứa 36 — bỏ tick cho gọn. */
    const soHoa = x => String(x || '').replace(/\D/g, '');
    /* Chỉ dò số điện thoại khi trong ô KHÔNG có chữ cái. Gõ "KH-0123" thì phần số là
       "0123", nằm lọt trong số 0910001233 của một khách khác — ra ba hồ sơ lạ ngay
       dòng đầu. Có chữ cái tức là người ta đang gõ mã hoặc tên, không phải số. */
    const laSo = !/[a-z]/.test(q);
    const khop = c => (o.ma && Combo.norm(c.code || '').includes(q))
      || (o.ten && Combo.norm(c.name || '').includes(q))
      || (o.sdt && laSo && soHoa(q) && soHoa(c.phone).includes(soHoa(q)));
    const ds = !q ? db.customers.slice() : db.customers.filter(khop);
    const sx = App.state.custSort || {k: 'code', d: 1};
    const codeNum = c => { const m = String(c.code || '').match(/(\d+)/); return m ? +m[1] : Infinity; };
    const khoa = {
      code: c => [codeNum(c), String(c.code || '')],
      name: c => [Combo.norm(c.name || '')],
      kham: c => [custLastVisit(c) || ''],
      sdt:  c => [String(c.phone || '').replace(/\D/g, '') || '\uffff'],
      diachi: c => [Combo.norm(fullAddr(c) || '\uffff')],
      no:   c => [custDebt(c)],
    };
    const lay = khoa[sx.k] || khoa.code;
    return ds.sort((a, b) => {
      const x = lay(a), y = lay(b);
      for (let i = 0; i < x.length; i++) {
        if (x[i] < y[i]) return -sx.d;
        if (x[i] > y[i]) return sx.d;
      }
      return 0;
    });
  },
  hangHTML(list){
    return list.map(c => {
      const debt = custDebt(c);
      const lastV = custLastVisit(c);
      const dc = fullAddr(c);
      return `<tr class="clickable ${c.id === App.state.custSel ? 'sel-row' : ''}" onclick="Cust.pick('${c.id}')">
        <td class="num"><b>${h(c.code || '—')}</b></td>
        <td><span class="cell-who"><span class="avatar">${h((c.name || '?').split(' ').slice(-1)[0].slice(0, 2))}</span>
          <span><b>${h(c.name)}</b><span>${h(c.gender || '')}${c.dob ? (c.gender ? ', ' : '') + c.dob.slice(0, 4) : ''}${
            lastV ? ' · khám ' + fmtD(lastV) : ''}</span></span></span></td>
        <td class="num">${h(c.phone || '—')}</td>
        <td>${dc ? h(dc) : '<span class="sub-line">—</span>'}</td>
        ${Perm.can('thu') ? `<td class="r num" ${debt ? 'style="color:var(--danger);font-weight:600"' : ''}>${money(debt)}</td>` : ''}</tr>`;
    }).join('') || `<tr><td colspan="5" class="sub-line">${App.state.custQ
      ? 'Không có hồ sơ nào khớp. Thử bỏ bớt dấu tick, hoặc gõ ít chữ hơn.'
      : 'Chưa có khách hàng nào.'}</td></tr>`;
  },
  bcTimHTML(soRa){
    const o = App.state.custO || {ma: 1, ten: 1, sdt: 1};
    if (!App.state.custQ) return '';
    const ten = ['ma', 'ten', 'sdt'].filter(k => o[k]).map(k => ({ma: 'mã KH', ten: 'tên', sdt: 'số điện thoại'})[k]);
    if (!ten.length) return '<b style="color:var(--danger)">Chưa tick mục nào để dò</b> — tick Mã KH, Tên hoặc Số điện thoại.';
    return `Đang dò <b>${h(App.state.custQ)}</b> theo ${h(ten.join(', '))} — ra <b>${soRa}</b> hồ sơ.`;
  },

  /* Bấm tiêu đề cột: lần đầu sắp tăng dần, bấm lại thì đảo chiều */
  sapXep(k){
    const sx = App.state.custSort || {k:'code', d:1};
    App.state.custSort = (sx.k === k) ? {k, d: -sx.d} : {k, d: 1};
    App.render();
  },

  /* Mã kế tiếp theo bộ đếm, nhưng nhảy qua mã nào đã có người dùng */
  /* Tiền tố mã khách. Mỗi cơ sở một tiền tố riêng để nhìn mã là biết hồ sơ của đâu —
     Rạch Giá (Thời Đại) là RG. Đổi được trong Cài đặt → Thông tin phòng khám. */
  tienTo(){ return (((db.clinic || {}).maKH || 'RG') + '').trim().toUpperCase() || 'RG'; },
  maTiepTheo(){
    const co = new Set(db.customers.map(x => Combo.norm(x.code || '')));
    /* Đi tiếp theo số LỚN NHẤT đang có, và giữ đúng bề rộng chữ số của hồ sơ cũ.
       Dữ liệu nhập từ file đánh số KH-0001…KH-0550; nếu ở đây bắt đầu lại từ 1 thì
       khách mới ra "RG-1" nằm lạc lõng giữa danh sách và sắp xếp cũng loạn. */
    let rong = 0, max = 0;
    (db.customers || []).forEach(x => {
      const m = String(x.code || '').match(/(\d+)\s*$/);
      if (!m) return;
      max = Math.max(max, parseInt(m[1], 10) || 0);
      rong = Math.max(rong, m[1].length);
    });
    const dem = n => (rong > 1 ? String(n).padStart(rong, '0') : String(n));
    let n = Math.max(max + 1, (db.seq && db.seq.cust) || 1), ma;
    do { ma = this.tienTo() + '-' + dem(n); n++; } while (co.has(Combo.norm(ma)) && n < 1e6);
    return ma;
  },

  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.name = (d.name||'').toUpperCase().trim();
    d.code = (d.code || '').toUpperCase().trim();
    /* Mã khách phải là duy nhất — trùng mã thì tra cứu, phiếu thu, bệnh án lẫn hết */
    if (d.code) {
      const trung = db.customers.find(x => x.id !== id && Combo.norm(x.code||'') === Combo.norm(d.code));
      if (trung) { App.toast('Mã ' + d.code + ' đã dùng cho khách ' + trung.name + ' — chọn mã khác'); return; }
    }
    /* Chốt lại người giới thiệu lúc lưu, thay vì bám theo từng lần gõ: gõ đè lên
       chuỗi "TÊN (MÃ)" rồi mà gtId còn giữ người cũ thì sau này đếm ra sai người. */
    if (d.source !== undefined) {
      if ((d.source || '').trim() !== 'Người quen giới thiệu') {
        d.gtTen = ''; d.gtPhone = ''; d.gtId = '';
      } else {
        const ng = Cust.khachTuChuoi(d.gtTen);
        d.gtId = ng ? ng.id : '';
        d.gtTen = (d.gtTen || '').trim();
        d.gtPhone = (d.gtPhone || '').trim() || (ng ? (ng.phone || '') : '');
      }
    }
    d.province = (d.province || '').trim();
    d.ward = (d.ward || '').trim();
    d.street = (d.street || '').trim();
    if (d.oldAddr !== undefined) d.oldAddr = (d.oldAddr || '').trim();
    if (id) { Object.assign(custById(id), d); App.toast('Đã cập nhật hồ sơ ✓'); }
    else {
      /* Bộ đếm vẫn chạy để lần sau gợi ý đúng, kể cả khi lễ tân tự đặt mã */
      db.seq.cust++;
      const c = Object.assign({id:uid(), code: d.code || (Cust.tienTo()+'-'+db.seq.cust), createdAt: d.createdAt || todayISO(),
        teeth:{}, record:{dienBien:[], vanDe:[]}}, d);
      db.customers.unshift(c); App.chonKhach(c.id); App.toast('Đã thêm khách hàng ✓');
      /* Khung hồ sơ nằm DƯỚI bảng danh sách. Phòng khám có hơn 500 hồ sơ nên sau khi
         lưu, màn hình đứng ở đầu bảng và khách vừa nhập nằm tít bên dưới — nhìn như
         app nhảy ra ngoài, không hiện gì. Cuộn tới đúng khung đó.
         Ô tìm còn chữ cũ cũng có thể đang lọc mất khách vừa thêm, nên xóa luôn. */
      App.state.custQ = '';
      setTimeout(() => {
        const el = document.getElementById('custDetail');
        /* Nhảy thẳng, không cuộn mượt: khung hồ sơ có thể cách tới mấy chục nghìn
           pixel khi danh sách dài, cuộn mượt quãng đó vừa lâu vừa chóng mặt. */
        if (el) el.scrollIntoView({block: 'start'});
        const row = document.querySelector('#custRows .sel-row');
        if (row) row.classList.add('vua-chon');
      }, 60);
    }
    save(); App.closeModal(); App.render();
  },
  pick(id){
    App.chonKhach(id); App.render();
    /* Nhảy thẳng, KHÔNG cuộn mượt: danh sách vài trăm khách thì quãng cuộn cả chục
       nghìn pixel, cuộn mượt vừa lâu vừa chạy lố qua chỗ cần. */
    const el = $('#custDetail');
    if (el) el.scrollIntoView({block:'start'});
  },

  /* Từ tab khác nhảy thẳng vào hồ sơ một khách.
     App.go kéo trang về đầu, mà hồ sơ nằm DƯỚI cả danh sách mấy trăm dòng, nên phải
     tự đưa nó vào tầm nhìn — không thì trông như bấm xong chẳng có gì đổi. */
  moHoSo(id){
    const c = custById(id);
    if (!c) { App.toast('Không tìm thấy hồ sơ khách này'); return; }
    App.chonKhach(id);
    /* Ô tìm kiếm còn chữ cũ có thể đang lọc mất người này khỏi danh sách */
    const q = Combo.norm(App.state.custQ || '');
    const khop = !q || Combo.norm(c.name).includes(q) || Combo.norm(c.code || '').includes(q)
      || (/\d/.test(q) && (c.phone||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')));
    if (!khop) App.state.custQ = '';
    App.go('customers');
    setTimeout(() => {
      const el = $('#custDetail');
      if (el) el.scrollIntoView({block:'start'});
      const row = document.querySelector('#custRows .sel-row');
      if (row) row.classList.add('vua-chon');
    }, 0);
  },

  toothClick(n, lop, ev){
    lop = lop || 'teeth';
    /* Giữ Ctrl (hoặc ⌘) bấm từng răng, giữ Shift bấm răng cuối để lấy cả dải —
       khỏi phải vào nút "Chọn nhiều răng" trước rồi mới bấm được. */
    if (ev && (ev.ctrlKey || ev.metaKey || ev.shiftKey)) {
      ev.preventDefault();
      if (!App.state.rangChon) App.state.rangChon = [];
      App.state.rangMo = null;
      if (ev.shiftKey && App.state.rangCuoi != null) this.chonDai(App.state.rangCuoi, n);
      else this.chonRang(n);
      return;
    }
    if (App.state.rangChon) { this.chonRang(n); return; }
    /* Sơ đồ chỉ để CHỌN răng. Bấm lần nữa vào răng đang mở thì đóng khung lại. */
    App.state.rangMo = (App.state.rangMo === n) ? null : n;
    App.render();
    setTimeout(() => { const o = document.getElementById('oRangGhi');
      if (o) o.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 0);
  },
  dongRang(){ App.state.rangMo = null; App.render(); },
  /* Hạng mục do khung ghi răng lập ra — đánh dấu tuRang để lần sau sửa đúng dòng đó
     chứ không đẻ thêm dòng mới mỗi lần bấm Lưu. */
  hangMucCua(c, n){
    return (db.treatments || []).find(t => t.customerId === c.id && String(t.tuRang) === String(n)) || null;
  },
  hangMucKH(c, id){
    return (db.treatments || []).find(t => t.customerId === c.id && t.tuKH && String(t.tuKH) === String(id)) || null;
  },
  tinhTien(hm){
    if (!hm) return 0;
    return Treat.thanhTien(hm.donGia != null ? hm.donGia : hm.price, hm.sl, hm.giamPct, hm.giamTien);
  },
  /* Chọn dịch vụ thì điền sẵn đơn giá, giống hệt hộp thoại hạng mục */
  chonDVRang(v){
    const f = document.querySelector('#oRangGhi form') || document.querySelector('#modalBody form');
    if (!f) return;
    const dv = (db.services || []).find(x => x.name === v);
    const o = f.querySelector('[name="donGia"]');
    if (dv && o && !num(o.value)) o.value = Tien.dinh(String(dv.price || 0));
    this.tinhTienRang();
  },
  tinhTienRang(){
    const f = document.querySelector('#oRangGhi form') || document.querySelector('#modalBody form');
    if (!f) return;
    const g = k => (f.querySelector('[name="' + k + '"]') || {}).value;
    const o = document.getElementById('tienRang');
    if (o) o.textContent = money(Treat.thanhTien(num(g('donGia')), +g('sl') || 1, +g('giamPct') || 0, num(g('giamTien'))));
  },
  /* Khung ghi cho một răng — trước đây là nội dung của hộp thoại, nay vẽ thẳng
     xuống dưới sơ đồ nên trả về HTML thay vì tự bật hộp thoại. */
  rangFormHTML(c, n, lop){
    lop = lop || 'teeth';
    if (!c) return '';
    const kh = lop === 'teethKH', st = lop === 'teethST';
    const hienTai = (c.teeth||{})[n];
    /* Trên sơ đồ kế hoạch, răng chưa có kế hoạch thì lấy sẵn tình trạng bên sơ đồ
       trước điều trị — ô ghi "Tình trạng hiện tại" thì phải đúng là hiện tại. */
    /* Sơ đồ sau điều trị cũng lấy sẵn tình trạng trước điều trị làm nền —
       răng nào chưa động tới thì vẫn y như cũ. */
    const t = (c[lop]||{})[n]
      || ((kh || st) && hienTai ? Object.assign({}, hienTai, kh ? {dichVu: ''} : {})
                                : {s:'ok', mat:[], note:''});
    const mat = t.mat || [];
    return `
    ${st ? `<div class="ba-muc"><b>Lịch sử điều trị răng ${n}</b>
        <span class="sub-line">gom từ hạng mục điều trị và diễn biến có nhắc R${n}</span></div>
      ${Cust.lichSuRangHTML(c, n)}
      <div class="note-block mb" style="margin-top:10px">Bên dưới là <b>tình trạng răng sau khi điều trị xong</b>.
        Phần mềm đã dựng sẵn theo dịch vụ đã hoàn tất${hienTai ? ` (trước điều trị: <b>${h(Tooth.moTa(n, hienTai))}</b>)` : ''};
        sửa ở đây thì lần dựng lại sau sẽ <b>không đè lên</b> răng này nữa.</div>` : ''}
    ${kh ? `<div class="note-block mb">Đang lập <b>kế hoạch điều trị</b> cho răng ${n}:
        ghi <b>tình trạng hiện tại</b> của răng, rồi chọn <b>dịch vụ sẽ làm</b> cho răng đó.
        ${hienTai ? `<br>Sơ đồ trước điều trị đang ghi: <b>${h(Tooth.moTa(n, hienTai))}</b>` : ''}</div>` : ''}
    <form class="form-grid" onsubmit="Cust.toothSave(event,${n},'${lop}')">
      <div class="f full"><label>${st ? 'Tình trạng sau điều trị' : 'Tình trạng hiện tại'}</label>
        ${oTinhTrang(t.s, ' onchange="Cust.toothMatHien(this.value)"', t.sKhac)}</div>
      ${oMucSau(t.s)}
      ${oMucLungLay(t.s)}
      ${oLoaiSu(t.s, t)}

      <div class="f full" id="oMat" style="display:${!kh && TT_CO_MAT.includes(t.s)?'':'none'}">
        <label>Mặt răng (chọn được nhiều mặt)</label>
        <div class="check-row">${TOOTH_SURF.map(([k,l])=>
          `<label><input type="checkbox" name="mat" value="${k}"${mat.includes(k)?' checked':''}> ${h(l)}</label>`).join('')}</div>
      </div>
      <div class="f full" id="oNoiNha" style="display:${!kh && TT_CO_NOI_NHA.includes(t.s)?'':'none'}"><div class="check-row">
        <label><input type="checkbox" name="nn"${t.nn?' checked':''}> Răng đã nội nha (điều trị tủy)</label></div></div>
      <div class="f full" id="oChanRang" style="display:${t.s === 'thaolap' ? '' : 'none'}">
        <label>Nền hàm</label><div class="check-row">
        <label><input type="checkbox" name="chanRang"${t.chanRang?' checked':''}> Còn chân răng dưới hàm tháo lắp</label></div>
        <div class="combo-hint">Bỏ trống nghĩa là vùng này đã nhổ sạch, hàm tì thẳng lên sống hàm.</div></div>
      ${Cust.oHamKhung(c, lop, [n], t.s)}
      <div class="f full" id="oChop" style="display:${!kh && TT_CO_CHOP.includes(t.s)?'':'none'}"><label>Dấu hiệu quanh chóp</label><div class="check-row">
        <label><input type="checkbox" name="loDo"${t.loDo?' checked':''}> Lỗ dò</label>
        <label><input type="checkbox" name="sung"${t.sung?' checked':''}> Sưng đáy hành lang</label></div></div>
      <div class="f full" style="display:${kh?'none':''}"><label>Ghi chú</label><input name="note" value="${h(t.note||'')}" placeholder="Vd: sâu ngà sâu, còn ê buốt…"></div>
      ${(kh || lop === 'teeth') ? `<div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbRangDX','chanDoan', icdName((lop === 'teeth' ? ((c.teethKH||{})[n]||{}).chanDoan : t.chanDoan) || '')||'',
          Cust.icdHopVoi(t.s, hienTai),
          'Gõ tên bệnh hoặc mã ICD', null, 'Mã hợp với tình trạng răng được xếp lên đầu; gõ để tra cả bảng ICD.')}</div>
      <div class="f full"><label>Dịch vụ điều trị</label>
        ${Combo.html('cbRangDV','dichVu', (lop === 'teeth' ? ((c.teethKH||{})[n]||{}).dichVu : t.dichVu) || '',
          Svc.goiY(1), 'Gõ tên dịch vụ, vd: boc su, noi nha',
          v => Cust.chonDVRang(v), 'Chọn dịch vụ là tự điền giá, và hạng mục điều trị được lập luôn khi bấm Lưu.')}</div>
      ${(() => {
        /* Phần giá chép từ hộp thoại "Thêm hạng mục điều trị": ghi xong một răng là
           hạng mục có luôn, khỏi phải mở thêm một hộp thoại nữa cho cùng một việc. */
        const hm = Cust.hangMucCua(c, n);
        return `<div class="f"><label>Đơn giá / răng (₫)</label>
          ${Tien.o('donGia', hm ? (hm.donGia != null ? hm.donGia : hm.price) : '', 'oninput="Cust.tinhTienRang()"')}</div>
        <div class="f"><label>Số lượng</label>
          <input type="number" name="sl" min="1" step="1" value="${hm ? (hm.sl || 1) : 1}" oninput="Cust.tinhTienRang()"></div>
        <div class="f"><label>Giảm giá (%)</label>
          <input type="number" name="giamPct" min="0" max="100" step="0.5" value="${hm && hm.giamPct ? hm.giamPct : ''}"
            placeholder="0" oninput="Cust.tinhTienRang()"></div>
        <div class="f"><label>Giảm thêm (₫)</label>
          ${Tien.o('giamTien', hm ? hm.giamTien : '', 'oninput="Cust.tinhTienRang()"')}</div>
        <div class="f"><label>Trạng thái</label><select name="tinhTrangDT">
          ${TREAT_STATUS.map(x => `<option${(hm ? hm.status : 'Chưa điều trị') === x ? ' selected' : ''}>${x}</option>`).join('')}
        </select></div>
        <div class="f"><label>&nbsp;</label>
          <div class="note-block" style="margin:0;padding:9px 12px">Thành tiền:
            <b id="tienRang">${money(Cust.tinhTien(hm))}</b></div></div>
        ${hm ? '' : '<div class="note-block full">Chọn dịch vụ rồi bấm <b>Lưu</b> là hạng mục điều trị được lập luôn — không phải mở thêm hộp thoại nào nữa.</div>'}`;
      })()}` : ''}
      ${kh ? '' : `<div class="note-block full">Nội nha để riêng vì răng <b>đã nội nha rồi bọc sứ</b> là chuyện thường —
        chọn "Răng sứ" mà vẫn tick được nội nha, sơ đồ hiện cả hai.</div>`}
      <div class="form-actions full">
        ${(c[lop]||{})[n]?`<button type="button" class="btn danger" onclick="Cust.toothXoa(${n},'${lop}')">Xóa đánh dấu</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="Cust.dongRang()">Đóng</button>

        <button class="btn primary">Lưu</button></div>
    </form>`;
  },

  /* Thẻ sơ đồ răng — nay nằm ở tab Điều trị, trang "Khám · Chẩn đoán · Kế hoạch".
     Tách ra khỏi màn Khách hàng để tab đó chỉ còn việc hành chính. */
  soDoCardHTML(c){
      const lop = App.state.lopRang || 'teeth';
      const coKH = !!(Object.keys(c.teethKH||{}).length || c.hamKhungKH);
      const coST = !!(Object.keys(c.teethST||{}).length || c.hamKhungST);
      const keHoach = lop === 'teethKH', sauDT = lop === 'teethST';
      const xongCount = (db.treatments||[]).filter(t => t.customerId === c.id
        && t.status === 'Hoàn tất' && Tooth.rangCua(t).length).length;
      /* Ba bước của một ca điều trị, đi theo đúng thứ tự công việc thật ở ghế:
         khám ghi hiện trạng -> bàn với khách rồi vạch kế hoạch -> làm xong thì
         chốt lại tình trạng mới. Trước đây ba cái này là ba tab ngang hàng nên
         không ai biết nên bắt đầu từ đâu. */
      const soHT = Object.keys(c.teeth || {}).filter(n => Tooth.moTa(n, c.teeth[n]) !== 'Bình thường').length;
      const khoKH = c.teethKH || {};
      const soKH = Object.keys(khoKH).filter(n => khoKH[n] && khoKH[n].dichVu).length;
      const tienKH = Object.keys(khoKH).filter(n => khoKH[n] && khoKH[n].dichVu).reduce((t, n) => {
        const dv = (db.services || []).find(x => Combo.norm(x.name || '') === Combo.norm(khoKH[n].dichVu));
        return t + (dv ? (dv.price || 0) : 0);
      }, 0);
      const soST = Object.keys(c.teethST || {}).filter(n => Tooth.moTa(n, c.teethST[n]) !== 'Bình thường').length;

      const BUOC = [
        {k: 'teeth',   so: 1, ten: 'Tình trạng ban đầu',
         mo: soHT ? soHT + ' răng đã ghi' : 'chưa ghi răng nào', xong: soHT > 0},
        {k: 'teethKH', so: 2, ten: 'Kế hoạch điều trị',
         mo: soKH ? soKH + ' răng · ' + money(tienKH) : 'chưa có kế hoạch', xong: soKH > 0},
        {k: 'teethST', so: 3, ten: 'Tình trạng sau điều trị',
         mo: soST ? soST + ' răng đã xong' : 'chưa có gì', xong: soST > 0},
      ];
      return `<div class="card mb">
      <div class="card-h"><h2>Sơ đồ răng</h2>
        <span class="hint">${sauDT ? 'nhấn vào răng để xem lịch sử điều trị của răng đó' : 'nhấn vào răng để ghi tình trạng'}</span><span class="spacer"></span>
        ${sauDT ? '' : `<button class="btn small ${App.state.rangChon?'primary':''}" onclick="Cust.batChonNhieu()">
            ${App.state.rangChon ? 'Xong chọn nhiều răng' : 'Chọn nhiều răng cùng lúc'}</button>`}
        ${keHoach ? `<button class="btn small" onclick="Cust.chepSangKH()">Chép lại từ hiện trạng</button>
          ${coKH?`<button class="btn small danger" onclick="Cust.xoaKH()">Xóa kế hoạch</button>`:''}` : ''}
        ${sauDT ? `<button class="btn small primary" onclick="Cust.dungST()">Dựng lại từ hạng mục đã hoàn tất</button>
          ${coST?`<button class="btn small danger" onclick="Cust.xoaST()">Xóa sơ đồ</button>`:''}` : ''}</div>
      <div class="card-b">
        <div class="sub-line" style="margin:0 0 12px">${h((BUOC.find(b => b.k === lop) || {}).mo || '')}</div>

        ${lop === 'teeth' ? `<div class="note-block mb">Bấm vào từng răng để ghi <b>tình trạng lúc mới đến khám</b>:
          sâu mặt nào, đã trám, răng sứ, mất răng, lỗ dò… Đây là sơ đồ gốc, hai bước sau đều dựa vào nó
          và không sửa ngược lại nó.
          ${App.state.rangChon ? '' : '<br>Nhiều răng <b>cùng một tình trạng</b> (mất nhiều răng, cao răng cả hàm) thì bấm <b>Chọn nhiều răng cùng lúc</b> ở góc trên.'}</div>` : ''}
        ${keHoach ? `<div class="note-block mb">Bấm vào răng cần làm: ô <b>Tình trạng hiện tại</b> đã lấy sẵn từ bước 1,
          bạn chỉ cần chọn <b>chẩn đoán</b> và <b>dịch vụ sẽ làm</b>.
          ${App.state.rangChon ? '' : '<br>Làm <b>cùng một dịch vụ cho nhiều răng</b> (cầu răng, niềng, tháo lắp) thì bấm <b>Chọn nhiều răng cùng lúc</b> ở góc trên — phần mềm gộp thành một hạng mục có số lượng.'}</div>` : ''}
        ${sauDT ? `<div class="note-block mb">Sơ đồ này ghi <b>tình trạng răng sau khi đã điều trị</b>.
          Bấm <b>Dựng lại từ hạng mục đã hoàn tất</b> để phần mềm tự vẽ theo những dịch vụ đã xong
          (${xongCount} hạng mục có ghi số răng), rồi bấm vào từng răng để xem <b>lịch sử điều trị</b> và sửa lại nếu cần.
          Răng đã sửa tay thì lần dựng sau không bị ghi đè.</div>` : ''}
        ${App.state.rangChon ? `<div class="note-block mb" style="border-color:var(--accent)">
          Đang <b>chọn nhiều răng</b> — bấm vào từng răng để chọn hoặc bỏ chọn.
          Đã chọn <b>${App.state.rangChon.length} răng</b>${App.state.rangChon.length?': '+App.state.rangChon.slice().sort((a,b)=>a-b).map(n=>'R'+n).join(', '):''}.
          <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
            <button class="btn small primary" ${App.state.rangChon.length?'':'disabled'}
              onclick="${keHoach ? 'Cust.keHoachNhieu()' : 'Cust.khamNhieu()'}">${
              keHoach ? 'Thêm dịch vụ cho' : 'Ghi tình trạng cho'} ${App.state.rangChon.length} răng</button>
            <button class="btn small" onclick="Cust.batChonNhieu()">Thoát chọn nhiều</button></div></div>` : ''}
        ${Tooth.hamHTML(c, lop)}
        ${Cust.oGhiRangHTML(c, lop)}
        ${keHoach ? '' : Cust.khoiNhaChu(c, lop)}
        ${Tooth.tomTatHTML(c, lop)}
        ${keHoach ? (() => {
          const kho = c.teethKH || {};
          const ds = Object.keys(kho).map(Number).filter(n => !isNaN(n) && kho[n] && kho[n].dichVu).sort((a,b)=>a-b);
          const tong = ds.reduce((s, n) => {
            const dv = (db.services||[]).find(x => Combo.norm(x.name||'') === Combo.norm(kho[n].dichVu));
            return s + (dv ? (dv.price||0) : 0);
          }, 0);
          return `<div class="tooth-info" style="border-color:var(--accent)"><b>Kế hoạch điều trị:</b><br>
            ${ds.length ? ds.map(n => `R${n}: ${h(Tooth.moTa(n, kho[n]))}${
              kho[n].chanDoan ? ' · <i>' + h(icdName(kho[n].chanDoan)) + '</i>' : ''} → <b>${h(kho[n].dichVu)}</b>`).join('<br>')
                        : 'Chưa răng nào có kế hoạch — bấm vào răng rồi chọn dịch vụ sẽ làm.'}
            ${tong ? `<br><br>Tạm tính <b>${money(tong)}</b> cho ${ds.length} răng` : ''}</div>`;
        })() : ''}
        ${sauDT ? (() => {
          const co = [];
          TEETH_UP.concat(TEETH_DN).forEach(n => {
            const ls = Cust.lichSuRang(c, n).filter(x => x.loai === 'dv');
            if (ls.length) co.push({n, ls});
          });
          if (!co.length) return `<div class="tooth-info" style="border-color:var(--accent)">
            <b>Lịch sử điều trị theo răng:</b><br>Chưa có hạng mục điều trị nào ghi số răng.
            Vào tab <b>Điều trị</b>, mở từng hạng mục và điền ô <b>Răng</b> (vd: 36, 37).</div>`;
          return `<div class="tooth-info" style="border-color:var(--accent)"><b>Lịch sử điều trị theo răng:</b><br>
            ${co.map(x => `R${x.n}: ` + x.ls.map(v =>
              `${h(v.ten)} <span class="sub-line">(${fmtD(v.ngay)}${v.status ? ' · ' + h(v.status) : ''}${
                v.bs ? ' · ' + h(v.bs) : ''})</span>`).join(' → ')).join('<br>')}
            <br><br><span class="sub-line">${co.length} răng đã được điều trị · bấm vào răng để xem chi tiết.</span></div>`;
        })() : ''}
        ${Tooth.chuThichHTML()}
      </div>
    </div>`;
  },

  /* ---------- Thanh ba bước của màn khách hàng ---------- */
  BUOC_KH: [
    ['hanhchinh', '1. Thông tin hành chính'],
    ['kham',      '2. Khám & chẩn đoán'],
    ['kehoach',   '3. Lập kế hoạch điều trị'],
    ['sau',       'Sau điều trị'],
  ],
  LOP_BUOC: {kham:'teeth', kehoach:'teethKH', sau:'teethST'},
  buocTabsHTML(buoc){
    return `<div class="subtabs">${this.BUOC_KH.map(([k, l]) =>
      `<button class="subtab ${buoc === k ? 'active' : ''}" onclick="Cust.doiBuoc('${k}')">${h(l)}</button>`).join('')}</div>`;
  },
  doiBuoc(k){
    App.state.buocKH = k;
    App.state.rangMo = null;
    App.state.rangChon = null;
    App.render();
  },
  /* Khối nằm ngay dưới sơ đồ: chưa chọn răng thì chỉ nhắc cách dùng */
  oGhiRangHTML(c, lop){
    const n = App.state.rangMo;
    if (App.state.rangChon) return '';
    if (!n) return `<div class="note-block" id="oRangGhi" style="margin-top:14px">
      <b>Bấm vào một răng trên sơ đồ</b> để ghi cho răng đó — khung nhập hiện ngay tại đây,
      sơ đồ vẫn nằm nguyên phía trên để đối chiếu với các răng bên cạnh.<br>
      Nhiều răng cùng lúc: giữ <b>Ctrl</b> bấm từng răng, hoặc giữ <b>Shift</b> bấm răng cuối để lấy cả dải.</div>`;
    const vt = (Tooth.hamTren(n) ? 'hàm trên' : 'hàm dưới') + (Tooth.benPhai(n) ? ' bên phải' : ' bên trái');
    return `<div class="card mb" id="oRangGhi" style="margin-top:14px;border-color:var(--accent)">
      <div class="card-h"><h2>Răng ${n}</h2><span class="hint">${h(vt)}</span><span class="spacer"></span>
        <button class="btn small" onclick="Cust.dongRang()">Đóng</button></div>
      <div class="card-b">${this.rangFormHTML(c, n, lop)}</div></div>`;
  },
  /* Lập hoặc cập nhật hạng mục điều trị của răng này. Bỏ trống dịch vụ thì gỡ hạng
     mục đi — nhưng chỉ gỡ khi chưa làm gì: đã ghi công đoạn hoặc đã thu tiền rồi mà
     xóa thì mất cả tiền công lẫn công nợ, lúc đó chỉ cảnh báo và giữ nguyên. */
  luuHangMuc(c, n, ten, d, f){
    const g = k => (f.querySelector('[name="' + k + '"]') || {}).value;
    this.ghiHangMuc(c, {tuRang: String(n)}, ten, {
      tooth: String(n), donGia: num(g('donGia')), sl: +g('sl'), giamPct: +g('giamPct'),
      giamTien: num(g('giamTien')), status: g('tinhTrangDT'),
    }, 'Răng ' + n);
  },
  /* Lập hoặc cập nhật hạng mục điều trị. khoa cho biết hạng mục này do đâu sinh ra
     ({tuRang:'17'} hoặc {tuKH:'id'}) để lần sau sửa đúng dòng đó chứ không đẻ dòng mới.
     Bỏ trống dịch vụ thì gỡ hạng mục — nhưng chỉ khi chưa làm gì: đã ghi công đoạn
     mà xóa thì mất cả tiền công lẫn công nợ. */
  ghiHangMuc(c, khoa, ten, gia, nhan){
    const k = Object.keys(khoa)[0], v = khoa[k];
    const cu = (db.treatments || []).find(t => t.customerId === c.id && String(t[k]) === String(v));
    if (!ten) {
      if (!cu) return;
      if ((cu.cd || []).length) {
        App.toast((nhan || 'Mục này') + ' đã ghi công đoạn nên giữ lại hạng mục — xóa ở trang Dịch vụ nếu thật sự muốn bỏ');
        return;
      }
      db.treatments = db.treatments.filter(x => x.id !== cu.id);
      return;
    }
    const dv = (db.services || []).find(x => Combo.norm(x.name || '') === Combo.norm(ten));
    const donGia = gia.donGia || (dv ? (dv.price || 0) : 0);
    const sl = Math.max(1, gia.sl || 1);
    const giamPct = Math.min(100, Math.max(0, gia.giamPct || 0));
    const giamTien = gia.giamTien || 0;
    const o = Object.assign({}, khoa, {
      name: dv ? dv.name : ten, group: dv ? dv.group : 'Khác', serviceId: dv ? dv.id : '',
      tooth: gia.tooth || '', donGia, sl, giamPct, giamTien,
      price: Treat.thanhTien(donGia, sl, giamPct, giamTien),
      status: gia.status || 'Chưa điều trị'});
    if (cu) Object.assign(cu, o, {_up: Date.now()});
    else {
      const ep = Dot.dangChon(c);
      db.treatments.push(Object.assign({id: uid(), customerId: c.id, episodeId: ep ? ep.id : '',
        doctorId: (ep && ep.doctorId) || '', assistantId: '', date: todayISO(), cd: []}, o));
    }
  },

  /* Hàm khung là chuyện của CẢ HÀM, không phải của một cái răng — nhưng chỉ hỏi
     khi răng đang được đánh dấu là răng tháo lắp, vì ngoài lúc đó ra hỏi cũng vô nghĩa.
     Tick vào thì ghi cho đúng cái hàm chứa răng đó. */
  khoaHK(lop){ return {teethKH: 'hamKhungKH', teethST: 'hamKhungST'}[lop] || 'hamKhung'; },
  oHamKhung(c, lop, ds, sHienTai){
    const k = this.khoaHK(lop), hk = c[k] || {};
    const tren = ds.some(n => Tooth.hamTren(n)), duoi = ds.some(n => !Tooth.hamTren(n));
    const dang = (tren && hk.tren) || (duoi && hk.duoi);
    const ten = [tren && 'hàm trên', duoi && 'hàm dưới'].filter(Boolean).join(' và ');
    return `<div class="f full" id="oHamKhung" style="display:${sHienTai === 'thaolap' ? '' : 'none'}">
      <label>Hàm khung tháo lắp</label>
      <div class="check-row">
        <label><input type="radio" name="hk" value="0"${dang?'':' checked'}> Không có hàm khung</label>
        <label><input type="radio" name="hk" value="1"${dang?' checked':''}> Có hàm khung ${h(ten)}</label>
      </div>
      <input name="hkNote" value="${h(hk.note||'')}" placeholder="Ghi chú: khung Titan, móc răng 34-44…" style="margin-top:6px">
      <div class="combo-hint">Ghi cho <b>cả ${h(ten)}</b> chứ không riêng răng này — hàm khung vốn là một khối.</div></div>`;
  },
  luuHamKhung(f, c, lop, ds){
    const o = f.querySelector('[name="hk"]:checked');
    if (!o) return;                                   /* tình trạng không phải tháo lắp */
    const k = this.khoaHK(lop);
    const hk = c[k] || (c[k] = {});
    const co = o.value === '1';
    if (ds.some(n => Tooth.hamTren(n))) hk.tren = co;
    if (ds.some(n => !Tooth.hamTren(n))) hk.duoi = co;
    hk.note = ((f.querySelector('[name="hkNote"]') || {}).value || '').trim();
    if (!hk.tren && !hk.duoi && !hk.note) delete c[k];
  },

  /* Răng đang ở tình trạng này thì thường làm những dịch vụ nào — chỉ là gợi ý,
     gõ tự do vẫn được. Khớp theo TÌNH TRẠNG HIỆN TẠI của răng. */
  DV_THEO_KH: {
    sauNong: ['Trám sâu răng phía trong — tiêu chuẩn','Trám răng cửa — tiêu chuẩn',
              'Trám cổ răng','Trám răng sữa'],
    sauSau:  ['Trám sâu răng phía trong — nâng cao','Che tủy gián tiếp','Che tủy trực tiếp',
              'Nội nha răng cối lớn — gói cơ bản','Trám sâu răng phía trong — tiêu chuẩn'],
    sauTuy:  ['Nội nha răng cối lớn — gói cơ bản','Nội nha răng cối nhỏ','Nội nha răng cửa',
              'Răng toàn sứ Zirconia','Endocrown','Nhổ răng vĩnh viễn — 2 chân'],
    crown:   ['Gắn lại răng sứ kim loại','Gắn lại răng toàn sứ','Răng toàn sứ Zirconia','Nội nha lại'],
    noinha:  ['Răng toàn sứ Zirconia','Endocrown','Trám sâu răng phía trong — nâng cao','Nội nha lại'],
    chanrang:['Nhổ răng vĩnh viễn — 2 chân','Nhổ chân răng','Trụ Implant Hàn Quốc','Răng tháo lắp nhựa — Nhật'],
    caries:  ['Trám sâu răng phía trong — tiêu chuẩn','Trám răng cửa — tiêu chuẩn',
              'Nội nha răng cối lớn — gói cơ bản','Răng toàn sứ Zirconia','Nhổ răng vĩnh viễn — 2 chân'],
    filled:  ['Trám sâu răng phía trong — nâng cao','Răng toàn sứ Zirconia','Endocrown','Inlay / Onlay Emax'],
    crownKL: ['Gắn lại răng sứ kim loại','Răng toàn sứ Zirconia','Răng toàn sứ Cercon'],
    crownTS: ['Gắn lại răng toàn sứ','Răng toàn sứ Cercon','Răng toàn sứ Lava'],
    pontic:  ['Gắn lại răng sứ kim loại','Gắn lại răng toàn sứ','Trụ Implant Hàn Quốc','Răng toàn sứ Zirconia'],
    missing: ['Trụ Implant Hàn Quốc','Trụ Implant Pháp','Răng tháo lắp nhựa — Nhật',
              'Hàm khung hợp kim Titan','Răng toàn sứ Zirconia'],
    thaolap: ['Răng tháo lắp nhựa — Nhật','Hàm khung hợp kim Titan','Đệm hàm','Thêm móc','Vá hàm nứt, vỡ'],
    implant: ['Răng toàn sứ Zirconia','Hàm tạm trên Implant','Thanh bar liên kết'],
    ok:      ['Cạo vôi răng — mức độ 1','Khám và tư vấn','Trám sâu răng phía trong — tiêu chuẩn'],
  },
  /* Mã ICD hay dùng cho từng tình trạng răng — xếp lên đầu ô chẩn đoán của răng đó */
  ICD_THEO_TT: {
    sauNong: ['K02.1','K02.0','K02.9','K02.8'],
    sauSau:  ['K02.1','K02.5','K04.0','K02.9'],
    sauTuy:  ['K02.5','K04.0','K04.1','K04.5','K04.6','K04.7'],
    crown:   ['K08.1','K02.5','K03.7','K04.5'],
    noinha:  ['K04.5','K04.1','K03.7','K02.5'],
    chanrang:['K08.3','K04.5','K04.6','K04.7'],
    caries:  ['K02.1','K02.0','K02.5','K02.9','K02.8'],
    filled:  ['K02.8','K02.1','K02.9'],
    crownKL: ['K08.1','K02.5','K03.7'],
    crownTS: ['K08.1','K02.5','K03.7'],
    pontic:  ['K08.1','Z97.2','K08.2'],
    missing: ['K08.1','K08.2','K08.3'],
    thaolap: ['Z97.2','Z46.3','K08.1'],
    implant: ['K08.1','K08.2'],
    ok:      ['Z01.2','K03.6','K05.1'],
  },
  icdHopVoi(tt, rangHT){
    const uu = (this.ICD_THEO_TT[tt] || []).slice();
    const t = rangHT || {};
    if (t.loDo) uu.unshift('K04.6');
    if (t.sung) uu.unshift('K04.7');
    if (t.nn)   uu.unshift('K04.5');
    if (TT_SAU.includes(tt) && (t.loDo || t.sung)) uu.unshift('K04.1');
    const het = icdOptions();
    const daCo = [];
    const dau = uu.filter(m => { if (daCo.indexOf(m) >= 0) return false; daCo.push(m); return true; })
      .map(ma => het.find(x => x.s === ma)).filter(Boolean)
      .map(x => Object.assign({}, x, {s: x.s + ' · hay gặp'}));
    const bo = new Set(daCo);
    return dau.concat(het.filter(x => !bo.has(x.s)));
  },
  /* Răng sâu mà có lỗ dò / sưng / đã nội nha thì thường phải nội nha (hoặc nội nha lại)
     trước khi phục hình — đưa lên đầu danh sách gợi ý. */
  dvHopVoi(tt, rangHT){
    const ds = (this.DV_THEO_KH[tt] || []).slice();
    const t = rangHT || {};
    if ((TT_SAU.includes(tt) || tt === 'filled' || laSu(tt)) && (t.loDo || t.sung || t.nn)) {
      ds.unshift('Điều trị tủy lại', 'Nội nha răng cối lớn — gói cơ bản');
    }
    /* Chỉ giữ những dịch vụ thật sự có trong bảng giá */
    const co = new Set((db.services||[]).map(x => Combo.norm(x.name||'')));
    return [...new Set(ds)].filter(x => co.has(Combo.norm(x))).slice(0, 6);
  },
  /* Lưu răng rồi tạo luôn hạng mục điều trị từ dịch vụ đã chọn */
  rangSangDieuTri(n){
    const f = document.querySelector('#oRangGhi form') || document.querySelector('#modalBody form');
    if (!f) return;
    const ten = ((f.querySelector('[name="dichVu"]')||{}).value || '').trim();
    if (!ten) { App.toast('Chọn dịch vụ sẽ làm trước đã'); return; }
    this.toothSave({preventDefault(){}, target: f}, n, 'teethKH');
    const c = custById(App.state.custSel);
    const dv = (db.services||[]).find(x => Combo.norm(x.name||'') === Combo.norm(ten));
    const ep = Dot.dangChon(c);
    const t = {id: uid(), customerId: c.id, episodeId: ep ? ep.id : '',
      name: dv ? dv.name : ten, group: dv ? dv.group : 'Khác', serviceId: dv ? dv.id : '',
      price: dv ? (dv.price || 0) : 0, tooth: String(n), status: 'Chưa điều trị',
      doctorId: (ep && ep.doctorId) || '', assistantId: '', date: todayISO(), cd: []};
    db.treatments.push(t);
    save(); App.render();
    App.toast('Đã thêm "' + t.name + '" cho răng ' + n + ' vào kế hoạch điều trị ✓');
    App.chonKhach(c.id);
    setTimeout(() => Treat.itemForm(t.id), 60);
  },

  /* Đổi mức sâu thì các ô bên dưới phải mở lại theo đúng mức đó */
  doiMucSau(){ this.toothMatHien('sau'); },
  toothMatHien(v){
    const keHoach = (App.state.lopRang === 'teethKH');
    const ms = document.getElementById('oMucSau');
    if (ms) ms.style.display = laSau(v) ? '' : 'none';
    /* 'sau' chỉ là mục lớn — ô nào được hỏi là do MỨC ĐỘ quyết định */
    if (v === 'sau') v = ((document.querySelector('[name="mucSau"]:checked') || {}).value) || 'sauNong';
    const o = document.getElementById('oMat');
    if (o && !keHoach) o.style.display = TT_CO_MAT.includes(v) ? '' : 'none';
    /* Chọn "Răng sứ" thì mới hỏi kim loại hay toàn sứ */
    const ls = document.getElementById('oLoaiSu');
    if (ls) ls.style.display = laSu(v) ? '' : 'none';
    /* Hàm tháo lắp: hỏi thêm dưới đó còn chân răng hay đã nhổ sạch */
    const cr = document.getElementById('oChanRang');
    if (cr) {
      cr.style.display = (v === 'thaolap') ? '' : 'none';
      if (v !== 'thaolap') cr.querySelectorAll('input').forEach(x => x.checked = false);
    }
    /* Lỗ dò / sưng đáy hành lang chỉ có nghĩa ở răng hở tủy và răng sứ — giấu đi thì
       bỏ luôn dấu tick, kẻo lưu lại dấu hiệu của tình trạng cũ. */
    const chop = document.getElementById('oChop');
    if (chop && !keHoach) {
      const duoc = TT_CO_CHOP.includes(v);
      chop.style.display = duoc ? '' : 'none';
      if (!duoc) chop.querySelectorAll('input').forEach(x => x.checked = false);
    }
    const ll = document.getElementById('oMucLL');
    if (ll) ll.style.display = (v === 'lunglay') ? '' : 'none';
    const tg = document.getElementById('oTuGhi');
    if (tg) { tg.style.display = (v === 'khac') ? '' : 'none'; if (v === 'khac') tg.focus(); }
    /* Mất răng, implant, tháo lắp thì không có tủy để nội nha — giấu luôn ô tick,
       và bỏ dấu đã tick kẻo lưu lại một thông tin vô lý. */
    /* Chỉ răng tháo lắp mới hỏi hàm khung */
    const hk = document.getElementById('oHamKhung');
    if (hk) hk.style.display = (v === 'thaolap') ? '' : 'none';
    const nn = document.getElementById('oNoiNha');
    if (nn && !keHoach) {
      const duoc = TT_CO_NOI_NHA.includes(v);
      nn.style.display = duoc ? '' : 'none';
      if (!duoc) { const cb = nn.querySelector('[name="nn"]'); if (cb) cb.checked = false; }
    }
  },
  toothSave(ev, n, lop){
    lop = lop || 'teeth';
    ev.preventDefault();
    const f = ev.target;
    const d = Object.fromEntries(new FormData(f).entries());
    /* Mục lớn trong ô chọn -> lưu xuống mức/loại cụ thể đã tick */
    if (d.s === 'sau') d.s = ((f.querySelector('[name="mucSau"]:checked') || {}).value) || 'sauNong';
    if (d.s === 'lunglay') d.s = ((f.querySelector('[name="mucLL"]:checked') || {}).value) || 'll1';
    if (d.s === 'crown') d.s = ((f.querySelector('[name="loaiSu"]:checked') || {}).value) || 'crownTS';
    const mat = TT_CO_MAT.includes(d.s)
      ? [...f.querySelectorAll('[name="mat"]:checked')].map(x => x.value) : [];
    const nn = !!f.querySelector('[name="nn"]:checked') && TT_CO_NOI_NHA.includes(d.s);
    const coChop = TT_CO_CHOP.includes(d.s);
    const loDo = coChop && !!f.querySelector('[name="loDo"]:checked');
    const sung = coChop && !!f.querySelector('[name="sung"]:checked');
    const c = custById(App.state.custSel);
    if (!c[lop]) c[lop] = {};
    if (d.s === 'ok' && !nn && !loDo && !sung && !mat.length && !d.note
        && !(d.dichVu||'').trim() && !(d.chanDoan||'').trim()) delete c[lop][n];
    else {
      const cu = c[lop][n] || {};
      c[lop][n] = {s:d.s, sKhac: d.s === 'khac' ? (d.sKhac||'').trim() : '',
        mat, nn, loDo, sung, note:d.note, dichVu:(d.dichVu||'').trim(),
        chanRang: d.s === 'thaolap' && !!f.querySelector('[name="chanRang"]:checked'),
        nhipCau: laSu(d.s) && ((f.querySelector('[name="vaiSu"]:checked')||{}).value === 'nhipcau'),
        chanDoan: icdCode((d.chanDoan||'').trim()), dv: cu.dv || []};
      /* Đánh dấu "sửa tay" để lần dựng lại sơ đồ sau điều trị không ghi đè */
      if (lop === 'teethST') c[lop][n].tay = 1;
    }
    /* Khám và lập kế hoạch nay làm trên cùng một khung, nên chẩn đoán và dịch vụ gõ ở
       lớp "tình trạng ban đầu" phải chảy sang sơ đồ KẾ HOẠCH — đó mới là chỗ bảng kế
       hoạch và hạng mục điều trị đọc tới. Tình trạng răng thì vẫn nằm ở lớp ban đầu. */
    if (lop === 'teeth') {
      const dv = (d.dichVu || '').trim(), icd = icdCode((d.chanDoan || '').trim());
      this.vanDeTuRang(c, n, icd);
      this.dongBoChanDoan(c);
      this.luuHangMuc(c, n, dv, d, f);
      if (dv || icd) {
        c.teethKH = c.teethKH || {};
        const nen = c.teethKH[n] || Object.assign({}, (c.teeth || {})[n] || {s: d.s, mat: []});
        c.teethKH[n] = Object.assign({}, nen, {s: d.s, mat, nn, dichVu: dv, chanDoan: icd});
      } else if (c.teethKH && c.teethKH[n]) {
        c.teethKH[n].dichVu = ''; c.teethKH[n].chanDoan = '';
      }
    }
    this.luuHamKhung(f, c, lop, [n]);
    save(); App.render();
    App.toast('Đã lưu răng ' + n
      + (lop === 'teethKH' ? ' (kế hoạch) ✓' : lop === 'teethST' ? ' (sau điều trị) ✓' : ' ✓'));
  },
  toothXoa(n, lop){
    lop = lop || 'teeth';
    const c = custById(App.state.custSel);
    if (c[lop]) delete c[lop][n];
    App.state.rangMo = null;
    save(); App.render(); App.toast('Đã xóa đánh dấu răng ' + n);
  },
  /* Hàm khung là chuyện của cả hàm, không gắn vào răng nào */
  hamKhung(lop){
    lop = {teethKH: 'hamKhungKH', teethST: 'hamKhungST'}[lop] || 'hamKhung';
    const c = custById(App.state.custSel); if (!c) return;
    const k = c[lop] || {};
    App.modal('Hàm khung tháo lắp'
      + (lop === 'hamKhungKH' ? ' — theo kế hoạch' : lop === 'hamKhungST' ? ' — sau điều trị' : ''), `
    <form class="form-grid" onsubmit="Cust.hamKhungSave(event,'${lop}')">
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="tren"${k.tren?' checked':''}> Hàm khung <b>hàm trên</b></label>
        <label><input type="checkbox" name="duoi"${k.duoi?' checked':''}> Hàm khung <b>hàm dưới</b></label>
      </div></div>
      <div class="f full"><label>Ghi chú</label><input name="note" value="${h(k.note||'')}" placeholder="Vd: khung Titan, móc răng 34-44…"></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  hamKhungSave(ev, lop){
    lop = lop || 'hamKhung';
    ev.preventDefault();
    const f = ev.target, c = custById(App.state.custSel);
    const tren = !!f.querySelector('[name="tren"]:checked'), duoi = !!f.querySelector('[name="duoi"]:checked');
    const note = (f.querySelector('[name="note"]')||{}).value || '';
    if (!tren && !duoi && !note) delete c[lop]; else c[lop] = {tren, duoi, note};
    save(); App.closeModal(); App.render(); App.toast('Đã lưu hàm khung ✓');
  },

  /* Chép hiện trạng sang sơ đồ kế hoạch để bác sĩ sửa từ đó, khỏi vẽ lại từ đầu */
  chepSangKH(){
    const c = custById(App.state.custSel); if (!c) return;
    const daCo = Object.keys(c.teethKH || {}).length || c.hamKhungKH;
    if (daCo && !confirm('Sơ đồ kế hoạch đang có dữ liệu. Chép đè hiện trạng lên, xóa hết những gì đã vạch?')) return;
    c.teethKH = JSON.parse(JSON.stringify(c.teeth || {}));
    if (c.hamKhung) c.hamKhungKH = JSON.parse(JSON.stringify(c.hamKhung)); else delete c.hamKhungKH;
    save(); App.render(); App.toast('Đã chép hiện trạng sang sơ đồ kế hoạch — giờ sửa thành kết quả mong muốn');
  },
  xoaKH(){
    const c = custById(App.state.custSel); if (!c) return;
    if (!confirm('Xóa toàn bộ sơ đồ kế hoạch điều trị? Sơ đồ hiện trạng giữ nguyên.')) return;
    delete c.teethKH; delete c.hamKhungKH;
    save(); App.render(); App.toast('Đã xóa sơ đồ kế hoạch');
  },
  doiLopRang(k){ App.state.lopRang = k; App.state.rangChon = null; App.render(); },

  /* ---------- Tình trạng mô nha chu ----------
     Vôi răng, vết dính, viêm nướu, viêm nha chu là chuyện của CẢ MIỆNG chứ không
     của một cái răng — đánh dấu vào từng răng thì vừa mất công vừa sai bản chất.
     Nên để riêng một ô ngoài sơ đồ, ghi một lần cho cả hàm. */
  NHA_CHU: ['Vôi răng', 'Vết dính', 'Viêm nướu', 'Viêm nha chu'],
  khoaNC(lop){ return lop === 'teethST' ? 'nhaChuST' : 'nhaChu'; },
  khoiNhaChu(c, lop){
    const k = this.khoaNC(lop), nc = c[k] || {};
    const ds = nc.ds || [];
    return `<div class="f full" style="margin-top:14px"><label>Tình trạng mô nha chu
        <span class="sub-line">${lop === 'teethST' ? 'sau điều trị' : 'lúc khám'} · ghi cho cả hai hàm</span></label>
      <div class="check-row">${this.NHA_CHU.map(x => `<label>
        <input type="checkbox" ${ds.includes(x)?'checked':''} value="${h(x)}"
          onchange="Cust.luuNhaChu('${lop}')"> ${h(x)}</label>`).join('')}
        <label style="flex:1;min-width:180px"><input type="hidden">
          <input id="ncNote" value="${h(nc.note||'')}" placeholder="Ghi chú: túi nha chu 5mm, chảy máu khi thăm khám…"
            onchange="Cust.luuNhaChu('${lop}')"></label></div></div>`;
  },
  luuNhaChu(lop){
    const c = custById(App.state.custSel); if (!c) return;
    const box = document.querySelector('#mainArea .check-row');
    const o = document.getElementById('ncNote');
    const wrap = o ? o.closest('.check-row') : null;
    if (!wrap) return;
    const ds = [...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
    const note = (o.value || '').trim();
    const k = this.khoaNC(lop);
    if (!ds.length && !note) delete c[k];
    else c[k] = {ds, note};
    c._up = Date.now(); save();
    App.toast('Đã ghi tình trạng mô nha chu ✓');
  },
  moTaNhaChu(c, lop){
    const nc = c[this.khoaNC(lop || 'teeth')] || {};
    return [(nc.ds || []).join(', '), nc.note].filter(Boolean).join(' — ');
  },

  /* ---------- Lịch sử điều trị của MỘT răng ----------
     Gom từ hạng mục điều trị có ghi số răng đó, cộng thêm những dòng diễn biến
     có nhắc tới răng đó. Xếp theo ngày, cũ trước. */
  lichSuRang(c, n){
    if (!c) return [];
    const ra = [];
    (db.treatments || []).filter(t => t.customerId === c.id && Tooth.rangCua(t).indexOf(+n) >= 0)
      .forEach(t => {
        const ep = (db.episodes || []).find(e => e.id === t.episodeId);
        ra.push({
          ngay: t.date || '', loai: 'dv', id: t.id,
          ten: t.name, nhom: t.group || '', status: t.status || '',
          bs: (staffById(t.doctorId) || {}).name || '',
          phu: (staffById(t.assistantId) || {}).name || '',
          dot: ep ? (ep.ten || '') : '', gia: t.price || 0,
        });
      });
    /* Diễn biến ghi rõ "R36" hoặc "răng 36" thì cũng thuộc lịch sử của răng đó */
    const re = new RegExp('(?:\\bR\\s?|răng\\s+)' + n + '(?![0-9])', 'i');
    ((c.record || {}).dienBien || []).forEach(v => {
      if (!re.test((v.db || '') + ' ' + (v.xt || ''))) return;
      ra.push({
        ngay: v.date || '', loai: 'db', id: v.id,
        ten: v.db || '', xt: v.xt || '',
        bs: (staffById(v.doctorId) || {}).name || '',
        phu: (staffById(v.assistantId) || {}).name || '',
      });
    });
    return ra.sort((a, b) => (a.ngay || '') < (b.ngay || '') ? -1 : 1);
  },
  /* Bảng lịch sử để hiện trong hộp thoại răng */
  lichSuRangHTML(c, n){
    const ds = this.lichSuRang(c, n);
    if (!ds.length) return `<div class="tooth-info">Răng ${n} chưa có lịch sử điều trị nào.
      Ghi ở tab <b>Điều trị</b> (hạng mục có số răng) hoặc <b>Thêm diễn biến</b> có nhắc "R${n}".</div>`;
    return `<div class="timeline">${ds.map(x => x.loai === 'dv'
      ? `<div class="tl-item"><span class="tl-date num">${fmtD(x.ngay)}</span>
          <b>${h(x.ten)}</b><p>${h(x.nhom)} · <span class="pill ${
            x.status === 'Hoàn tất' ? 'ok' : x.status === 'Đang điều trị' ? 'info' : 'mutedp'}">${h(x.status)}</span>
          ${x.bs ? ' · BS ' + h(x.bs) : ''}${x.phu ? ' · phụ: ' + h(x.phu) : ''}
          ${x.dot ? ' · <span class="pill mutedp">' + h(x.dot) + '</span>' : ''}</p></div>`
      : `<div class="tl-item"><span class="tl-date num">${fmtD(x.ngay)}</span>
          <b>${h(x.ten)}</b><p>${h(x.xt || '')}${x.bs ? ' <span class="sub-line">· BS ' + h(x.bs) + '</span>' : ''}
          ${x.phu ? ' <span class="sub-line">· phụ: ' + h(x.phu) + '</span>' : ''}</p></div>`).join('')}</div>`;
  },

  /* ---------- Dựng sơ đồ SAU ĐIỀU TRỊ từ các hạng mục đã hoàn tất ----------
     Lấy sơ đồ trước điều trị làm nền, rồi áp kết quả của từng dịch vụ đã xong
     theo thứ tự thời gian. Cái gì phần mềm đoán sai thì bấm vào răng sửa lại. */
  dungST(imLang){
    const c = custById(App.state.custSel); if (!c) return 0;
    const xong = (db.treatments || [])
      .filter(t => t.customerId === c.id && t.status === 'Hoàn tất' && Tooth.rangCua(t).length)
      .sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
    if (!xong.length) { if (!imLang) App.toast('Chưa có hạng mục nào ở trạng thái "Hoàn tất"'); return 0; }
    const cu = c.teethST || {};
    const moi = JSON.parse(JSON.stringify(c.teeth || {}));
    let dem = 0;
    xong.forEach(t => {
      const kq = Tooth.ketQua(t.name); if (!kq) return;
      Tooth.rangCua(t).forEach(n => {
        const r = moi[n] || (moi[n] = {s: 'ok', mat: [], note: ''});
        /* Răng đã nhổ mà nay nằm trong một cầu răng sứ thì đó là NHỊP CẦU —
           có thân răng sứ nhưng không có chân răng. Ghi 'răng sứ' vào chỗ này
           là sai, vì nhìn sơ đồ sẽ tưởng răng thật còn nguyên. */
        if (kq.s === 'crownTS' || kq.s === 'crownKL') {
          r.nhipCau = (r.s === 'missing' || r.s === 'pontic' || !!r.nhipCau);
          r.s = kq.s;
        } else if (kq.s) { r.s = kq.s; if (kq.s !== 'missing') r.nhipCau = false; }
        /* Nội nha xử lý đúng cái ổ nhiễm trùng, nên lỗ dò và sưng coi như đã lành.
           Còn tồn tại thật thì bác sĩ tick lại tay. */
        if (kq.nn) { r.nn = true; r.loDo = false; r.sung = false; }
        /* Trám thì mặt sâu thành mặt đã trám; bọc sứ / nhổ / implant thì bỏ hết mặt */
        if (kq.xoaMat) r.mat = [];
        if (kq.s === 'missing' || kq.s === 'implant') { r.nn = false; r.loDo = false; r.sung = false; }
        r.dv = (r.dv || []).concat([t.name]).filter((x, i, a) => a.indexOf(x) === i);
        dem++;
      });
    });
    /* Răng nào bác sĩ đã tự sửa tay thì giữ nguyên, không đè lên */
    Object.keys(cu).forEach(n => { if (cu[n] && cu[n].tay) moi[n] = cu[n]; });
    c.teethST = moi; c._up = Date.now();
    save();
    if (!imLang) { App.render(); App.toast('Đã dựng sơ đồ sau điều trị từ ' + xong.length + ' hạng mục đã hoàn tất ✓'); }
    return dem;
  },
  xoaST(){
    if (!confirm('Xóa sơ đồ sau điều trị? Sơ đồ trước điều trị và kế hoạch không bị ảnh hưởng.')) return;
    const c = custById(App.state.custSel); if (!c) return;
    delete c.teethST; delete c.hamKhungST;
    c._up = Date.now(); save(); App.render(); App.toast('Đã xóa sơ đồ sau điều trị');
  },

  /* ---------- Chọn nhiều răng cùng lúc để lập chung một kế hoạch ---------- */
  batChonNhieu(){ App.state.rangChon = App.state.rangChon ? null : []; App.render(); },
  chonRang(n){
    const ds = App.state.rangChon || [];
    const i = ds.indexOf(n);
    if (i < 0) ds.push(n); else ds.splice(i, 1);
    App.state.rangChon = ds;
    App.state.rangCuoi = n;
    App.render();
  },
  /* Cả dải răng giữa hai lần bấm, tính theo thứ tự in trên sơ đồ chứ không theo số —
       số răng nhảy quãng giữa hai phần hàm (18…11 rồi 21…28). */
  chonDai(tu, den){
    const hang = Tooth.hamTren(tu) === Tooth.hamTren(den)
      ? (Tooth.hamTren(tu) ? TEETH_UP : TEETH_DN) : null;
    if (!hang) { this.chonRang(den); return; }
    let a = hang.indexOf(tu), b = hang.indexOf(den);
    if (a < 0 || b < 0) { this.chonRang(den); return; }
    if (a > b) { const t = a; a = b; b = t; }
    const ds = App.state.rangChon || [];
    hang.slice(a, b + 1).forEach(x => { if (!ds.includes(x)) ds.push(x); });
    App.state.rangChon = ds;
    App.state.rangCuoi = den;
    App.render();
  },
  /* Lập một hạng mục điều trị chung cho tất cả răng đang chọn */
  /* Bước 1 — ghi một tình trạng cho cả nhóm răng. Mất nhiều răng liền nhau,
     cao răng cả hàm, sâu nhiều răng cùng một mặt… đánh từng cái thì lâu mà dễ sót. */
  khamNhieu(){
    const c = custById(App.state.custSel);
    const ds = (App.state.rangChon || []).slice().sort((a,b)=>a-b);
    if (!ds.length) { App.toast('Chưa chọn răng nào'); return; }
    /* Nếu cả nhóm đang cùng một tình trạng thì mở sẵn tình trạng đó cho dễ sửa */
    const dangCo = [...new Set(ds.map(n => ((c.teeth||{})[n]||{}).s || 'ok'))];
    const s0 = dangCo.length === 1 ? dangCo[0]
             : (dangCo.every(laSu) ? 'crownTS' : 'ok');
    App.modal('Ghi tình trạng cho ' + ds.length + ' răng', `
    <form class="form-grid" onsubmit="Cust.khamNhieuLuu(event)">
      <div class="note-block full">Sẽ ghi <b>cùng một tình trạng</b> cho các răng:
        <b>${ds.map(n=>'R'+n).join(', ')}</b>.
        ${dangCo.length > 1 ? '<br>Các răng này đang có tình trạng khác nhau — lưu xong sẽ thành giống nhau hết.' : ''}</div>
      <div class="f full"><label>Tình trạng</label>
        ${oTinhTrang(s0, ' onchange="Cust.toothMatHien(this.value)"')}</div>
      ${oMucSau(s0)}
      ${oMucLungLay(s0)}
      ${oLoaiSu(s0, null)}
      <div class="f full" id="oMat" style="display:${TT_CO_MAT.includes(s0)?'':'none'}">
        <label>Mặt răng (áp cho mọi răng đã chọn)</label>
        <div class="check-row">${TOOTH_SURF.map(([k,l])=>
          `<label><input type="checkbox" name="mat" value="${k}"> ${h(l)}</label>`).join('')}</div>
        <div class="combo-hint">Bỏ trống thì chỉ ghi tình trạng, không tô mặt nào.</div></div>
      <div class="f full" id="oNoiNha" style="display:${TT_CO_NOI_NHA.includes(s0)?'':'none'}"><div class="check-row">
        <label><input type="checkbox" name="nn"> Đã nội nha</label></div></div>
      <div class="f full" id="oChop" style="display:${TT_CO_CHOP.includes(s0)?'':'none'}"><label>Dấu hiệu quanh chóp</label><div class="check-row">
        <label><input type="checkbox" name="loDo"> Lỗ dò</label>
        <label><input type="checkbox" name="sung"> Sưng đáy hành lang</label></div></div>
      <div class="f full" id="oChanRang" style="display:${s0 === 'thaolap' ? '' : 'none'}">
        <label>Nền hàm</label><div class="check-row">
        <label><input type="checkbox" name="chanRang"> Còn chân răng dưới hàm tháo lắp</label></div></div>
      ${Cust.oHamKhung(c, 'teeth', ds, s0)}
      <div class="f full"><label>Ghi chú</label>
        <input name="note" placeholder="Vd: cao răng nhiều, nướu sưng đỏ…"></div>
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="giuGhiChu" checked> Giữ ghi chú cũ của những răng đã có</label></div></div>
      <div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbNhieuDX2','chanDoan', '', icdOptions(), 'Gõ tên bệnh hoặc mã ICD',
          null, 'Ghi chung cho các răng vừa chọn. Bỏ trống cũng được.')}</div>
      <div class="f full"><label>Dịch vụ điều trị</label>
        ${Combo.html('cbNhieuDV2','dichVu', '', Svc.goiY(1), 'Gõ tên dịch vụ, vd: boc su, tram',
          null, 'Chọn thì mỗi răng được ghi một dòng kế hoạch. Bỏ trống thì chỉ ghi tình trạng.')}</div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Ghi cho ${ds.length} răng</button></div>
    </form>`);
  },
  khamNhieuLuu(ev){
    ev.preventDefault();
    const f = ev.target;
    const c = custById(App.state.custSel);
    const ds = (App.state.rangChon || []).slice().sort((a,b)=>a-b);
    const d = Object.fromEntries(new FormData(f).entries());
    if (d.s === 'sau') d.s = ((f.querySelector('[name="mucSau"]:checked') || {}).value) || 'sauNong';
    if (d.s === 'lunglay') d.s = ((f.querySelector('[name="mucLL"]:checked') || {}).value) || 'll1';
    if (d.s === 'crown') d.s = ((f.querySelector('[name="loaiSu"]:checked') || {}).value) || 'crownTS';
    const mat = TT_CO_MAT.includes(d.s)
      ? [...f.querySelectorAll('[name="mat"]:checked')].map(x => x.value) : [];
    const nn = !!f.querySelector('[name="nn"]:checked') && TT_CO_NOI_NHA.includes(d.s);
    const coChop = TT_CO_CHOP.includes(d.s);
    const loDo = coChop && !!f.querySelector('[name="loDo"]:checked');
    const sung = coChop && !!f.querySelector('[name="sung"]:checked');
    const giu = !!f.querySelector('[name="giuGhiChu"]:checked');
    if (!c.teeth) c.teeth = {};
    ds.forEach(n => {
      const cu = c.teeth[n] || {};
      const note = (d.note || '').trim() || (giu ? (cu.note || '') : '');
      if (d.s === 'ok' && !nn && !loDo && !sung && !mat.length && !note) delete c.teeth[n];
      else c.teeth[n] = {s: d.s, sKhac: d.s === 'khac' ? (d.sKhac||'').trim() : '',
        mat, nn, loDo, sung, note,
        chanRang: d.s === 'thaolap' && !!f.querySelector('[name="chanRang"]:checked'),
        nhipCau: laSu(d.s) && ((f.querySelector('[name="vaiSu"]:checked')||{}).value === 'nhipcau')};
    });
    /* Chẩn đoán và dịch vụ chảy sang sơ đồ KẾ HOẠCH, y như khi ghi từng răng một */
    const dv = (d.dichVu || '').trim(), icd = icdCode((d.chanDoan || '').trim());
    ds.forEach(n => this.vanDeTuRang(c, n, icd));
    this.dongBoChanDoan(c);
    if (dv || icd) {
      c.teethKH = c.teethKH || {};
      ds.forEach(n => {
        const nen = c.teethKH[n] || Object.assign({}, c.teeth[n] || {s: d.s, mat: []});
        c.teethKH[n] = Object.assign({}, nen, {s: d.s, mat, nn, dichVu: dv, chanDoan: icd});
      });
    }
    this.luuHamKhung(f, c, 'teeth', ds);
    c._up = Date.now();
    App.state.rangChon = null;
    save(); App.closeModal(); App.render();
    App.toast('Đã ghi cho ' + ds.length + ' răng ✓' + (dv ? ' — đã thêm vào kế hoạch' : ''));
  },

  keHoachNhieu(){
    const c = custById(App.state.custSel);
    const ds = (App.state.rangChon || []).slice().sort((a,b)=>a-b);
    if (!ds.length) { App.toast('Chưa chọn răng nào'); return; }
    App.modal('Kế hoạch cho ' + ds.length + ' răng', `
    <form class="form-grid" onsubmit="Cust.keHoachNhieuLuu(event)">
      <div class="note-block full">Sẽ lập <b>một hạng mục điều trị</b> chung cho các răng:
        <b>${ds.map(n=>'R'+n).join(', ')}</b> — số lượng <b>${ds.length}</b>.</div>
      <div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbNhieuDX','chanDoan', '', icdOptions(), 'Gõ tên bệnh hoặc mã ICD',
          null, 'Ghi chung cho các răng vừa chọn.')}</div>
      <div class="f full"><label>Kế hoạch điều trị (dịch vụ)</label>
        ${Combo.html('cbNhieuDV','dichVu', '', Svc.goiY(1), 'Gõ tên dịch vụ, vd: boc su, tram',
          null, 'Gợi ý lấy từ bảng giá phòng khám.')}</div>
      <div class="f"><label>Giảm giá (%)</label><input type="number" name="giamPct" min="0" max="100" step="0.5" placeholder="0"></div>
      <div class="f"><label>Giảm thêm (₫)</label>${Tien.o('giamTien','')}</div>
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="veSoDo" checked> Ghi luôn kế hoạch này lên sơ đồ răng</label></div></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lập hạng mục</button></div>
    </form>`);
  },
  keHoachNhieuLuu(ev){
    ev.preventDefault();
    const c = custById(App.state.custSel);
    const ds = (App.state.rangChon || []).slice().sort((a,b)=>a-b);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const ten = (d.dichVu || '').trim();
    if (!ten) { App.toast('Chưa chọn dịch vụ'); return; }
    const dv = (db.services||[]).find(x => Combo.norm(x.name||'') === Combo.norm(ten));
    const ep = Dot.dangChon(c);
    const donGia = dv ? (dv.price || 0) : 0;
    const pct = Math.min(100, Math.max(0, +d.giamPct || 0)), giam = num(d.giamTien);
    db.treatments.push({id: uid(), customerId: c.id, episodeId: ep ? ep.id : '',
      name: dv ? dv.name : ten, group: dv ? dv.group : 'Khác', serviceId: dv ? dv.id : '',
      donGia, sl: ds.length, giamPct: pct, giamTien: giam,
      price: Treat.thanhTien(donGia, ds.length, pct, giam),
      tooth: ds.join(', '), status: 'Chưa điều trị',
      doctorId: (ep && ep.doctorId) || '', assistantId: '', date: todayISO(), cd: []});
    if (d.veSoDo) {
      if (!c.teethKH) c.teethKH = {};
      ds.forEach(n => {
        const ht = (c.teeth||{})[n];
        c.teethKH[n] = Object.assign({s:'ok', mat:[], note:''}, ht || {},
          {dichVu: dv ? dv.name : ten, chanDoan: icdCode((d.chanDoan||'').trim())});
      });
      c._up = Date.now();
    }
    App.state.rangChon = null;
    save(); App.closeModal(); App.render();
    App.toast('Đã lập kế hoạch cho ' + ds.length + ' răng ✓');
  },

  recordForm(){
    const c = custById(App.state.custSel); const r = c.record || {};
    const ta = (label,name,val,ph) => `<div class="f full"><label>${label}</label><textarea name="${name}" placeholder="${ph||''}">${h(val||'')}</textarea></div>`;
    const icdSel = (label,name,val,ph) => `<div class="f full"><label>${label}</label>
      ${Combo.html('cb_'+name, name, val ? icdName(val) : '', icdOptions(),
        ph || 'Gõ tên bệnh hoặc mã ICD, vd: viem tuy, K04', null,
        'Gõ không dấu cũng ra. Chưa có mã thì cứ ghi tên bệnh.')}</div>`;
    App.modal('Bệnh án ngoại trú RHM (BA-18) — ' + c.name, `
    <form class="form-grid" onsubmit="Cust.recordSave(event)">
      ${ta('I. Lý do vào viện, vấn đề sức khỏe','lyDo',r.lyDo)}
      ${ta('II.1. Quá trình bệnh lý và diễn biến lâm sàng','benhLy',r.benhLy,'Đặc điểm khởi phát, triệu chứng, diễn biến...')}
      ${ta('II.2. Tiền sử bản thân','tienSuBanThan',r.tienSuBanThan,'Dị ứng, bệnh nội khoa...')}
      ${ta('Tiền sử gia đình','tienSuGiaDinh',r.tienSuGiaDinh)}
      ${ta('III.1. Khám toàn thân','toanThan',r.toanThan)}
      ${ta('III.2. Khám ngoài miệng','ngoaiMieng',r.ngoaiMieng)}
      ${ta('Khám trong miệng','trongMieng',r.trongMieng)}
      ${ta('III.3. Xét nghiệm, cận lâm sàng','canLamSang',r.canLamSang)}
      ${ta('III.4. Tóm tắt bệnh án','tomTat',r.tomTat)}
      ${icdSel('IV. Chẩn đoán — bệnh chính (kèm mã ICD)','chanDoan',r.chanDoan)}
      ${icdSel('Bệnh kèm theo (nếu có)','chanDoanKem',r.chanDoanKem,'Gõ tên bệnh hoặc mã ICD, vd: cao rang, K03.6')}
      ${icdSel('Biến chứng (nếu có)','bienChung',r.bienChung,'Gõ tên biến chứng hoặc mã ICD, vd: ap xe, K04.7')}
      ${ta('V. Kế hoạch điều trị','keHoach',r.keHoach)}
      <div class="f"><label>Điều trị từ ngày</label><input type="date" name="tuNgay" value="${h(r.tuNgay||'')}"></div>
      <div class="f"><label>Đến ngày</label><input type="date" name="denNgay" value="${h(r.denNgay||'')}"></div>
      <div class="f full"><label>Tình trạng ra viện</label><select name="ketQua"><option value="">— chưa tổng kết —</option>${['Khỏi','Đỡ','Không thay đổi','Nặng hơn','Chưa xác định'].map(o=>`<option${r.ketQua===o?' selected':''}>${o}</option>`).join('')}</select></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu bệnh án</button></div>
    </form>`);
  },
  /* ---------- Các vấn đề (chẩn đoán) của khách ----------
     Một khách có thể có nhiều vấn đề cùng lúc, mỗi cái gắn một răng. Vấn đề đầu
     danh sách là bệnh chính, còn lại vào "bệnh kèm theo" trên bản in BA-18. */
  vanDe(c){ return ((c || {}).record || {}).vanDe || []; },
  vanDeForm(vid){
    const c = custById(App.state.custSel); if (!c) return;
    const v = vid ? this.vanDe(c).find(x => x.id === vid) : {ngay: todayISO(), tinhTrang: 'Chưa điều trị'};
    App.modal((vid ? 'Sửa' : 'Thêm') + ' vấn đề — ' + c.name, `
    <form class="form-grid" onsubmit="Cust.vanDeSave(event,'${vid||''}')">
      <div class="f full"><label>Chẩn đoán (tên bệnh kèm mã ICD)</label>
        ${Combo.html('cbVanDe','icd', v.icd ? icdName(v.icd) : '', icdOptions(),
          'Gõ tên bệnh hoặc mã ICD, vd: viem tuy, K04')}</div>
      <div class="f"><label>Răng / vị trí</label><input name="rang" value="${h(v.rang||'')}" placeholder="R36, hàm trên, 2 hàm..."></div>
      <div class="f"><label>Ngày phát hiện</label><input type="date" name="ngay" value="${h(v.ngay||todayISO())}"></div>
      <div class="f"><label>Tình trạng</label><select name="tinhTrang">
        ${['Chưa điều trị','Đang điều trị','Đã xử lý','Theo dõi'].map(x=>`<option${v.tinhTrang===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="f full"><label>Ghi chú</label><input name="note" value="${h(v.note||'')}"></div>
      <div class="note-block full">Vấn đề <b>đứng đầu danh sách</b> được in vào dòng "Bệnh chính" của bệnh án,
        các vấn đề còn lại vào dòng "Bệnh kèm theo". Kéo thứ tự bằng nút ↑ ↓.</div>
      <div class="form-actions full">
        ${vid?`<button type="button" class="btn danger" onclick="Cust.vanDeXoa('${vid}')">Xóa vấn đề</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  vanDeSave(ev, vid){
    ev.preventDefault();
    const c = custById(App.state.custSel);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.icd = icdCode(d.icd);
    if (!d.icd) { App.toast('Chưa chọn chẩn đoán'); return; }
    if (!c.record) c.record = {};
    if (!c.record.vanDe) c.record.vanDe = [];
    const cu = vid && c.record.vanDe.find(x => x.id === vid);
    if (cu) Object.assign(cu, d); else c.record.vanDe.push(Object.assign({id: uid()}, d));
    this.dongBoChanDoan(c);
    save(); App.render(); this.vanDeBang(); App.toast('Đã lưu vấn đề ✓');
  },
  vanDeXoa(vid){
    const c = custById(App.state.custSel);
    if (!confirm('Xóa vấn đề này khỏi bệnh án?')) return;
    c.record.vanDe = this.vanDe(c).filter(x => x.id !== vid);
    this.dongBoChanDoan(c);
    save(); App.render(); this.vanDeBang(); App.toast('Đã xóa');
  },
  vanDeDoiCho(vid, huong){
    const c = custById(App.state.custSel), ds = this.vanDe(c);
    const i = ds.findIndex(x => x.id === vid), j = i + huong;
    if (i < 0 || j < 0 || j >= ds.length) return;
    const t = ds[i]; ds[i] = ds[j]; ds[j] = t;
    this.dongBoChanDoan(c);
    save(); App.render(); this.vanDeBang();
  },
  /* Vấn đề đầu = bệnh chính, còn lại = bệnh kèm theo — để bản in giữ đúng mẫu BA-18 */
  /* Chẩn đoán gõ trong khung ghi răng chảy xuống bảng Chẩn đoán.
     Những dòng do khung răng sinh ra được đánh dấu tuRang để lần sau còn sửa hoặc
     dọn đúng dòng đó — dòng quản lý tự thêm tay thì không đụng tới.
     Một răng chỉ giữ một dòng tự sinh; đổi chẩn đoán thì sửa tại chỗ, xóa chẩn đoán
     thì gỡ dòng đó đi. */
  vanDeTuRang(c, n, icd){
    if (!c.record) c.record = {};
    if (!c.record.vanDe) c.record.vanDe = [];
    const ds = c.record.vanDe;
    const i = ds.findIndex(x => x.tuRang && String(x.rang) === String(n));
    if (!icd) { if (i >= 0) ds.splice(i, 1); return; }
    if (i >= 0) { ds[i].icd = icd; ds[i].ngay = ds[i].ngay || todayISO(); }
    else ds.push({id: uid(), icd, rang: String(n), note: '', ngay: todayISO(),
                  tinhTrang: 'Đang điều trị', tuRang: 1});
  },
  dongBoChanDoan(c){
    const ds = this.vanDe(c);
    if (!c.record) c.record = {};
    /* Xóa hết vấn đề thì phải xóa luôn dòng Bệnh chính, không thì bệnh án in ra
       vẫn còn chẩn đoán của lần trước. */
    if (!ds.length) { c.record.chanDoan = ''; c.record.chanDoanKem = ''; c._up = Date.now(); return; }
    c.record.chanDoan = ds[0].icd;
    c.record.chanDoanKem = ds.slice(1).map(x => icdName(x.icd) + (x.rang ? ' (R' + x.rang + ')' : '')).join('; ');
    c._up = Date.now();
  },
  /* Danh sách chẩn đoán mở riêng, để khung Bệnh án điện tử chỉ còn 5 dòng giấy tờ */
  vanDeBang(){
    const c = custById(App.state.custSel); if (!c) return;
    App.modal('IV. Chẩn đoán — các vấn đề của ' + c.name, `
      <div class="note-block mb">Một khách có thể có nhiều vấn đề cùng lúc, tất cả nằm trên
        <b>một bệnh án</b>. Vấn đề đứng đầu in vào dòng <b>Bệnh chính</b>, còn lại vào
        <b>Bệnh kèm theo</b> — đổi thứ tự bằng nút ↑ ↓.</div>
      ${this.vanDeHTML(c)}
      <div class="form-actions" style="margin-top:10px">
        <button class="btn primary" onclick="Cust.vanDeForm()">${IC.plus} Thêm vấn đề</button>
        <span class="spacer"></span>
        <button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },
  vanDeHTML(c){
    const ds = this.vanDe(c);
    const rows = ds.map((v, i) => `<tr>
      <td>${i === 0 ? '<span class="pill danger">Bệnh chính</span>' : '<span class="pill mutedp">Kèm theo</span>'}</td>
      <td><b>${h(icdName(v.icd))}</b>${v.tuRang?' <span class="pill mutedp">từ sơ đồ răng</span>':''}${
        v.note?`<br><span class="sub-line">${h(v.note)}</span>`:''}</td>
      <td class="num">${h(v.rang||'—')}</td>
      <td class="num">${v.ngay?fmtD(v.ngay):'—'}</td>
      <td>${h(v.tinhTrang||'')}</td>
      <td style="white-space:nowrap">
        <button class="btn small" ${i===0?'disabled':''} onclick="Cust.vanDeDoiCho('${v.id}',-1)">↑</button>
        <button class="btn small" ${i===ds.length-1?'disabled':''} onclick="Cust.vanDeDoiCho('${v.id}',1)">↓</button>
        <button class="btn small" onclick="Cust.vanDeForm('${v.id}')">Sửa</button></td></tr>`).join('')
      || '<tr><td colspan="6" class="sub-line">Chưa ghi vấn đề nào. Một khách có thể có nhiều vấn đề cùng lúc — thêm từng cái, mỗi cái gắn một răng.</td></tr>';
    return `<div class="tbl-wrap"><table style="min-width:560px">
      <thead><tr><th></th><th>Chẩn đoán (ICD)</th><th>Răng</th><th>Phát hiện</th><th>Tình trạng</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  recordSave(ev){
    ev.preventDefault();
    const c = custById(App.state.custSel);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    ['chanDoan','chanDoanKem','bienChung'].forEach(k => d[k] = icdCode(d[k]));
    c.record = Object.assign({dienBien:(c.record&&c.record.dienBien)||[]}, c.record, d);
    save(); App.closeModal(); App.render(); App.toast('Đã lưu bệnh án ✓');
  },

  /* Khách đang xem: tab Khách hàng dùng custSel, tab Điều trị dùng treatCust */
  aiDangXem(cid){ return custById(cid || (App.cur === 'treatment' ? App.state.treatCust : App.state.custSel)); },
  dienBienCua(c){ return ((c || {}).record || {}).dienBien || []; },

  visitForm(vid, cid){
    const c = this.aiDangXem(cid); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const v = vid ? this.dienBienCua(c).find(x => x.id === vid) : null;
    App.modal((v ? 'Sửa' : 'Thêm') + ' diễn biến điều trị — ' + c.name, `
    <form class="form-grid" onsubmit="Cust.visitSave(event,'${vid||''}','${c.id}')">
      ${(() => {
        /* Diễn biến luôn thuộc về MỘT dịch vụ đang làm dở. Việc đã hoàn tất thì không
           còn gì để ghi diễn biến nữa, nên không đưa vào danh sách — trừ khi đang sửa
           lại một dòng cũ đã gắn vào nó, lúc đó phải giữ để khỏi mất liên kết. */
        const dangLam = db.treatments.filter(t => t.customerId === c.id && t.status !== 'Hoàn tất');
        const cu = v && v.treatmentId ? db.treatments.find(t => t.id === v.treatmentId) : null;
        const ds = cu && !dangLam.some(t => t.id === cu.id) ? dangLam.concat([cu]) : dangLam;
        return `<div class="f full"><label>Ghi diễn biến cho dịch vụ nào</label>
          <select name="treatmentId" onchange="Cust.doiDichVuDienBien()">
            <option value="">— không gắn dịch vụ nào —</option>
            ${ds.map(t => `<option value="${t.id}"${(v && v.treatmentId) === t.id ? ' selected' : ''}>${h(t.name)}${
              t.tooth ? ' — R' + h(t.tooth) : ''} · ${h(t.status)}</option>`).join('')}</select>
          <div class="combo-hint">${dangLam.length
            ? 'Chỉ hiện những dịch vụ <b>chưa hoàn tất</b>. Chọn xong thì đợt điều trị, bác sĩ và mẫu điền nhanh bên dưới tự bám theo dịch vụ đó.'
            : 'Khách này chưa có dịch vụ nào đang làm dở — thêm hạng mục ở tab <b>Điều trị</b> trước.'}</div></div>`;
      })()}
      <div class="f"><label>Ngày</label><input type="date" name="date" value="${h((v&&v.date)||todayISO())}" required>
        <div class="combo-hint">Mặc định hôm nay — ghi bù cho buổi trước thì đổi sang ngày khác.</div></div>
      <div class="f"><label>Bác sĩ thực hiện</label><select name="doctorId">
        <option value="">— chưa ghi —</option>
        ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${v&&v.doctorId===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`).join('')}</select></div>
      <div class="f"><label>Người phụ (trợ thủ)</label><select name="assistantId">
        <option value="">— không có —</option>
        ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${v&&v.assistantId===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`).join('')}</select></div>
      ${(() => {
        /* Đợt điều trị đi theo dịch vụ chứ không chọn riêng — một dịch vụ chỉ nằm trong
           đúng một đợt, cho chọn tay chỉ tạo cơ hội gắn lệch. */
        const t0 = v && v.treatmentId ? db.treatments.find(x => x.id === v.treatmentId) : null;
        const e0 = t0 && t0.episodeId ? (db.episodes || []).find(e => e.id === t0.episodeId) : null;
        return `<div class="f full"><label>Thuộc đợt điều trị</label>
          <div id="oDot" class="tooth-info" style="margin-top:0">${Cust.moTaDot(e0)}</div>
          <input type="hidden" name="episodeId" value="${h(e0 ? e0.id : '')}"></div>`;
      })()}
      <div class="f full"><label>Công đoạn đã làm trong buổi này</label>
        <div id="oCongDoan">${Cust.khoiCongDoan(v && v.treatmentId ? db.treatments.find(x => x.id === v.treatmentId) : null, v)}</div>
        <div class="combo-hint">Tick công đoạn nào thì công đoạn đó được ghi là <b>đã làm</b> trong hạng mục điều trị,
          người làm lấy theo <b>bác sĩ</b> chọn ở trên — đây là căn cứ tính hoa hồng.</div></div>
      <div class="f full"><label>Diễn biến bệnh</label><textarea name="db" rows="3" required>${h((v&&v.db)||'')}</textarea></div>
      <div class="f full"><label>Chỉ định — xử trí</label><textarea name="xt" rows="3">${h((v&&v.xt)||'')}</textarea></div>
      <div class="f full"><label>Dặn dò sau điều trị</label><textarea name="dan" rows="2">${h((v&&v.dan)||'')}</textarea></div>
      <div class="form-actions full">
        ${vid?`<button type="button" class="btn danger" onclick="Cust.visitDel('${vid}','${c.id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">${v?'Lưu':'Thêm'}</button></div>
    </form>`);
  },
  /* Các công đoạn của quy trình gắn với dịch vụ đang chọn. Công đoạn nào đã làm rồi
     thì đánh dấu ✓ kèm ngày và người làm, để khỏi ghi trùng. */
  khoiCongDoan(t, v){
    if (!t) return '<span class="sub-line">Chọn dịch vụ ở trên để thấy các công đoạn.</span>';
    const q = QT.cua(t);
    if (!q || !(q.buoc || []).length)
      return '<span class="sub-line">Dịch vụ này chưa gắn quy trình công đoạn nào — đặt trong Cài đặt → Quy trình.</span>';
    const xong = {}; (t.cd || []).forEach(x => xong[x.b] = x);
    const cua = new Set((v && v.congDoan) || []);
    return `<div class="check-row">${q.buoc.map(b => {
      const da = xong[b.b], ai = da ? ((staffById(da.s) || {}).name || '') : '';
      return `<label title="${da ? 'Đã làm ' + fmtD(da.d) + (ai ? ' — ' + h(ai) : '') : 'Chưa làm'}">
        <input type="checkbox" name="congDoan" value="${b.b}"${cua.has(b.b) ? ' checked' : ''}>
        ${h(b.t)}${da ? (cua.has(b.b) ? '' : ' ✓') : ''}</label>`;
    }).join('')}</div>`;
  },
  moTaDot(e){
    return e ? `<b>${h(e.ten || '(chưa đặt tên)')}</b> — mở ${fmtD(e.tuNgay)}${e.status ? ' · ' + h(e.status) : ''}`
             : '<span class="sub-line">Chọn dịch vụ ở trên — đợt điều trị sẽ hiện theo dịch vụ đó.</span>';
  },
  /* Đổi dịch vụ thì đợt điều trị, bác sĩ, người phụ và công đoạn đều bám theo */
  doiDichVuDienBien(){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const id = (f.querySelector('[name="treatmentId"]') || {}).value;
    const t = db.treatments.find(x => x.id === id);
    const dat = (n, val) => { const o = f.querySelector(`[name="${n}"]`); if (o && val) o.value = val; };
    if (t) {
      if (!(f.querySelector('[name="doctorId"]') || {}).value) dat('doctorId', t.doctorId);
      if (!(f.querySelector('[name="assistantId"]') || {}).value) dat('assistantId', t.assistantId);
    }
    /* Đợt điều trị bám theo dịch vụ */
    const e = t && t.episodeId ? (db.episodes || []).find(x => x.id === t.episodeId) : null;
    const oe = f.querySelector('[name="episodeId"]'); if (oe) oe.value = e ? e.id : '';
    const hd = document.getElementById('oDot'); if (hd) hd.innerHTML = this.moTaDot(e);
    const cd = document.getElementById('oCongDoan');
    if (cd) cd.innerHTML = this.khoiCongDoan(t || null, null);
  },
  visitSave(ev, vid, cid){
    ev.preventDefault();
    const c = custById(cid) || this.aiDangXem(); if (!c) return;
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!c.record) c.record = {};
    if (!c.record.dienBien) c.record.dienBien = [];
    /* FormData chỉ giữ một giá trị cho các ô trùng tên — công đoạn phải gom tay */
    d.congDoan = [...ev.target.querySelectorAll('[name="congDoan"]:checked')].map(x => x.value);
    const cu = vid && c.record.dienBien.find(x => x.id === vid);
    this.ghiCongDoan(d, (cu && cu.congDoan) || []);
    if (cu) Object.assign(cu, d);
    else c.record.dienBien.push(Object.assign({id: uid()}, d));
    save(); App.closeModal(); App.render(); App.toast(cu ? 'Đã lưu diễn biến ✓' : 'Đã thêm diễn biến ✓');
  },
  /* Công đoạn tick trong buổi khám được ghi thẳng vào hạng mục điều trị — đó mới là
     chỗ hoa hồng và tiến độ đọc tới. Bỏ tick thì chỉ gỡ đúng công đoạn mà CHÍNH buổi
     này từng ghi, không đụng vào công đoạn của buổi khác. */
  ghiCongDoan(d, cuaCu){
    const t = db.treatments.find(x => x.id === d.treatmentId);
    if (!t) return;
    t.cd = t.cd || [];
    cuaCu.filter(b => !d.congDoan.includes(b)).forEach(b => { t.cd = t.cd.filter(x => x.b !== b); });
    d.congDoan.forEach(b => {
      const co = t.cd.find(x => x.b === b);
      if (co) { if (d.doctorId) co.s = d.doctorId; if (d.date) co.d = d.date; }
      else t.cd.push({b, s: d.doctorId || '', d: d.date || todayISO()});
    });
    /* Làm xong công đoạn nào là ca đó đang chạy — trạng thái "Chưa điều trị" hết đúng */
    if (t.cd.length && t.status === 'Chưa điều trị') t.status = 'Đang điều trị';
    t._up = Date.now();
  },
  visitDel(vid, cid){
    if (!confirm('Xóa diễn biến này khỏi bệnh án?')) return;
    const c = custById(cid); if (!c || !c.record) return;
    c.record.dienBien = (c.record.dienBien||[]).filter(x => x.id !== vid);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa');
  },
  /* Dòng thời gian dùng chung cho cả tab Khách hàng lẫn tab Điều trị */
  timelineHTML(c){
    const ds = this.dienBienCua(c).slice().sort((a,b) => (a.date||'') < (b.date||'') ? 1 : -1);
    if (!ds.length) return '<span class="sub-line">Chưa có diễn biến điều trị — bấm "Thêm diễn biến".</span>';
    return ds.map(v => {
      const bs = staffById(v.doctorId);
      return `<div class="tl-item clickable" onclick="Cust.visitForm('${v.id||''}','${c.id}')" title="Bấm để sửa">
        <span class="tl-date num">${fmtD(v.date)}</span>
        <b>${h(v.db)}</b><p>${(() => {
          const t = v.treatmentId ? db.treatments.find(x => x.id === v.treatmentId) : null;
          return t ? `<span class="pill info">${h(t.name)}${t.tooth?' · R'+h(t.tooth):''}</span><br>` : '';
        })()}${h(v.xt||'')}${bs?` <span class="sub-line">· BS ${h(bs.name)}</span>`:''}${
          (() => { const pt = staffById(v.assistantId); return pt ? ` <span class="sub-line">· phụ: ${h(pt.name)}</span>` : ''; })()}${
          (() => { const e=(db.episodes||[]).find(x=>x.id===v.episodeId); return e?` <span class="pill mutedp">${h(e.ten||'đợt')}</span>`:''; })()}</p></div>`;
    }).join('');
  },

  del(id){
    const c = custById(id);
    if (!confirm('Xóa hồ sơ khách hàng "' + c.name + '"? Toàn bộ điều trị, phiếu thu, đơn thuốc liên quan sẽ bị xóa. Không thể hoàn tác.')) return;
    db.customers = db.customers.filter(x=>x.id!==id);
    db.treatments = db.treatments.filter(x=>x.customerId!==id);
    db.receipts = db.receipts.filter(x=>x.customerId!==id);
    db.rx = db.rx.filter(x=>x.customerId!==id);
    db.appointments = db.appointments.filter(x=>x.customerId!==id);
    db.labs = db.labs.filter(x=>x.customerId!==id);
    if (App.state.custSel === id) App.chonKhach(db.customers[0] && db.customers[0].id);
    save(); App.render(); App.toast('Đã xóa hồ sơ');
  },
};

SCREENS.customers = () => {
  const o = App.state.custO || {ma: 1, ten: 1, sdt: 1};
  const list = Cust.locDS();
  const rows = Cust.hangHTML(list);
  /* Sắp xếp theo cột đang chọn, bấm lại tiêu đề cột thì đảo chiều */
  const sx = App.state.custSort || {k:'code', d:1};
  const th = (k, nhan, phai) => `<th class="${phai?'r ':''}sap ${sx.k===k?'dang':''}" onclick="Cust.sapXep('${k}')"
    title="Bấm để sắp xếp">${nhan}<span class="sap-mui">${sx.k===k?(sx.d>0?'▲':'▼'):'⇅'}</span></th>`;

  const c = custById(App.state.custSel);
  let detail = '';
  if (c) {
    const r = c.record || {};
    const tags = [];
    if (c.allergy) tags.push(`<span class="pill danger">⚕ ${h(c.allergy)}</span>`);
    const debt = custDebt(c); if (debt) tags.push(`<span class="pill warn">Công nợ ${money(debt)}</span>`);
    if (r.chanDoan) tags.push(`<span class="pill info">${h(icdName(r.chanDoan))}</span>`);
    detail = `
    <div class="card mb" id="custDetail">
      <div class="card-h"><h2>Hồ sơ: ${h(c.name)}</h2><span class="hint">${h(c.code)}</span><span class="spacer"></span>
        <button class="btn small" onclick="Cust.form('${c.id}')">Sửa hồ sơ</button>
        <button class="btn small primary" onclick="App.chonKhach('${c.id}');Treat.trang='kham';App.go('treatment')">Khám · chẩn đoán · kế hoạch →</button>
        ${Perm.only('xoa', `<button class="btn small danger" onclick="Cust.del('${c.id}')">Xóa</button>`)}</div>
      <div class="card-b">
        <div class="form-grid" style="gap:8px 16px">
          <div class="f"><label>Ngày sinh</label><b class="num">${fmtD(c.dob)}</b></div>
          <div class="f"><label>Điện thoại</label><b class="num">${h(c.phone||'—')}</b></div>
          <div class="f"><label>Địa chỉ</label><b>${h(fullAddr(c)||'—')}</b></div>
          <div class="f"><label>Đối tượng · CCCD</label><b>${h(c.doiTuong||'—')} · ${h(c.cccd||'—')}</b></div>
          <div class="f"><label>Thân nhân báo tin</label><b>${h(c.kinName||'—')} ${c.kinPhone?'· '+h(c.kinPhone):''}</b></div>
          <div class="f"><label>Nguồn khách</label><b>${h(c.source||'—')}</b>${
            c.gtTen ? `<br><span class="sub-line">Do ${c.gtId
              ? `<button class="link-btn" onclick="App.chonKhach('${c.gtId}')">${h(c.gtTen)}</button>`
              : h(c.gtTen)}${c.gtPhone ? ' · ' + h(c.gtPhone) : ''} giới thiệu</span>` : ''}</div>
        </div>
        <div class="check-row" style="margin-top:8px">${tags.join(' ')}</div>
      </div>
    </div>
    ${Cal.cardKhachHTML(c)}
    ${Photo.cardHTML(c)}`;
  }

  return `
  <div class="page-head"><h1>Khách hàng</h1><span class="spacer"></span>
    ${Perm.only('caidat', `<button class="btn" onclick="App.dedupeForm()">Dọn trùng lặp</button>`)}
    <button class="btn" onclick="Importer.anhForm()">${IC.cam} Nhập từ ảnh chụp</button>
    <button class="btn primary" onclick="Cust.form()">${IC.plus} Thêm khách hàng</button>
    <div class="sub">${db.customers.length} hồ sơ · thông tin hành chính theo mẫu BA-18</div></div>
  <div class="card mb"><div class="card-b">
    <div class="searchbar" style="margin:0">${IC.search}
      <input id="oTimKH" placeholder="Gõ mã KH, tên hoặc số điện thoại — kết quả hiện ngay"
        value="${h(App.state.custQ)}" autocomplete="off" oninput="Cust.goTim()"
        onkeydown="if(event.key==='Enter'){event.preventDefault();Cust.timNgay()}"></div>
    <div class="check-row" style="margin-top:10px;align-items:center">
      <span class="sub-line">Dò theo:</span>
      ${[['ma','Mã KH'],['ten','Tên'],['sdt','Số điện thoại']].map(([k,l]) =>
        `<label><input type="checkbox" id="tim_${k}"${o[k]?' checked':''} onchange="Cust.timNgay()"> ${l}</label>`).join('')}
      <span class="spacer"></span>
      <button class="btn" id="custBoTim" onclick="Cust.boTim()"
        style="${App.state.custQ ? '' : 'display:none'}">Bỏ dò</button>
    </div>
    <div class="sub-line" id="custTimBC" style="margin-top:8px${App.state.custQ ? '' : ';display:none'}">${
      Cust.bcTimHTML(list.length)}</div>
  </div></div>
  <div class="card mb"><div class="tbl-wrap"><table>
    <thead><tr>${th('code','Mã KH')}${th('name','Tên khách hàng')}${th('sdt','Số điện thoại')}${th('diachi','Địa chỉ')}${Perm.can('thu')?th('no','Công nợ',1):''}</tr></thead>
    <tbody id="custRows">${rows}</tbody></table></div></div>
  ${detail}`;
};

/* ---------- Bệnh án điện tử ----------
   Tách hẳn khỏi màn Khách hàng. Giấy tờ bệnh án là việc làm theo đợt và theo hạn nộp,
   không phải việc mỗi lần khách tới; để chung thì ngày nào mở hồ sơ cũng thấy năm cái
   phiếu "Chưa lập" nằm giữa đường, trong khi lễ tân chỉ cần ghi tình trạng răng.
   Dữ liệu vẫn là một: màn này đọc thẳng hồ sơ và đợt điều trị đã nhập bên kia. */
SCREENS.benhan = () => {
  const cid = App.state.custSel || (db.customers[0] && db.customers[0].id);
  const c = custById(cid);
  if (!c) return `<div class="page-head"><h1>Bệnh án điện tử</h1>
    <div class="sub">Chưa có khách hàng nào — thêm ở tab Khách hàng trước.</div></div>`;
  App.chonKhach(cid);
  const r = c.record || {};
  const ds = Dot.cua(c.id);
  const ep = Dot.dangChon(c);
  const thieu = [];
  if (!r.lyDo) thieu.push('lý do đến khám');
  if (!r.chanDoan) thieu.push('chẩn đoán');
  if (!c.dob) thieu.push('ngày sinh');
  if (!fullAddr(c)) thieu.push('địa chỉ');
  if (!c.cccd) thieu.push('số CCCD');

  return `
  <div class="page-head"><h1>Bệnh án điện tử</h1><span class="spacer"></span>
    <span style="min-width:300px;flex:2;max-width:620px">${Combo.html('cbBACust','baCust', custLabel(c), custOptions(),
      'Chọn khách: gõ tên, SĐT hoặc mã KH', HoSo.onCustPick)}</span>
    <div class="sub">Hồ sơ giấy tờ theo mẫu Bộ Y tế — điền trên máy rồi in khổ A4</div></div>

  <div class="card mb"><div class="card-b" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">
    <div style="flex:1;min-width:220px">
      <b style="font-size:15px">${h(c.name)}</b> <span class="sub-line">· ${h(c.code||'')}</span><br>
      <span class="sub-line">${fmtD(c.dob)||'chưa có ngày sinh'} · ${h(c.phone||'chưa có SĐT')} · ${h(fullAddr(c)||'chưa có địa chỉ')}</span>
    </div>
    <button class="btn small" onclick="App.chonKhach('${c.id}');App.go('customers')">Sửa thông tin hành chính →</button>
  </div></div>

  ${thieu.length ? `<div class="note-block warn-block mb">Bệnh án còn thiếu <b>${h(thieu.join(', '))}</b>.
    Những mục này lấy từ hồ sơ khách và phần khám — điền bên tab <b>Khách hàng</b> thì ở đây tự có.</div>`
   : `<div class="note-block mb">Đủ các mục bắt buộc của bệnh án. Dữ liệu lấy thẳng từ hồ sơ khách và đợt điều trị, không nhập lại.</div>`}

  ${ds.length > 1 ? `<div class="card mb"><div class="card-h"><h2>Đợt điều trị</h2>
      <span class="hint">bốn phiếu dưới thuộc về đợt đang chọn</span></div>
    <div class="card-b"><select onchange="Dot.chon(this.value);App.render()">
      ${ds.map(e => `<option value="${e.id}"${ep && ep.id === e.id ? ' selected' : ''}>${
        fmtD(e.tuNgay)}${e.denNgay ? ' – ' + fmtD(e.denNgay) : ''}${e.lyDo ? ' · ' + h(e.lyDo) : ''}</option>`).join('')}
    </select></div></div>` : ''}

  ${HoSo.cardHTML(c)}`;
};

/* ---------- Lịch hẹn ---------- */
const Cal = {
  /* Lịch hẹn của riêng một khách — dùng cho trang "Hẹn lần sau" trong tab Điều trị */
  dsKhachHTML(c){
    const ds = (db.appointments || []).filter(a => a.customerId === c.id)
      .sort((a, b) => ((a.date || '') + (a.time || '')) < ((b.date || '') + (b.time || '')) ? 1 : -1);
    if (!ds.length) return `<div class="sub-line">Chưa có lịch hẹn nào cho khách này.</div>`;
    const nay = todayISO();
    return `<div class="tbl-wrap"><table style="min-width:560px">
      <thead><tr><th>Ngày giờ</th><th>Nội dung</th><th>Bác sĩ</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${ds.map(a => `<tr${(a.date || '') < nay ? ' style="opacity:.6"' : ''}>
        <td class="num">${fmtD(a.date)}<br><span class="sub-line num">${h(a.time || '')}${a.dur ? ' · ' + a.dur + ' phút' : ''}</span></td>
        <td>${h(a.note || a.lyDo || '—')}</td>
        <td>${h((staffById(a.doctorId) || {}).name || '—')}</td>
        <td><span class="pill ${/hủy|không đến/i.test(a.status || '') ? 'danger' : (a.date || '') < nay ? 'mutedp' : 'info'}">${h(a.status || '')}</span></td>
        <td><button class="btn small" onclick="Cal.form('${a.id}')">Sửa</button></td></tr>`).join('')}</tbody></table></div>`;
  },
  setDate(v){ App.state.calDate = v || todayISO(); App.render(); },
  shift(d){ App.state.calDate = isoAdd(App.state.calDate, d); App.render(); },
  doiKieu(k){ App.state.calView = k; App.render(); },

  /* Khoảng ngày đang xem, tùy kiểu xem. Tuần tính từ thứ Hai. */
  khoang(D, kieu){
    if (kieu === 'tuan') {
      const d = new Date(D + 'T00:00');
      const lui = (d.getDay() + 6) % 7;
      const tu = isoAdd(D, -lui), den = isoAdd(tu, 6);
      return {tu, den, tieuDe: 'Tuần ' + fmtD(tu) + ' – ' + fmtD(den)};
    }
    if (kieu === 'thang') {
      const y = +D.slice(0,4), m = +D.slice(5,7);
      const tu = D.slice(0,7) + '-01';
      const den = isoOf(new Date(y, m, 0));      /* ngày 0 của tháng sau = ngày cuối tháng này */
      return {tu, den, tieuDe: 'Tháng ' + String(m).padStart(2,'0') + '/' + y};
    }
    return {tu: D, den: D, tieuDe: fmtD(D)};
  },
  cacNgay(tu, den){ const r = []; for (let d = tu; d <= den; d = isoAdd(d, 1)) r.push(d); return r; },
  lui(){
    const k = App.state.calView || 'ngay';
    App.state.calDate = k === 'ngay' ? isoAdd(App.state.calDate, -1)
      : k === 'tuan' ? isoAdd(this.khoang(App.state.calDate,'tuan').tu, -7)
      : isoAdd(this.khoang(App.state.calDate,'thang').tu, -1).slice(0,7) + '-01';
    App.render();
  },
  toi(){
    const k = App.state.calView || 'ngay';
    App.state.calDate = k === 'ngay' ? isoAdd(App.state.calDate, 1)
      : k === 'tuan' ? isoAdd(this.khoang(App.state.calDate,'tuan').den, 1)
      : isoAdd(this.khoang(App.state.calDate,'thang').den, 1);
    App.render();
  },
  /* cid: đặt lịch sẵn cho một khách — dùng khi bấm bước "Hẹn lần sau" ở thanh quy trình */
  form(id, cid){
    const a = id ? db.appointments.find(x=>x.id===id)
                 : {date:App.state.calDate || todayISO(), time:'09:00', dur:30,
                    status:'Chờ xác nhận', customerId: cid || ''};
    const labOpts = db.labs.filter(l=>!l.received).map(l=>`<option value="${l.id}"${a.labOrderId===l.id?' selected':''}>${h(l.type)} ${h(l.teeth)} — ${h(custById(l.customerId)?custById(l.customerId).name:'')}</option>`).join('');
    App.modal(id?'Sửa lịch hẹn':'Đặt lịch hẹn', `
    <form class="form-grid" onsubmit="Cal.save(event,'${id||''}')">
      <div class="f full"><label>Khách hàng</label>
        ${Combo.html('cbApptCust','customerName', custLabel(custById(a.customerId)), custOptions(),
          'Gõ tên, số điện thoại hoặc mã KH', pickCustomerInto, 'Gõ không dấu cũng ra.')}
        <input type="hidden" name="customerId" value="${h(a.customerId||'')}"></div>
      <div class="f"><label>Ngày</label><input type="date" name="date" value="${a.date}" required></div>
      <div class="f"><label>Giờ</label><input type="time" name="time" value="${a.time}" required></div>
      <div class="f"><label>Thời lượng (phút)</label><input type="number" name="dur" value="${a.dur}" min="15" step="15"></div>
      <div class="f"><label>Ghế</label><select name="chair">${CHAIRS.map(g=>`<option${a.chair===g?' selected':''}>${g}</option>`).join('')}</select></div>
      <div class="f full"><label>Nội dung / dịch vụ</label>
        ${Combo.html('cbApptSvc','service', a.service||'', Svc.goiY(),
          'Gõ tên dịch vụ, vd: cao voi, implant', null,
          'Gợi ý lấy từ bảng giá phòng khám. Gõ tự do cũng được.')}</div>
      <div class="f"><label>Bác sĩ</label><select name="doctorId">${db.staff.filter(s=>(s.role||'').includes('Bác sĩ')).map(s=>`<option value="${s.id}"${a.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Trạng thái</label><select name="status">${APPT_STATUS.map(s=>`<option${a.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="f full"><label>Chờ hàng lab (nếu có)</label><select name="labOrderId"><option value="">— không —</option>${labOpts}</select></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Cal.del('${id}')">Xóa lịch</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu lịch hẹn</button></div>
    </form>`);
  },
  /* Lịch hẹn của riêng một khách, hiện ngay trong hồ sơ khách đó */
  cuaKhach(cid){
    return (db.appointments || []).filter(a => a.customerId === cid)
      .sort((a, b) => (a.date + (a.time||'')) < (b.date + (b.time||'')) ? 1 : -1);
  },
  cardKhachHTML(c){
    const ds = this.cuaKhach(c.id), T = todayISO();
    const sap = ds.filter(a => a.date >= T && a.status !== 'Hủy' && a.status !== 'Hoàn tất');
    const rows = ds.slice(0, 12).map(a => {
      const st = a.status === 'Hoàn tất' ? 'ok' : a.status === 'Hủy' ? 'mutedp'
               : a.date < T ? 'danger' : a.date === T ? 'info' : 'warn';
      const bs = staffById(a.doctorId);
      const lab = a.labOrderId ? db.labs.find(l => l.id === a.labOrderId) : null;
      return `<tr class="clickable" onclick="Cal.moTuHoSo('${a.id}')">
        <td class="num"><b>${h(a.time||'')}</b><br><span class="sub-line">${fmtD(a.date)}</span></td>
        <td>${h(a.service||'—')}<br><span class="sub-line">${h(a.chair||'')}${bs?' · '+h(bs.name):''}${a.tuOnline?' · đặt online':''}</span></td>
        <td><span class="pill ${st}">${h(a.status||'')}</span>
          ${lab && !lab.received ? '<br><span class="pill danger">răng chưa về</span>' : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="3" class="sub-line">Khách này chưa có lịch hẹn nào.</td></tr>';
    return `<div class="card mb"><div class="card-h"><h2>Lịch hẹn của khách</h2>
      <span class="hint">${sap.length ? sap.length + ' lịch sắp tới' : 'không có lịch sắp tới'}${ds.length > 12 ? ' · hiện 12 lần gần nhất' : ''}</span>
      <span class="spacer"></span>
      <button class="btn small" onclick="Cal.datChoKhach('${c.id}')">${IC.plus} Đặt lịch</button></div>
      <div class="tbl-wrap"><table style="min-width:420px">
        <thead><tr><th>Giờ · ngày</th><th>Nội dung</th><th>Trạng thái</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  },
  /* Đặt lịch ngay từ hồ sơ khách: điền sẵn khách này */
  datChoKhach(cid){
    const c = custById(cid); if (!c) return;
    this.form();
    setTimeout(() => {
      const b = document.getElementById('modalBody'); if (!b) return;
      const inp = b.querySelector('#cbApptCust .combo-input');
      if (inp) inp.value = custLabel(c);
      const hid = b.querySelector('[name="customerId"]');
      if (hid) hid.value = c.id;
    }, 0);
  },
  /* Bấm một lịch hẹn trong hồ sơ: mở luôn form sửa lịch đó */
  moTuHoSo(id){
    const a = (db.appointments || []).find(x => x.id === id);
    if (a) App.state.calDate = a.date;
    this.form(id);
  },

  /* Hai lịch hẹn đè lên nhau khi khoảng [giờ, giờ+thời lượng) của chúng giao nhau */
  deNhau(a, b){
    const x = hm2m(a.time), y = hm2m(b.time);
    if (x == null || y == null || a.date !== b.date) return false;
    return x < y + (+b.dur || 30) && y < x + (+a.dur || 30);
  },
  /* Các lịch hẹn đã có đè lên khung này. loc để lọc thêm theo bác sĩ hoặc ghế. */
  trungGio(hen, boQuaId, loc){
    return (db.appointments || []).filter(a =>
      a.id !== boQuaId && a.status !== 'Hủy' && this.deNhau(hen, a) && (!loc || loc(a)));
  },
  moTaHen(a){
    const c = custById(a.customerId), bs = staffById(a.doctorId);
    return a.time + ' — ' + (c ? c.name : '?') + (a.service ? ' (' + a.service + ')' : '')
      + (bs ? ' · ' + bs.name : '') + (a.chair ? ' · ' + a.chair : '');
  },

  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!d.customerId) { App.toast('Hãy chọn khách hàng từ danh sách gợi ý'); return; }
    delete d.customerName;
    d.dur = num(d.dur) || 30;
    /* Một bác sĩ không thể ngồi hai ghế cùng lúc — chặn hẳn, không cho lưu. */
    if (d.doctorId && d.status !== 'Hủy') {
      const dung = this.trungGio(d, id, a => a.doctorId === d.doctorId);
      if (dung.length) {
        const bs = staffById(d.doctorId);
        App.modal('Trùng giờ bác sĩ', `
          <div class="note-block mb" style="border-color:var(--danger)">
            <b>${h(bs ? bs.name : 'Bác sĩ này')}</b> đã có lịch đè lên khung
            <b>${h(d.time)}</b> ngày <b>${fmtD(d.date)}</b> (${d.dur} phút):</div>
          <ul>${dung.map(a => `<li>${h(Cal.moTaHen(a))}</li>`).join('')}</ul>
          <div class="note-block" style="margin-top:10px">Đổi giờ, đổi bác sĩ, hoặc rút ngắn thời lượng rồi lưu lại.</div>
          <div class="form-actions"><button class="btn primary" onclick="App.closeModal()">Đã hiểu</button></div>`);
        return;
      }
    }
    /* Cùng một ghế cũng không kê được hai người — cái này chỉ cảnh báo, vì có thể
       đổi ghế lúc làm thật hoặc ca trước xong sớm. */
    if (d.chair && d.status !== 'Hủy') {
      const ghe = this.trungGio(d, id, a => a.chair === d.chair);
      const X = String.fromCharCode(10);
      if (ghe.length && !confirm(d.chair + ' đang có lịch đè lên khung này:' + X + X
          + ghe.map(a => '• ' + Cal.moTaHen(a)).join(X) + X + X + 'Vẫn lưu?')) return;
    }
    if (id) Object.assign(db.appointments.find(x=>x.id===id), d);
    else db.appointments.push(Object.assign({id:uid()}, d));
    if (d.labOrderId) { const l = db.labs.find(x=>x.id===d.labOrderId); if (l) l.apptId = id || db.appointments[db.appointments.length-1].id; }
    save(); App.closeModal(); App.state.calDate = d.date; App.render(); App.toast('Đã lưu lịch hẹn ✓');
  },
  del(id){
    if (!confirm('Xóa lịch hẹn này?')) return;
    db.appointments = db.appointments.filter(x=>x.id!==id);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa lịch hẹn');
  },
  status(id, st){
    const a = db.appointments.find(x=>x.id===id); a.status = st;
    save(); App.render(); App.toast('→ ' + st);
  },
};

SCREENS.calendar = () => {
  /* Hỏi máy chủ xem còn yêu cầu nào đang chờ, để hiện số lên nút */
  setTimeout(() => DatHen.capNhatDem(), 0);
  const D = App.state.calDate, kieu = App.state.calView || 'ngay';
  const {tu, den, tieuDe} = Cal.khoang(D, kieu);
  const trong = db.appointments.filter(a => a.date >= tu && a.date <= den);

  const dongHen = a => {
    const c = custById(a.customerId); const doc = staffById(a.doctorId);
    const lab = a.labOrderId ? db.labs.find(l=>l.id===a.labOrderId) : null;
    const labWarn = lab && !lab.received ? `<span class="pill danger">Răng chưa về từ lab!</span>` : (lab ? `<span class="pill ok">Hàng lab đã về</span>` : '');
    return `<div class="row-item">
      <span class="time-chip num">${h(a.time)}</span>
      <span class="r-main"><b>${h(c?c.name:'?')}</b><span>${h(a.service)} · ${h(a.chair||'')} · ${h(doc?doc.name:'')}</span>${labWarn?'<span style="display:block;margin-top:3px">'+labWarn+'</span>':''}</span>
      <select onchange="Cal.status('${a.id}',this.value)" style="padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:12.5px">
        ${APPT_STATUS.map(s=>`<option${a.status===s?' selected':''}>${s}</option>`).join('')}</select>
      <button class="btn small" onclick="Cal.form('${a.id}')">Sửa</button>
    </div>`;
  };

  let than = '';
  if (kieu === 'ngay') {
    const rows = trong.sort((a,b)=>a.time<b.time?-1:1).map(dongHen).join('')
      || '<div class="sub-line" style="padding:12px 4px">Không có lịch hẹn ngày này. Bấm "Đặt lịch" để thêm.</div>';
    than = `<div class="card"><div class="card-h"><h2>${WEEKD[new Date(D+'T00:00').getDay()]}, ${fmtD(D)}</h2>
      <span class="hint">${trong.length} lịch hẹn</span></div>
      <div class="card-b row-list">${rows}</div></div>`;
  } else if (kieu === 'tuan') {
    /* Mỗi ngày một thẻ, ngày không có hẹn vẫn hiện để thấy chỗ trống mà xếp khách */
    than = Cal.cacNgay(tu, den).map(d => {
      const ds = trong.filter(a => a.date === d).sort((a,b)=>a.time<b.time?-1:1);
      const homNay = d === todayISO();
      return `<div class="card mb"><div class="card-h">
        <h2 style="${homNay?'color:var(--accent-ink)':''}">${WEEKD[new Date(d+'T00:00').getDay()]}, ${fmtD(d)}${homNay?' · hôm nay':''}</h2>
        <span class="hint">${ds.length||'không có'} lịch hẹn</span><span class="spacer"></span>
        <button class="btn small" onclick="Cal.setDate('${d}');Cal.doiKieu('ngay')">Mở ngày này</button></div>
        ${ds.length?`<div class="card-b row-list">${ds.map(dongHen).join('')}</div>`:''}</div>`;
    }).join('');
  } else {
    /* Tháng: lưới 7 cột, mỗi ô là một ngày, bấm vào mở ngày đó */
    const dau = new Date(tu + 'T00:00');
    const lui = (dau.getDay() + 6) % 7;                 /* tuần bắt đầu từ thứ Hai */
    const o = [];
    for (let i = 0; i < lui; i++) o.push('');
    Cal.cacNgay(tu, den).forEach(d => o.push(d));
    while (o.length % 7) o.push('');
    than = `<div class="card"><div class="card-h"><h2>${h(tieuDe)}</h2><span class="hint">${trong.length} lịch hẹn cả tháng</span></div>
      <div class="card-b">
        <div class="thang-lich">
          ${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<div class="thang-dau">${x}</div>`).join('')}
          ${o.map(d => {
            if (!d) return '<div class="thang-o trong"></div>';
            const ds = trong.filter(a => a.date === d);
            const homNay = d === todayISO();
            return `<button class="thang-o${homNay?' hom-nay':''}${ds.length?' co-hen':''}" onclick="Cal.setDate('${d}');Cal.doiKieu('ngay')"
              title="${fmtD(d)} — ${ds.length} lịch hẹn">
              <span class="thang-so num">${+d.slice(8)}</span>
              ${ds.length?`<span class="thang-dem">${ds.length} hẹn</span>
                <span class="thang-ten">${ds.slice(0,2).map(a=>h((custById(a.customerId)||{}).name||'?').split(' ').slice(-1)[0]).join(', ')}${ds.length>2?'…':''}</span>`:''}
            </button>`;
          }).join('')}
        </div>
      </div></div>`;
  }

  return `
  <div class="page-head"><h1>Lịch hẹn</h1><span class="spacer"></span>
    <button class="btn" onclick="DatHen.moDanhSach()">Đặt hẹn online${
      DatHen._cho ? ` <span class="pill warn">${DatHen._cho}</span>` : ''}</button>
    <button class="btn primary" onclick="Cal.form()">${IC.plus} Đặt lịch</button></div>
  <div class="subtabs">${[['ngay','Ngày'],['tuan','Tuần'],['thang','Tháng']].map(([k,l])=>
    `<button class="subtab ${kieu===k?'active':''}" onclick="Cal.doiKieu('${k}')">${l}</button>`).join('')}</div>
  <div class="date-nav mb">
    <button class="btn small" onclick="Cal.lui()">‹ ${kieu==='ngay'?'Hôm trước':kieu==='tuan'?'Tuần trước':'Tháng trước'}</button>
    <input type="date" value="${D}" onchange="Cal.setDate(this.value)">
    <button class="btn small" onclick="Cal.toi()">${kieu==='ngay'?'Hôm sau':kieu==='tuan'?'Tuần sau':'Tháng sau'} ›</button>
    <button class="btn small" onclick="Cal.setDate('${todayISO()}')">Hôm nay</button>
    <span class="spacer"></span><span class="sub-line">${h(tieuDe)} · ${trong.length} lịch hẹn</span>
  </div>
  ${DatHen.bangChoHTML()}
  ${than}
  <div class="legend" style="margin-top:10px"><span><i style="background:var(--ok)"></i>Đã xác nhận</span><span><i style="background:var(--warn)"></i>Chờ xác nhận</span><span><i style="background:var(--info)"></i>Đang điều trị</span></div>`;
};

/* ---------- Điều trị & thanh toán ---------- */
const Treat = {
  trang: 'kham',
  doiTrang(k){ this.trang = k; App.state.rangMo = null; App.state.rangChon = null; App.render(); },
  /* ---------- Kế hoạch điều trị ----------
     Hai nguồn: dịch vụ gắn vào từng răng trên sơ đồ kế hoạch (c.teethKH), và dịch vụ
     không thuộc răng nào — cạo vôi, tẩy trắng, niềng — để riêng ở c.keHoachKhac. */
  keHoachDS(c){
    const kho = c.teethKH || {};
    const theoRang = Object.keys(kho).map(Number)
      .filter(n => !isNaN(n) && kho[n] && kho[n].dichVu).sort((a, b) => a - b)
      .map(n => ({rang: n, dichVu: kho[n].dichVu, chanDoan: kho[n].chanDoan, tt: Tooth.moTa(n, kho[n])}));
    const khac = (c.keHoachKhac || []).map(x => ({id: x.id, dichVu: x.dichVu, chanDoan: x.chanDoan, tt: ''}));
    return theoRang.concat(khac);
  },
  giaCua(ten){
    const dv = (db.services || []).find(x => Combo.norm(x.name || '') === Combo.norm(ten || ''));
    return dv ? (+dv.price || 0) : 0;
  },
  keHoachHTML(c){
    const ds = this.keHoachDS(c);
    if (!ds.length) return `<div class="sub-line">Chưa có dịch vụ nào trong kế hoạch. Bấm vào răng trên sơ đồ
      rồi chọn <b>Dịch vụ điều trị</b>, hoặc bấm <b>Thêm dịch vụ</b> cho những việc không thuộc răng nào.</div>`;
    const daCo = n => (db.treatments || []).some(t => t.customerId === c.id
      && String(t.tooth || '').split(/[^0-9]+/).includes(String(n)));
    const rows = ds.map(x => {
      const gia = this.giaCua(x.dichVu);
      const co = x.rang ? daCo(x.rang) : false;
      return `<tr><td class="num">${x.rang ? 'R' + x.rang : '<span class="sub-line">cả hàm</span>'}</td>
        <td>${h(x.tt || '—')}</td>
        <td>${x.chanDoan ? h(icdName(x.chanDoan)) : '<span class="sub-line">—</span>'}</td>
        <td><b>${h(x.dichVu)}</b></td>
        <td class="r num">${gia ? money(gia) : '<span class="sub-line">chưa có giá</span>'}</td>
        <td style="white-space:nowrap">${(() => {
          const hm = x.rang ? Cust.hangMucCua(c, x.rang) : Cust.hangMucKH(c, x.id);
          return hm ? `<span class="pill ${trangThaiMau(hm.status)}">${h(hm.status)}</span>` : '';
        })()}
          <button class="btn small danger" onclick="Treat.khBo('${x.rang || ''}','${x.id || ''}')">Xóa</button></td></tr>`;
    }).join('');
    const tong = ds.reduce((t, x) => t + this.giaCua(x.dichVu), 0);
    return `<div class="tbl-wrap"><table style="min-width:680px">
      <thead><tr><th>Răng</th><th>Tình trạng</th><th>Chẩn đoán</th><th>Dịch vụ sẽ làm</th><th class="r">Giá</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      ${tong ? `<div class="note-block" style="margin-top:10px">Tạm tính <b>${money(tong)}</b> cho ${ds.length} dịch vụ —
        giá chốt theo hạng mục điều trị chứ không theo bảng này.</div>` : ''}`;
  },
  khThem(){
    const c = custById(App.state.treatCust || App.state.custSel); if (!c) return;
    /* Thứ tự đúng như lúc làm thật: nhìn răng nào, chẩn đoán ra sao, rồi mới tới
       làm gì và bao nhiêu tiền. */
    App.modal('Thêm dịch vụ vào kế hoạch — ' + c.name, `
    <form class="form-grid" onsubmit="Treat.khThemSave(event)">
      <div class="f full"><label>Chọn răng trên sơ đồ</label>
        ${Tooth.chonSoHTML('rang')}</div>
      <div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbKHDx', 'chanDoan', '', Cust.icdHopVoi('ok', null), 'Gõ tên bệnh hoặc mã ICD')}</div>
      <div class="f full"><label>Dịch vụ</label>
        ${Combo.html('cbKHDv', 'dichVu', '', Svc.goiY(1), 'Gõ tên dịch vụ, vd: cao voi, tay trang',
          v => Treat.khChonDV(v), 'Chọn dịch vụ là tự điền giá.')}</div>
      <div class="f"><label>Đơn giá / răng (₫)</label>
        ${Tien.o('donGia', '', 'oninput="Treat.khTinhTien()"')}</div>
      <div class="f"><label>Số lượng</label>
        <input type="number" name="sl" min="1" step="1" value="1" oninput="Treat.khTinhTien()"></div>
      <div class="f"><label>Giảm giá (%)</label>
        <input type="number" name="giamPct" min="0" max="100" step="0.5" placeholder="0" oninput="Treat.khTinhTien()"></div>
      <div class="f"><label>Giảm thêm (₫)</label>
        ${Tien.o('giamTien', '', 'oninput="Treat.khTinhTien()"')}</div>
      <div class="f"><label>Trạng thái</label><select name="tinhTrangDT">
        ${TREAT_STATUS.map(x => `<option${x === 'Chưa điều trị' ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="f"><label>&nbsp;</label>
        <div class="note-block" style="margin:0;padding:9px 12px">Thành tiền: <b id="khTien">0 ₫</b></div></div>
      <div class="note-block full">Chọn nhiều răng thì <b>mỗi răng được một hạng mục riêng</b> theo đơn giá trên.
        Không chọn răng nào thì tính cho cả hàm, số lượng lấy theo ô Số lượng.</div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Thêm vào kế hoạch</button></div>
    </form>`);
  },
  khChonDV(v){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const dv = (db.services || []).find(x => x.name === v);
    const o = f.querySelector('[name="donGia"]');
    if (dv && o && !num(o.value)) o.value = Tien.dinh(String(dv.price || 0));
    this.khTinhTien();
  },
  khTinhTien(){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const g = k => (f.querySelector('[name="' + k + '"]') || {}).value;
    const o = document.getElementById('khTien');
    if (o) o.textContent = money(this.thanhTien(num(g('donGia')), +g('sl') || 1, +g('giamPct') || 0, num(g('giamTien'))));
  },
  khThemSave(ev){
    ev.preventDefault();
    const c = custById(App.state.treatCust || App.state.custSel); if (!c) return;
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const ten = (d.dichVu || '').trim();
    if (!ten) { App.toast('Chưa chọn dịch vụ'); return; }
    const ds = String(d.rang || '').split(/[^0-9]+/).map(x => parseInt(x, 10)).filter(x => x > 0);
    const icd = icdCode((d.chanDoan || '').trim());
    const gia = {donGia: num(d.donGia), sl: +d.sl || 1, giamPct: +d.giamPct || 0,
                 giamTien: num(d.giamTien), status: d.tinhTrangDT || 'Chưa điều trị'};
    if (ds.length) {
      /* Gắn vào răng thì lấy sẵn tình trạng bên sơ đồ khám làm nền, giống khi bấm vào răng */
      c.teethKH = c.teethKH || {};
      ds.forEach(n => {
        const nen = c.teethKH[n] || Object.assign({}, (c.teeth || {})[n] || {s: 'ok', mat: []});
        c.teethKH[n] = Object.assign({}, nen, {dichVu: ten, chanDoan: icd});
        if (icd) Cust.vanDeTuRang(c, n, icd);
        /* Mỗi răng một hạng mục, số lượng 1 — đơn giá trong ô là giá của MỘT răng */
        Cust.ghiHangMuc(c, {tuRang: String(n)}, ten,
          Object.assign({}, gia, {tooth: String(n), sl: 1}), 'Răng ' + n);
      });
      if (icd) Cust.dongBoChanDoan(c);
    } else {
      c.keHoachKhac = c.keHoachKhac || [];
      const kh = {id: uid(), dichVu: ten, chanDoan: icd};
      c.keHoachKhac.push(kh);
      Cust.ghiHangMuc(c, {tuKH: kh.id}, ten, Object.assign({}, gia, {tooth: ''}), ten);
    }
    save(); App.closeModal(); App.render();
    App.toast('Đã thêm vào kế hoạch ✓' + (ds.length > 1 ? ' (' + ds.length + ' răng)' : ''));
  },
  khBo(rang, id){
    const c = custById(App.state.treatCust || App.state.custSel); if (!c) return;
    const n = parseInt(rang, 10);
    const ten = n ? ((c.teethKH || {})[n] || {}).dichVu
                  : ((c.keHoachKhac || []).find(x => x.id === id) || {}).dichVu;
    if (!confirm('Bỏ "' + (ten || '') + '" khỏi kế hoạch?\n\nHạng mục điều trị đã lập thì không bị đụng tới.')) return;
    if (n) {
      /* Chỉ gỡ phần kế hoạch, giữ nguyên tình trạng răng đã ghi */
      if (c.teethKH && c.teethKH[n]) { c.teethKH[n].dichVu = ''; c.teethKH[n].chanDoan = ''; }
      /* Gỡ luôn hạng mục do răng này sinh ra, y như dòng của cả hàm — bỏ khỏi kế
         hoạch mà hạng mục còn nằm đó thì công nợ vẫn tính tiền dịch vụ vừa bỏ. */
      Cust.ghiHangMuc(c, {tuRang: String(n)}, '', {}, 'Răng ' + n);
    } else {
      Cust.ghiHangMuc(c, {tuKH: id}, '', {}, ten || 'Mục này');
      c.keHoachKhac = (c.keHoachKhac || []).filter(x => x.id !== id);
    }
    save(); App.render(); App.toast('Đã bớt khỏi kế hoạch');
  },
  setCust(id){ App.chonKhach(id); App.render(); },
  onCustPick(v){
    const code = String(v).split('·').pop().trim();
    const c = db.customers.find(x => x.code === code);
    if (c) Treat.setCust(c.id);
  },
  /* ================= Sơ đồ tiến trình điều trị =================
     Cùng một bộ răng, nhưng ở tab Điều trị thì màu răng nói về TIẾN ĐỘ chứ không
     phải bệnh lý: răng nào chưa làm, đang làm, đã xong. Bấm vào răng là đổi được
     trạng thái ngay, không phải mở từng hạng mục. */
  rangCua(t){ return Tooth.rangCua(t); },
  /* Mỗi răng đang ở đâu trong tiến trình — răng có nhiều hạng mục thì lấy cái
     "trễ" nhất, vì răng chỉ xong khi mọi việc trên nó đã xong. */
  tienDoRang(cid){
    const m = {};
    const bac = {'Báo giá': 0, 'Chưa điều trị': 1, 'Đang điều trị': 2, 'Hoàn tất': 3};
    db.treatments.filter(t => t.customerId === cid).forEach(t => {
      this.rangCua(t).forEach(n => {
        if (!m[n] || bac[t.status] < bac[m[n]]) m[n] = t.status;
      });
    });
    return m;
  },
  mucCuaRang(cid, n){
    return db.treatments.filter(t => t.customerId === cid && this.rangCua(t).indexOf(+n) >= 0);
  },
  soDoHTML(c){
    const td = this.tienDoRang(c.id);
    const chon = App.state.rangTri || null;
    const hang = ds => ds.map(n => {
      const st = td[n];
      const lop = st === 'Hoàn tất' ? 'tt-xong' : st === 'Đang điều trị' ? 'tt-dang'
                : st === 'Chưa điều trị' ? 'tt-chua' : st === 'Báo giá' ? 'tt-bao' : '';
      const muc = st ? this.mucCuaRang(c.id, n) : [];
      const mo = muc.length ? muc.map(t => t.name).join(', ') + ' — ' + st : 'chưa có dịch vụ nào';
      return `<button class="tooth ${lop} ${(chon||[]).includes(n)?'dang-chon':''}"
        onclick="Treat.rangClick(${n})" title="Răng ${n}: ${h(mo)}">
        <span class="tooth-svg">${Tooth.svg(n, (c.teethST||c.teeth||{})[n])}${Tooth.deLen(n, (c.teethST||c.teeth||{})[n])}</span>
        <span class="tooth-no num">${n}</span></button>`;
    }).join('');
    const dem = {};
    Object.values(td).forEach(x => dem[x] = (dem[x] || 0) + 1);
    return `<div class="arch-lb"><span>Hàm trên · phải bệnh nhân</span><span>trái bệnh nhân</span></div>
      <div class="arch" style="margin-bottom:10px">${hang(TEETH_UP.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_UP.slice(8))}</div>
      <div class="arch">${hang(TEETH_DN.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_DN.slice(8))}</div>
      <div class="arch-lb"><span>Hàm dưới · phải bệnh nhân</span><span>trái bệnh nhân</span></div>
      <div class="legend" style="margin-top:12px">
        ${TIEN_DO.map(([t, k]) => `<span><i class="lg-${k}"></i>${t}${dem[t]?' ('+dem[t]+')':''}</span>`).join('')}
        <span><i class="lg-mutedp"></i>Báo giá${dem['Báo giá']?' ('+dem['Báo giá']+')':''}</span>
      </div>`;
  },
  batChonNhieu(){
    App.state.rangTri = App.state.rangTri ? null : [];
    App.render();
  },
  rangClick(n){
    const cid = App.state.treatCust;
    if (App.state.rangTri) {
      const ds = App.state.rangTri;
      const i = ds.indexOf(n);
      if (i >= 0) ds.splice(i, 1); else ds.push(n);
      App.render(); return;
    }
    const c = custById(cid);
    const muc = this.mucCuaRang(cid, n);
    const kh = (c.teethKH || {})[n];
    App.modal('Răng ' + n + ' — tiến trình điều trị', `
      ${muc.length ? `<div class="card mb"><div class="card-h"><h2>${muc.length} dịch vụ trên răng ${n}</h2></div>
        <div class="card-b">${muc.map(t => `<div class="ho-so-file">
          <div class="hsf-than"><div class="hsf-dau"><b>${h(t.name)}</b>
            <span class="pill ${trangThaiMau(t.status)}">${h(t.status)}</span></div>
            <div class="hsf-mo">${money(t.price)}${t.tooth?' · R'+h(t.tooth):''}
              ${(staffById(t.doctorId)||{}).name ? ' · '+h((staffById(t.doctorId)||{}).name) : ''}</div>
            <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
              ${TIEN_DO.map(([tt, k]) => `<button class="btn small ${t.status===tt?'primary':''}"
                onclick="Treat.datTrangThai('${t.id}','${tt}')">${tt}</button>`).join('')}</div>
          </div>
          <div class="hsf-nut"><button class="btn small" onclick="Treat.itemForm('${t.id}')">Sửa</button></div>
        </div>`).join('')}</div></div>`
        : `<div class="note-block mb">Răng ${n} chưa có dịch vụ nào trong tiến trình điều trị.
            ${kh && kh.dichVu ? `Sơ đồ kế hoạch đang ghi: <b>${h(kh.dichVu)}</b>.` : ''}</div>`}
      <div class="form-actions">
        <button class="btn primary" onclick="Treat.themChoRang('${n}')">${IC.plus} Thêm dịch vụ cho răng ${n}</button>
        <span class="spacer"></span>
        <button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },
  datTrangThai(id, tt){
    const t = db.treatments.find(x => x.id === id); if (!t) return;
    t.status = tt;
    /* Xong việc thì ghi luôn ngày, để sơ đồ "Sau điều trị" và báo cáo có mốc đúng */
    if (tt === 'Hoàn tất' && !t.date) t.date = todayISO();
    save(); App.render();
    App.toast('Răng ' + (t.tooth || '') + ': ' + t.name + ' → ' + tt);
    const n = this.rangCua(t)[0];
    if (n) this.rangClick(n);
  },
  /* dichVu: điền sẵn luôn tên dịch vụ, dùng khi đưa một dòng kế hoạch thành hạng mục */
  themChoRang(rang, dichVu){
    App.closeModal();
    setTimeout(() => {
      this.itemForm();
      const f = document.querySelector('#modalBody form');
      if (!f) return;
      const o = f.querySelector('[name="tooth"]');
      if (o) o.value = rang;
      if (dichVu) {
        const d = f.querySelector('[name="name"]');
        /* onServicePick mới là chỗ điền đơn giá và nhóm dịch vụ — gán thẳng .value
           thì không có sự kiện nào chạy, nên giá để trống và người ta phải tự gõ lại. */
        if (d) { d.value = dichVu; Treat.onServicePick(dichVu, d); }
      }
      if (typeof Treat.tinhLai === 'function') Treat.tinhLai();
    }, 60);
  },
  /* Đổi trạng thái hàng loạt cho những răng đang chọn */
  nhieuRangForm(){
    const ds = (App.state.rangTri || []).slice().sort((a,b)=>a-b);
    if (!ds.length) { App.toast('Chưa chọn răng nào'); return; }
    const cid = App.state.treatCust;
    const muc = [...new Set(ds.flatMap(n => this.mucCuaRang(cid, n).map(t => t.id)))]
      .map(id => db.treatments.find(t => t.id === id));
    App.modal('Tiến trình cho ' + ds.length + ' răng', `
      <div class="note-block mb">Đang chọn: <b>${ds.map(n=>'R'+n).join(', ')}</b>.
        ${muc.length ? `Có <b>${muc.length}</b> dịch vụ nằm trên những răng này.`
                     : 'Chưa dịch vụ nào nằm trên những răng này — bấm "Thêm dịch vụ" để lập một hạng mục chung.'}</div>
      ${muc.length ? `<div class="f full"><label>Đổi trạng thái cả ${muc.length} dịch vụ thành</label>
        <div class="form-actions" style="justify-content:flex-start">
          ${TIEN_DO.map(([tt]) => `<button class="btn" onclick="Treat.datNhieu('${tt}')">${tt}</button>`).join('')}
        </div></div>
        <div class="card mb"><div class="card-b">${muc.map(t => `<div class="alert-line">
          <span class="alert-ico ${trangThaiMau(t.status)==='ok'?'info':'warn'}">•</span>
          <div>${h(t.name)} <span class="sub-line">R${h(t.tooth)}</span>
            <span class="pill ${trangThaiMau(t.status)}">${h(t.status)}</span></div></div>`).join('')}</div></div>` : ''}
      <div class="form-actions">
        <button class="btn primary" onclick="Treat.themChoRang('${ds.join(', ')}')">${IC.plus} Thêm dịch vụ cho ${ds.length} răng</button>
        <span class="spacer"></span>
        <button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },
  datNhieu(tt){
    const ds = (App.state.rangTri || []);
    const cid = App.state.treatCust;
    const ids = [...new Set(ds.flatMap(n => this.mucCuaRang(cid, n).map(t => t.id)))];
    ids.forEach(id => {
      const t = db.treatments.find(x => x.id === id); if (!t) return;
      t.status = tt;
      if (tt === 'Hoàn tất' && !t.date) t.date = todayISO();
    });
    save(); App.closeModal(); App.render();
    App.toast('Đã đặt ' + ids.length + ' dịch vụ thành "' + tt + '" ✓');
  },

  itemForm(id){
    /* Thêm mới thì mặc định "Chưa điều trị" — dịch vụ đã ghi cho răng là đã chốt làm.
       Ai chỉ muốn báo giá thăm dò thì đổi lại trong ô Trạng thái. */
    const t = id ? db.treatments.find(x=>x.id===id) : {status:'Chưa điều trị', date:todayISO()};
    App.modal(id?'Sửa hạng mục điều trị':'Thêm hạng mục điều trị', `
    <form class="form-grid" onsubmit="Treat.itemSave(event,'${id||''}')">
      <div class="f full"><label>Dịch vụ</label>
        ${Combo.html('cbService','name', (db.services.find(s=>s.id===t.serviceId)||{}).name || t.name || '',
          Svc.goiY(1),
          'Gõ tên dịch vụ, vd: implant, tram, cao voi', Treat.onServicePick,
          'Gõ không dấu cũng ra. Dịch vụ mới thì cứ gõ rồi tự điền giá.')}
        <div class="combo-hint">Sửa tên, loại hoặc giá dịch vụ trong
          <b>Cài đặt → Bảng giá dịch vụ</b>.</div></div>
      <input type="hidden" name="group" value="${h(t.group||'')}">
      <div class="f full"><label>Răng / vị trí</label>
        <input name="tooth" value="${h(t.tooth||'')}" placeholder="Vd: 36, 37, 46 — cách nhau bằng dấu phẩy" oninput="Treat.tinhLai()">
        <div class="combo-hint">Ghi nhiều răng thì <b>số lượng tự đếm theo số răng</b>. Ghi kiểu "2 hàm" thì số lượng để 1.</div></div>
      <div class="f"><label>Đơn giá / răng (₫)</label>${Tien.o('donGia', t.donGia != null ? t.donGia : t.price, 'required oninput="Treat.tinhLai()"')}</div>
      <div class="f"><label>Số lượng</label><input type="number" name="sl" min="1" step="1" value="${t.sl||1}" oninput="Treat.tinhLai()"></div>
      <div class="f"><label>Giảm giá (%)</label><input type="number" name="giamPct" min="0" max="100" step="0.5" value="${t.giamPct||''}" placeholder="0" oninput="Treat.tinhLai()"></div>
      <div class="f"><label>Giảm thêm (₫)</label>${Tien.o('giamTien', t.giamTien, 'oninput="Treat.tinhLai()"')}</div>
      <div class="f full"><div class="note-block" id="thanhTien"></div></div>
      <div class="f"><label>Trạng thái</label><select name="status">${TREAT_STATUS.map(s=>`<option${t.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Treat.itemDel('${id}')">Xóa</button>
        <button type="button" class="btn" onclick="QT.ghi('${id}')">Công đoạn & hoa hồng</button><span class="spacer"></span>`:''}
        <span id="moTinh" style="display:none"></span>
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  onServicePick(v, inp){
    const s = db.services.find(x => x.name === v); if (!s) return;
    const f = inp.form;
    const dg = f.querySelector('[name=donGia]'), grp = f.querySelector('[name=group]');
    if (dg && !num(dg.value)) dg.value = Tien.dinh(String(s.price || 0));
    if (grp) grp.value = s.group;
    Treat.tinhLai();
  },
  /* Đếm số răng từ ô "Răng": "36, 37, 46" -> 3. Ghi kiểu "2 hàm" thì coi như 1. */
  demRang(v){
    const ds = String(v||'').split(/[,;/]+/).map(x => x.trim()).filter(Boolean)
      .filter(x => /^R?\d{1,2}$/i.test(x));
    return ds.length;
  },
  /* Thành tiền = đơn giá × số lượng − giảm %, − giảm tiền */
  thanhTien(donGia, sl, pct, tien){
    const goc = (+donGia || 0) * (+sl || 1);
    const sauPct = goc - goc * (Math.min(100, Math.max(0, +pct || 0)) / 100);
    return Math.max(0, Math.round(sauPct - (+tien || 0)));
  },
  tinhLai(){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const g = n => (f.querySelector('[name="' + n + '"]') || {}).value;
    const oSl = f.querySelector('[name="sl"]');
    const demR = this.demRang(g('tooth'));
    if (demR && oSl && +oSl.value !== demR) oSl.value = demR;   /* số lượng đi theo số răng */
    const donGia = num(g('donGia')), sl = +(oSl ? oSl.value : 1) || 1;
    const pct = +g('giamPct') || 0, tien = num(g('giamTien'));
    const goc = donGia * sl, tt = this.thanhTien(donGia, sl, pct, tien);
    const o = document.getElementById('thanhTien');
    if (o) o.innerHTML = `Thành tiền: <b style="font-size:15px">${money(tt)}</b>`
      + (goc !== tt ? ` <span class="sub-line">(${money(donGia)} × ${sl} = ${money(goc)}, giảm ${money(goc - tt)})</span>`
                    : (sl > 1 ? ` <span class="sub-line">(${money(donGia)} × ${sl} răng)</span>` : ''));
  },

  itemSave(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.name = (d.name || '').trim();
    const s = db.services.find(x => x.name === d.name);
    d.serviceId = s ? s.id : '';
    d.donGia = num(d.donGia);
    d.sl = Math.max(1, +d.sl || this.demRang(d.tooth) || 1);
    d.giamPct = Math.min(100, Math.max(0, +d.giamPct || 0));
    d.giamTien = num(d.giamTien);
    /* price là THÀNH TIỀN — mọi chỗ khác (công nợ, hoa hồng, phiếu thu) đều đọc ô này */
    d.price = this.thanhTien(d.donGia, d.sl, d.giamPct, d.giamTien);
    d.name = d.name || 'Dịch vụ'; d.group = s ? s.group : (d.group || 'Khác');
    if (id) Object.assign(db.treatments.find(x=>x.id===id), d);
    else db.treatments.push(Object.assign({id:uid(), customerId:App.state.treatCust, date:todayISO()}, d));
    save(); App.closeModal(); App.render(); App.toast('Đã lưu hạng mục ✓');
  },
  itemDel(id){
    if (!confirm('Xóa hạng mục điều trị này?')) return;
    db.treatments = db.treatments.filter(x=>x.id!==id);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa');
  },
  /* Số tiền của một hạng mục còn thiếu bao nhiêu */
  conThieu(t){
    return Math.max(0, (+t.price || 0) - (typeof QT !== 'undefined' ? QT.daThu(t) : 0));
  },
  payForm(){
    const c = custById(App.state.treatCust);
    const debt = custDebt(c);
    /* Nội dung phiếu thu lấy thẳng từ hạng mục đã nhập: tick món nào thu món đó.
       Khỏi gõ tay tên dịch vụ, và phần mềm biết chính xác tiền này trả cho hạng mục
       nào nên chia hoa hồng đúng người, không phải đoán theo nhóm. */
    const muc = (db.treatments || []).filter(t => t.customerId === c.id && t.status !== 'Báo giá'
      && Treat.conThieu(t) > 0);
    App.modal('Thu tiền — ' + c.name, `
    <form class="form-grid" onsubmit="Treat.paySave(event)">
      ${muc.length ? `<div class="f full"><label>Thu cho dịch vụ nào</label>
        <div class="check-list" id="dsMucThu">${muc.map(t => `<label>
          <input type="checkbox" name="muc" value="${t.id}" checked onchange="Treat.doiMucThu()">
          ${h(t.name)}${t.tooth ? ' · R' + h(t.tooth) : ''}
          <span class="sub-line">còn ${money(Treat.conThieu(t))}${
            QT.daThu(t) ? ' / đã trả ' + money(QT.daThu(t)) : ''}</span></label>`).join('')}</div>
        <div class="combo-hint">Bỏ tick món nào thì tiền và nội dung tự trừ món đó ra.</div></div>`
       : `<div class="note-block full">Khách không còn hạng mục nào chưa thu đủ — cứ gõ nội dung tự do bên dưới.</div>`}
      <div class="f full"><label>Nội dung</label>
        <input name="desc" required placeholder="Vd: Trả góp đợt 2 — bọc sứ R36"
               value="${h(muc.map(t => t.name + (t.tooth ? ' R' + t.tooth : '')).join(', '))}">
        <div class="combo-hint">Điền sẵn theo mấy món đã tick — sửa hoặc gõ thêm thoải mái.</div></div>
      <div class="f"><label>Số tiền (₫)</label>${Tien.o('amount', debt, 'required')}</div>
      <div class="f"><label>Hình thức</label><select name="method">${PAY_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="f"><label>Bác sĩ thực hiện</label><select name="doctorId">${db.staff.filter(s=>(s.role||'').includes('Bác sĩ')).map(s=>`<option value="${s.id}">${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Người thu tiền</label><select name="staffId">
        ${db.staff.filter(s=>s.active!==false).map(s=>{const me=Att.myStaff();
          return `<option value="${s.id}"${me&&me.id===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`;}).join('')}</select></div>
      <div class="note-block full">Công nợ hiện tại của khách: <b>${money(debt)}</b>. Phiếu thu sẽ vào sổ quỹ và bảng hoa hồng tự động.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lập phiếu thu</button></div>
    </form>`);
  },
  /* Tick / bỏ tick một món thì nội dung và số tiền chạy theo */
  doiMucThu(){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const ids = [...f.querySelectorAll('[name="muc"]:checked')].map(x => x.value);
    const ds = ids.map(id => (db.treatments || []).find(t => t.id === id)).filter(Boolean);
    const o = f.querySelector('[name="desc"]'), a = f.querySelector('[name="amount"]');
    if (o) o.value = ds.map(t => t.name + (t.tooth ? ' R' + t.tooth : '')).join(', ');
    if (a) a.value = Tien.dinh(String(ds.reduce((s, t) => s + this.conThieu(t), 0)));
  },
  paySave(ev){
    ev.preventDefault();
    const f = ev.target;
    const d = Object.fromEntries(new FormData(f).entries());
    const me = Att.myStaff();
    const ids = [...f.querySelectorAll('[name="muc"]:checked')].map(x => x.value);
    /* Nhóm dịch vụ suy ra từ chính mấy món đã tick — món nào nhiều tiền nhất thì lấy
       nhóm của món đó. Bảng lương theo nhóm và việc rải tiền đều đọc ô này. */
    let nhom = '';
    if (ids.length) {
      const tong = {};
      ids.forEach(id => {
        const t = (db.treatments || []).find(x => x.id === id); if (!t) return;
        tong[t.group || 'Khác'] = (tong[t.group || 'Khác'] || 0) + this.conThieu(t);
      });
      nhom = Object.keys(tong).sort((a, b) => tong[b] - tong[a])[0] || '';
    }
    const r = {id:uid(), no:'PT-'+(db.seq.receipt++), date:todayISO(), customerId:App.state.treatCust, desc:d.desc, method:d.method, amount:num(d.amount), staffId:d.staffId || (me?me.id:''), doctorId:d.doctorId, group:nhom, mucIds: ids, invoice:null};
    db.receipts.push(r);
    save(); App.closeModal(); App.render(); App.toast('Đã lập ' + r.no + ' ✓');
    /* Lập xong mở luôn cửa sổ in khổ A5 — khách còn ngồi đó, khỏi phải tìm nút In */
    Treat.printReceipt(r.id);
  },
  invoice(rid){
    const r = db.receipts.find(x=>x.id===rid);
    r.invoice = {no:'1C26THB-'+String(db.seq.receipt+8000).padStart(8,'0'), code:Math.random().toString(16).slice(2,8).toUpperCase(), date:todayISO()};
    save(); App.render(); App.toast('Đã phát hành HĐĐT qua Viettel SInvoice ✓ (mô phỏng — bản thật cần tài khoản SInvoice)');
  },
  printReceipt(rid){
    const r = db.receipts.find(x=>x.id===rid); if (!r) { App.toast('Không tìm thấy phiếu thu'); return; }
    const c = custById(r.customerId);
    const thu = staffById(r.staffId) || staffById(r.doctorId);
    const conNo = c ? custDebt(c) : 0;
    const ngay = new Date(r.date + 'T00:00');
    App.print(`
    <div class="p-head">
      <div><b>${h(db.clinic.name)}</b><br>${h(db.clinic.legal||'')}<br>${h(db.clinic.addr)}${db.clinic.phone?'<br>ĐT: '+h(db.clinic.phone):''}</div>
      <div style="text-align:right">Số: <b>${h(r.no)}</b><br>Ngày ${ngay.getDate()} tháng ${ngay.getMonth()+1} năm ${ngay.getFullYear()}</div>
    </div>
    <h1>PHIẾU THU</h1>
    <table class="no-border">
      <tr><td style="width:34%">Họ tên người nộp tiền:</td><td><b>${h(c?c.name:'')}</b>${c&&c.code?' — '+h(c.code):''}</td></tr>
      ${c&&c.phone?`<tr><td>Điện thoại:</td><td>${h(c.phone)}</td></tr>`:''}
      ${c&&fullAddr(c)?`<tr><td>Địa chỉ:</td><td>${h(fullAddr(c))}</td></tr>`:''}
      <tr><td>Lý do nộp:</td><td>${h(r.desc)}</td></tr>
      <tr><td>Số tiền:</td><td><b style="font-size:15px">${money(r.amount)}</b></td></tr>
      <tr><td>Bằng chữ:</td><td><i>${h(docTien(r.amount))}</i></td></tr>
      <tr><td>Hình thức thanh toán:</td><td>${h(r.method)}</td></tr>
      <tr><td>Còn lại sau phiếu này:</td><td><b>${money(conNo)}</b>${conNo?'':' <i>(đã thanh toán đủ)</i>'}</td></tr>
      ${r.invoice?`<tr><td>Hóa đơn điện tử:</td><td>${h(r.invoice.no)} — mã tra cứu ${h(r.invoice.code)}</td></tr>`:''}
    </table>
    <div class="sign">
      <div><b>Người nộp tiền</b><br>(Ký, ghi rõ họ tên)<br><br><br><br></div>
      <div><b>Người thu tiền</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(thu?thu.name:'')}</div>
    </div>`, 'A5');
  },
  rxForm(){
    const c = custById(App.state.treatCust);
    const row = i => `<div class="form-grid full" style="grid-template-columns:2fr 1fr 2fr;gap:6px">
      <div class="f">${Combo.html('cbDrug'+i,'drug'+i,'',DRUGS,'Gõ tên thuốc '+(i+1))}</div>
      <div class="f"><input name="qty${i}" placeholder="SL (10 viên)"></div>
      <div class="f"><input name="use${i}" placeholder="Cách dùng"></div></div>`;
    App.modal('Kê đơn thuốc — ' + c.name, `
    <form onsubmit="Treat.rxSave(event)">
      ${c.allergy?`<div class="note-block mb" style="background:var(--danger-soft);color:var(--danger)">⚠ Khách có ghi chú dị ứng: <b>${h(c.allergy)}</b></div>`:''}
      ${[0,1,2,3,4].map(row).join('')}
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu đơn thuốc</button></div>
    </form>`);
  },
  rxSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const items = [];
    for (let i=0;i<5;i++) if (d['drug'+i]) items.push({drug:d['drug'+i], qty:d['qty'+i]||'', use:d['use'+i]||''});
    if (!items.length) { App.toast('Đơn chưa có thuốc nào'); return; }
    db.rx.push({id:uid(), customerId:App.state.treatCust, date:todayISO(), doctorId:'st1', status:'draft', code:'', items});
    save(); App.closeModal(); App.render(); App.toast('Đã lưu đơn thuốc ✓');
  },
  rxSend(id){
    const r = db.rx.find(x=>x.id===id);
    r.status = 'sent';
    const c = custById(r.customerId);
    r.code = '79-' + (c.code||'').replace(/^[A-Za-zÀ-ỹ]+-/, '') + '-' + r.date.replace(/-/g,'').slice(2) + '-' + Math.floor(1000+Math.random()*9000);
    save(); App.render(); App.toast('Đã gửi lên Đơn thuốc quốc gia ✓ (mô phỏng — bản thật cần mã liên thông)');
  },
  printRx(id){
    const r = db.rx.find(x=>x.id===id); const c = custById(r.customerId); const doc = staffById(r.doctorId);
    App.print(`
    <div class="p-head"><div><b>${h(db.clinic.name)}</b><br>${h(db.clinic.addr)}</div><div>${r.code?('Mã đơn QG: <b>'+h(r.code)+'</b><br>'):''}Ngày: ${fmtD(r.date)}</div></div>
    <h1>ĐƠN THUỐC</h1>
    <table class="no-border">
      <tr><td>Họ tên:</td><td><b>${h(c.name)}</b> — ${fmtD(c.dob)} (${h(c.gender||'')})</td></tr>
      <tr><td>Địa chỉ:</td><td>${h(fullAddr(c))}</td></tr>
      <tr><td>Chẩn đoán:</td><td>${h(icdName((c.record||{}).chanDoan))||'—'}</td></tr>
      ${c.allergy?`<tr><td>Dị ứng:</td><td><b>${h(c.allergy)}</b></td></tr>`:''}
    </table>
    <table><tr><th style="width:24px">#</th><th>Thuốc</th><th>Số lượng</th><th>Cách dùng</th></tr>
    ${r.items.map((it,i)=>`<tr><td>${i+1}</td><td><b>${h(it.drug)}</b></td><td>${h(it.qty)}</td><td>${h(it.use)}</td></tr>`).join('')}</table>
    <div class="sign"><div></div><div>Ngày ${fmtD(r.date)}<br><b>Bác sỹ kê đơn</b><br>${h(doc?doc.name:'')}<br><br></div></div>`);
  },
};

SCREENS.treatment = () => {
  const cid = App.state.treatCust || App.state.custSel || (db.customers[0] && db.customers[0].id);
  App.chonKhach(cid);
  const c = custById(cid);
  if (!c) return '<div class="page-head"><h1>Điều trị & thanh toán</h1><div class="sub">Chưa có khách hàng — thêm ở tab Khách hàng.</div></div>';
  const items = db.treatments.filter(t=>t.customerId===cid);
  const total = items.filter(t=>t.status!=='Báo giá').reduce((s,t)=>s+t.price,0);
  const paid = db.receipts.filter(r=>r.customerId===cid).reduce((s,r)=>s+r.amount,0);
  const debt = Math.max(0, total - paid);
  const recs = db.receipts.filter(r=>r.customerId===cid).sort((a,b)=>a.date<b.date?1:-1);
  const rxs = db.rx.filter(r=>r.customerId===cid).sort((a,b)=>a.date<b.date?1:-1);

  const itemRows = items.map(t => {
    const st = trangThaiMau(t.status);
    const phu = staffById(t.assistantId);
    const q = QT.cua(t), xong = (t.cd||[]).length;
    return `<tr class="clickable" onclick="Treat.itemForm('${t.id}')"><td><b>${h(t.name)}</b><br><span class="sub-line">${h(t.group)}</span></td>
    <td class="num">${h(t.tooth||'—')}</td>
    <td>${(() => {
      /* Ai làm thì lấy từ công đoạn đã ghi — form hạng mục không còn hỏi bác sĩ nữa.
         Hạng mục cũ đã gán tay thì vẫn hiện tên đó. */
      const ds = [...new Set((t.cd || []).map(x => (staffById(x.s) || {}).name).filter(Boolean))];
      if (ds.length) return h(ds.join(', '));
      const bs = (staffById(t.doctorId) || {}).name;
      return bs ? h(bs) + (phu ? `<br><span class="sub-line">phụ: ${h(phu.name)}</span>` : '') : '<span class="sub-line">—</span>';
    })()}</td>
    <td><span class="pill ${st}">${t.status}</span></td>
    <td class="r num">${money(t.price)}${(t.sl>1||t.giamPct||t.giamTien)?`<br><span class="sub-line">${money(t.donGia!=null?t.donGia:t.price)}${t.sl>1?' × '+t.sl:''}${(t.giamPct||t.giamTien)?' · giảm'+(t.giamPct?' '+t.giamPct+'%':'')+(t.giamTien?' '+money(t.giamTien):''):''}</span>`:''}</td>
    <td onclick="event.stopPropagation()">${q
      ? `<button class="btn small" onclick="QT.ghi('${t.id}')">Công đoạn ${xong}/${q.buoc.length}</button>`
      : '<span class="sub-line">—</span>'}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="sub-line">Chưa có hạng mục — bấm "Thêm hạng mục".</td></tr>';

  const recRows = recs.map(r => `<tr><td class="num">${fmtD(r.date)}<br><span class="sub-line num">${h(r.no)}</span></td>
    <td>${h(r.desc)}<br><span class="sub-line">${h(r.method)} · ${h(r.group||'')}</span></td>
    <td class="r num" style="font-weight:600">${money(r.amount)}</td>
    <td>${r.invoice
      ? `<span class="pill ok">Đã phát hành</span><br><span class="rx-code num">${h(r.invoice.no)} · tra cứu ${h(r.invoice.code)}</span>`
      : `<button class="btn small" onclick="Treat.invoice('${r.id}')">Phát hành HĐĐT</button>`}</td>
    <td><button class="btn small" onclick="Treat.printReceipt('${r.id}')">${IC.print} In</button></td></tr>`).join('') || '<tr><td colspan="5" class="sub-line">Chưa có phiếu thu.</td></tr>';

  const rxBlocks = rxs.map(r => `
    <div class="rx mb"><div class="rx-head">
      <div><b>Đơn ngày ${fmtD(r.date)}</b> · ${h((staffById(r.doctorId)||{}).name||'')}</div>
      <span>${r.status==='sent'
        ? `<span class="pill ok">Đã liên thông</span> <span class="rx-code num">Mã đơn: ${h(r.code)}</span>`
        : `<button class="btn small primary" onclick="Treat.rxSend('${r.id}')">Gửi đơn quốc gia</button>`}
        <button class="btn small" onclick="Treat.printRx('${r.id}')">${IC.print} In</button></span></div>
      <div class="tbl-wrap"><table style="min-width:460px"><thead><tr><th>Thuốc</th><th>SL</th><th>Cách dùng</th></tr></thead>
      <tbody>${r.items.map(it=>`<tr><td><b>${h(it.drug)}</b></td><td class="num">${h(it.qty)}</td><td>${h(it.use)}</td></tr>`).join('')}</tbody></table></div></div>`).join('') || '<span class="sub-line">Chưa có đơn thuốc.</span>';

  const trang = Treat.trang || 'kham';
  const soHM = items.length, soXong = items.filter(t => t.status === 'Hoàn tất').length;
  const TRANG = [
    ['kham',    '1. Khám · Chẩn đoán · Kế hoạch'],
    ['dichvu',  '2. Dịch vụ & quá trình điều trị' + (soHM ? ' (' + soXong + '/' + soHM + ')' : '')],
    ['thutien', '3. Thu tiền' + (debt ? ' · nợ ' + money(debt) : '')],
    ['hen',     '4. Hẹn lần sau'],
  ];
  const dauTrang = `<div class="subtabs">${TRANG.map(([k, l]) =>
    `<button class="subtab ${trang === k ? 'active' : ''}" onclick="Treat.doiTrang('${k}')">${h(l)}</button>`).join('')}</div>`;

  /* Trang 1 gom đúng ba việc liền nhau của một lần khám: ghi tình trạng răng,
     chốt chẩn đoán, rồi vạch dịch vụ sẽ làm. Trước đây ba việc này nằm ở tab
     Khách hàng còn hạng mục nằm ở đây, nên khám xong phải nhảy qua lại hai tab. */
  if (trang === 'kham') return `
  <div class="page-head"><h1>Điều trị</h1><span class="spacer"></span>
    <span style="min-width:300px;flex:2;max-width:620px">${Combo.html('cbTreatCust','treatCust', custLabel(c), custOptions(),
      'Đổi khách: gõ tên, SĐT hoặc mã KH', Treat.onCustPick)}</span>
    <div class="sub">${h(c.name)} · ${h(c.code||'')}${c.allergy?' · ⚕ '+h(c.allergy):''}</div></div>
  ${dauTrang}
  ${Cust.soDoCardHTML(c)}
  <div class="card mb"><div class="card-h"><h2>Chẩn đoán</h2>
    <span class="hint">vấn đề đứng đầu in vào dòng Bệnh chính của bệnh án</span><span class="spacer"></span>
    <button class="btn small primary" onclick="Cust.vanDeForm()">${IC.plus} Thêm chẩn đoán</button></div>
    <div class="card-b">${Cust.vanDeHTML(c)}</div></div>
  <div class="card"><div class="card-h"><h2>Kế hoạch điều trị</h2>
    <span class="hint">thêm bớt thoải mái — chưa phải hạng mục chính thức</span><span class="spacer"></span>
    <button class="btn small primary" onclick="Treat.khThem()">${IC.plus} Thêm dịch vụ</button>
    <button class="btn small" onclick="Treat.doiTrang('dichvu')">Sang dịch vụ &amp; điều trị →</button></div>
    <div class="card-b">${Treat.keHoachHTML(c)}</div></div>`;

  const dau = `
  <div class="page-head"><h1>Điều trị & thanh toán</h1><span class="spacer"></span>
    <span style="min-width:300px;flex:2;max-width:620px">${Combo.html('cbTreatCust','treatCust', custLabel(c), custOptions(),
      'Đổi khách: gõ tên, SĐT hoặc mã KH', Treat.onCustPick)}</span>
    <button class="btn primary" onclick="Treat.payForm()">Thu tiền</button></div>
  ${dauTrang}
  <div class="card mb"><div class="card-b" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">
    <div style="flex:1;min-width:200px">
      <b style="font-size:15px">${h(c.name)}</b> <span class="sub-line">· ${h(c.code||'')}</span><br>
      <span class="sub-line">${h(c.phone||'chưa có SĐT')} · ${fmtD(c.dob)||'chưa có ngày sinh'} · ${h(fullAddr(c)||'chưa có địa chỉ')}</span>
      ${c.allergy?`<br><span class="pill danger">⚕ ${h(c.allergy)}</span>`:''}
    </div>
    <button class="btn small" onclick="Cust.moHoSo('${c.id}')">Xem hồ sơ đầy đủ →</button>
  </div></div>
`;

  /* Trang 2: những dịch vụ đã lên kế hoạch, sửa thêm bớt ở đây, rồi tiến trình
     điều trị bám theo đúng những dịch vụ đó. */
  if (trang === 'dichvu') return dau + `
  <div class="card mb"><div class="card-h"><h2>Dịch vụ đã lên kế hoạch</h2>
    <span class="hint">thêm bớt thoải mái — chưa phải hạng mục chính thức</span><span class="spacer"></span>
    <button class="btn small primary" onclick="Treat.khThem()">${IC.plus} Thêm dịch vụ</button></div>
    <div class="card-b">${Treat.keHoachHTML(c)}</div></div>
  <div class="card mb"><div class="card-h"><h2>Hạng mục điều trị</h2><span class="hint">đã chốt giá, vào công nợ</span><span class="spacer"></span>
    <button class="btn small" onclick="Treat.itemForm()">${IC.plus} Thêm hạng mục</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Hạng mục</th><th>Răng</th><th>Bác sĩ · người phụ</th><th>Trạng thái</th><th class="r">Đơn giá</th><th>Công đoạn</th></tr></thead><tbody>${itemRows}</tbody></table></div></div>
  <div class="card mb"><div class="card-h"><h2>Sơ đồ tiến trình điều trị</h2>
    <span class="hint">bấm vào răng để đổi trạng thái · màu răng nói về tiến độ, không phải bệnh lý</span>
    <span class="spacer"></span>
    <button class="btn small ${App.state.rangTri?'primary':''}" onclick="Treat.batChonNhieu()">
      ${App.state.rangTri ? 'Xong chọn nhiều răng' : 'Chọn nhiều răng'}</button></div>
    <div class="card-b">
      ${App.state.rangTri ? `<div class="note-block mb" style="border-color:var(--accent)">
        Đang <b>chọn nhiều răng</b> — bấm vào từng răng để chọn hoặc bỏ chọn.
        Đã chọn <b>${App.state.rangTri.length} răng</b>${App.state.rangTri.length?': '+App.state.rangTri.slice().sort((a,b)=>a-b).map(n=>'R'+n).join(', '):''}.
        <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
          <button class="btn small primary" ${App.state.rangTri.length?'':'disabled'} onclick="Treat.nhieuRangForm()">Đặt tiến trình cho ${App.state.rangTri.length} răng</button>
          <button class="btn small" onclick="Treat.batChonNhieu()">Thoát chọn nhiều</button></div></div>`
        : `<div class="note-block mb">Dịch vụ vừa gắn cho một răng mà chưa làm gì thì mặc định là
           <b>Chưa điều trị</b>. Bấm vào răng để chuyển sang <b>Đang điều trị</b> rồi <b>Hoàn tất</b>.
           Răng nào hoàn tất sẽ tự hiện lên sơ đồ <b>Sau điều trị</b> ở tab Khách hàng.</div>`}
      ${Treat.soDoHTML(c)}
    </div></div>
  <div class="card mb"><div class="card-h"><h2>Quá trình điều trị</h2><span class="hint">bấm vào một dòng để sửa</span><span class="spacer"></span>
    <button class="btn small" onclick="Cust.visitForm('','${c.id}')">${IC.plus} Thêm diễn biến</button></div>
    <div class="card-b"><div class="timeline">${Cust.timelineHTML(c)}</div></div></div>
  <div class="card mb"><div class="card-h"><h2>Đơn thuốc</h2><span class="hint">liên thông Đơn thuốc quốc gia</span><span class="spacer"></span>
    <button class="btn small" onclick="Treat.rxForm()">${IC.plus} Kê đơn mới</button></div>
    <div class="card-b">${rxBlocks}</div></div>`;

  /* Trang 3: thu tiền */
  if (trang === 'thutien') return dau + `
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="card kpi"><div class="k-label">Tổng kế hoạch (đã duyệt)</div><div class="k-value num">${money(total)}</div><div class="k-note">${items.length} hạng mục · ${items.filter(t=>t.status==='Báo giá').length} đang báo giá</div></div>
    <div class="card kpi"><div class="k-label">Đã thanh toán</div><div class="k-value num" style="color:var(--ok)">${money(paid)}</div><div class="k-note">${total?Math.min(100,Math.round(paid/total*100)):0}% kế hoạch</div></div>
    <div class="card kpi"><div class="k-label">Còn lại</div><div class="k-value num" ${debt?'style="color:var(--danger)"':''}>${money(debt)}</div><div class="k-note">${debt?'nhắc khách theo lịch trả góp':'không còn công nợ'}</div></div>
  </div>
  <div class="card"><div class="card-h"><h2>Phiếu thu</h2><span class="hint">hóa đơn điện tử Viettel SInvoice</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Ngày / Số</th><th>Nội dung</th><th class="r">Số tiền</th><th>Hóa đơn điện tử</th><th></th></tr></thead><tbody>${recRows}</tbody></table></div></div>`;

  /* Trang 4: hẹn ngày tiếp theo */
  return dau + `
  <div class="card"><div class="card-h"><h2>Hẹn ngày tiếp theo</h2>
    <span class="hint">lịch hẹn của riêng khách này</span><span class="spacer"></span>
    <button class="btn small primary" onclick="Cal.form('','${c.id}')">${IC.plus} Đặt lịch hẹn</button></div>
    <div class="card-b">${Cal.dsKhachHTML(c)}</div></div>`;
};

/* ================= Đợt điều trị & Bệnh án điện tử =================
   Một khách có thể làm nhiều dịch vụ trong CÙNG một đợt điều trị. Đợt là chỗ nối
   năm biểu mẫu lại với nhau: chẩn đoán, bác sĩ, danh sách hạng mục nhập một lần,
   cả năm phiếu cùng dùng. Điền đầy đủ trên máy trước, in sau. */

/* Gợi ý cho các ô trống — gõ chọn cho nhanh, vẫn gõ tự do được */
const GY = {
  /* ================= Nội dung theo MẪU của phòng khám =================
     Mọi câu gợi ý dưới đây chép đúng từ hai file mẫu phòng khám đưa:
     "Mẫu bệnh án đầy đủ 9 dịch vụ" và "Phiếu theo dõi điều trị - mẫu".
     Mỗi dịch vụ có đủ: lý do vào viện · quá trình bệnh lý · khám trong miệng ·
     cận lâm sàng · tóm tắt · chẩn đoán · kế hoạch · dặn dò · các buổi điều trị. */
  MAU: {
    thaolaptoan: {
      ten: 'Phục hình tháo lắp toàn hàm',
      lyDo: 'Mất răng toàn hàm, ăn nhai khó khăn (phục hình tháo lắp toàn hàm).',
      qt: ['Bệnh nhân mất toàn bộ răng hàm trên/hàm dưới/hai hàm, ăn nhai khó khăn, mong muốn làm hàm giả tháo lắp.'],
      tm: ['Mất răng toàn hàm trên/hàm dưới/hai hàm. Vùng nhổ răng đã lành thương, không ghi nhận chân răng còn sót trên lâm sàng',
        'Sống hàm trên cao trung bình',
        'Niêm mạc phủ sống hàm hồng, săn chắc, không viêm loét, không đau khi sờ'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì mất răng toàn hàm, ăn nhai khó khăn. Khám trong miệng ghi nhận mất toàn bộ răng hàm trên/hàm dưới/hai hàm, sống hàm và niêm mạc …….',
      dx: ['Mất răng toàn bộ hàm trên/hàm dưới/hai hàm (phục hình tháo lắp toàn hàm).'],
      kh: ['Phục hình tháo lắp toàn hàm hai hàm/ hàm trên/ hàm dưới'],
      dan: 'Hướng dẫn cách mang và tháo hàm, vệ sinh hàm và niêm mạc. Tái khám nếu đau, loét niêm mạc hoặc hàm lỏng.',
      db: 'Bệnh nhân mất toàn bộ răng hàm trên/hàm dưới/hai hàm, ăn nhai khó khăn.',
      buoi: [
        {l: 'LẦN 1', cd: 'Khám và lấy dấu sơ khởi.'},
        {l: 'LẦN 2', cd: 'Thử khay cá nhân, lấy dấu lần 2. Ghi tương quan hai hàm; xác định đường giữa, đường cười; chọn màu/hình dạng răng.'},
        {l: 'LẦN 3', cd: 'Thử răng sáp; kiểm tra thẩm mỹ, phát âm, nâng đỡ môi má và khớp cắn.'},
        {l: 'LẦN 4', cd: 'Giao hàm; kiểm tra lưu giữ, khớp cắn và chỉnh điểm cấn. Phục hình tháo lắp toàn hàm trên/hàm dưới/hai hàm.'},
      ],
      icd: ['K08.1', 'K08.2', 'Z97.2', 'Z46.3'],
    },
    thaolapban: {
      ten: 'Phục hình tháo lắp bán hàm',
      lyDo: 'Mất nhiều răng ……, ăn nhai khó khăn (phục hình tháo lắp bán hàm).',
      qt: ['Bệnh nhân mất các răng ……, ăn nhai khó khăn, mong muốn phục hồi các răng mất bằng hàm giả tháo lắp.'],
      tm: ['Mất các răng …….', 'Vùng mất răng đã lành thương', 'Các răng còn lại và mô nha chu bình thường'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì mất nhiều răng, ăn nhai khó khăn. Khám ghi nhận mất các răng ……, các răng còn lại và mô nha chu …….',
      dx: ['Mất răng …… (phục hình tháo lắp bán hàm).'],
      kh: ['Phục hình tháo lắp bán hàm các răng...'],
      dan: 'Hướng dẫn tháo lắp đúng cách, vệ sinh hàm và răng trụ, tái khám kiểm tra răng trụ và chỉnh hàm khi cần.',
      db: 'Bệnh nhân mất các răng ……, ăn nhai khó khăn. Khám các răng còn lại, mô nha chu, răng trụ, sống hàm và khớp cắn.',
      buoi: [
        {l: 'LẦN 1', cd: 'Khám, điều chỉnh sơ khởi, lấy dấu, ghi tương quan hai hàm.'},
        {l: 'LẦN 2', cd: 'Thử răng sáp; kiểm tra thẩm mỹ, phát âm và khớp cắn.'},
        {l: 'LẦN 3', cd: 'Giao hàm; kiểm tra độ lưu giữ, ổn định, móc và khớp cắn; chỉnh điểm cấn. Phục hình tháo lắp bán hàm thay thế các răng …….'},
      ],
      icd: ['K08.1', 'K08.2', 'Z97.2', 'Z46.3'],
    },
    su: {
      ten: 'Phục hình răng sứ',
      lyDo: 'Răng …… sâu lớn/vỡ lớn/đổi màu/đã điều trị tủy, ảnh hưởng ăn nhai (phục hình răng sứ).',
      qt: ['Răng …… sâu lớn/vỡ lớn/đổi màu/đã điều trị tủy, bệnh nhân mong muốn phục hồi chức năng ăn nhai.'],
      tm: ['Răng …… mất mô răng do sâu/vỡ/đổi màu/đã điều trị tủy',
        'Mô răng còn lại ít, mô nha chu lành mạnh, khớp cắn ổn'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu lớn/vỡ lớn/đổi màu/đã điều trị tủy. Khám ghi nhận răng …… mất mô răng nhiều, chỉ định phục hình răng sứ.',
      dx: ['Răng …… sâu lớn/vỡ lớn/đổi màu/đã điều trị tủy hoặc mất răng ... (phục hình răng sứ).'],
      kh: ['Phục hình sứ răng ....'],
      dan: 'Hướng dẫn vệ sinh răng miệng, làm sạch kẽ, hạn chế thức ăn quá cứng; tái khám nếu đau kéo dài, cộm khớp cắn, phục hình lung lay/nứt/vỡ.',
      db: 'Răng …… sâu lớn/vỡ lớn/đổi màu/đã điều trị tủy, có chỉ định phục hình sứ.',
      buoi: [
        {l: 'LẦN 1', cd: 'Khám răng, mô nha chu và khớp cắn; sửa soạn răng, lấy dấu/scan, ghi khớp, chọn màu; làm và gắn răng tạm khi cần.'},
        {l: 'LẦN 2', cd: 'Thử phục hình sứ; kiểm tra độ khít sát, điểm tiếp xúc, hình thể, màu sắc, thẩm mỹ và khớp cắn. Gắn phục hình bằng vật liệu phù hợp; làm sạch vật liệu gắn dư. Phục hình răng sứ răng …….'},
      ],
      icd: ['K08.1', 'S02.5', 'K02.5', 'K00.3', 'K03.7'],
    },
    chetuygt: {
      ten: 'Che tủy gián tiếp',
      lyDo: 'Răng …… sâu sát tủy, ê buốt khi ăn uống, không đau tự phát (che tủy gián tiếp).',
      qt: ['Răng …… sâu, ê buốt khi có kích thích nóng/lạnh/ngọt, hết ê sau khi loại bỏ kích thích, không đau tự phát, không đau về đêm.'],
      tm: ['Răng …… sâu ngà sâu sát tủy, chưa lộ tủy',
        'Tủy còn đáp ứng, không ghi nhận dấu hiệu viêm tủy không hồi phục; quanh chóp không ghi nhận bất thường.'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu, ê buốt. Khám ghi nhận sâu ngà sâu sát tủy, chưa lộ tủy, tủy còn khả năng hồi phục.',
      dx: ['Sâu ngà sâu răng …… / tình trạng tủy phù hợp bảo tồn (che tủy gián tiếp).'],
      kh: ['Che tủy gián tiếp răng...'],
      dan: 'Theo dõi đau/ê và đáp ứng tủy. Tái khám theo hẹn; tái khám sớm nếu đau tự phát, đau kéo dài, đau về đêm hoặc sưng.',
      db: 'Răng …… sâu ngà sâu sát tủy, chưa lộ tủy. Tủy còn sống, chưa ghi nhận dấu hiệu viêm tủy không hồi phục.',
      buoi: [
        {l: '', cd: 'Cách ly, làm sạch mô sâu, sát khuẩn, che tủy gián tiếp bằng vật liệu BIO C REPAIR và trám kín phục hồi. Kiểm tra khớp cắn, đánh bóng. Che tủy gián tiếp và trám phục hồi răng …….'},
      ],
      icd: ['K02.1', 'K02.5', 'K04.0'],
    },
    chetuytt: {
      ten: 'Che tủy trực tiếp',
      lyDo: 'Răng …… sâu sát tủy/lộ tủy điểm nhỏ, tủy còn khả năng hồi phục (che tủy trực tiếp).',
      qt: ['Răng …… sâu sâu, ê buốt khi kích thích, không đau tự phát hoặc đau kéo dài. Trong quá trình loại bỏ mô sâu ghi nhận lộ tủy điểm nhỏ.'],
      tm: ['Răng …… sâu ngà sâu, lộ tủy điểm nhỏ',
        'Tủy còn sống, chảy máu tủy kiểm soát được, chưa ghi nhận dấu hiệu viêm tủy không hồi phục.'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu sâu/ê buốt. Khám và trong quá trình làm sạch mô sâu ghi nhận lộ tủy điểm nhỏ, tủy còn sống và có khả năng hồi phục.',
      dx: ['Răng …… lộ tủy điểm nhỏ, tủy còn khả năng hồi phục (che tủy trực tiếp).'],
      kh: ['Che tủy trực tiếp răng...'],
      dan: 'Theo dõi triệu chứng và tình trạng tủy. Tái khám theo hẹn; tái khám sớm nếu đau tự phát/kéo dài, đau về đêm, đau khi cắn hoặc sưng.',
      db: 'Răng …… sâu sát tủy; trong quá trình làm sạch mô sâu ghi nhận lộ tủy điểm nhỏ. Tủy còn sống, chảy máu kiểm soát được, chưa ghi nhận dấu hiệu viêm tủy không hồi phục.',
      buoi: [
        {l: '', cd: 'Cách ly, kiểm soát chảy máu, làm sạch/sát khuẩn vùng lộ tủy. Che trực tiếp bằng BIO C REPAIR và trám phục hồi. Kiểm tra khớp cắn. Che tủy trực tiếp và trám phục hồi răng …….'},
      ],
      icd: ['K02.5', 'K04.0', 'K02.1'],
    },
    tram: {
      ten: 'Trám răng',
      lyDo: 'Răng …… sâu răng/sâu mặt nhai, mặt gần, mặt xa hoặc cổ răng; có thể nhét thức ăn/ê buốt, không đau tự phát (trám răng).',
      qt: ['Răng …… sâu, nhét thức ăn/ê buốt khi ăn uống, không đau tự phát, không đau về đêm.'],
      tm: ['Răng …… sâu ngà mặt ……, mô răng còn lại đủ khả năng phục hồi',
        'Gõ không đau, mô quanh chóp không ghi nhận bất thường lâm sàng.'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu/nhét thức ăn/ê buốt. Khám ghi nhận sâu ngà mặt ……, chưa ghi nhận dấu hiệu bệnh lý tủy không hồi phục.',
      dx: ['Sâu răng …… (trám răng).'],
      kh: ['Trám răng ...'],
      dan: 'Dặn theo dõi ê buốt sau trám. Vệ sinh răng miệng, hạn chế nhai thức ăn quá cứng tại vùng vừa trám. Tái khám nếu đau tự phát, đau kéo dài hoặc cộm khớp cắn.',
      db: 'Răng …… sâu mặt nhai/phía gần/phía xa/cổ răng, chưa lộ tủy, không đau tự phát.',
      buoi: [
        {l: '', cd: 'Làm sạch xoang sâu, tạo xoang, xử lý bề mặt, trám composite/GIC. Chỉnh khớp cắn, hoàn tất và đánh bóng. Trám phục hồi răng …….'},
      ],
      icd: ['K02.1', 'K02.0', 'K02.5', 'K02.9', 'K03.0', 'K03.1', 'K00.2'],
    },
    tuy: {
      ten: 'Điều trị tủy',
      lyDo: 'Răng …… sâu vỡ lớn/đau tự phát/đau kéo dài, nghi tổn thương tủy (điều trị tủy).',
      qt: ['Răng …… sâu vỡ lớn, đau tự phát/đau khi nhai/đau kéo dài; triệu chứng xuất hiện …… ngày. Chưa/đã dùng thuốc trước khi đến khám.'],
      tm: ['Răng …… sâu vỡ lớn sát tuỷ/ lộ tủy hoặc phục hồi cũ', 'Đau tự phát/ đau liên tục'],
      cls: ['Chụp phim X-quang'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu vỡ lớn/đau. Khám và cận lâm sàng ghi nhận tổn thương tủy răng …… phù hợp chỉ định điều trị nội nha.',
      dx: ['Viêm tủy/hoại tử tủy/viêm quanh chóp răng …… (điều trị tủy).'],
      kh: ['Điều trị tủy răng...'],
      dan: 'Dặn giữ vệ sinh, tránh nhai cứng trên răng đang điều trị/chưa phục hồi hoàn chỉnh; tái khám đúng hẹn. Tái khám sớm nếu đau tăng, sưng hoặc có bất thường.',
      db: 'Răng …… sâu vỡ lớn/đau tự phát/đau kéo dài/ lộ tuỷ/ nhiễm trùng chóp',
      buoi: [
        {l: 'LẦN 1', cd: 'Gây tê, đặt đê, mở tủy, sửa soạn ống tuỷ, xác định chiều dài làm việc, tạo hình và bơm rửa ống tủy. Đặt thuốc Ca(OH)2/ CHX trám tạm.'},
        {l: 'LẦN 2', db: 'BN giảm đau/còn ê nhẹ.', cd: 'Tháo trám tạm, tiếp tục sửa soạn, bơm rửa NaOCl/EDTA, đặt Ca(OH)2/ CHX và trám tạm.'},
        {l: 'LẦN 3', db: 'Răng hết đau, ống tủy sạch và khô.', cd: 'Bơm rửa, làm khô, trám bít ống tủy bằng gutta-percha + sealer, chụp phim kiểm tra, trám tạm.'},
        {l: 'LẦN 4', cd: 'Phục hồi thân răng bằng trám hoặc phục hình sứ. Điều trị tủy răng …….'},
      ],
      icd: ['K04.0', 'K04.1', 'K04.4', 'K04.5', 'K04.6', 'K04.7', 'K02.5', 'K04.8'],
    },
    nho: {
      ten: 'Nhổ răng thường',
      lyDo: 'Răng …… sâu vỡ lớn không thể phục hồi/lung lay nhiều/còn chân răng, có chỉ định nhổ răng.',
      qt: ['Răng …… sâu vỡ lớn không thể phục hồi/lung lay độ ……, đau khi ăn nhai hoặc còn chân răng. Bệnh nhân đồng ý nhổ răng sau khi được tư vấn.'],
      tm: ['Răng …… sâu vỡ lớn không thể phục hồi/lung lay độ 4/còn chân răng...'],
      cls: ['Chụp phim X-quang', 'Xét nghiệm đông máu', 'Xét nghiệm công thức máu'],
      tt: 'Bệnh nhân …… đến khám vì răng …… sâu vỡ lớn/lung lay/đau. Khám ghi nhận răng không còn khả năng bảo tồn/ có chỉ định nhổ.',
      dx: ['Răng …… sâu vỡ lớn không thể phục hồi/lung lay/ chân răng... (nhổ răng thường).'],
      kh: ['Nhổ răng ……'],
      dan: 'Cắn gạc 30–45 phút, không súc miệng mạnh/khạc nhổ trong ngày đầu, ăn mềm, tránh đồ nóng và không tác động vào ổ răng. Tái khám khi chảy máu kéo dài, đau hoặc sưng tăng.',
      db: 'Răng …… sâu vỡ lớn không phục hồi được/lung lay độ …/còn chân răng, có chỉ định nhổ.',
      buoi: [
        {l: '', cd: 'Gây tê, nhổ răng. Kiểm tra ổ răng/ nạo rửa, cầm máu, cho bệnh nhân cắn gòn. Nhổ răng …….'},
      ],
      icd: ['K08.3', 'K05.3', 'K04.5', 'K02.9', 'S02.5', 'K10.3'],
    },
    tieuphau: {
      ten: 'Nhổ răng tiểu phẫu',
      lyDo: 'Răng …… mọc lệch/mọc ngầm, sưng/ đau nướu, nhét thức ăn (nhổ răng tiểu phẫu).',
      qt: ['Răng …… mọc lệch/ngầm, có thể đau hoặc viêm lợi trùm tái phát. Đã tư vấn nguy cơ, phương pháp tiểu phẫu và bệnh nhân đồng ý điều trị.'],
      tm: ['Răng …… mọc lệch/ngầm', 'Viêm lợi trùm, há miệng hạn chế'],
      cls: ['Chụp phim X-quang', 'Xét nghiệm đông máu', 'Xét nghiệm công thức máu'],
      tt: 'Bệnh nhân …… đến khám vì răng …… mọc lệch/ngầm. Khám và phim X-quang ghi nhận vị trí răng …… phù hợp chỉ định tiểu phẫu.',
      dx: ['Răng …… mọc lệch/ngầm (nhổ răng tiểu phẫu).'],
      kh: ['Nhổ răng tiểu phẫu răng ...'],
      dan: 'Dặn dùng thuốc theo toa nếu có, chườm lạnh trong 24 giờ đầu, không súc miệng mạnh/khạc nhổ, ăn mềm và vệ sinh theo hướng dẫn. Tái khám/cắt chỉ theo hẹn; tái khám sớm nếu chảy máu kéo dài, sưng đau tăng hoặc có dấu hiệu bất thường.',
      db: 'Răng …… mọc lệch/ngầm có chỉ định nhổ.',
      buoi: [
        {l: '', cd: 'Tư vấn nguy cơ và phương pháp điều trị, bệnh nhân đồng ý tiểu phẫu. Gây tê, lật vạt, mở xương, chia răng, lấy răng, kiểm tra ổ răng, bơm rửa, khâu và cắn gòn. Tiểu phẫu răng …….'},
      ],
      icd: ['K01.1', 'K01.0', 'K05.2', 'K09.0', 'K00.1'],
    },
    caovoi: {
      ten: 'Cạo vôi răng',
      lyDo: 'Chảy máu nướu/hôi miệng — cạo vôi răng.',
      qt: ['Hai hàm nhiều vôi răng, vết dính, chảy máu khi đánh răng/ hôi miệng'],
      tm: ['Hai hàm nhiều vôi răng, vết dính', 'Nướu viêm, sưng đỏ', 'Chảy máu khi chạm nhẹ'],
      cls: [],
      tt: 'Bệnh nhân …… đến khám vì chảy máu nướu/hôi miệng. Khám trong miệng ghi nhận hai hàm nhiều vôi răng, vết dính; nướu viêm, sưng đỏ, chảy máu khi chạm nhẹ.',
      dx: ['Viêm nướu hai hàm do vôi răng'],
      kh: ['Cạo vôi và đánh bóng hai hàm'],
      dan: 'Hướng dẫn chải răng đúng cách ít nhất 2 lần/ngày, làm sạch kẽ bằng chỉ nha khoa/bàn chải kẽ phù hợp. Có thể ê nhẹ hoặc chảy máu nướu nhẹ trong thời gian ngắn sau điều trị. Tái khám kiểm tra và cạo vôi định kỳ khoảng 3–6 tháng. Tái khám sớm nếu đau, sưng, chảy máu bất thường.',
      db: 'Khám ghi nhận vệ sinh răng miệng tốt/trung bình/kém. Mảng bám và vôi răng mức độ ít/vừa/nhiều',
      buoi: [
        {l: '', cd: 'Tiến hành cạo vôi răng hai hàm bằng máy siêu âm. Đánh bóng bề mặt răng. Cạo vôi răng hai hàm, làm sạch mảng bám/vết dính và đánh bóng.',
         db2: 'Sau điều trị, vôi răng và mảng bám được làm sạch; nướu có thể chảy máu nhẹ tại vùng viêm.'},
      ],
      icd: ['K03.6', 'K05.1', 'K05.0', 'K05.3', 'K05.2', 'K06.0', 'Z01.2'],
    },
    nieng: {
      ten: 'Niềng răng mắc cài',
      lyDo: 'Răng hô/móm/chen chúc, lệch lạc — muốn niềng răng mắc cài.',
      qt: ['Răng hô, môi khó khép kín', 'Răng móm, khớp cắn ngược',
        'Răng chen chúc, khó vệ sinh, hay sâu kẽ', 'Răng thưa nhiều kẽ, ảnh hưởng thẩm mỹ'],
      tm: ['Khớp cắn loại II', 'Khớp cắn loại III', 'Răng chen chúc cung hàm trên',
        'Răng chen chúc cung hàm dưới', 'Cắn hở vùng răng cửa', 'Cắn sâu', 'Lệch đường giữa'],
      cls: ['Chụp phim toàn cảnh (Panorex)', 'Chụp phim sọ nghiêng (Cephalo)'],
      tt: 'Bệnh nhân …… đến khám vì răng hô/móm/chen chúc. Khám ghi nhận sai khớp cắn, có chỉ định chỉnh nha bằng mắc cài.',
      dx: ['Sai khớp cắn, lệch lạc răng (chỉnh nha mắc cài).'],
      kh: ['Niềng răng mắc cài hai hàm'],
      dan: 'Hướng dẫn vệ sinh răng miệng khi mang mắc cài, tránh thức ăn cứng dính. Tái khám đúng hẹn hằng tháng; tái khám sớm nếu bung mắc cài, đứt dây cung hoặc đau kéo dài.',
      db: 'Răng hô/móm/chen chúc, sai khớp cắn có chỉ định chỉnh nha.',
      buoi: [
        {l: 'LẦN 1', cd: 'Khám, lấy dấu, chụp phim, lên kế hoạch điều trị; gắn mắc cài hàm trên/hàm dưới.'},
        {l: 'TÁI KHÁM', cd: 'Kiểm tra tiến triển, thay dây cung/thun, chỉnh lực; kiểm tra vệ sinh răng miệng.'},
      ],
      icd: ['K07.3', 'K07.2', 'K07.1', 'K07.0', 'Z46.4', 'K00.6'],
    },
    implant: {
      ten: 'Cấy ghép Implant',
      lyDo: 'Mất răng ……, muốn cấy ghép Implant.',
      qt: ['Mất răng lâu năm, tiêu xương vùng mất răng', 'Mất răng đơn lẻ, không muốn mài răng kế cận',
        'Vừa nhổ răng, muốn cấy ghép sớm'],
      tm: ['Khoảng mất răng đủ rộng', 'Sống hàm đủ chiều cao và bề dày',
        'Sống hàm tiêu nhiều, cần ghép xương', 'Niêm mạc sừng hóa đủ'],
      cls: ['Chụp CT Cone Beam', 'Xét nghiệm công thức máu', 'Xét nghiệm đông máu', 'Đường huyết mao mạch'],
      tt: 'Bệnh nhân …… đến khám vì mất răng ……. Khám và phim CT ghi nhận sống hàm phù hợp chỉ định cấy ghép Implant.',
      dx: ['Mất răng …… (cấy ghép Implant).'],
      kh: ['Cấy ghép Implant răng ……'],
      dan: 'Uống thuốc theo toa, chườm lạnh 24 giờ đầu, ăn mềm, không tác động vùng phẫu thuật. Tái khám cắt chỉ và kiểm tra tích hợp xương theo hẹn.',
      db: 'Mất răng ……, sống hàm đủ điều kiện cấy ghép Implant.',
      buoi: [
        {l: 'LẦN 1', cd: 'Gây tê, lật vạt, khoan xương theo hướng dẫn, đặt trụ Implant, khâu đóng. Chụp phim kiểm tra.'},
        {l: 'LẦN 2', cd: 'Cắt chỉ, kiểm tra lành thương.'},
        {l: 'LẦN 3', cd: 'Tháo nắp, đặt abutment, lấy dấu làm phục hình trên Implant.'},
        {l: 'LẦN 4', cd: 'Gắn phục hình sứ trên Implant, kiểm tra khớp cắn.'},
      ],
      icd: ['K08.1', 'K08.2'],
    },
    tay: {
      ten: 'Tẩy trắng răng',
      lyDo: 'Răng ố vàng/xỉn màu, muốn tẩy trắng răng.',
      qt: ['Răng ố vàng do cà phê, thuốc lá', 'Răng xỉn màu theo tuổi, muốn sáng hơn'],
      tm: ['Răng nhiễm màu ngoại lai', 'Răng xỉn màu theo tuổi', 'Men răng còn tốt, không nứt'],
      cls: [],
      tt: 'Bệnh nhân …… đến khám vì răng ố vàng/xỉn màu. Khám ghi nhận men răng còn tốt, phù hợp chỉ định tẩy trắng.',
      dx: ['Răng nhiễm màu (tẩy trắng răng).'],
      kh: ['Tẩy trắng răng hai hàm'],
      dan: 'Kiêng thực phẩm sẫm màu (cà phê, trà, nước tương) trong 1–2 tuần đầu. Có thể ê buốt nhẹ vài ngày, tự hết. Tái khám nếu ê buốt kéo dài.',
      db: 'Răng nhiễm màu ngoại lai/xỉn màu theo tuổi, men răng còn tốt.',
      buoi: [
        {l: '', cd: 'Cạo vôi làm sạch, cách ly nướu, bôi thuốc tẩy trắng và chiếu đèn theo chu kỳ. Kiểm tra màu sau tẩy, bôi gel chống ê buốt.'},
      ],
      icd: ['K00.3', 'K03.7', 'K03.2'],
    },
  },
  /* Thứ tự nhận diện nhóm dịch vụ — dòng nào khớp trước thì lấy nhóm đó */
  DAU_HIEU: [
    ['chetuygt',    /che tuy gian tiep/],
    ['chetuytt',    /che tuy truc tiep/],
    ['thaolaptoan', /thao lap toan ham|mat rang toan ham/],
    ['thaolapban',  /thao lap ban ham|mat nhieu rang/],
    ['su',          /rang su|boc rang|phuc hinh su/],
    ['caovoi',      /cao voi|voi rang|cao rang|chay mau nuou|hoi mieng|nha chu/],
    ['tieuphau',    /tieu phau|rang khon|rang ngam|moc lech|moc ngam/],
    ['tuy',         /dieu tri tuy|chua tuy|noi nha|den tuy|ton thuong tuy/],
    ['nho',         /nho rang|chan rang|lung lay/],
    ['nieng',       /nieng|chinh nha|mac cai|rang ho|rang mom|lech lac/],
    ['implant',     /implant|cay ghep/],
    ['thaolapban',  /thao lap|ham gia/],
    ['tay',         /tay trang|o vang|xin mau/],
    ['tram',        /tram|sau rang|rang thua|sau mat nhai/],
  ],
  /* Lý do vào viện: đúng một dòng cho mỗi dịch vụ, chép từ mẫu */
  get lyDo(){ return Object.keys(this.MAU).map(k => this.MAU[k].lyDo); },
  /* Đoán nhóm dịch vụ từ một câu lý do vào viện */
  nhomDV(lyDo){
    const t = Combo.norm(lyDo || '');
    if (!t) return '';
    for (let i = 0; i < this.DAU_HIEU.length; i++)
      if (this.DAU_HIEU[i][1].test(t)) return this.DAU_HIEU[i][0];
    return '';
  },
  /* Khách làm nhiều việc cùng lúc thì gom gợi ý của mọi dịch vụ đã tick */
  nhomDS(lyDo){
    const cau = String(lyDo || '').split(';').map(x => x.trim()).filter(Boolean);
    const ds = [];
    (cau.length ? cau : ['']).forEach(x => {
      const k = this.nhomDV(x); if (k && ds.indexOf(k) < 0) ds.push(k);
    });
    return ds;
  },
  gom(lyDo, truong, mac){
    const ra = [];
    this.nhomDS(lyDo).forEach(k => {
      const m = this.MAU[k]; if (!m) return;
      [].concat(m[truong] || []).forEach(x => { if (x && ra.indexOf(x) < 0) ra.push(x); });
    });
    return ra.length ? ra : (mac || []);
  },
  quaTrinh: ['Đau âm ỉ vài ngày nay, tăng về đêm', 'Ê buốt khi ăn nóng lạnh, chưa đau tự phát',
    'Phát hiện tình cờ khi khám định kỳ', 'Sưng đau 2–3 ngày, có sốt nhẹ'],
  qtCho(lyDo){ return this.gom(lyDo, 'qt', this.quaTrinh); },
  tmCho(lyDo){ return this.gom(lyDo, 'tm', this.trongMieng); },
  clsCho(lyDo){
    const rieng = this.gom(lyDo, 'cls', []);
    return ['Không'].concat(rieng, this.canLamSang.filter(x => x !== 'Không'))
      .filter((x, i, a) => a.indexOf(x) === i);
  },
  ttCho(lyDo){ return this.gom(lyDo, 'tt', this.tomTat); },
  dxCho(lyDo){ return this.gom(lyDo, 'dx', []); },
  khCho(lyDo){ return this.gom(lyDo, 'kh', []); },
  danCho(lyDo){ return this.gom(lyDo, 'dan', []); },
  /* Các buổi điều trị cho Phiếu theo dõi — theo đúng mẫu phòng khám */
  buoiCho(lyDo){
    const ra = [];
    this.nhomDS(lyDo).forEach(k => {
      const m = this.MAU[k]; if (!m) return;
      (m.buoi || []).forEach(b => ra.push({
        nhom: k, ten: m.ten, l: b.l || '',
        db: [b.l ? b.l + ':' : '', b.db || (b.l ? '' : m.db), b.db2 || ''].filter(Boolean).join(' ').trim() || m.db,
        cd: b.cd || '', dan: m.dan || '',
      }));
    });
    return ra;
  },
  /* Danh sách ICD cho ô chẩn đoán: mã hợp với dịch vụ lên trước, còn lại theo sau */
  icdCho(lyDo){
    const uu = [];
    this.nhomDS(lyDo).forEach(k => ((this.MAU[k] || {}).icd || [])
      .forEach(m => { if (uu.indexOf(m) < 0) uu.push(m); }));
    const het = icdOptions();
    if (!uu.length) return het;
    const dau = uu.map(ma => het.find(x => x.s === ma)).filter(Boolean)
      .map(x => Object.assign({}, x, {s: x.s + ' · hay gặp'}));
    const daCo = new Set(uu);
    return dau.concat(het.filter(x => !daCo.has(x.s)));
  },
  trongMieng: ['Bình thường', 'Sâu ngà', 'Sâu ngà sâu, gõ dọc đau', 'Tủy hoại tử, gõ dọc đau',
    'Viêm nướu, cao răng nhiều', 'Túi nha chu sâu > 5mm', 'Răng lung lay độ I', 'Răng lung lay độ II',
    'Răng lung lay độ III', 'Lỗ dò vùng chóp', 'Mô nướu hồng, không sưng', 'Vỡ lớn thân răng, còn chân răng'],
  tienSu: ['Không','Tăng huyết áp','Đái tháo đường','Bệnh tim mạch','Hen suyễn','Viêm dạ dày',
    'Đang dùng thuốc chống đông','Rối loạn đông máu','Phụ nữ có thai','Phụ nữ cho con bú'],
  diUng: ['Không','Penicillin','Lidocaine','Thuốc tê nhóm Amide','Aspirin / NSAID','Hải sản','Sulfamid'],
  toanThan: ['Bình thường','Tỉnh táo, tiếp xúc tốt','Không sốt, mạch đều','Sốt nhẹ','Da niêm hồng hào'],
  ngoaiMieng: ['Bình thường','Sưng nề vùng má','Hạch dưới hàm sờ thấy, di động','Há miệng hạn chế',
    'Khớp thái dương hàm kêu khi há ngậm','Mất cân xứng hai bên mặt','Môi, má không tổn thương'],
  trongMieng: ['Bình thường','Sâu ngà','Sâu ngà sâu, gõ dọc đau','Tủy hoại tử, gõ dọc đau',
    'Viêm nướu, cao răng nhiều','Túi nha chu sâu > 5mm','Răng lung lay độ I','Răng lung lay độ II',
    'Răng lung lay độ III','Lỗ dò vùng chóp','Mô nướu hồng, không sưng','Vỡ lớn thân răng, còn chân răng'],
  canLamSang: ['Không',
    'Chụp phim quanh chóp',
    'Chụp phim toàn cảnh (Panorex)',
    'Chụp phim sọ nghiêng (Cephalo)',
    'Chụp CT Cone Beam',
    'Xét nghiệm công thức máu',
    'Máu chảy — máu đông (TS – TC)',
    'Đông máu: TQ (PT) — INR',
    'Đông máu: TCK (APTT)',
    'Định lượng Fibrinogen',
    'Đường huyết mao mạch',
    'HbA1c',
    'Đo huyết áp',
    'HBsAg — Anti HCV — HIV (trước phẫu thuật)'],
  tomTat: ['Bệnh nhân tỉnh, tiếp xúc tốt, đến khám vì đau răng','Tình trạng toàn thân ổn định, tổn thương khu trú tại răng',
    'Không có chống chỉ định can thiệp nha khoa'],
  tienLuong: ['Tiên lượng tốt, hồi phục sau 3–5 ngày',
    'Có thể ê buốt nhẹ vài ngày sau điều trị, tự hết',
    'Có thể sưng, đau nhẹ 2–3 ngày sau thủ thuật',
    'Nguy cơ chảy máu kéo dài nếu không tuân thủ dặn dò',
    'Nguy cơ tê môi – cằm tạm thời khi can thiệp gần ống thần kinh',
    'Kết quả thẩm mỹ phụ thuộc tình trạng mô nướu và xương'],
  ngheNghiep: ['Nông dân','Công nhân','Học sinh','Sinh viên','Giáo viên','Buôn bán','Nội trợ',
    'Công chức','Lái xe','Hưu trí','Tự do'],
  danToc: ['Kinh','Khmer','Hoa','Chăm'],
  quanHe: ['Vợ','Chồng','Con','Cha','Mẹ','Anh','Chị','Em','Người giám hộ'],
  nguyCo: ['Phản ứng thuốc','Suy hô hấp - tuần hoàn','Chảy máu','Nhiễm trùng','Tử vong'],
  ppTT: ['Phẫu thuật mở','Phẫu thuật nội soi','Thủ thuật'],
  ppGM: ['Mê nội khí quản','Mê mask thanh quản','Mê tĩnh mạch','Tê tủy sống','Tê ngoài màng cứng',
    'Tê đám rối thần kinh','Tiền mê + Tê tại chỗ','Khác'],
  tinhChat: ['Cấp cứu','Bán cấp','Chương trình/Phiên'],
  ykien: ['Tiếp tục điều trị tại phòng khám theo phương thức đã giải thích.',
    'Tiếp tục điều trị, không xét nghiệm hay can thiệp gì thêm.','Khác'],
};

/* ---------- Đợt điều trị ---------- */
const Dot = {
  cua(cid){ return (db.episodes || []).filter(e => e.customerId === cid).sort((a,b)=>(a.tuNgay||'')<(b.tuNgay||'')?1:-1); },
  dangChon(c){
    const ds = this.cua(c.id);
    if (!ds.length) return null;
    return ds.find(e => e.id === App.state.dotSel) || ds[0];
  },
  mucCua(ep){ return ep ? db.treatments.filter(t => t.episodeId === ep.id) : []; },
  chon(id){ App.state.dotSel = id; App.render(); },

  form(id){
    const c = custById(App.state.custSel); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const e = id ? (db.episodes||[]).find(x=>x.id===id) : {tuNgay: todayISO(), status:'Đang điều trị'};
    const r = c.record || {};
    /* Hạng mục chọn được: chưa thuộc đợt nào, hoặc đã thuộc chính đợt này */
    const muc = db.treatments.filter(t => t.customerId === c.id && (!t.episodeId || t.episodeId === id));
    App.modal(id ? 'Sửa đợt điều trị' : 'Mở đợt điều trị mới', `
    <form class="form-grid" onsubmit="Dot.save(event,'${id||''}')">
      <div class="f full"><label>Tên đợt điều trị</label>
        <input name="ten" required value="${h(e.ten||'')}" placeholder="Vd: Điều trị tủy + bọc sứ R36"></div>
      <div class="f"><label>Từ ngày</label><input type="date" name="tuNgay" value="${h(e.tuNgay||todayISO())}" required></div>
      <div class="f"><label>Đến ngày (để trống nếu đang làm)</label><input type="date" name="denNgay" value="${h(e.denNgay||'')}"></div>
      <div class="f"><label>Bác sĩ phụ trách</label><select name="doctorId">
        <option value="">— chưa phân —</option>
        ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${e.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Trạng thái</label><select name="status">
        ${['Đang điều trị','Hoàn tất','Tạm dừng'].map(x=>`<option${e.status===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="f full"><label>Lý do vào viện</label>
        ${Combo.html('cbDotLyDo','lyDo', e.lyDo||r.lyDo||'', GY.lyDo, 'Gõ hoặc chọn gợi ý')}</div>
      <div class="f full"><label>Chẩn đoán chính (ICD)</label>
        ${Combo.html('cbDotDx','chanDoan', icdName(e.chanDoan||r.chanDoan)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
      <div class="f full"><label>Bệnh kèm theo</label>
        ${Combo.html('cbDotDx2','chanDoanKem', icdName(e.chanDoanKem||r.chanDoanKem)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
      <div class="f full"><label>Kế hoạch điều trị</label>
        <textarea name="keHoach" placeholder="Mỗi dòng một việc">${h(e.keHoach||r.keHoach||'')}</textarea></div>
      <div class="f full"><label>Các dịch vụ trong đợt này (chọn được nhiều)</label>
        <div class="check-list">${muc.length ? muc.map(t=>`<label><input type="checkbox" name="muc" value="${t.id}"${t.episodeId===id?' checked':''}>
          ${h(t.name)}${t.tooth?' — R'+h(t.tooth):''} <span class="sub-line">${money(t.price)} · ${h(t.status)}</span></label>`).join('')
          : '<span class="sub-line">Chưa có hạng mục nào rảnh. Thêm ở tab Điều trị trước.</span>'}</div></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Dot.del('${id}')">Xóa đợt</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  save(ev, id){
    ev.preventDefault();
    const f = ev.target, d = Object.fromEntries(new FormData(f).entries());
    const c = custById(App.state.custSel);
    d.chanDoan = icdCode(d.chanDoan); d.chanDoanKem = icdCode(d.chanDoanKem);
    if (!db.episodes) db.episodes = [];
    let e = id && db.episodes.find(x=>x.id===id);
    if (!e) { e = {id: uid(), customerId: c.id, phieu: {}}; db.episodes.push(e); }
    Object.assign(e, {ten:d.ten, tuNgay:d.tuNgay, denNgay:d.denNgay, doctorId:d.doctorId,
      status:d.status, lyDo:d.lyDo, chanDoan:d.chanDoan, chanDoanKem:d.chanDoanKem, keHoach:d.keHoach});
    /* Gán / gỡ hạng mục vào đợt */
    const chon = [...f.querySelectorAll('[name="muc"]:checked')].map(x=>x.value);
    db.treatments.forEach(t => {
      if (t.customerId !== c.id) return;
      if (chon.includes(t.id)) t.episodeId = e.id;
      else if (t.episodeId === e.id) t.episodeId = '';
    });
    App.state.dotSel = e.id;
    save(); App.closeModal(); App.render(); App.toast('Đã lưu đợt điều trị ✓');
  },
  /* Chốt đợt: điền ngày kết thúc và chuyển trạng thái sang Hoàn tất */
  ketThuc(id){
    const e = (db.episodes||[]).find(x => x.id === id); if (!e) return;
    const con = db.treatments.filter(t => t.episodeId === id && t.status !== 'Hoàn tất' && t.status !== 'Báo giá');
    const X = String.fromCharCode(10);
    if (con.length && !confirm('Đợt này còn ' + con.length + ' hạng mục chưa xong:' + X + X
        + con.map(t => '• ' + t.name + (t.tooth ? ' (R' + t.tooth + ')' : '') + ' — ' + t.status).join(X)
        + X + X + 'Vẫn kết thúc đợt?')) return;
    e.denNgay = todayISO();
    e.status = 'Hoàn tất';
    e._up = Date.now();
    const c = custById(e.customerId);
    if (c) { if (!c.record) c.record = {}; c.record.denNgay = e.denNgay; c._up = Date.now(); }
    save(); App.closeModal(); App.render();
    App.toast('Đã kết thúc đợt "' + (e.ten||'') + '" ngày ' + fmtD(e.denNgay) + ' ✓');
  },

  del(id){
    if (!confirm('Xóa đợt điều trị này? Các hạng mục dịch vụ vẫn giữ nguyên, chỉ gỡ khỏi đợt.')) return;
    db.treatments.forEach(t => { if (t.episodeId === id) t.episodeId = ''; });
    db.episodes = (db.episodes||[]).filter(x => x.id !== id);
    if (App.state.dotSel === id) App.state.dotSel = null;
    save(); App.closeModal(); App.render(); App.toast('Đã xóa đợt');
  },
};

/* ---------- Bệnh án điện tử ---------- */
const HoSo = {
  /* Thứ tự đúng như phòng khám đánh số trên bộ giấy tờ */
  DS: [
    {k:'ba18',    ten:'Bệnh án ngoại trú RHM',              ms:'MS: BA-18'},
    {k:'tuvan',   ten:'Phiếu tư vấn + báo giá',             ms:''},
    {k:'theodoi', ten:'Phiếu theo dõi điều trị',            ms:'MS: 36/BV2'},
    {k:'camket',  ten:'Giấy cam kết phẫu thuật, thủ thuật', ms:'MS: 01/BV2'},
    {k:'phieuthu',ten:'Phiếu thu (bảng chi tiết)',          ms:''},
  ],
  ten(k){ return (this.DS.find(x=>x.k===k)||{}).ten || k; },

  cham(n){ return '.'.repeat(n || 60); },
  gach(v, n){ return v ? h(v) : this.cham(n || 60); },
  o(danh, nhan){ return `<span class="o-tick">${danh ? '☒' : '☐'}</span> ${nhan}`; },
  /* BA-18 là bệnh án của KHÁCH, dùng chung cho mọi đợt — lưu ở c.record.
     Bốn phiếu còn lại (theo dõi, cam kết, thu, tư vấn) mới thuộc từng đợt. */
  KHACH: ['ba18'],
  cuaKhach(k){ return this.KHACH.includes(k); },
  dl(ep, k, c){
    if (this.cuaKhach(k)) return (c && c.record) || {};
    return ((ep && ep.phieu) || {})[k] || {};
  },

  dau(c, tieu, ms, phu){
    return `<table class="no-border pa-dau"><tr>
      <td style="width:32%;vertical-align:top">${h(db.clinic.authority || 'Sở Y tế An Giang')}<br><b>${h(db.clinic.legal || db.clinic.name)}</b></td>
      <td style="width:40%;text-align:center;vertical-align:top"><h1>${tieu}</h1>${phu || ''}</td>
      <td style="width:26%;vertical-align:top;font-size:11px">${ms ? h(ms) + '<br>' : ''}Số HS: ${h(c.soHS || '…………')}<br>Mã KH: ${h(c.code || '…………')}</td>
    </tr></table>`;
  },
  tuoi(c){
    if (!c.dob) return '';
    const d = new Date(c.dob + 'T00:00'), n = new Date();
    let t = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) t--;
    return t >= 0 ? String(t) : '';
  },
  ngayChu(iso){
    const d = iso ? new Date(iso + 'T00:00') : new Date();
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  },
  bacSi(c, ep){
    if (ep && ep.doctorId) return staffById(ep.doctorId);
    const dem = {};
    db.treatments.filter(t => t.customerId === c.id && t.doctorId).forEach(t => dem[t.doctorId] = (dem[t.doctorId] || 0) + 1);
    return staffById(Object.keys(dem).sort((a,b)=>dem[b]-dem[a])[0])
      || (typeof Att !== 'undefined' ? Att.myStaff() : null) || null;
  },
  soDoChu(c, lop){
    const {dong, khung, note} = Tooth.tomTat(c, lop);
    const a = dong.map(x => 'R' + x.n + ': ' + h(x.mo)).join('; ');
    const b = khung.length ? ' — Hàm khung tháo lắp: ' + h(khung.join(' và ')) + (note ? ' (' + h(note) + ')' : '') : '';
    return a + b;
  },
  /* Hạng mục dùng cho một phiếu: đã chọn riêng thì theo lựa chọn, chưa thì lấy cả đợt */
  mucCho(ep, k, loc){
    const d = this.dl(ep, k);
    let ds = Dot.mucCua(ep);
    if (d.muc && d.muc.length) ds = ds.filter(t => d.muc.includes(t.id));
    else if (loc) ds = ds.filter(loc);
    return ds;
  },

  /* Vài dòng tóm tắt nội dung mỗi biểu mẫu đang có, để nhìn là biết đã đủ chưa */
  tomTat(k, c, ep){
    ep = ep || {};
    const d = this.dl(ep, k, c), r = c.record || {};
    if (k === 'ba18') {
      const dx = icdName(d.chanDoan || ep.chanDoan || r.chanDoan);
      const ly = d.lyDo || ep.lyDo || r.lyDo;
      return [ly && 'Lý do: ' + ly, dx && 'Chẩn đoán: ' + dx,
        (d.keHoach || ep.keHoach || r.keHoach) && 'Có kế hoạch điều trị'].filter(Boolean).join(' · ');
    }
    if (k === 'theodoi') {
      const n = ((r.dienBien) || []).length;
      return n ? n + ' lần diễn biến sẽ được in ra' : 'Chưa có diễn biến nào — thêm ở mục Quá trình điều trị';
    }
    if (k === 'camket') {
      const bs = staffById(d.bsId) || this.bacSi(c, ep);
      return [bs && 'BS ' + bs.name, (d.ppTT || []).join(', '),
        (d.nguyCo || []).length && (d.nguyCo.length + ' nguy cơ đã tick')].filter(Boolean).join(' · ');
    }
    if (k === 'phieuthu') {
      const ds = this.mucCho(ep, 'phieuthu', t => t.status !== 'Báo giá');
      const tong = ds.reduce((x, t) => x + (t.price || 0), 0);
      return ds.length ? ds.length + ' dịch vụ · ' + money(tong) + ' · còn lại ' + money(custDebt(c))
                       : 'Chưa có dịch vụ nào đã duyệt trong đợt này';
    }
    if (k === 'tuvan') {
      const bg = this.mucCho(ep, 'tuvan');
      const tong = bg.reduce((x, t) => x + (t.price || 0), 0);
      return bg.length ? 'Báo giá ' + bg.length + ' hạng mục · ' + money(tong) : 'Chưa gắn hạng mục nào vào đợt';
    }
    return '';
  },

  /* ---------- Bệnh án ngoại trú: MỘT bản cho mỗi khách, dùng suốt mọi đợt ---------- */
  /* ---------- Bệnh án điện tử: CHỈ 5 loại giấy tờ, không có mục nào khác ----------
     Chọn đợt điều trị và các mục phụ đều nằm bên trong từng giấy tờ, để khung ngoài
     gọn đúng một danh sách. */
  cardHTML(c){
    const r = c.record || {};
    const ep = Dot.dangChon(c);
    const daLapBA = !!(r.lyDo || r.chanDoan || (r.vanDe||[]).length);

    const dong = (d, i) => {
      const laKhach = this.cuaKhach(d.k);
      const daDien = laKhach ? daLapBA : !!(ep && ep.phieu && ep.phieu[d.k] && ep.phieu[d.k]._at);
      const ngay = (!laKhach && ep && ep.phieu && ep.phieu[d.k]) ? ep.phieu[d.k]._at : '';
      return `<div class="ho-so-file ${daDien?'da-dien':''}">
        <div class="hsf-so">${i + 1}</div>
        <div class="hsf-than">
          <div class="hsf-dau"><b>${h(d.ten)}</b>
            ${d.ms ? `<span class="hs-ms">${h(d.ms)}</span>` : ''}
            ${daDien ? `<span class="pill ok">Đã lập${ngay?' '+fmtD(ngay):''}</span>` : `<span class="pill warn">Chưa lập</span>`}</div>
          <div class="hsf-mo">${h(this.tomTat(d.k, c, ep)) || 'Sẽ lấy dữ liệu sẵn có của khách'}</div>
          ${typeof Ky !== 'undefined' ? Ky.dongTT(c, d.k) : ''}
        </div>
        <div class="hsf-nut">
          <button class="btn small primary" onclick="HoSo.dien('${d.k}')">${daDien?'Sửa':'Điền'}</button>
          ${d.k === 'ba18' ? `<button class="btn small" onclick="Cust.vanDeBang()">Chẩn đoán</button>` : ''}
          <button class="btn small" onclick="HoSo.in('${d.k}')">${IC.print} In</button>
        </div></div>`;
    };

    return `<div class="card mb"><div class="card-h"><h2>Bệnh án điện tử</h2>
      <span class="hint">điền trên máy rồi in khổ A4</span>
      <button class="btn small" onclick="PDF.hop('${c.id}')" title="Kết xuất toàn bộ hồ sơ ra một tệp PDF">Xuất PDF</button>
      <button class="btn small" onclick="LT.hop('${c.id}')" title="Xuất tệp XML/JSON theo chuẩn trao đổi của Bộ Y tế">Kết xuất liên thông</button></div>
      <div class="card-b">${this.DS.map(dong).join('')}</div></div>`;
  },

  /* Đổi khách ở ô tìm trên đầu màn Bệnh án điện tử */
  onCustPick(v, inp){
    const c = (db.customers || []).find(x => custLabel(x) === v)
           || (db.customers || []).find(x => Combo.norm(custLabel(x)) === Combo.norm(v));
    if (!c) return;
    App.chonKhach(c.id);
    App.render();
  },

  /* ---------- Hộp thoại điền ---------- */
  dien(k){
    if (Perm.chan('suahoso', 'lập hoặc sửa hồ sơ bệnh án')) return;
    const c = custById(App.state.custSel); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const ep = Dot.dangChon(c);
    /* Bệnh án ngoại trú là của khách nên lập được ngay, chưa cần đợt nào */
    if (!ep && !this.cuaKhach(k)) { App.toast('Mở một đợt điều trị trước đã'); Dot.form(); return; }
    const E = ep || {};
    const than = this['f_' + k];
    if (!than) { App.toast('Chưa có mẫu này'); return; }
    /* Giấy tờ đã có chữ ký của nhân viên y tế thì khóa. Sửa lén sau khi ký là đúng
       thứ mà quy định về truy vết muốn chặn — muốn sửa phải mở khóa và ghi lý do. */
    if (typeof Ky !== 'undefined' && Ky.daKhoa(Ky.oGiay(c, k))) {
      const o = Ky.oGiay(c, k);
      App.modal(this.ten(k) + ' — đã ký', `
        <div class="note-block warn-block"><b>Giấy tờ này đã được ký và đang khóa.</b>
          ${Ky.cuaNhanVien(o).map(x => `<br>${h(x.ten)}${x.chucDanh ? ' — ' + h(x.chucDanh) : ''} ký lúc ${h(Ky.gio(x.luc))}.`).join('')}
          <br><br>Muốn sửa nội dung thì mở khóa trước. Chữ ký cũ được giữ lại trong hồ sơ
          và việc mở khóa được ghi vào nhật ký lưu vết.</div>
        <div class="form-actions full">
          <button class="btn" onclick="App.closeModal()">Đóng</button>
          <button class="btn" onclick="Ky.hop('${k}')">Xem chữ ký</button>
          <button class="btn primary" onclick="Ky.moKhoa('${k}')">Mở khóa để sửa</button></div>`);
      return;
    }
    const ds = Dot.cua(c.id);
    App.modal('Điền ' + this.ten(k) + ' — ' + c.name, `
      ${this.cuaKhach(k)
        ? `<div class="note-block mb">Bệnh án của khách, dùng chung cho mọi đợt điều trị.
            Ô nào bỏ trống thì trên bản in để dòng chấm cho viết tay.</div>`
        : `<div class="f full mb"><label>Lập cho đợt điều trị</label>
            <select onchange="Dot.chon(this.value);HoSo.dien('${k}')">
              ${ds.map(e => `<option value="${e.id}"${e.id===E.id?' selected':''}>
                ${h(e.ten||'(chưa đặt tên)')} — ${fmtD(e.tuNgay)} · ${Dot.mucCua(e).length} dịch vụ</option>`).join('')}</select>
            <div class="combo-hint">${Dot.mucCua(E).length} dịch vụ trong đợt này.
              <button type="button" class="link-btn" onclick="Dot.form('${E.id}')">Sửa đợt</button> ·
              <button type="button" class="link-btn" onclick="Dot.form()">Mở đợt mới</button>.
              Ô nào bỏ trống thì trên bản in để dòng chấm cho viết tay.</div></div>`}
      <form class="form-grid" onsubmit="HoSo.luu(event,'${k}',0)">
        ${than.call(this, c, E)}
        <div class="form-actions full">
          <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
          <button class="btn">Lưu</button>
          <button type="button" class="btn primary" onclick="HoSo.luuVaIn(this,'${k}')">${IC.print} Lưu và in</button></div>
      </form>`);
  },
  luuVaIn(nut, k){
    const f = nut.closest('form');
    if (!f.reportValidity()) return;
    this.luu({preventDefault(){}, target: f}, k, 1);
  },
  luu(ev, k, inLuon){
    ev.preventDefault();
    const f = ev.target;
    const c = custById(App.state.custSel), ep = Dot.dangChon(c);
    if (!ep && !this.cuaKhach(k)) { App.toast('Chưa có đợt điều trị'); return; }
    const d = Object.fromEntries(new FormData(f).entries());
    /* Gom MỌI nhóm ô tick thành mảng. Trước đây liệt kê tay từng tên nên sót một cái
       là chỗ đó thành chuỗi, lúc in gọi .map lên chuỗi là văng lỗi. */
    new Set([...f.querySelectorAll('input[type="checkbox"][name]')].map(x => x.name)).forEach(n => {
      d[n] = [...f.querySelectorAll(`[name="${n}"]:checked`)].map(x => x.value);
    });
    /* Ghép các dòng đã tick với ô "Khác" thành một câu */
    ['lyDo','quaTrinh','diUng','tienSuBanThan','tienSuGiaDinh',
     'toanThan','ngoaiMieng','trongMieng','canLamSang','keHoach',
     'chanDoanMo','danDo'].forEach(n => {
      if (d[n + 'Tick'] === undefined && d[n + 'Khac'] === undefined) return;
      const ghep = (d[n + 'Tick'] || []).concat([(d[n + 'Khac'] || '').trim()]).filter(Boolean).join('; ');
      /* Ô "Không" chỉ có ở ba mục tiền sử — không tick gì thì ghi thẳng "Không" */
      /* Không tick gì thì ghi thẳng nhãn bình thường của mục đó */
      const oK = f.querySelector(`[name="${n}Khong"]`), oB = f.querySelector(`[name="${n}Bat"]`);
      d[n] = ghep
        || (oK && oK.checked ? (oK.dataset.nhan || '') : '')
        || (oB && oB.checked ? (oB.dataset.nhan || '') : '');
      delete d[n + 'Tick']; delete d[n + 'Khac']; delete d[n + 'Khong']; delete d[n + 'Bat'];
    });
    if (d.chanDoan != null) d.chanDoan = icdCode(d.chanDoan);
    if (d.chanDoanKem != null) d.chanDoanKem = icdCode(d.chanDoanKem);
    d._at = todayISO();
    if (this.cuaKhach(k)) {
      /* Bệnh án của khách: gộp vào bản đang có, giữ nguyên quá trình điều trị
         và danh sách vấn đề vì hai thứ đó sửa ở chỗ khác. */
      const cu = c.record || {};
      c.record = Object.assign({}, cu, d, {dienBien: cu.dienBien || [], vanDe: cu.vanDe || []});
      c._up = Date.now();
    } else {
      if (!ep.phieu) ep.phieu = {};
      ep.phieu[k] = d;
      ep._up = Date.now();
    }
    save(); App.closeModal(); App.render();
    App.toast('Đã lưu ' + this.ten(k) + ' ✓');
    if (inLuon) this.in(k);
  },
  in(k){
    const c = custById(App.state.custSel); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const ep = Dot.dangChon(c);
    if (!ep && !this.cuaKhach(k)) { App.toast('Mở một đợt điều trị trước đã'); Dot.form(); return; }
    const fn = this['p_' + k];
    if (!fn) { App.toast('Chưa có mẫu này'); return; }
    /* In kèm khối chữ ký điện tử: bản giấy phải nói rõ ai đã ký bản điện tử và
       mã kiểm tra, nếu không cầm tờ giấy ra ngoài là mất hết dấu vết ký. */
    const kyHTML = (typeof Ky !== 'undefined') ? Ky.khoiIn(c, k) : '';
    App.print(fn.call(this, c, ep || {}) + kyHTML, undefined, this.ten(k) + ' — ' + (c.name || ''));
  },

  /* Danh sách tick, dòng cuối để gõ tự do nếu không dòng nào ở trên hợp.
     Câu đã lưu được tách theo dấu ; — dòng nào khớp thì tick lại, phần còn lại
     rơi vào ô "Khác" để sửa tiếp. */
  tachCau(v){ return String(v||'').split(';').map(x => x.trim()).filter(Boolean); },
  tickDong(id, ten, ds, daLuu, nhan, ghiChu){
    const cau = this.tachCau(daLuu);
    const co = new Set(ds.map(x => Combo.norm(x)));
    const chon = new Set(cau.filter(x => co.has(Combo.norm(x))).map(x => Combo.norm(x)));
    const khac = cau.filter(x => !co.has(Combo.norm(x))).join('; ');
    return `<div class="f full"><label>${nhan}</label>
      <div class="tick-ds" id="${id}">${ds.map(x => `<label class="tick-d">
        <input type="checkbox" name="${ten}Tick" value="${h(x)}"${chon.has(Combo.norm(x))?' checked':''}
          ${ten==='lyDo'?` onchange="HoSo.doiLyDo()"`:''}> <span>${h(x)}</span></label>`).join('')
        || '<span class="sub-line">Chọn lý do vào viện ở trên để thấy gợi ý.</span>'}</div>
      <div class="tick-khac"><span>Khác:</span>
        <input name="${ten}Khac" value="${h(khac)}" placeholder="gõ tay nếu không dòng nào ở trên hợp"></div>
      ${ghiChu?`<div class="combo-hint">${ghiChu}</div>`:''}</div>`;
  },
  /* Đổi lý do thì đổi luôn danh sách gợi ý quá trình bệnh lý bên dưới */
  doiLyDo(){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const ly = [...f.querySelectorAll('[name="lyDoTick"]:checked')].map(x => x.value)
      .concat([(f.querySelector('[name="lyDoKhac"]')||{}).value || '']).join('; ');
    this.veLaiTick('tkQT',  'quaTrinhTick',   GY.qtCho(ly));
    this.veLaiTick('tkTM',  'trongMiengTick', GY.tmCho(ly), 1);
    this.veLaiTick('tkCLS', 'canLamSangTick', GY.clsCho(ly), 1);
    this.veLaiTick('tkDX',  'chanDoanMoTick', GY.dxCho(ly));
    this.veLaiTick('tkDan', 'danDoTick',      GY.danCho(ly));
    const icd = GY.icdCho(ly);
    Combo.setOpts('gy_dx', icd); Combo.setOpts('gy_dx2', icd);
    const oTT = document.getElementById('ttMau');
    if (oTT) oTT.innerHTML = '<option value="">— chọn câu mẫu —</option>'
      + GY.ttCho(ly).map(x => `<option value="${h(x)}">${h(x)}</option>`).join('');
  },
  /* Câu lý do vào viện đang tick — dùng chung cho mọi ô gợi ý bám theo dịch vụ */
  lyDoDang(c, ep){
    const f = document.querySelector('#modalBody form');
    if (f && f.querySelector('[name="lyDoTick"]'))
      return [...f.querySelectorAll('[name="lyDoTick"]:checked')].map(x => x.value)
        .concat([(f.querySelector('[name="lyDoKhac"]') || {}).value || '']).join('; ');
    const r = (c || {}).record || {};
    return r.lyDo || (ep || {}).lyDo || '';
  },
  chenTomTat(v){
    if (!v) return;
    const o = document.querySelector('#modalBody [name="tomTat"]'); if (!o) return;
    o.value = (o.value.trim() ? o.value.trim() + ' ' : '') + v;
  },
  /* Vẽ lại một danh sách tick, giữ nguyên những dòng người dùng đã tick */
  veLaiTick(id, ten, ds, giuDongKhong){
    const box = document.getElementById(id); if (!box) return;
    const cu = new Set([...box.querySelectorAll(`[name="${ten}"]:checked`)].map(x => Combo.norm(x.value)));
    box.innerHTML = ds.filter(x => !this.laKhong(x)).map(x => `<label class="tick-d">
      <input type="checkbox" name="${ten}" value="${h(x)}"${cu.has(Combo.norm(x)) ? ' checked' : ''}
        ${giuDongKhong ? ` onchange="HoSo.coBenh('${id}','${ten.replace(/Tick$/, '')}')"` : ''}> <span>${h(x)}</span></label>`).join('')
      || '<span class="sub-line">Chọn lý do vào viện ở trên để thấy gợi ý.</span>';
  },

  /* Hai ô riêng: "Bình thường" và "Bất thường" (hoặc "Không" / "Có") — theo đúng
     khuôn mẫu giấy tờ, mỗi bên một ô vuông để tick. Hai ô loại trừ nhau. Tick một
     dòng bên dưới hoặc gõ ô Ghi rõ thì tự chuyển sang "Bất thường". */
  laKhong(v){ const t = Combo.norm(v || ''); return !t || t === 'khong' || t === 'binh thuong'; },
  nhanBat(nhanKhong){ return Combo.norm(nhanKhong) === 'binh thuong' ? 'Bất thường' : 'Có'; },
  tickKhong(id, ten, ds, daLuu, nhan, ghiChu, nhanKhong, macDinhBT){
    nhanKhong = nhanKhong || 'Không';
    const nBat = this.nhanBat(nhanKhong);
    /* Khám trong miệng thì mặc định KHÔNG tick "Bình thường" — khách đã đến khám thì
       trong miệng gần như luôn có gì đó, tick sẵn bình thường dễ ký nhầm. */
    const khong = daLuu ? this.laKhong(daLuu) : (macDinhBT !== false);
    const bat = daLuu ? !this.laKhong(daLuu) : false;
    const cau = khong ? [] : this.tachCau(daLuu);
    const co = new Set(ds.map(x => Combo.norm(x)));
    const chon = new Set(cau.filter(x => co.has(Combo.norm(x))).map(x => Combo.norm(x)));
    const ro = cau.filter(x => !co.has(Combo.norm(x))).join('; ');
    return `<div class="f full"><label>${nhan}</label>
      <div class="tick-doi">
        <label class="tick-d tick-khong"><input type="checkbox" name="${ten}Khong" data-nhan="${h(nhanKhong)}"${khong ? ' checked' : ''}
          onchange="HoSo.doiKhong('${id}','${ten}',this.checked)"> <span>${h(nhanKhong)}</span></label>
        <label class="tick-d tick-bat"><input type="checkbox" name="${ten}Bat" data-nhan="${h(nBat)}"${bat ? ' checked' : ''}
          onchange="HoSo.doiBat('${id}','${ten}',this.checked)"> <span>${h(nBat)}, ghi rõ:</span></label>
      </div>
      <div class="tick-ds" id="${id}">
        ${ds.filter(x => !this.laKhong(x)).map(x => `<label class="tick-d">
          <input type="checkbox" name="${ten}Tick" value="${h(x)}"${chon.has(Combo.norm(x)) ? ' checked' : ''}
            onchange="HoSo.coBenh('${id}','${ten}')"> <span>${h(x)}</span></label>`).join('')}
      </div>
      <div class="tick-khac"><span>Ghi rõ:</span>
        <input name="${ten}Khac" value="${h(ro)}" placeholder="gõ tay nếu không dòng nào ở trên hợp"
          oninput="HoSo.coBenh('${id}','${ten}')"></div>
      ${ghiChu ? `<div class="combo-hint">${ghiChu}</div>` : ''}</div>`;
  },
  /* Tick ô bình thường -> bỏ hết dòng bất thường và xóa ô ghi rõ */
  doiKhong(id, ten, bat){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const oBat = f.querySelector(`[name="${ten}Bat"]`);
    if (!bat) return;
    if (oBat) oBat.checked = false;
    f.querySelectorAll(`[name="${ten}Tick"]`).forEach(x => x.checked = false);
    const o = f.querySelector(`[name="${ten}Khac"]`); if (o) o.value = '';
  },
  /* Tick ô bất thường -> bỏ ô bình thường */
  doiBat(id, ten, bat){
    const f = document.querySelector('#modalBody form'); if (!f || !bat) return;
    const k = f.querySelector(`[name="${ten}Khong"]`); if (k) k.checked = false;
  },
  /* Tick một dòng bất thường hoặc gõ ghi rõ -> tự chuyển sang ô bất thường */
  coBenh(id, ten){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const coTick = !!f.querySelector(`[name="${ten}Tick"]:checked`);
    const ro = ((f.querySelector(`[name="${ten}Khac"]`) || {}).value || '').trim();
    const k = f.querySelector(`[name="${ten}Khong"]`), bt = f.querySelector(`[name="${ten}Bat"]`);
    if (coTick || ro) { if (k) k.checked = false; if (bt) bt.checked = true; }
  },

  /* Tóm tắt bệnh án tự viết từ những gì đã điền: hành chính + lý do vào viện +
     khám trong miệng + chẩn đoán. Bác sĩ sửa lại được, không ép. */
  cauTomTat(c){
    const f = document.querySelector('#modalBody form');
    const lay = n => {
      if (!f) return '';
      const tk = [...f.querySelectorAll(`[name="${n}Tick"]:checked`)].map(x => x.value);
      const kh = ((f.querySelector(`[name="${n}Khac"]`)||{}).value || '').trim();
      const bt = f.querySelector(`[name="${n}Khong"]`);
      const ghep = tk.concat(kh ? [kh] : []).filter(Boolean).join('; ');
      return ghep || (bt && bt.checked ? (bt.dataset.nhan || '') : '');
    };
    const nam = c.dob ? c.dob.slice(0, 4) : '';
    const tuoi = this.tuoi(c);
    const p = [];
    p.push('Bệnh nhân ' + (c.gender ? c.gender.toLowerCase() : '') +
      (nam ? ', sinh năm ' + nam : '') + (tuoi ? ' (' + tuoi + ' tuổi)' : ''));
    const ly = lay('lyDo');
    if (ly) p.push('đến khám vì ' + ly.charAt(0).toLowerCase() + ly.slice(1).replace(/\.$/, ''));
    let cau = p.join(', ') + '.';
    const tm = lay('trongMieng');
    if (tm && !this.laKhong(tm)) cau += ' Khám trong miệng thấy: ' + tm + '.';
    else if (tm) cau += ' Khám trong miệng bình thường.';
    const dx = f ? icdName(icdCode(((f.querySelector('[name="chanDoan"]')||{}).value) || '')) : '';
    if (dx) cau += ' Chẩn đoán: ' + dx + '.';
    return cau.replace(/\s+/g, ' ').trim();
  },
  vietTomTat(){
    const c = custById(App.state.custSel); if (!c) return;
    const o = document.querySelector('#modalBody [name="tomTat"]');
    if (o) { o.value = this.cauTomTat(c); App.toast('Đã viết tóm tắt — sửa lại tùy ý'); }
  },

  /* Mục V. Kế hoạch điều trị — danh sách dịch vụ sẽ làm trong đợt này.
     Gợi ý lấy từ bảng giá phòng khám nhưng CHỈ TÊN, không kèm giá (bản in bệnh án
     không phải chỗ bàn tiền — tiền nằm ở phiếu báo giá và phiếu thu). */
  khoiKeHoach(c, ep, daLuu){
    const cau = this.tachCau(daLuu);
    /* Dịch vụ đã gắn vào đợt và dịch vụ đã vạch trên sơ đồ kế hoạch — gợi ý sẵn */
    const tuDot = Dot.mucCua(ep).map(t => t.name + (t.tooth ? ' — R' + t.tooth : ''));
    const tuSoDo = Object.keys(c.teethKH || {}).map(Number).filter(n => !isNaN(n))
      .sort((a,b)=>a-b).map(n => (c.teethKH[n].dichVu||'') + ' — R' + n).filter(x => x.trim()[0] !== '—');
    const mau = GY.khCho(this.lyDoDang(c, ep));
    const ds = [...new Set(tuDot.concat(tuSoDo).concat(mau).concat(cau))];
    const co = new Set(ds.map(x => Combo.norm(x)));
    const chon = new Set(cau.map(x => Combo.norm(x)));
    return `<div class="f full"><label>V. Kế hoạch điều trị</label>
      <div class="tick-ds" id="tkKH">${ds.length ? ds.map(x => `<label class="tick-d">
        <input type="checkbox" name="keHoachTick" value="${h(x)}"${chon.has(Combo.norm(x))||!cau.length?' checked':''}> <span>${h(x)}</span></label>`).join('')
        : '<span class="sub-line">Chưa có dịch vụ nào — chọn ở ô bên dưới để thêm vào kế hoạch.</span>'}</div>
      <div style="margin-top:8px">${Combo.html('gy_kh','', '', Svc.goiY(), 'Gõ tên dịch vụ để thêm vào kế hoạch',
        v => HoSo.themKeHoach(v), 'Gợi ý lấy từ bảng giá phòng khám — chỉ tên dịch vụ, không kèm giá.')}</div>
      <div class="tick-khac"><span>Ghi thêm:</span>
        <input name="keHoachKhac" placeholder="ghi chú kế hoạch, thứ tự làm, hẹn tái khám…"></div></div>`;
  },
  themKeHoach(v){
    v = String(v || '').trim(); if (!v) return;
    const box = document.getElementById('tkKH'); if (!box) return;
    const co = [...box.querySelectorAll('[name="keHoachTick"]')].some(x => Combo.norm(x.value) === Combo.norm(v));
    if (co) { App.toast('Đã có trong kế hoạch rồi'); }
    else {
      const l = document.createElement('label');
      l.className = 'tick-d';
      l.innerHTML = `<input type="checkbox" name="keHoachTick" value="${h(v)}" checked> <span>${h(v)}</span>`;
      const trong = box.querySelector('.sub-line'); if (trong) trong.remove();
      box.appendChild(l);
    }
    const inp = document.querySelector('#gy_kh .combo-input'); if (inp) inp.value = '';
  },

  /* VII. Thời gian điều trị — từ ngày đầu tiên đến ngày kết thúc.
     Điền sẵn: ngày đầu = đợt sớm nhất (hoặc diễn biến sớm nhất); ngày kết thúc để trống
     cho tới khi lễ tân bấm "Kết thúc đợt điều trị". */
  ngayDau(c){
    const ds = (db.episodes||[]).filter(e => e.customerId === c.id).map(e => e.tuNgay).filter(Boolean)
      .concat(((c.record||{}).dienBien||[]).map(v => v.date).filter(Boolean));
    return ds.sort()[0] || '';
  },
  ngayCuoi(c){
    const ds = (db.episodes||[]).filter(e => e.customerId === c.id).map(e => e.denNgay).filter(Boolean);
    return ds.sort().pop() || '';
  },
  khoiThoiGian(c){
    const r = c.record || {};
    const ep = Dot.dangChon(c);
    const dangMo = (db.episodes||[]).filter(e => e.customerId === c.id && !e.denNgay);
    return `<div class="f"><label>VII. Điều trị từ ngày</label>
        <input type="date" name="tuNgay" value="${h(r.tuNgay || this.ngayDau(c))}"></div>
      <div class="f"><label>Đến ngày</label>
        <input type="date" name="denNgay" value="${h(r.denNgay || this.ngayCuoi(c))}"></div>
      <div class="f"><label>Ngày ký bệnh án</label>
        <input type="date" name="ngayKy" value="${h(r.ngayKy || r.denNgay || this.ngayCuoi(c) || this.ngayDau(c) || todayISO())}">
        <div class="combo-hint">Ngày này in vào <b>cả hai ô ký</b> — Bác sỹ điều trị và Đại diện cơ sở.
          Điền sẵn theo ngày kết thúc đợt, sửa lại tùy ý.</div></div>
      <div class="f full">${ep && !ep.denNgay
        ? `<div class="note-block">Đợt <b>${h(ep.ten||'')}</b> đang mở${dangMo.length>1?` (còn ${dangMo.length} đợt chưa đóng)`:''}.
            Xong hẳn thì bấm nút dưới — phần mềm điền ngày kết thúc và chuyển đợt sang <b>Hoàn tất</b>.
            <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
              <button type="button" class="btn small" onclick="Dot.ketThuc('${ep.id}')">Kết thúc đợt điều trị</button></div></div>`
        : `<div class="note-block">${ep ? `Đợt <b>${h(ep.ten||'')}</b> đã kết thúc ngày <b>${fmtD(ep.denNgay)}</b>.`
            : 'Chưa có đợt điều trị nào.'}</div>`}</div>`;
  },

  /* Ô nhập kèm gợi ý */
  oGY(id, name, val, ds, nhan, rong){
    return `<div class="f ${rong?'full':''}"><label>${nhan}</label>
      ${Combo.html('gy_'+id, name, val || '', ds, 'Gõ hoặc chọn gợi ý')}</div>`;
  },
  tickDS(name, ds, daChon, nhan){
    const c = daChon || [];
    return `<div class="f full"><label>${nhan}</label><div class="check-list">
      ${ds.map(x=>`<label><input type="checkbox" name="${name}" value="${h(x)}"${c.includes(x)?' checked':''}> ${h(x)}</label>`).join('')}
    </div></div>`;
  },
  tickMuc(ep, k, loc){
    const d = this.dl(ep, k);
    const ds = Dot.mucCua(ep).filter(loc || (()=>true));
    const chon = d.muc && d.muc.length ? d.muc : ds.map(t=>t.id);
    if (!ds.length) return `<div class="f full"><div class="note-block">Đợt này chưa có dịch vụ nào phù hợp. Bấm <b>Sửa đợt</b> để gắn dịch vụ.</div></div>`;
    return `<div class="f full"><label>Dịch vụ đưa vào phiếu (bỏ tick nếu không muốn in)</label>
      <div class="check-list">${ds.map(t=>`<label><input type="checkbox" name="muc" value="${t.id}"${chon.includes(t.id)?' checked':''}>
        ${h(t.name)}${t.tooth?' — R'+h(t.tooth):''} <span class="sub-line">${money(t.price)}</span></label>`).join('')}</div></div>`;
  },
};

/* ================= Nội dung từng biểu mẫu =================
   f_<mẫu> = các ô để điền trên máy · p_<mẫu> = bản in khổ A4 */
Object.assign(HoSo, {

  /* ---------- 1. Bệnh án ngoại trú RHM (BA-18) ---------- */
  /* Mục A lấy thẳng từ phần hành chính của khách — hiện ra để soát, sửa thì bấm
     "Sửa hồ sơ khách", không nhập lại ở đây cho khỏi lệch hai nơi. */
  khoiA(c){
    const r = c.record || {};
    const A = [
      ['1. Họ và tên', (c.name||'').toUpperCase()],
      ['2. Ngày sinh', c.dob ? fmtD(c.dob) + (this.tuoi(c) ? ' · ' + this.tuoi(c) + ' tuổi' : '') : ''],
      ['3. Giới tính', c.gender],
      ['4. Điện thoại', c.phone],
      ['5. Nghề nghiệp', r.job || c.job],
      ['6. Dân tộc', r.danToc || c.danToc],
      ['7. Quốc tịch', r.quocTich || 'Việt Nam'],
      ['8. Địa chỉ', fullAddr(c)],
      ['9. Đối tượng', c.doiTuong],
      ['10. Số thẻ BHYT', c.bhyt],
      ['11. Số căn cước', c.cccd],
      ['12. Thân nhân báo tin', c.kinName ? c.kinName + (c.kinPhone ? ' · ' + c.kinPhone : '')
        + (c.kinAddr ? ' · ' + c.kinAddr : '') : ''],
      ['13. Nơi làm việc', c.noiLamViec],
    ];
    const thieu = A.filter(x => !x[1]).length;
    return `<div class="f full"><label>A. Thông tin chung
        <span class="sub-line">lấy từ hồ sơ khách${thieu?` · còn ${thieu} mục trống`:' · đã đủ'}</span></label>
      <div class="ba-a">${A.map(([k, v]) => `<div class="ba-o ${v?'':'trong'}">
        <span class="ba-k">${h(k)}</span><span class="ba-v">${v ? h(v) : '— chưa có —'}</span></div>`).join('')}</div>
      <div class="combo-hint">Mục này <b>không nhập ở đây</b> — sửa trong hồ sơ khách để hai nơi khỏi lệch.
        <button type="button" class="link-btn" onclick="Cust.form('${c.id}')">Sửa hồ sơ khách</button></div></div>`;
  },

  f_ba18(c, ep){
    const d = c.record || {}, r = d;
    const g = (k, fb) => d[k] != null ? d[k] : (fb || '');
    return `
    ${this.khoiA(c)}
    ${this.tickDong('tkLyDo','lyDo', GY.lyDo, g('lyDo', ep.lyDo || r.lyDo),
      'I. Lý do vào viện, vấn đề sức khỏe', 'Tick được nhiều dòng — khách đến vì nhiều việc cùng lúc thì tick hết.')}
    ${this.tickDong('tkQT','quaTrinh', GY.qtCho(g('lyDo', ep.lyDo || r.lyDo)), g('quaTrinh', r.quaTrinh),
      'II.1. Quá trình bệnh lý và diễn biến lâm sàng', 'Danh sách này <b>đổi theo lý do vào viện</b> đã tick ở trên.')}
    ${this.tickKhong('tkDiUng','diUng', GY.diUng, g('diUng', c.allergy), 'II.2. Dị ứng',
      'Mặc định tick <b>Không</b>. Tick một dị nguyên hoặc gõ vào ô Ghi rõ thì <b>Không</b> tự bỏ.')}
    ${this.tickKhong('tkTSBT','tienSuBanThan', GY.tienSu, g('tienSuBanThan', r.tienSuBanThan), 'Tiền sử bản thân')}
    ${this.tickKhong('tkTSGD','tienSuGiaDinh', GY.tienSu, g('tienSuGiaDinh', r.tienSuGiaDinh), 'Tiền sử gia đình')}
    ${this.oGY('nghe','job', g('job', c.job), GY.ngheNghiep, 'Nghề nghiệp')}
    ${this.oGY('dt','danToc', g('danToc', c.danToc || 'Kinh'), GY.danToc, 'Dân tộc')}
    <div class="f"><label>Quốc tịch</label><input name="quocTich" value="${h(g('quocTich', c.quocTich || 'Việt Nam'))}"></div>
    <div class="f"><label>Mạch (lần/phút)</label><input name="mach" value="${h(g('mach'))}" placeholder="Vd: 78"></div>
    <div class="f"><label>Nhiệt độ (°C)</label><input name="nhietDo" value="${h(g('nhietDo'))}" placeholder="Vd: 37"></div>
    <div class="f"><label>Huyết áp (mmHg)</label><input name="huyetAp" value="${h(g('huyetAp'))}" placeholder="Vd: 120/80"></div>
    <div class="f"><label>Nhịp thở (lần/phút)</label><input name="nhipTho" value="${h(g('nhipTho'))}" placeholder="Vd: 18"></div>
    <div class="f"><label>Cân nặng (kg)</label><input name="canNang" value="${h(g('canNang'))}"></div>
    <div class="f"><label>Chiều cao (cm)</label><input name="chieuCao" value="${h(g('chieuCao'))}"></div>
    ${this.tickKhong('tkTT','toanThan', GY.toanThan, g('toanThan', r.toanThan), 'III.1. Khám toàn thân',
      'Mặc định tick <b>Bình thường</b>. Có gì bất thường thì tick vào, hoặc gõ ở ô Ghi rõ.', 'Bình thường')}
    ${this.tickKhong('tkNM','ngoaiMieng', GY.ngoaiMieng, g('ngoaiMieng', r.ngoaiMieng), 'III.2. Khám ngoài miệng', '', 'Bình thường')}
    ${this.tickKhong('tkTM','trongMieng', GY.tmCho(g('lyDo', ep.lyDo || r.lyDo)), g('trongMieng', r.trongMieng),
      'Khám trong miệng', 'Danh sách này <b>đổi theo lý do vào viện</b>. Mặc định <b>chưa tick</b> Bình thường — khách đến khám thì trong miệng thường có vấn đề.',
      'Bình thường', false)}
    ${this.tickKhong('tkCLS','canLamSang', GY.clsCho(g('lyDo', ep.lyDo || r.lyDo)), g('canLamSang', r.canLamSang),
      'III.3. Cận lâm sàng cần làm', 'Danh sách này <b>đổi theo dịch vụ</b> đã tick ở mục I, đúng theo mẫu phòng khám.', 'Không')}
    <div class="f full"><label>III.4. Tóm tắt bệnh án</label>
      <textarea name="tomTat" rows="3" placeholder="Bấm nút bên dưới để phần mềm tự viết từ những mục đã điền">${h(g('tomTat', r.tomTat))}</textarea>
      <div class="form-actions" style="justify-content:flex-start;margin-top:6px">
        <button type="button" class="btn small" onclick="HoSo.vietTomTat()">Tự viết từ các mục đã điền</button></div>
      <div style="margin-top:6px"><select id="ttMau" onchange="HoSo.chenTomTat(this.value);this.value=''">
        <option value="">— chọn câu mẫu —</option>
        ${GY.ttCho(g('lyDo', ep.lyDo || r.lyDo)).map(x => `<option value="${h(x)}">${h(x)}</option>`).join('')}</select></div>
      <div class="combo-hint">Câu mẫu theo hồ sơ phòng khám: <i>Bệnh nhân nam, sinh năm 1990 đến khám vì …,
        khám trong miệng thấy …</i> Viết xong sửa lại tùy ý.</div></div>
    <div class="f full"><label>IV. Chẩn đoán chính (ICD)</label>
      ${Combo.html('gy_dx','chanDoan', icdName(g('chanDoan', ep.chanDoan || r.chanDoan)) || '',
        GY.icdCho(g('lyDo', ep.lyDo || r.lyDo)), 'Gõ tên bệnh hoặc mã ICD')}
      <div class="combo-hint">Mã hay gặp với dịch vụ đã chọn ở trên được xếp lên đầu; gõ để tra cả bảng ICD.</div></div>
    ${this.tickDong('tkDX','chanDoanMo', GY.dxCho(g('lyDo', ep.lyDo || r.lyDo)), g('chanDoanMo'),
      'Chẩn đoán ghi theo mẫu (in kèm mã ICD)', 'Câu chữ lấy đúng từ mẫu bệnh án của phòng khám.')}
    <div class="f full"><label>Bệnh kèm theo</label>
      ${Combo.html('gy_dx2','chanDoanKem', icdName(g('chanDoanKem', ep.chanDoanKem || r.chanDoanKem)) || '',
        GY.icdCho(g('lyDo', ep.lyDo || r.lyDo)), 'Gõ tên bệnh hoặc mã ICD')}</div>
    ${this.khoiKeHoach(c, ep, g('keHoach', ep.keHoach || r.keHoach))}
    ${this.tickDong('tkDan','danDo', GY.danCho(g('lyDo', ep.lyDo || r.lyDo)), g('danDo'),
      'Hướng điều trị và dặn dò tiếp theo', 'In ở cuối <b>Phiếu theo dõi điều trị</b> (tờ số 3).')}
    ${this.khoiThoiGian(c)}
    <div class="note-block full">Những ô dưới đây có trong mẫu <b>16/BV-01</b> của Bộ Y tế mà bộ giấy cũ
      của phòng khám không có. Không bắt buộc điền, nhưng có thì bản in đủ mục.</div>
    <div class="f"><label>Đến khám bệnh lúc</label>
      <input type="time" name="gioKham" value="${h(g('gioKham'))}">
      <div class="combo-hint">Mục 12 của mẫu — giờ, phút.</div></div>
    <div class="f"><label>Nơi giới thiệu</label>
      <select name="noiGioiThieuLoai">${['Tự đến','Y tế'].map(o =>
        `<option${g('noiGioiThieuLoai','Tự đến')===o?' selected':''}>${o}</option>`).join('')}</select></div>
    <div class="f full"><label>Chẩn đoán và xử lý của nơi giới thiệu</label>
      <input name="noiGioiThieu" value="${h(g('noiGioiThieu'))}" placeholder="Bỏ trống nếu khách tự đến">
      <div class="combo-hint">Mục 13 của mẫu.</div></div>
    <div class="f full"><label>Mô tả tổn thương khi vào viện</label>
      <textarea name="tonThuong" rows="2" placeholder="Vd: sưng nề vùng má trái, hạn chế há miệng 2cm">${h(g('tonThuong'))}</textarea>
      <div class="combo-hint">Mẫu của Bộ để ô hình vẽ. Sơ đồ răng của phần mềm lo phần răng;
        ô này để mô tả tổn thương phần mềm, xương hàm, ngoài mặt.</div></div>
    <div class="f full"><label>Phân loại khe hở môi – vòm miệng</label>
      <select name="kheHo">${['Không có','1,4 - Khe hở môi','2,5 - Khe hở xương ổ răng',
        '3,6 - Khe hở cung hàm','7,8 - Khe hở vòm miệng cứng','9 - Khe hở vòm miệng mềm'].map(o =>
        `<option${g('kheHo','Không có')===o?' selected':''}>${o}</option>`).join('')}</select>
      <div class="combo-hint">Chỉ dùng cho ca dị tật bẩm sinh. Bình thường để <b>Không có</b>.</div></div>
    <div class="f full"><label>Đã xử lý của tuyến dưới</label>
      <input name="xuLyTuyenDuoi" value="${h(g('xuLyTuyenDuoi'))}" placeholder="Bỏ trống nếu chưa nơi nào xử lý"></div>
    <div class="f full"><label>Tình trạng người bệnh khi kết thúc điều trị</label>
      <textarea name="tinhTrangRa" rows="2" placeholder="Vd: hết đau, ăn nhai tốt, vết thương liền">${h(g('tinhTrangRa'))}</textarea></div>
    ${this.tickDS('hoSoPhim', ['X-quang','CT Scanner','Siêu âm','Xét nghiệm','Ảnh lâm sàng','Khác'],
      g('hoSoPhim') || [], 'Hồ sơ, phim, ảnh kèm theo')}
    <div class="f"><label>Tổng số tờ</label><input name="hoSoPhimSo" value="${h(g('hoSoPhimSo'))}" placeholder="Vd: 3"></div>
    <div class="f"></div>
    <div class="note-block full">Mục VI <b>Quá trình điều trị</b> và <b>Sơ đồ răng</b> tự lấy từ hồ sơ, không cần nhập lại ở đây.</div>`;
  },
  p_ba18(c, ep){
    const d = c.record || {}, r = d;
    const g = (k, fb) => (d[k] != null && d[k] !== '') ? d[k] : (fb || '');
    const ds = (r.dienBien || []).slice().sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
    /* Mục VI để TRỐNG cho bác sĩ viết tay — theo yêu cầu phòng khám. Diễn biến vẫn
       lưu trong phần mềm và in đầy đủ ở Phiếu theo dõi điều trị (tờ số 3). */
    const rows = '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(10);
    const tuN = fmtD(g('tuNgay', this.ngayDau(c))) || '…/…/……';
    const denN = fmtD(g('denNgay', this.ngayCuoi(c))) || '…/…/……';
    const bs = this.bacSi(c, ep);
    const diUng = g('diUng', c.allergy), coDiUng = diUng && !/^không$/i.test(diUng);
    const tsbt = g('tienSuBanThan'), tsgd = g('tienSuGiaDinh');
    const ok = v => !v || /^(không|bình thường)$/i.test(v);
    const ht = this.soDoChu(c,'teeth'), kh = this.soDoChu(c,'teethKH'), st = this.soDoChu(c,'teethST');
    return `
    ${this.dau(c, 'BỆNH ÁN NGOẠI TRÚ<br>CHUYÊN KHOA RĂNG HÀM MẶT', 'MS: 16/BV-01')}
    <h2>A. THÔNG TIN CHUNG</h2>
    <table class="no-border">
      <tr><td style="width:22%">1. Họ và tên:</td><td colspan="3"><b>${h((c.name||'').toUpperCase())}</b></td></tr>
      <tr><td>2. Ngày sinh:</td><td style="width:30%">${c.dob?fmtD(c.dob):'……/……/………'} — Tuổi: ${this.gach(this.tuoi(c),4)}</td>
          <td style="width:16%">3. Giới tính:</td><td>${this.o(c.gender==='Nam','Nam')} &nbsp; ${this.o(c.gender==='Nữ','Nữ')}</td></tr>
      <tr><td>4. Điện thoại:</td><td>${this.gach(c.phone,18)}</td><td>5. Nghề nghiệp:</td><td>${this.gach(g('job',c.job),22)}</td></tr>
      <tr><td>Nơi làm việc:</td><td colspan="3">${this.gach(c.noiLamViec,60)}</td></tr>
      <tr><td>6. Dân tộc:</td><td>${this.gach(g('danToc',c.danToc),14)}</td><td>7. Quốc tịch:</td><td>${this.gach(g('quocTich','Việt Nam'),14)}</td></tr>
      <tr><td>8. Địa chỉ:</td><td colspan="3">${this.gach(fullAddr(c),90)}</td></tr>
      <tr><td>9. Đối tượng:</td><td colspan="3">${this.o(c.doiTuong==='BHYT','BHYT')} &nbsp; ${this.o(!c.doiTuong||c.doiTuong==='Thu phí','Thu phí')} &nbsp; ${this.o(c.doiTuong==='Miễn','Miễn')} &nbsp; ${this.o(c.doiTuong==='Khác','Khác')}</td></tr>
      <tr><td>10. Số thẻ BHYT:</td><td>${this.gach(c.bhyt,24)}</td><td>Giá trị đến:</td><td>${this.gach(c.bhytDen?fmtD(c.bhytDen):'',14)}</td></tr>
      <tr><td>11. Số Căn cước:</td><td colspan="3">${this.gach(c.cccd,40)}</td></tr>
      <tr><td>12. Thân nhân báo tin:</td><td colspan="3">${this.gach(c.kinName,32)} — Điện thoại: ${this.gach(c.kinPhone,18)}</td></tr>
      <tr><td>Địa chỉ thân nhân:</td><td colspan="3">${this.gach(c.kinAddr,70)}</td></tr>
      <tr><td>13. Đến khám lúc:</td><td>${this.gach(g('gioKham'),8)} ngày ${this.gach(fmtD(g('tuNgay', this.ngayDau(c))),14)}</td>
          <td>Nơi giới thiệu:</td><td>${this.o(g('noiGioiThieuLoai','Tự đến')==='Y tế','Y tế')} &nbsp; ${this.o(g('noiGioiThieuLoai','Tự đến')==='Tự đến','Tự đến')}</td></tr>
      ${g('noiGioiThieu') ? `<tr><td>Chẩn đoán, xử lý của nơi giới thiệu:</td><td colspan="3">${h(g('noiGioiThieu'))}</td></tr>` : ''}
    </table>
    <h2>B. THÔNG TIN KHÁM BỆNH</h2>
    <p><b>I. LÝ DO VÀO VIỆN, VẤN ĐỀ SỨC KHỎE:</b> ${this.gach(g('lyDo', ep.lyDo || r.lyDo), 76)}</p>
    <p><b>II. HỎI BỆNH</b><br>
      1. Quá trình bệnh lý và diễn biến lâm sàng: ${this.gach(g('quaTrinh', r.quaTrinh), 60)}<br>
      2. Tiền sử liên quan đến tình trạng bệnh lần này:<br>
      &nbsp;&nbsp;Dị ứng: ${this.o(!coDiUng,'Không')} &nbsp; ${this.o(coDiUng,'Có, ghi rõ:')} ${this.gach(coDiUng?diUng:'',38)}<br>
      &nbsp;&nbsp;Bản thân: ${this.o(ok(tsbt),'Không')} &nbsp; ${this.o(!ok(tsbt),'Có, ghi rõ:')} ${this.gach(ok(tsbt)?'':tsbt,38)}<br>
      &nbsp;&nbsp;Gia đình: ${this.o(ok(tsgd),'Không')} &nbsp; ${this.o(!ok(tsgd),'Có, ghi rõ:')} ${this.gach(ok(tsgd)?'':tsgd,38)}</p>
    <p><b>III. KHÁM BỆNH</b><br>
      Mạch: ${this.gach(g('mach'),5)} lần/phút &nbsp; Nhiệt độ: ${this.gach(g('nhietDo'),5)} °C &nbsp; Huyết áp: ${this.gach(g('huyetAp'),8)} mmHg<br>
      Nhịp thở: ${this.gach(g('nhipTho'),5)} lần/phút &nbsp; Cân nặng: ${this.gach(g('canNang'),5)} kg &nbsp; Chiều cao: ${this.gach(g('chieuCao'),5)} cm<br>
      1. Toàn thân: ${this.o(ok(g('toanThan')),'Bình thường')} &nbsp; ${this.o(!ok(g('toanThan')),'Bất thường, ghi rõ:')} ${this.gach(ok(g('toanThan'))?'':g('toanThan'),46)}<br>
      2. Khám chuyên khoa<br>
      &nbsp;&nbsp;Ngoài miệng: ${this.o(ok(g('ngoaiMieng')),'Bình thường')} &nbsp; ${this.o(!ok(g('ngoaiMieng')),'Bất thường:')} ${this.gach(ok(g('ngoaiMieng'))?'':g('ngoaiMieng'),42)}<br>
      &nbsp;&nbsp;Trong miệng: ${this.o(ok(g('trongMieng')),'Bình thường')} &nbsp; ${this.o(!ok(g('trongMieng')),'Bất thường:')} ${this.gach(ok(g('trongMieng'))?'':g('trongMieng'),42)}<br>
      3. Các xét nghiệm, cận lâm sàng cần làm: ${this.o(ok(g('canLamSang')),'Không')} &nbsp; ${this.o(!ok(g('canLamSang')),'Có, ghi rõ:')} ${this.gach(ok(g('canLamSang'))?'':g('canLamSang'),38)}<br>
      4. Mô tả tổn thương khi vào viện: ${this.gach(g('tonThuong'),52)}<br>
      ${g('kheHo') && g('kheHo') !== 'Không có' ? 'Phân loại khe hở môi – vòm miệng: <b>' + h(g('kheHo')) + '</b><br>' : ''}
      5. Đã xử lý của tuyến dưới: ${this.gach(g('xuLyTuyenDuoi'),56)}<br>
      6. Tóm tắt bệnh án: ${this.gach(g('tomTat'),62)}</p>
    <p><b>SƠ ĐỒ RĂNG</b><br>${(() => {
        const nc = Cust.moTaNhaChu(c, 'teeth');
        return nc ? 'Mô nha chu: ' + h(nc) + '<br>' : '';
      })()}Trước điều trị: ${ht || this.cham(70)}
      ${(() => {
        const kho = c.teethKH || {};
        const ds = Object.keys(kho).map(Number).filter(n => !isNaN(n) && kho[n] && kho[n].dichVu).sort((a,b)=>a-b);
        const {khung, note} = Tooth.tomTat(c, 'teethKH');
        if (!ds.length && !khung.length) return '';
        const a = ds.map(n => 'R' + n + ': ' + h(Tooth.moTa(n, kho[n]))
          + (kho[n].chanDoan ? ' · ' + h(icdName(kho[n].chanDoan)) : '')
          + ' → <b>' + h(kho[n].dichVu) + '</b>').join('<br>');
        const b = khung.length ? '<br>Hàm khung tháo lắp: ' + h(khung.join(' và ')) + (note ? ' — ' + h(note) : '') : '';
        return '<br><b>Kế hoạch điều trị theo răng:</b><br>' + a + b;
      })()}${st ? '<br>Sau điều trị: ' + st : ''}</p>
    <p><b>IV. CHẨN ĐOÁN</b> (tên bệnh kèm mã ICD)<br>
      Bệnh chính: <b>${this.gach([icdName(g('chanDoan', ep.chanDoan || r.chanDoan)), g('chanDoanMo')].filter(Boolean).join(' — '),54)}</b><br>
      Bệnh kèm theo: ${this.gach(icdName(g('chanDoanKem', ep.chanDoanKem || r.chanDoanKem)),54)}<br>
      Biến chứng: ${this.gach(icdName(r.bienChung),54)}</p>
    <p><b>V. KẾ HOẠCH ĐIỀU TRỊ</b><br>${h(g('keHoach', ep.keHoach || r.keHoach)).replace(/\n/g,'<br>') || this.cham(100)+'<br>'+this.cham(100)}</p>
    <h2>VI. QUÁ TRÌNH ĐIỀU TRỊ</h2>
    <table><tr><th style="width:78px">Ngày</th><th>Diễn biến bệnh</th><th>Xử trí</th><th style="width:96px">Đợt điều trị</th></tr>${rows}</table>
    <p style="margin-top:8px"><b>VII. THỜI GIAN ĐIỀU TRỊ</b><br>Điều trị ngoại trú từ ngày ${tuN} đến ngày ${denN}<br>
      Tình trạng người bệnh khi kết thúc điều trị: ${this.gach(g('tinhTrangRa'),52)}</p>
    ${(() => {
      const ds = g('hoSoPhim') || [];
      if (!ds.length && !g('hoSoPhimSo')) return '';
      return `<p><b>HỒ SƠ, PHIM, ẢNH KÈM THEO:</b> ${h([].concat(ds).join(', '))}` +
        (g('hoSoPhimSo') ? ' — tổng số tờ: ' + h(g('hoSoPhimSo')) : '') + '</p>';
    })()}
    ${(() => {
      const ngay = g('ngayKy', g('denNgay', this.ngayCuoi(c) || this.ngayDau(c)));
      return `<div class="sign">
      <div>${this.ngayChu(ngay)}<br><b>Bác sỹ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bs?bs.name:'')}</div>
      <div>${this.ngayChu(ngay)}<br><b>Đại diện cơ sở KB, CB</b><br>(Ký, đóng dấu)<br><br><br></div>
    </div>`; })()}`;
  },

  /* ---------- 2. Phiếu theo dõi điều trị ---------- */
  f_theodoi(c, ep){
    const d = this.dl(ep, 'theodoi'), r = c.record || {};
    return `
    <div class="f"><label>Tờ số</label><input name="toSo" value="${h(d.toSo||'1')}"></div>
    <div class="f"><label>Khoa</label><input name="khoa" value="${h(d.khoa||'Răng Hàm Mặt')}"></div>
    <div class="f full"><label>Chẩn đoán</label>
      ${Combo.html('gy_tdx','chanDoan', icdName(d.chanDoan || ep.chanDoan || r.chanDoan)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
    <div class="f full"><label>Chẩn đoán phân biệt</label>
      ${Combo.html('gy_tdx2','chanDoanKem', icdName(d.chanDoanKem || ep.chanDoanKem)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
    <div class="f full"><label>Dặn dò — hướng điều trị tiếp theo (in cuối phiếu)</label>
      <textarea name="danDo" rows="2" placeholder="để trống thì lấy phần dặn dò trong bệnh án">${h(d.danDo || '')}</textarea>
      <div class="combo-hint">Bỏ trống thì phiếu tự lấy mục <b>Hướng điều trị và dặn dò</b> đã ghi trong Bệnh án ngoại trú.</div></div>
    <div class="note-block full">Bảng <b>Thời gian · Diễn biến bệnh · Chỉ định</b> tự lấy từ mục
      <b>Quá trình điều trị</b> của khách — mỗi buổi một dòng, có bác sĩ và người phụ.
      Muốn thêm dòng thì bấm <b>Thêm diễn biến</b> ở hồ sơ khách; ở đó có sẵn nút điền nhanh theo mẫu.</div>
    <div class="f full"><label>Số dòng trống chừa thêm để viết tay</label>
      <select name="dongTrong">${[0,2,4,6,8].map(n=>`<option${String(d.dongTrong)===String(n)?' selected':''}>${n}</option>`).join('')}</select></div>`;
  },
  p_theodoi(c, ep){
    const d = this.dl(ep, 'theodoi'), r = c.record || {};
    const ds = (r.dienBien||[]).slice().sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
    const rows = ds.map(v => {
      const bs = staffById(v.doctorId), pt = staffById(v.assistantId);
      const ky = [bs ? 'BS: ' + h(bs.name) : '', pt ? 'Phụ tá: ' + h(pt.name) : ''].filter(Boolean).join(' · ');
      const dv = v.treatmentId ? db.treatments.find(x => x.id === v.treatmentId) : null;
      return `<tr><td style="width:104px">${fmtD(v.date)}</td>
        <td>${dv ? '<i>' + h(dv.name) + (dv.tooth ? ' — R' + h(dv.tooth) : '') + '</i><br>' : ''}${h(v.db||'')}</td>
        <td>${h(v.xt||'')}${v.dan?'<br><i>Dặn dò: '+h(v.dan)+'</i>':''}</td>
        <td style="width:22%">${ky ? '<i>'+ky+'</i>' : ''}<br><br></td></tr>`;
    }).join('');
    const trong = '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(ds.length ? (+d.dongTrong || 0) : 6);
    const dan = d.danDo || r.danDo || '';
    return `
    ${this.dau(c, 'PHIẾU THEO DÕI ĐIỀU TRỊ', 'MS: 36/BV2', `<div style="font-size:11px">Tờ số: ${h(d.toSo||'1')}</div>`)}
    <table class="no-border">
      <tr><td style="width:24%">Họ và tên người bệnh:</td><td><b>${h(c.name||'')}</b></td>
          <td style="width:14%">Tuổi: ${this.gach(this.tuoi(c),4)}</td>
          <td style="width:20%">${this.o(c.gender==='Nam','Nam')} ${this.o(c.gender==='Nữ','Nữ')}</td></tr>
      <tr><td>Khoa:</td><td colspan="3">${this.gach(d.khoa||'Răng Hàm Mặt',30)}</td></tr>
      <tr><td>Chẩn đoán:</td><td colspan="3">${this.gach(icdName(d.chanDoan || ep.chanDoan || r.chanDoan),70)}</td></tr>
      <tr><td>Chẩn đoán phân biệt:</td><td colspan="3">${this.gach(icdName(d.chanDoanKem || ep.chanDoanKem),70)}</td></tr>
    </table>
    <table style="margin-top:8px">
      <tr><th style="width:104px">Thời gian<br>(Ngày, giờ)</th>
          <th>Diễn biến bệnh</th>
          <th style="width:30%">Chỉ định</th>
          <th style="width:22%">Bác sỹ — Phụ tá<br><span style="font-weight:400">(Ký, ghi rõ họ tên)</span></th></tr>
      ${rows}${trong}
    </table>
    ${dan ? `<p style="margin-top:8px"><b>Hướng điều trị và dặn dò tiếp theo:</b> ${h(dan)}</p>` : ''}
    <p style="margin-top:8px"><b>Ghi chú:</b> Bác sỹ ký ngay sau mỗi lần ghi chép trong phần “Diễn biến bệnh” hoặc “Chỉ định”.</p>`;
  },

  /* ---------- 3. Giấy cam kết ---------- */
  f_camket(c, ep){
    const d = this.dl(ep, 'camket'), r = c.record || {};
    const bs = this.bacSi(c, ep);
    return `
    <div class="f"><label>Tính chất</label><select name="tinhChat">
      ${GY.tinhChat.map(x=>`<option${(d.tinhChat||'Chương trình/Phiên')===x?' selected':''}>${x}</option>`).join('')}</select></div>
    <div class="f"><label>Bác sĩ thực hiện</label><select name="bsId">
      ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${(d.bsId||(bs&&bs.id))===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
    <div class="f"><label>Bác sĩ gây mê (nếu có)</label><select name="bsGmId">
      <option value="">— không có —</option>
      ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${d.bsGmId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
    <div class="f full"><label>Chẩn đoán</label>
      ${Combo.html('gy_ckdx','chanDoan', icdName(d.chanDoan || ep.chanDoan || r.chanDoan)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
    ${this.tickMuc(ep, 'camket')}
    ${this.tickDS('ppTT', GY.ppTT, d.ppTT || ['Thủ thuật'], 'Phương pháp phẫu thuật / thủ thuật dự kiến')}
    ${this.tickDS('ppGM', GY.ppGM, d.ppGM || ['Tiền mê + Tê tại chỗ'], 'Phương pháp vô cảm dự kiến')}
    ${this.tickDS('nguyCo', GY.nguyCo, d.nguyCo || ['Phản ứng thuốc','Chảy máu','Nhiễm trùng'], 'Nguy cơ, tai biến có thể xảy ra')}
    <div class="f full"><label>Nguy cơ / rủi ro khác</label><input name="nguyCoKhac" value="${h(d.nguyCoKhac||'')}" placeholder="Vd: tê môi cằm tạm thời"></div>
    <div class="f full"><label>Kết quả sau phẫu thuật/thủ thuật (dự kiến)</label>
      <input name="ketQua" value="${h(d.ketQua||'')}" placeholder="Vd: hết đau, phục hồi ăn nhai sau 5–7 ngày"></div>
    <div class="f full"><label>Phương pháp điều trị khác ngoài phẫu thuật/thủ thuật</label>
      <input name="ppKhac" value="${h(d.ppKhac||'')}" placeholder="Để trống nếu không có"></div>
    <div class="f"><label>Họ tên thân nhân</label><input name="kinName" value="${h(d.kinName||c.kinName||'')}"></div>
    ${this.oGY('qh','kinRel', d.kinRel || c.kinRel || '', GY.quanHe, 'Quan hệ với người bệnh')}
    <div class="f"><label>Năm sinh thân nhân</label><input name="kinNam" value="${h(d.kinNam||'')}"></div>
    <div class="f"><label>Ngày ký</label><input type="date" name="ngayKy" value="${h(d.ngayKy||todayISO())}"></div>`;
  },
  p_camket(c, ep){
    const d = this.dl(ep, 'camket'), r = c.record || {};
    const bs = staffById(d.bsId) || this.bacSi(c, ep);
    const bsGm = staffById(d.bsGmId);
    const muc = this.mucCho(ep, 'camket');
    const co = (ds, x) => (ds||[]).includes(x);
    const nam = c.dob ? c.dob.slice(0,4) : '';
    return `
    ${this.dau(c, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'MS: 01/BV2', '<div style="font-size:12px"><i>Độc lập - Tự do - Hạnh phúc</i></div>')}
    <h1 style="margin-top:4px">GIẤY CAM KẾT CHẤP THUẬN<br>PHẪU THUẬT, THỦ THUẬT VÀ GÂY MÊ HỒI SỨC</h1>
    <p style="text-align:center">${GY.tinhChat.map(x=>this.o(d.tinhChat===x, x)).join(' &nbsp; ')}</p>
    <p>Chúng tôi có tên dưới đây cùng làm Bản cam kết như sau:</p>
    <p><b>I. BÁC SỸ PHẪU THUẬT/THỦ THUẬT/GÂY MÊ HỒI SỨC:</b><br>
      Tôi tên là: <b>${this.gach(bs?bs.name:'',46)}</b> &nbsp; Chức danh: ${this.gach(bs?bs.role:'',22)} &nbsp; Khoa: Răng Hàm Mặt<br>
      và Bác sỹ: ${this.gach(bsGm?bsGm.name:'',26)} Chức danh: ${this.gach(bsGm?bsGm.role:'',16)} (Khoa phẫu thuật Gây mê hồi sức)<br>
      Được phân công thực hiện phẫu thuật/thủ thuật/gây mê cho người bệnh: <b>${h(c.name||'')}</b><br>
      Chẩn đoán: ${this.gach(icdName(d.chanDoan || ep.chanDoan || r.chanDoan),52)}</p>
    ${muc.length?`<p><b>Nội dung thực hiện trong đợt này:</b><br>${muc.map((t,i)=>(i+1)+'. '+h(t.name)+(t.tooth?' — R'+h(t.tooth):'')).join('<br>')}</p>`:''}
    <p>Chúng tôi đã tư vấn, giải thích đầy đủ, rõ ràng những thông tin liên quan đến cuộc phẫu thuật/thủ thuật/gây mê hồi sức cho người bệnh/thân nhân người bệnh về các vấn đề sau:</p>
    <p>${this.o(1,'Chẩn đoán')} &nbsp; ${this.o(1,'Lý do phẫu thuật/thủ thuật')} &nbsp; ${this.o(1,'Rủi ro, nguy cơ nếu không thực hiện')}<br>
      ${this.o(!!d.ketQua,'Kết quả sau phẫu thuật/thủ thuật (dự kiến):')} ${this.gach(d.ketQua,40)}</p>
    <p><b>Phương pháp phẫu thuật/thủ thuật dự kiến:</b><br>${GY.ppTT.map(x=>this.o(co(d.ppTT,x),x)).join(' &nbsp; ')}</p>
    <p><b>Phương pháp gây mê hồi sức dự kiến:</b><br>${GY.ppGM.map(x=>this.o(co(d.ppGM,x),x)).join(' &nbsp; ')}</p>
    <p><b>Các phương pháp điều trị khác ngoài phẫu thuật/thủ thuật:</b>
      ${this.o(!d.ppKhac,'Không')} &nbsp; ${this.o(!!d.ppKhac,'Có, cụ thể:')} ${this.gach(d.ppKhac,34)}</p>
    <p><b>Nguy cơ, tai biến trong và sau phẫu thuật/thủ thuật có thể xảy ra:</b><br>
      ${GY.nguyCo.map(x=>this.o(co(d.nguyCo,x),x)).join(' &nbsp; ')}<br>
      ${this.o(!!d.nguyCoKhac,'Nguy cơ/rủi ro khác:')} ${this.gach(d.nguyCoKhac,40)}</p>
    <p>Chúng tôi đã dành đủ thời gian để người bệnh/thân nhân đặt các câu hỏi liên quan đến phẫu thuật/thủ thuật/gây mê sẽ được thực hiện hoặc các mối quan tâm khác và chúng tôi đã trả lời tất cả các câu hỏi đó.</p>
    <p>Chúng tôi cam kết phục vụ người bệnh bằng lương tâm và trách nhiệm của người thầy thuốc cùng với tất cả kiến thức, sự hiểu biết về chuyên môn và phương tiện hiện có của <b>${h(db.clinic.legal||db.clinic.name)}</b> để nỗ lực đem lại kết quả tốt nhất cho người bệnh.</p>
    <p><b>II. NGƯỜI BỆNH/THÂN NHÂN:</b><br>
      Họ và tên người bệnh: <b>${h(c.name||'')}</b> &nbsp; Năm sinh: ${this.gach(nam,8)}<br>
      Họ và tên thân nhân: ${this.gach(d.kinName||c.kinName,30)} &nbsp; Năm sinh: ${this.gach(d.kinNam,8)}<br>
      Quan hệ với người bệnh: ${this.gach(d.kinRel||c.kinRel,22)}</p>
    <p>Tôi đã được nghe các Bác sỹ giải thích và đã trao đổi với các Bác sỹ về tất cả các thông tin của cuộc phẫu thuật/thủ thuật/gây mê, những nguy cơ thường gặp có thể xảy ra và mức độ thành công. Tôi đã hiểu lý do phải thực hiện và đồng ý để Bác sỹ thực hiện cho tôi/thân nhân của tôi.</p>
    <p>Tôi đã được tư vấn những thông tin về chi phí phẫu thuật/thủ thuật/gây mê, vật tư y tế tiêu hao dự kiến sử dụng, tôi cam kết chi trả chi phí khám bệnh, chữa bệnh ngoài phạm vi được hưởng theo quy định của pháp luật về bảo hiểm y tế và các quy định khác.</p>
    <p>Tôi đã đọc bản cam kết với tinh thần hoàn toàn minh mẫn và hiểu biết. Tôi xin hoàn toàn chịu trách nhiệm với quyết định đồng ý cho Bác sỹ phẫu thuật/thủ thuật cho tôi/thân nhân của tôi.</p>
    <p>1. Đồng ý xin phẫu thuật, thủ thuật, gây mê hồi sức và để giấy này làm bằng chứng.<br>
       2. Không đồng ý phẫu thuật, thủ thuật, gây mê hồi sức và để giấy này làm bằng chứng.<br>
       <i>(Câu 1 và câu 2 do người bệnh, thân nhân của người bệnh tự viết dưới đây)</i></p>
    <p>${this.cham(100)}<br>${this.cham(100)}</p>
    <div class="sign">
      <div><b>PHẪU THUẬT VIÊN/<br>BÁC SỸ THỰC HIỆN THỦ THUẬT</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bs?bs.name:'')}</div>
      <div><b>BÁC SỸ GÂY MÊ</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bsGm?bsGm.name:'')}</div>
      <div>${this.ngayChu(d.ngayKy)}<br><b>NGƯỜI BỆNH/THÂN NHÂN</b><br>(Ký, ghi rõ họ tên)<br><br><br></div>
    </div>`;
  },

  /* ---------- Bảng hạng mục ---------- */
  bangMuc(ds, ghi){
    /* t.price LÀ THÀNH TIỀN đã trừ giảm giá — không nhân thêm số lượng nữa */
    const rows = ds.map(t => {
      const sl = t.sl || 1, dg = t.donGia != null ? t.donGia : (t.price || 0);
      const giam = (t.giamPct ? t.giamPct + '%' : '') + (t.giamTien ? (t.giamPct ? ' + ' : '') + money(t.giamTien) : '');
      return `<tr><td>${h(t.name)}${t.tooth?' — R'+h(t.tooth):''}${giam?'<br><i>giảm '+giam+'</i>':''}</td>
      <td class="r" style="width:60px">${sl}</td>
      <td class="r" style="width:100px">${money(dg)}</td>
      <td class="r" style="width:110px">${money(t.price||0)}</td>
      <td style="width:100px">${h((ghi&&ghi[t.id])||t.status||'')}</td></tr>`;
    }).join('') || '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>'.repeat(4);
    const tong = ds.reduce((s,t)=>s+(t.price||0), 0);
    return `<table>
      <tr><th>Nội dung điều trị</th><th class="r">Số lượng</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th><th>Ghi chú</th></tr>
      ${rows}
      <tr><td colspan="3" style="text-align:right"><b>Tổng cộng</b></td><td class="r"><b>${money(tong)}</b></td><td></td></tr>
    </table>
    <p style="margin-top:6px">Bằng chữ: <i>${h(docTien(tong))}</i></p>`;
  },

  /* ---------- 4. Phiếu thu ---------- */
  f_phieuthu(c, ep){
    const d = this.dl(ep, 'phieuthu');
    return `
    <div class="f"><label>Ngày lập phiếu</label><input type="date" name="ngay" value="${h(d.ngay||todayISO())}"></div>
    <div class="f"><label>Nơi lập</label><input name="noi" value="${h(d.noi||(db.clinic.addr||'An Giang').split(',').pop().trim())}"></div>
    <div class="f"><label>Người thu tiền</label><select name="thuId">
      ${db.staff.filter(s=>s.active!==false).map(s=>{const me=Att.myStaff();
        return `<option value="${s.id}"${(d.thuId||(me&&me.id))===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`;}).join('')}</select></div>
    ${this.tickMuc(ep, 'phieuthu', t => t.status !== 'Báo giá')}
    <div class="f full"><label>Ghi chú thêm cuối phiếu</label><input name="ghiChu" value="${h(d.ghiChu||'')}" placeholder="Vd: đã giảm 10% cho khách quen"></div>
    <div class="note-block full">Dòng <b>Đã thanh toán</b> và <b>Còn lại</b> tự tính từ các phiếu thu đã lập cho khách này.</div>`;
  },
  p_phieuthu(c, ep){
    const d = this.dl(ep, 'phieuthu');
    const ds = this.mucCho(ep, 'phieuthu', t => t.status !== 'Báo giá');
    const daThu = db.receipts.filter(r => r.customerId === c.id).reduce((s,r)=>s+r.amount, 0);
    const bs = this.bacSi(c, ep);
    const thu = staffById(d.thuId) || (typeof Att !== 'undefined' ? Att.myStaff() : null);
    const conLai = custDebt(c);
    const ng = d.ngay ? new Date(d.ngay + 'T00:00') : new Date();
    return `
    ${this.dau(c, 'PHIẾU THU', '')}
    <p><b>${h(db.clinic.name)}</b> xác nhận:</p>
    <table class="no-border">
      <tr><td style="width:26%">Họ và tên bệnh nhân:</td><td><b>${h(c.name||'')}</b></td></tr>
      <tr><td>Ngày sinh:</td><td>${c.dob?fmtD(c.dob):this.cham(20)}</td></tr>
      <tr><td>Địa chỉ:</td><td>${this.gach(fullAddr(c),70)}</td></tr>
      <tr><td>Số điện thoại:</td><td>${this.gach(c.phone,20)}</td></tr>
      <tr><td>Số căn cước công dân:</td><td>${this.gach(c.cccd,24)}</td></tr>
    </table>
    <p>Đã đến khám và điều trị tại ${h(db.clinic.name)} với các thông tin sau:</p>
    ${this.bangMuc(ds)}
    <table class="no-border" style="margin-top:6px">
      <tr><td style="width:26%">Đã thanh toán:</td><td><b>${money(daThu)}</b></td></tr>
      <tr><td>Số tiền còn lại:</td><td><b style="font-size:14px">${money(conLai)}</b>${conLai?'':' <i>(đã thanh toán đủ)</i>'}</td></tr>
      <tr><td>Bằng chữ (còn lại):</td><td><i>${h(docTien(conLai))}</i></td></tr>
    </table>
    ${d.ghiChu?`<p><i>${h(d.ghiChu)}</i></p>`:''}
    <div class="sign">
      <div><b>Người thu tiền</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(thu?thu.name:'')}</div>
      <div>${h(d.noi||'An Giang')}, ngày ${ng.getDate()} tháng ${ng.getMonth()+1} năm ${ng.getFullYear()}<br>
        <b>Bác sĩ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bs?bs.name:'')}</div>
    </div>`;
  },

  /* ---------- 5. Phiếu tư vấn + báo giá ---------- */
  f_tuvan(c, ep){
    const d = this.dl(ep, 'tuvan'), r = c.record || {};
    const bs = this.bacSi(c, ep);
    return `
    <div class="f"><label>Ngày tư vấn</label><input type="date" name="ngay" value="${h(d.ngay||todayISO())}"></div>
    <div class="f"><label>Giờ</label><input type="time" name="gio" value="${h(d.gio||'')}"></div>
    <div class="f"><label>Người tư vấn 1</label><select name="bs1Id">
      ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${(d.bs1Id||(bs&&bs.id))===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
    <div class="f"><label>Người tư vấn 2</label><select name="bs2Id">
      <option value="">— không có —</option>
      ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${d.bs2Id===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
    <div class="f full"><label>Chẩn đoán</label>
      ${Combo.html('gy_tvdx','chanDoan', icdName(d.chanDoan || ep.chanDoan || r.chanDoan)||'', icdOptions(), 'Gõ tên bệnh hoặc mã ICD')}</div>
    <div class="f full"><label>Phương pháp điều trị</label>
      <textarea name="ppDieuTri" placeholder="Mỗi dòng một việc">${h(d.ppDieuTri || ep.keHoach || r.keHoach || '')}</textarea></div>
    ${this.tickDS('tienLuong', GY.tienLuong, d.tienLuong || [GY.tienLuong[0]], 'Tiên lượng và nguy cơ (chọn nhiều được)')}
    <div class="f full"><label>Tiên lượng, nguy cơ khác</label><input name="tienLuongKhac" value="${h(d.tienLuongKhac||'')}"></div>
    ${this.oGY('tvcls','canLamSang', d.canLamSang || r.canLamSang || '', GY.canLamSang, 'Cận lâm sàng cần làm', 1)}
    <div class="f"><label>Xét nghiệm máu</label><input name="xnMau" value="${h(d.xnMau||'')}" placeholder="Để trống nếu không"></div>
    <div class="f"><label>Chụp X-quang</label><input name="xq" value="${h(d.xq||'')}" placeholder="Vd: phim quanh chóp R36"></div>
    <div class="f full"><label>Ý kiến của bệnh nhân / người nhà</label>
      <select name="ykien">${GY.ykien.map(x=>`<option${d.ykien===x?' selected':''}>${h(x)}</option>`).join('')}</select></div>
    <div class="f full"><label>Ghi rõ nếu chọn "Khác"</label><input name="ykienKhac" value="${h(d.ykienKhac||'')}"></div>
    ${this.tickMuc(ep, 'tuvan')}`;
  },
  p_tuvan(c, ep){
    const d = this.dl(ep, 'tuvan'), r = c.record || {};
    const bs1 = staffById(d.bs1Id) || this.bacSi(c, ep), bs2 = staffById(d.bs2Id);
    const bg = this.mucCho(ep, 'tuvan');
    const ng = d.ngay ? new Date(d.ngay + 'T00:00') : new Date();
    const gio = d.gio ? d.gio.split(':') : null;
    const tl = (d.tienLuong || []).concat(d.tienLuongKhac ? [d.tienLuongKhac] : []);
    return `
    ${this.dau(c, 'PHIẾU TƯ VẤN', '')}
    <p>Lúc ${gio?'<b>'+h(gio[0])+'</b>':this.cham(4)} giờ ${gio?'<b>'+h(gio[1])+'</b>':this.cham(4)} phút,
      ngày ${ng.getDate()} tháng ${ng.getMonth()+1} năm ${ng.getFullYear()}, tại ${h(db.clinic.name)}.</p>
    <p>Chúng tôi là:<br>1. ${this.gach(bs1?bs1.name+(bs1.role?' — '+bs1.role:''):'',52)}<br>2. ${this.gach(bs2?bs2.name+(bs2.role?' — '+bs2.role:''):'',52)}</p>
    <p>Đã tư vấn và giải thích cho bệnh nhân <b>${h(c.name||'')}</b>${c.kinName?' / người nhà: '+h(c.kinName):''} các nội dung như sau:</p>
    <p><b>Chẩn đoán:</b> ${this.gach(icdName(d.chanDoan || ep.chanDoan || r.chanDoan),52)}</p>
    <p><b>Phương pháp điều trị:</b><br>${h(d.ppDieuTri || ep.keHoach || '').replace(/\n/g,'<br>') || this.cham(100)}
      ${bg.length?'<br>'+bg.map((t,i)=>(i+1)+'. '+h(t.name)+(t.tooth?' — R'+h(t.tooth):'')).join('<br>'):''}</p>
    <p><b>Tiên lượng và nguy cơ</b> (phản ứng với thuốc tê, chảy máu, nhiễm trùng, tê môi – má – lưỡi, thời gian phục hồi, tỷ lệ các biến chứng):<br>
      ${tl.length ? tl.map(x=>'– '+h(x)).join('<br>') : this.cham(100)+'<br>'+this.cham(100)}</p>
    <p><b>Cận lâm sàng cần làm:</b> ${this.gach(d.canLamSang,44)}<br>
      Xét nghiệm máu: ${this.gach(d.xnMau,26)} &nbsp; Chụp X-quang: ${this.gach(d.xq,26)}</p>
    <p><b>Ý kiến của bệnh nhân / người nhà bệnh nhân:</b><br>
      Sau khi nghe bác sĩ tư vấn và giải thích, tôi và các thành viên gia đình mong muốn:<br>
      ${GY.ykien.slice(0,2).map(x=>this.o(d.ykien===x, x)).join('<br>')}<br>
      ${this.o(d.ykien==='Khác','Khác:')} ${this.gach(d.ykienKhac,50)}</p>
    <p>Bệnh nhân/người nhà bệnh nhân sau khi nghe giải thích đã hiểu rõ bệnh lý, phương pháp điều trị, các nguy cơ biến chứng…, chấp nhận các rủi ro và chịu trách nhiệm với các lựa chọn trên; đồng thời cam kết thực hiện đầy đủ các nghĩa vụ của bệnh nhân theo quy định của pháp luật và quy định của phòng khám.</p>
    <div class="sign">
      <div><b>Bác sĩ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bs1?bs1.name:'')}</div>
      <div><b>Bệnh nhân/Người nhà</b><br>(Ký, ghi rõ họ tên)<br><br><br></div>
    </div>
    <div class="ngat-trang"></div>
    ${this.dau(c, 'PHIẾU BÁO GIÁ', '')}
    <table class="no-border">
      <tr><td style="width:26%">Họ và tên bệnh nhân:</td><td><b>${h(c.name||'')}</b>${c.phone?' — '+h(c.phone):''}</td></tr>
      <tr><td>Đợt điều trị:</td><td>${h(ep.ten||'')}${ep.tuNgay?' — từ '+fmtD(ep.tuNgay):''}</td></tr>
    </table>
    ${this.bangMuc(bg)}
    <p style="font-size:11px"><i>Báo giá có giá trị tham khảo, có thể thay đổi khi tình trạng răng thực tế khác với thăm khám ban đầu.</i></p>
    <div class="sign">
      <div><b>Bác sĩ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br>${h(bs1?bs1.name:'')}</div>
      <div><b>Bệnh nhân/Người nhà</b><br>(Ký, ghi rõ họ tên)<br><br><br></div>
    </div>`;
  },
});

/* ---------- Sơ đồ răng ----------
   Mỗi răng vẽ thành ô 5 vùng (gần / xa / ngoài / trong / nhai) + một vạch cổ răng.
   Gần–xa đổi bên theo phần hàm: răng bên phải bệnh nhân nằm nửa trái sơ đồ nên mặt
   gần (phía đường giữa) là phía PHẢI ô; bên trái thì ngược lại. Ngoài–trong đổi theo
   hàm trên / hàm dưới, đúng như nhìn vào miệng bệnh nhân. */

const Tooth = {
  hamTren(n){ const q = Math.floor(n/10); return q === 1 || q === 2; },
  benPhai(n){ const q = Math.floor(n/10); return q === 1 || q === 4; },   /* nửa trái sơ đồ */
  /* Vùng nào trên ô ứng với mặt nào của răng này */
  ban(n){
    const tren = this.hamTren(n), phai = this.benPhai(n);
    return {
      top:    tren ? 'N' : 'T',        /* hàm trên: mặt ngoài quay lên */
      bottom: tren ? 'T' : 'N',
      left:   phai ? 'X' : 'G',        /* nửa trái sơ đồ: đường giữa ở bên phải ô */
      right:  phai ? 'G' : 'X',
      center: 'NH',
    };
  },
  tenMat(k){ const m = TOOTH_SURF.find(x => x[0] === k); return m ? m[1] : k; },

  /* Màu của một mặt: sâu = đỏ, đã trám = xanh dương, còn lại để trống */
  mauMat(t, k){
    if (!t || !(t.mat||[]).includes(k)) return '';
    return t.s === 'filled' ? 'var(--info)' : 'var(--danger)';
  },
  /* Ô 5 vùng + vạch cổ răng, vẽ bằng SVG cho nét ở mọi cỡ màn hình */
  svg(n, t){
    const b = this.ban(n), P = (d, k) => {
      const f = this.mauMat(t, k);
      return `<polygon points="${d}" fill="${f || 'var(--surface)'}" stroke="var(--line)" stroke-width="1"><title>${h(this.tenMat(k))}</title></polygon>`;
    };
    const co = this.mauMat(t, 'C');
    return `<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
      ${P('0,0 32,0 22,10 10,10', b.top)}
      ${P('32,0 32,32 22,22 22,10', b.right)}
      ${P('0,32 32,32 22,22 10,22', b.bottom)}
      ${P('0,0 0,32 10,22 10,10', b.left)}
      ${P('10,10 22,10 22,22 10,22', b.center)}
      <rect x="0" y="34" width="32" height="6" rx="2" fill="${co || 'var(--surface)'}" stroke="var(--line)" stroke-width="1"><title>Cổ răng</title></rect>
    </svg>`;
  },
  /* Ký hiệu đè lên cả răng cho các tình trạng không phải sâu / trám */
  deLen(n, t){
    if (!t) return '';
    const g = [];
    /* Lung lay: hai mũi tên hai bên cho thấy răng lắc được; càng nặng càng đậm.
       Không tô kín mặt răng vì răng lung lay vẫn có thể lành lặn, chỉ là mất bám. */
    if (laLungLay(t.s)) {
      const d = t.s === 'll3' ? 3.2 : t.s === 'll2' ? 2.4 : 1.6;
      g.push(`<path d="M5 16h-3M2 16l2.5-2M2 16l2.5 2M27 16h3M30 16l-2.5-2M30 16l-2.5 2"
        stroke="var(--warn)" stroke-width="${d}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    if (t.s === 'missing')  g.push(`<line x1="3" y1="3" x2="29" y2="29" stroke="var(--muted)" stroke-width="2.5"/><line x1="29" y1="3" x2="3" y2="29" stroke="var(--muted)" stroke-width="2.5"/>`);
    if (t.s === 'crownKL' && !t.nhipCau) g.push(`<rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="var(--ink2)" stroke-width="2.5"/><path d="M4 10h24M4 16h24M4 22h24" stroke="var(--ink2)" stroke-width="1.4" opacity=".5"/>`);
    if (t.s === 'crownTS' && !t.nhipCau) g.push(`<rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="var(--accent-ink)" stroke-width="2.5"/>`);
    if (t.s === 'thaolap')  g.push(`<rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="4 3"/>`);
    /* Còn chân răng nằm dưới hàm tháo lắp — vạch ngắn ở vùng chân răng */
    if (t.s === 'thaolap' && t.chanRang) g.push(`<path d="M16 20v9" stroke="var(--warn)" stroke-width="3" stroke-linecap="round"/>`);
    if (t.s === 'implant')  g.push(`<path d="M16 4v24" stroke="var(--accent)" stroke-width="3"/><path d="M10 10h12M10 15h12M10 20h12M10 25h12" stroke="var(--accent)" stroke-width="2"/>`);
    /* Nhịp cầu: thân răng sứ KHÔNG có chân, treo giữa hai răng trụ. Vẽ thân răng
       hở đáy, thêm hai mấu nối sang hai bên và vạch nướu bên dưới để thấy rõ
       nó chỉ tì lên nướu chứ không cắm xuống xương. */
    if (t.s === 'pontic' || (laSu(t.s) && t.nhipCau)) g.push(`<rect x="5" y="3" width="22" height="21" rx="4" fill="none" stroke="var(--accent-ink)" stroke-width="2.5"/><path d="M1 13h4M27 13h4" stroke="var(--accent-ink)" stroke-width="3.5" stroke-linecap="round"/><path d="M7 29h18" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round" opacity=".75"/>`);
    /* Lỗ dò và sưng đáy hành lang là DẤU HIỆU quan sát được, không phải cách điều trị,
       nên đánh dấu được cùng lúc với bất kỳ tình trạng nào của răng. */
    if (t.loDo) g.push(`<circle cx="27" cy="5" r="3.6" fill="var(--surface)" stroke="var(--danger)" stroke-width="1.8"/><circle cx="27" cy="5" r="1.4" fill="var(--danger)"/>`);
    if (t.sung) g.push(`<path d="M2 30 q5 -6 10 0 z" fill="var(--warn)" stroke="var(--warn)" stroke-width="1.2" stroke-linejoin="round"/>`);
    /* Nội nha: vạch dọc ở chân răng — chồng được lên cả răng sứ, đúng thực tế lâm sàng */
    if (t.s === 'noinha' || (t.nn && TT_CO_NOI_NHA.includes(t.s)))
      g.push(`<path d="M16 6v20" stroke="var(--warn)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="28" r="2.6" fill="var(--warn)"/>`);
    /* Chân răng còn sót: chỉ còn phần chân, thân răng đã mất */
    if (t.s === 'chanrang') g.push(`<path d="M11 14h10l-2 15h-6z" fill="var(--muted)" fill-opacity=".35" stroke="var(--ink2)" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 12h20" stroke="var(--ink2)" stroke-width="2" stroke-dasharray="3 3"/>`);
    return g.length ? `<svg class="tooth-ov" viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">${g.join('')}</svg>` : '';
  },
  /* Câu mô tả ngắn để hiện khi rê chuột và in ra bệnh án */
  moTa(n, t){
    if (!t || (t.s === 'ok' && !t.nn && !t.loDo && !t.sung && !(t.mat||[]).length && !t.note)) return 'Bình thường';
    const p = [];
    const ten = (t.s === 'khac' && (t.sKhac || '').trim())
      || TEN_TT[t.s] || (TOOTH_STATES.find(x => x[0] === t.s) || [])[1] || '';
    if (t.s && t.s !== 'ok') p.push(ten);
    if ((t.mat||[]).length) p.push((t.s === 'filled' ? 'trám mặt ' : 'mặt ') + t.mat.map(k=>this.tenMat(k).replace(/^Mặt /,'').toLowerCase()).join(', '));
    if (t.nn && TT_CO_NOI_NHA.includes(t.s)) p.push('đã nội nha');
    if (t.chanRang && t.s === 'thaolap') p.push('còn chân răng');
    if (laSu(t.s)) p.push(t.nhipCau ? 'nhịp cầu' : 'răng trụ');
    if (t.loDo) p.push('lỗ dò');
    if (t.sung) p.push('sưng đáy hành lang');
    if (t.note) p.push(t.note);
    return p.join(' · ');
  },
  /* Làm xong một dịch vụ thì cái răng đó trở thành gì — dùng để dựng sẵn
     sơ đồ SAU ĐIỀU TRỊ từ những hạng mục đã hoàn tất. Bác sĩ sửa lại được. */
  ketQua(tenDV){
    const t = Combo.norm(tenDV || '');
    if (!t) return null;
    if (/nho rang|tieu phau|nho chan rang/.test(t))                  return {s: 'missing', xoaMat: 1};
    if (/implant|tru implant|cay ghep/.test(t))                      return {s: 'implant', xoaMat: 1};
    if (/thao lap|ham khung|ham nhua|ham deo|ham gia/.test(t))       return {s: 'thaolap', xoaMat: 1};
    if (/veneer|toan su|zirconia|emax|cercon|lava|endocrown|inlay|onlay|cau rang su/.test(t))
                                                                     return {s: 'crownTS', xoaMat: 1};
    if (/su kim loai|hop kim|titan|mao su|rang su|boc su/.test(t))    return {s: 'crownKL', xoaMat: 1};
    if (/noi nha|dieu tri tuy|chua tuy|lay tuy/.test(t))             return {nn: 1};
    if (/tram|che tuy|phuc hoi than rang/.test(t))                   return {s: 'filled'};
    return null;   /* cạo vôi, tẩy trắng, khám… không đổi hình răng */
  },
  /* Một hạng mục điều trị ghi "36, 37" hoặc "R36" — tách ra thành danh sách số răng */
  rangCua(t){
    return String((t && t.tooth) || '').split(/[,;/]+/).map(x => x.trim())
      .map(x => parseInt(String(x).replace(/^R/i, ''), 10))
      .filter(n => !isNaN(n) && n >= 11 && n <= 85);
  },

  /* Tổng kết cả hàm — dùng cho bệnh án và bản in.
     lop = 'teeth' (trước điều trị), 'teethKH' (kế hoạch) hoặc 'teethST' (sau điều trị). */
  tomTat(c, lop){
    const kho = (c && c[lop || 'teeth']) || {};
    const ds = Object.keys(kho).map(Number).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
    const dong = ds.map(n => ({n, mo: this.moTa(n, kho[n])})).filter(x => x.mo !== 'Bình thường');
    const hk = (c && c[{teethKH: 'hamKhungKH', teethST: 'hamKhungST'}[lop] || 'hamKhung']) || {};
    const khung = [hk.tren && 'hàm trên', hk.duoi && 'hàm dưới'].filter(Boolean);
    return {dong, khung, note: hk.note || ''};
  },

  /* Vẽ cả một hàm. lop quyết định đọc sơ đồ hiện trạng hay sơ đồ kế hoạch. */
  hamHTML(c, lop){
    const kho = c[lop] || {};
    const hang = ds => ds.map(n => {
      const t = kho[n];
      const co = t && (t.s !== 'ok' || t.nn || t.loDo || t.sung || (t.mat||[]).length);
      /* Trên sơ đồ kế hoạch: nhấn răng nào ĐÃ CÓ kế hoạch điều trị */
      /* Sơ đồ sau điều trị: nhấn răng nào đã từng được làm gì đó */
      const khac = (lop === 'teethKH' && !!(t && t.dichVu))
        || (lop === 'teethST' && Cust.lichSuRang(c, n).length > 0);
      const dangChon = (App.state.rangChon || []).includes(n) || App.state.rangMo === n;
      return `<button class="tooth ${co?'co-van-de':''} ${khac?'doi-theo-kh':''} ${dangChon?'dang-chon':''}"
        onclick="Cust.toothClick(${n},'${lop}',event)" title="Răng ${n} — ${h(this.moTa(n,t))}">
        <span class="tooth-svg">${this.svg(n,t)}${this.deLen(n,t)}</span>
        <span class="tooth-no num">${n}</span></button>`;
    }).join('');
    return `<div class="arch-lb"><span>Hàm trên · phải bệnh nhân</span><span>trái bệnh nhân</span></div>
      <div class="arch" style="margin-bottom:10px">${hang(TEETH_UP.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_UP.slice(8))}</div>
      <div class="arch">${hang(TEETH_DN.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_DN.slice(8))}</div>
      <div class="arch-lb"><span>Hàm dưới · phải bệnh nhân</span><span>trái bệnh nhân</span></div>`;
  },
  /* Lưới chọn số răng cho các hộp thoại không gắn với sơ đồ của một khách cụ thể
     (vd: thêm dịch vụ vào kế hoạch). Bấm để chọn / bỏ chọn, có thể chọn nhiều răng. */
  chonSoHTML(ten){
    /* Mỗi hàm 16 răng phải nằm GỌN MỘT HÀNG thì mới ra hình cung hàm; rớt xuống
       dòng là nhìn không còn ra trái phải trên dưới nữa. Nút co lại vừa đủ, và cho
       cuộn ngang khi màn hình quá hẹp thay vì xuống dòng. */
    const hang = ds => ds.map(n => `<button type="button" class="btn small chon-rang" data-n="${n}"
      onclick="Tooth.chonSo(this,'${ten}')"
      style="flex:none;min-width:0;width:30px;padding:5px 0;font-size:12px">${n}</button>`).join('');
    const d = 'display:flex;flex-wrap:nowrap;gap:3px;align-items:center;margin:4px 0;min-width:max-content';
    return `<input type="hidden" name="${ten}" value="">
      <div style="overflow-x:auto;max-width:100%">
        <div style="${d}">${hang(TEETH_UP.slice(0,8))}<span style="flex:none;width:12px"></span>${hang(TEETH_UP.slice(8))}</div>
        <div style="${d}">${hang(TEETH_DN.slice(0,8))}<span style="flex:none;width:12px"></span>${hang(TEETH_DN.slice(8))}</div>
      </div>
      <div class="combo-hint">Đang chọn: <b id="soRangDaChon">chưa chọn răng nào</b> —
        bấm lần nữa để bỏ chọn. Không chọn răng nào thì dịch vụ tính cho cả hàm.</div>`;
  },
  chonSo(btn, ten){
    btn.classList.toggle('primary');
    const f = btn.closest('form'); if (!f) return;
    const ds = [...f.querySelectorAll('.chon-rang.primary')].map(b => +b.dataset.n).sort((a, b) => a - b);
    const o = f.querySelector('[name="' + ten + '"]');
    if (o) o.value = ds.join(', ');
    const nhan = f.querySelector('#soRangDaChon');
    if (nhan) nhan.textContent = ds.length ? ds.map(n => 'R' + n).join(', ') : 'chưa chọn răng nào';
  },
  tomTatHTML(c, lop){
    const {dong, khung, note} = this.tomTat(c, lop);
    const km = khung.length
      ? `<div class="pill warn" style="margin-top:10px">Hàm khung tháo lắp: ${h(khung.join(' và '))}${note?' — '+h(note):''}</div>` : '';
    const ds = dong.length
      ? `<div class="tooth-info"><b>${dong.length} răng:</b> ${dong.map(x=>`R${x.n}: ${h(x.mo)}`).join(' · ')}</div>`
      : `<div class="tooth-info">Chưa đánh dấu răng nào — nhấn vào răng để ghi.</div>`;
    return km + ds;
  },
  chuThichHTML(){
    return `<div class="legend" style="margin-top:12px">
      <span><i style="background:var(--danger)"></i>Sâu (tô mặt bị sâu)</span>
      <span><i style="background:var(--info)"></i>Đã trám (tô mặt đã trám)</span>
      <span><i class="lg-nn"></i>Đã nội nha</span>
      <span><i class="lg-kl"></i>Răng sứ kim loại</span>
      <span><i class="lg-ts"></i>Răng sứ toàn sứ</span>
      <span><i class="lg-tl"></i>Răng tháo lắp</span>
      <span><i class="lg-im"></i>Implant</span>
      <span><i class="lg-nc"></i>Nhịp cầu (răng sứ treo)</span>
      <span><i class="lg-cr"></i>Chân răng còn sót</span>
      <span><i class="lg-mat"></i>Mất răng</span>
      <span><i style="background:var(--warn)"></i>↔ Lung lay (mũi tên càng đậm càng nặng)</span>
      <span><i class="lg-lodo"></i>Lỗ dò</span>
      <span><i class="lg-sung"></i>Sưng đáy hành lang</span>
    </div>
    <div class="combo-hint" style="margin-top:8px">Mỗi răng chia 5 vùng — <b>trên/dưới là mặt ngoài và mặt trong</b> (đổi chiều theo hàm trên hay hàm dưới),
      <b>trái/phải là mặt gần và mặt xa</b> (mặt gần luôn quay về đường giữa), <b>ô giữa là mặt nhai</b>.
      Vạch dưới cùng là <b>cổ răng</b>. Rê chuột vào từng vùng để xem tên mặt.</div>`;
  },
};

/* ---------- Bảng giá dịch vụ ---------- */
/* Thứ tự nhóm đi theo mạch điều trị thật: khám → nha chu → trám → nội nha → nhổ →
   phục hình → implant → chỉnh nha → trẻ em → thẩm mỹ. Trước đây Nhổ răng chen vào
   giữa Trám răng và Điều trị tủy, tách đôi hai việc vốn đi liền nhau. */
/* Nhóm dịch vụ — bảng mặc định khi phòng khám chưa tự đặt. Thứ tự ở đây cũng là
   thứ tự hiện trong bảng giá và trong ô chọn nhóm. */
const NHOM_DV_MAC_DINH = ['Chẩn đoán hình ảnh','Nha chu','Trám răng','Điều trị tủy','Nhổ răng',
                 'Phục hình sứ','Phục hình tháo lắp','Implant','Chỉnh nha',
                 'Răng trẻ em','Thẩm mỹ','Khác'];
/* NHOM_DV đọc thẳng từ dữ liệu phòng khám. Để là thuộc tính của window chứ không
   phải const, vì mọi chỗ trong app đang dùng nó như một mảng — làm cách này thì
   không phải sửa chỗ nào mà vẫn sửa được danh sách từ màn Cài đặt. */
Object.defineProperty(window, 'NHOM_DV', {
  get(){
    const ds = (typeof db !== 'undefined' && db && db.nhomDV) || null;
    return (Array.isArray(ds) && ds.length) ? ds : NHOM_DV_MAC_DINH;
  },
});
const Svc = {
  /* Gợi ý dịch vụ dùng chung cho ô đặt lịch và ô lập hạng mục: bỏ trùng tên,
     xếp theo nhóm rồi theo tên, ghi kèm nhóm và giá ở bên phải. */
  goiY(coGia){
    const m = new Map();
    (db.services || []).forEach(x => {
      const k = Combo.norm(x.name || ''); if (!k) return;
      const cu = m.get(k);
      if (!cu || (!cu.price && x.price)) m.set(k, x);
    });
    const thu = g => { const i = NHOM_DV.indexOf(g); return i < 0 ? 99 : i; };
    return [...m.values()]
      .sort((a, b) => thu(a.group) - thu(b.group) || this.thuTu(a) - this.thuTu(b)
                   || String(a.name).localeCompare(String(b.name), 'vi'))
      .map(x => ({t: x.name, s: (x.group || '') + (coGia && x.price ? ' · ' + money(x.price) : '')}));
  },

  /* ---------- Thứ tự hiển thị trong một nhóm ----------
     Lấy theo vị trí trên bảng giá giấy của phòng khám (BG_THU_TU trong banggia.js),
     không lấy theo thứ tự bản ghi được thêm vào — thêm vào lúc nào thì tuỳ lịch sử
     nhập liệu, nên cùng một loại dịch vụ nằm rải rác khắp nhóm.
     Dịch vụ nào quản lý tự đặt số thứ tự thì số đó thắng; dịch vụ tự thêm mà không
     có trong bảng giá chuẩn thì xuống cuối nhóm, xếp theo vần. */
  thuTu(s){
    if (s.stt !== undefined && s.stt !== null && s.stt !== '' && !isNaN(+s.stt)) return +s.stt;
    if (typeof BG_THU_TU !== 'undefined' && typeof bgKey === 'function') {
      const i = BG_THU_TU[bgKey(s.name)];
      if (i !== undefined) return i;
    }
    return 9000;
  },
  sapXep(ds){
    return ds.slice().sort((a, b) =>
      this.thuTu(a) - this.thuTu(b) || String(a.name).localeCompare(String(b.name), 'vi'));
  },

  /* Gợi ý chỉ có TÊN dịch vụ — dùng cho ô hẹp như "Kế hoạch điều trị" của từng răng,
     ở đó tên nhóm hiện bên phải làm chữ chồng lên nhau, đọc không ra. */
  goiYTen(){ return this.goiY().map(x => x.t); },

  bang(q){
    if (q != null) App.state.svcQ = q;
    const tim = Combo.norm(App.state.svcQ || '');
    const sua = Perm.can('caidat');
    const loc = ds => ds.filter(s => !tim || Combo.norm(s.name).includes(tim) || Combo.norm(s.group||'').includes(tim));
    const theoNhom = NHOM_DV.map(g => ({g, ds: this.sapXep(loc(db.services.filter(s => s.group === g)))}))
      .concat([{g:'(chưa xếp nhóm)', ds: this.sapXep(loc(db.services.filter(s => !NHOM_DV.includes(s.group))))}])
      .filter(x => x.ds.length);
    const chuaGia = db.services.filter(s => !s.price && !s.mienPhi).length;
    const rows = theoNhom.map(({g, ds}) => `
      <tr><td colspan="${sua?3:2}" style="background:var(--surface2);font-weight:700">${h(g)} <span class="sub-line">· ${ds.length} dịch vụ</span></td></tr>
      ${ds.map(s => `<tr${sua?` class="clickable" onclick="Svc.form('${s.id}')"`:''}><td>${h(s.name)}
        ${(s.xuatXu||s.baoHanh||s.note)?`<br><span class="sub-line">${[s.xuatXu, s.baoHanh?'BH '+s.baoHanh:'', s.note].filter(Boolean).map(h).join(' · ')}</span>`:''}</td>
        <td class="r num" style="font-weight:600">${s.price ? money(s.price) : (s.mienPhi ? '<span class="pill ok">Miễn phí</span>' : '<span class="pill warn">chưa đặt giá</span>')}
          ${s.donVi?`<br><span class="sub-line">/ ${h(s.donVi)}</span>`:''}</td>
        ${sua?`<td style="white-space:nowrap"><button class="btn small" onclick="event.stopPropagation();Svc.form('${s.id}')">Sửa</button></td>`:''}</tr>`).join('')}`).join('');
    App.modal('Bảng giá dịch vụ', `
      ${sua ? `<div class="form-actions" style="justify-content:flex-start;margin-bottom:10px">
        <button class="btn primary" onclick="Svc.form()">${IC.plus} Thêm dịch vụ</button>
        <button class="btn" onclick="Svc.nhomBang()">Nhóm dịch vụ</button>
        <button class="btn" onclick="Svc.napBangGia()">Nạp bảng giá phòng khám</button>
        ${(() => { const n = Svc.nhomTrung().length;
          return `<button class="btn ${n?'danger':''}" onclick="Svc.donTrung()">Dọn trùng lặp${n?` (${n} nhóm)`:''}</button>`; })()}
        ${chuaGia?`<span class="pill warn">${chuaGia} dịch vụ chưa đặt giá</span>`:''}</div>`
      : '<div class="note-block mb">Chỉ quản lý mới sửa được bảng giá. Bạn xem để báo giá cho khách.</div>'}
      <div class="searchbar" style="margin-bottom:10px">${IC.search}<input id="svcQ" placeholder="Tìm tên dịch vụ hoặc nhóm..."
        value="${h(App.state.svcQ||'')}" autocomplete="off"
        oninput="Svc.bang(this.value);const i=document.getElementById('svcQ');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
      <div class="tbl-wrap"><table style="min-width:420px">
        <thead><tr><th>Dịch vụ</th><th class="r">Đơn giá</th>${sua?'<th></th>':''}</tr></thead>
        <tbody>${rows || `<tr><td colspan="3" class="sub-line">Không tìm thấy dịch vụ nào.</td></tr>`}</tbody></table></div>
      <div class="note-block" style="margin-top:12px">Bấm vào một dòng để sửa <b>tên, nhóm dịch vụ và giá</b>.
        Sửa giá ở đây <b>không làm đổi giá của những hạng mục đã lập trước đó</b> — hồ sơ cũ giữ nguyên giá lúc chốt,
        giá mới chỉ áp cho hạng mục lập từ bây giờ.</div>`);
  },
  form(id){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được bảng giá'); return; }
    const s = id ? db.services.find(x=>x.id===id) : {group:'Phục hình sứ', price:0};
    App.modal(id?'Sửa dịch vụ':'Thêm dịch vụ', `
    <form class="form-grid" onsubmit="Svc.save(event,'${id||''}')">
      <div class="f full"><label>Tên dịch vụ</label><input name="name" required value="${h(s.name||'')}"></div>
      <div class="f"><label>Nhóm dịch vụ</label><select name="group">
        ${NHOM_DV.map(g=>`<option${s.group===g?' selected':''}>${h(g)}</option>`).join('')}</select></div>
      <div class="f"><label>Đơn giá (₫)</label>${Tien.o('price', s.price||0, 'required')}</div>
      <div class="f"><label>Đơn vị tính</label><input name="donVi" value="${h(s.donVi||'')}" list="dvList" placeholder="răng, hàm, ca...">
        <datalist id="dvList">${['răng','2 hàm','hàm','cái','ca','lần','phim','lọ','màng','ống','bộ','chốt','thanh','xoang','gói'].map(x=>`<option value="${x}">`).join('')}</datalist></div>
      <div class="f"><label>Xuất xứ</label><input name="xuatXu" value="${h(s.xuatXu||'')}" placeholder="Hàn Quốc, Đức..."></div>
      <div class="f"><label>Bảo hành</label><input name="baoHanh" value="${h(s.baoHanh||'')}" placeholder="10 năm"></div>
      <div class="f full"><label>Ghi chú</label><input name="note" value="${h(s.note||'')}" placeholder="Vd: 30 – 45 triệu tùy ca"></div>
      <div class="f full"><div class="check-row"><label><input type="checkbox" name="mienPhi"${s.mienPhi?' checked':''}>
        Dịch vụ miễn phí (giá 0 là cố ý, không phải quên điền)</label></div></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Svc.del('${id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="Svc.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.name = (d.name||'').trim(); d.price = num(d.price);
    ['donVi','xuatXu','baoHanh','note'].forEach(k => d[k] = (d[k]||'').trim());
    d.mienPhi = !!ev.target.querySelector('[name="mienPhi"]:checked');
    if (!d.name) { App.toast('Chưa nhập tên dịch vụ'); return; }
    const trung = db.services.find(x => x.id !== id && Combo.norm(x.name) === Combo.norm(d.name));
    if (trung) { App.toast('Đã có dịch vụ tên này trong nhóm ' + trung.group); return; }
    if (id) Object.assign(db.services.find(x=>x.id===id), d);
    else db.services.push(Object.assign({id:uid()}, d));
    save(); App.render(); this.bang(); App.toast('Đã lưu dịch vụ ✓');
  },
  /* ---------- Dọn dịch vụ trùng ----------
     Khóa "lỏng": bỏ dấu, bỏ mọi dấu câu và khoảng trắng. Nhờ vậy "Trám răng cửa —
     tiêu chuẩn" và "Tram rang cua - tieu chuan" gom về một nhóm. */
  khoaLong(x){ return Combo.norm(String(x||'')).replace(/[^a-z0-9]/g, ''); },
  nhomTrung(){
    const m = new Map();
    (db.services||[]).forEach(x => {
      const k = this.khoaLong(x.name); if (!k) return;
      (m.get(k) || m.set(k, []).get(k)).push(x);
    });
    return [...m.values()].filter(g => g.length > 1);
  },
  demDung(id){ return db.treatments.filter(t => t.serviceId === id).length; },

  donTrung(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới dọn được bảng giá'); return; }
    const nhom = this.nhomTrung();
    /* Bỏ qua những bản nằm trong nhóm trùng — phần dọn trùng đã lo rồi, đếm nữa là
       cùng một dòng bị kể hai lần, nhìn ra số to hơn thực tế. */
    const trongNhom = new Set(nhom.flat().map(x => x.id));
    const thua = db.services.filter(x => !trongNhom.has(x.id) && !x.price && !x.mienPhi && !this.demDung(x.id));
    if (!nhom.length && !thua.length) {
      App.modal('Dọn trùng lặp', `<div class="note-block">Bảng giá sạch — không có dịch vụ nào trùng tên,
        cũng không có món nào vừa chưa đặt giá vừa chưa dùng lần nào.</div>
        <div class="form-actions"><button class="btn" onclick="Svc.bang()">Quay lại</button></div>`);
      return;
    }
    const bang = nhom.map((g, i) => {
      /* Bản giữ lại: ưu tiên món có giá, rồi món đã dùng nhiều nhất */
      const sx = g.slice().sort((a,b) => (b.price?1:0)-(a.price?1:0) || this.demDung(b.id)-this.demDung(a.id));
      return `<div class="rx mb"><div class="rx-head"><b>Nhóm ${i+1}</b>
        <span class="sub-line">${g.length} bản trùng nhau</span></div>
        <div class="card-b">${sx.map((x, j) => `<label class="don-dong">
          <input type="radio" name="giu${i}" value="${x.id}"${j===0?' checked':''}>
          <span><b>${h(x.name)}</b>
            <span class="sub-line">${h(x.group||'')} · ${x.price?money(x.price):(x.mienPhi?'miễn phí':'chưa đặt giá')}
              · đã dùng ${this.demDung(x.id)} lần</span></span>
          ${j===0?'<span class="pill ok">giữ</span>':'<span class="pill danger">xóa</span>'}</label>`).join('')}</div></div>`;
    }).join('');
    App.modal('Dọn trùng lặp trong bảng giá', `
      <div class="note-block mb">Tìm thấy <b>${nhom.length} nhóm trùng tên</b>
        (tổng ${nhom.reduce((s,g)=>s+g.length,0)} dòng, sẽ còn ${nhom.length} dòng)${
        thua.length?` và <b>${thua.length} dịch vụ</b> vừa chưa đặt giá vừa chưa dùng lần nào`:''}.</div>
      <div class="note-block mb">Xóa dịch vụ <b>không ảnh hưởng hồ sơ điều trị đã lập</b> —
        hạng mục cũ giữ nguyên tên và giá lúc chốt.</div>
      <form onsubmit="Svc.donChay(event)">
        ${nhom.length ? `<b style="font-size:13.5px">Chọn bản giữ lại trong mỗi nhóm</b>${bang}` : ''}
        ${thua.length ? `<div class="rx mb"><div class="rx-head"><b>Chưa đặt giá &amp; chưa dùng lần nào</b></div>
          <div class="card-b"><div class="check-row"><label><input type="checkbox" name="xoaThua" checked>
            Xóa luôn ${thua.length} dịch vụ này</label></div>
            <div class="sub-line" style="margin-top:6px">${thua.slice(0,20).map(x=>h(x.name)).join(' · ')}${thua.length>20?' …':''}</div>
          </div></div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn" onclick="Svc.bang()">Hủy</button>
          <span class="spacer"></span>
          <button class="btn primary">Dọn ngay</button></div>
      </form>`);
  },
  donChay(ev){
    ev.preventDefault();
    const f = ev.target;
    const nhom = this.nhomTrung();
    const xoa = new Set();
    nhom.forEach((g, i) => {
      const giuId = (f.querySelector(`[name="giu${i}"]:checked`) || {}).value || g[0].id;
      const giu = g.find(x => x.id === giuId) || g[0];
      g.forEach(x => {
        if (x.id === giu.id) return;
        /* Bản giữ lại mà thiếu giá thì lấy giá của bản sắp xóa cho khỏi mất */
        if (!giu.price && x.price) giu.price = x.price;
        ['donVi','xuatXu','baoHanh','note'].forEach(k => { if (!giu[k] && x[k]) giu[k] = x[k]; });
        /* Hạng mục đang trỏ vào bản bị xóa thì chuyển sang bản giữ lại */
        db.treatments.forEach(t => { if (t.serviceId === x.id) t.serviceId = giu.id; });
        xoa.add(x.id);
      });
    });
    let nThua = 0;
    if (f.querySelector('[name="xoaThua"]:checked')) {
      const trongNhom = new Set(nhom.flat().map(x => x.id));
      db.services.forEach(x => {
        if (!xoa.has(x.id) && !trongNhom.has(x.id) && !x.price && !x.mienPhi && !this.demDung(x.id)) { xoa.add(x.id); nThua++; }
      });
    }
    const truoc = db.services.length;
    db.services = db.services.filter(x => !xoa.has(x.id));
    save(); App.render(); this.bang();
    App.toast('Đã dọn ' + (truoc - db.services.length) + ' dòng — còn ' + db.services.length + ' dịch vụ');
  },

  /* Nạp toàn bộ bảng giá chính thức của phòng khám (từ hai file PDF).
     Không đụng tới hồ sơ điều trị: hạng mục đã lập giữ nguyên tên và giá lúc chốt. */
  /* ---------- Quản lý nhóm dịch vụ ----------
     Đổi tên nhóm phải sửa luôn mọi chỗ đang trỏ tới tên cũ: dịch vụ, hạng mục điều
     trị, phiếu thu và phần gắn nhóm của kỹ thuật tính hoa hồng. Chỉ đổi mỗi danh
     sách thì những thứ kia trỏ vào một cái tên không còn tồn tại. */
  nhomBang(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được nhóm dịch vụ'); return; }
    const ds = NHOM_DV;
    const dem = g => (db.services || []).filter(s => s.group === g).length;
    const rows = ds.map((g, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td><b>${h(g)}</b></td>
      <td class="r num">${dem(g)}</td>
      <td>${(() => {
        const q = QT.ds().find(x => (x.nhom||[]).includes(g));
        const n = q ? (q.buoc||[]).length : 0;
        if (q && q.khongChia) return `<span class="pill mutedp">không chia hoa hồng</span>
          <br><button class="btn small" onclick="QT.bangNhom('${h(g).replace(/'/g,"\\'")}')">Sửa</button>`;
        return `${n ? `<b>${n} công đoạn</b> · tổng tỷ trọng ${QT.tongPct(q)}%`
                    : '<span class="pill warn">chưa có công đoạn</span>'}
          <br><button class="btn small ${n?'':'primary'}" onclick="QT.bangNhom('${h(g).replace(/'/g,"\\'")}')">
            ${n ? 'Sửa công đoạn & hoa hồng' : 'Đặt công đoạn & hoa hồng'}</button>`;
      })()}</td>
      <td style="white-space:nowrap">
        <button class="btn small" ${i === 0 ? 'disabled' : ''} onclick="Svc.nhomDoiCho(${i},-1)">↑</button>
        <button class="btn small" ${i === ds.length - 1 ? 'disabled' : ''} onclick="Svc.nhomDoiCho(${i},1)">↓</button>
        <button class="btn small" onclick="Svc.nhomSua(${i})">Đổi tên</button>
        <button class="btn small danger" onclick="Svc.nhomXoa(${i})">Xóa</button></td></tr>`).join('');
    App.modal('Nhóm dịch vụ', `
      <div class="note-block mb">Đây là nhóm dùng để <b>xếp bảng giá</b>, <b>gắn kỹ thuật tính hoa hồng</b>
        và <b>lọc báo cáo</b>. Thứ tự trong bảng này cũng là thứ tự hiện ngoài bảng giá.</div>
      <div class="tbl-wrap"><table style="min-width:620px">
        <thead><tr><th>#</th><th>Tên nhóm</th><th class="r">Số dịch vụ</th><th>Công đoạn &amp; hoa hồng</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="form-actions" style="margin-top:12px">
        <button class="btn primary" onclick="Svc.nhomThem()">${IC.plus} Thêm nhóm</button>
        <button class="btn" onclick="Svc.nhomDatLai()">Nạp lại bảng mặc định</button>
        <span class="spacer"></span>
        <button class="btn" onclick="Svc.bang()">Xong</button></div>`);
  },
  nhomGhi(ds){ db.nhomDV = ds.slice(); save(); this.nhomBang(); },
  nhomDoiCho(i, huong){
    const ds = NHOM_DV.slice(), j = i + huong;
    if (j < 0 || j >= ds.length) return;
    const t = ds[i]; ds[i] = ds[j]; ds[j] = t;
    this.nhomGhi(ds);
  },
  nhomThem(){
    const ten = (prompt('Tên nhóm mới:') || '').trim();
    if (!ten) return;
    const ds = NHOM_DV.slice();
    if (ds.some(x => Combo.norm(x) === Combo.norm(ten))) { App.toast('Đã có nhóm tên này'); return; }
    ds.push(ten);
    this.nhomGhi(ds);
    App.toast('Đã thêm nhóm "' + ten + '" ✓');
  },
  nhomSua(i){
    const ds = NHOM_DV.slice(), cu = ds[i];
    const ten = (prompt('Đổi tên nhóm "' + cu + '" thành:', cu) || '').trim();
    if (!ten || ten === cu) return;
    if (ds.some((x, k) => k !== i && Combo.norm(x) === Combo.norm(ten))) { App.toast('Đã có nhóm tên này'); return; }
    const n = this.doiTenNhom(cu, ten);
    ds[i] = ten;
    this.nhomGhi(ds);
    App.toast('Đã đổi tên ✓' + (n ? ' — cập nhật ' + n + ' chỗ đang dùng tên cũ' : ''));
  },
  /* Đổi tên ở mọi nơi đang trỏ tới nhóm cũ */
  doiTenNhom(cu, moi){
    let n = 0;
    (db.services || []).forEach(x => { if (x.group === cu) { x.group = moi; x._up = Date.now(); n++; } });
    (db.treatments || []).forEach(x => { if (x.group === cu) { x.group = moi; x._up = Date.now(); n++; } });
    (db.receipts || []).forEach(x => { if (x.group === cu) { x.group = moi; x._up = Date.now(); n++; } });
    (db.quyTrinh || []).forEach(q => {
      const i = (q.nhom || []).indexOf(cu);
      if (i >= 0) { q.nhom[i] = moi; q._up = Date.now(); n++; }
    });
    return n;
  },
  nhomXoa(i){
    const ds = NHOM_DV.slice(), g = ds[i];
    const dung = (db.services || []).filter(s => s.group === g);
    if (dung.length) {
      const con = ds.filter((x, k) => k !== i);
      const sang = (prompt(dung.length + ' dịch vụ đang thuộc nhóm "' + g + '".\n'
        + 'Gõ tên nhóm muốn chuyển chúng sang:\n\n' + con.join(' · '), con[0] || '') || '').trim();
      if (!sang) return;
      const dich = con.find(x => Combo.norm(x) === Combo.norm(sang));
      if (!dich) { App.toast('Không có nhóm tên "' + sang + '"'); return; }
      this.doiTenNhom(g, dich);
      App.toast('Đã chuyển ' + dung.length + ' dịch vụ sang "' + dich + '"');
    } else if (!confirm('Xóa nhóm "' + g + '"?')) return;
    /* Gỡ nhóm khỏi các kỹ thuật tính hoa hồng, không thì chúng trỏ vào tên đã mất */
    (db.quyTrinh || []).forEach(q => {
      if ((q.nhom || []).includes(g)) { q.nhom = q.nhom.filter(x => x !== g); q._up = Date.now(); }
    });
    this.nhomGhi(ds.filter((x, k) => k !== i));
  },
  nhomDatLai(){
    if (!confirm('Nạp lại ' + NHOM_DV_MAC_DINH.length + ' nhóm mặc định?\n\n'
      + 'Nhóm tự thêm sẽ biến khỏi danh sách; dịch vụ thuộc nhóm đó vẫn còn nhưng '
      + 'nằm ở mục "(chưa xếp nhóm)" cuối bảng giá.')) return;
    this.nhomGhi(NHOM_DV_MAC_DINH);
    App.toast('Đã nạp lại bảng mặc định ✓');
  },

  napBangGia(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới nạp được bảng giá'); return; }
    if (typeof BANG_GIA === 'undefined') { App.toast('Chưa nạp được dữ liệu bảng giá'); return; }
    const co = new Map(db.services.map(x => [Combo.norm(x.name||''), x]));
    const them = BANG_GIA.filter(x => !co.has(Combo.norm(x.n))).length;
    const doiGia = BANG_GIA.filter(x => { const c = co.get(Combo.norm(x.n)); return c && c.price !== x.p; }).length;
    const thua = db.services.filter(x => !BANG_GIA.some(y => Combo.norm(y.n) === Combo.norm(x.name||''))).length;
    App.modal('Nạp bảng giá phòng khám', `
      <div class="note-block mb">Bảng giá chính thức có <b>${BANG_GIA.length} dịch vụ</b>.
        So với danh sách hiện tại: thêm mới <b>${them}</b>, cập nhật giá <b>${doiGia}</b>,
        và có <b>${thua}</b> dịch vụ đang có mà không nằm trong bảng giá.</div>
      <div class="note-block mb">Hạng mục điều trị đã lập <b>giữ nguyên tên và giá lúc chốt</b> —
        việc này chỉ thay danh mục để chọn từ nay về sau.</div>
      <div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap">
        <button class="btn primary" onclick="Svc.napChay(0)">Bổ sung & cập nhật giá</button>
        <button class="btn danger" onclick="Svc.napChay(1)">Thay hẳn — xóa ${thua} dịch vụ ngoài bảng</button>
        <button class="btn" onclick="Svc.bang()">Hủy</button></div>`);
  },
  napChay(thayHan){
    const co = new Map(db.services.map(x => [Combo.norm(x.name||''), x]));
    let them = 0, doi = 0;
    BANG_GIA.forEach(x => {
      const cu = co.get(Combo.norm(x.n));
      const o = {group:x.g, name:x.n, price:x.p, donVi:x.d||'', xuatXu:x.x||'', baoHanh:x.bh||'', note:x.c||'', mienPhi:!!x.mp};
      if (cu) { if (cu.price !== x.p) doi++; Object.assign(cu, o); }
      else { db.services.push(Object.assign({id:uid()}, o)); them++; }
    });
    let xoa = 0;
    if (thayHan) {
      const giu = new Set(BANG_GIA.map(x => Combo.norm(x.n)));
      const truoc = db.services.length;
      db.services = db.services.filter(x => giu.has(Combo.norm(x.name||'')));
      xoa = truoc - db.services.length;
    }
    save(); App.render(); this.bang();
    App.toast('Đã nạp bảng giá ✓ thêm ' + them + ', cập nhật ' + doi + (xoa ? ', xóa ' + xoa : ''));
  },

  del(id){
    const s = db.services.find(x=>x.id===id); if (!s) return;
    const dung = db.treatments.filter(t => t.serviceId === id).length;
    if (!confirm('Xóa "' + s.name + '" khỏi bảng giá?' +
      (dung ? '\n\n' + dung + ' hạng mục điều trị đã dùng dịch vụ này. Hồ sơ cũ vẫn giữ nguyên tên và giá, chỉ mất gợi ý khi lập hạng mục mới.' : ''))) return;
    db.services = db.services.filter(x=>x.id!==id);
    save(); App.render(); this.bang(); App.toast('Đã xóa');
  },
};

/* ---------- Kho ---------- */
/* Mỗi dòng trong db.inventory là MỘT LÔ. Cùng tên nhưng khác hạn sử dụng thì nằm
   riêng từng lô, để xuất được đúng lô sắp hết hạn trước (FEFO). */
const LY_DO_XUAT = ['Sử dụng hàng ngày', 'Phòng nha Hoàng Bách Thời Đại'];

const Inv = {
  /* Sắp lô: hạn gần nhất lên trước, lô không ghi hạn xuống cuối cùng */
  hanCmp(a, b){
    const ea = a.expiry || '', eb = b.expiry || '';
    if (ea && eb) return ea < eb ? -1 : ea > eb ? 1 : 0;
    if (ea) return -1;
    if (eb) return 1;
    return 0;
  },
  /* Gom các lô cùng tên thành một mặt hàng */
  nhom(){
    const m = new Map();
    (db.inventory || []).forEach(it => {
      const k = Combo.norm(it.name || '').trim();
      if (!k) return;
      if (!m.has(k)) m.set(k, {key:k, name:it.name, unit:it.unit || '', min:0, los:[], tong:0});
      const g = m.get(k);
      g.los.push(it);
      g.tong += (+it.stock || 0);
      g.min = Math.max(g.min, +it.min || 0);
      if (!g.unit && it.unit) g.unit = it.unit;
    });
    const arr = [...m.values()];
    arr.forEach(g => g.los.sort(this.hanCmp));
    arr.sort((a,b) => a.name.localeCompare(b.name, 'vi'));
    return arr;
  },
  nhomCua(name){ const k = Combo.norm(name||'').trim(); return this.nhom().find(g => g.key === k); },

  /* Gợi ý tên: danh mục lấy từ sổ cũ + những tên đã có sẵn trong kho */
  goiYTen(){
    const co = new Map();
    (typeof VAT_LIEU !== 'undefined' ? VAT_LIEU : []).forEach(v => co.set(Combo.norm(v.n), {t:v.n, s:v.d || ''}));
    (db.inventory || []).forEach(it => { const k = Combo.norm(it.name||''); if (k && !co.has(k)) co.set(k, {t:it.name, s:it.unit || ''}); });
    return [...co.values()];
  },
  /* Chọn tên trong gợi ý → tự điền đơn vị tính cho khỏi gõ lại */
  chonTen(val){
    const k = Combo.norm(val);
    const v = (typeof VAT_LIEU !== 'undefined' ? VAT_LIEU : []).find(x => Combo.norm(x.n) === k)
           || (db.inventory || []).find(x => Combo.norm(x.name||'') === k);
    const dv = v ? (v.d || v.unit || '') : '';
    const o = document.querySelector('#modalBody [name="unit"]');
    if (o && dv && !o.value.trim()) o.value = dv;
  },

  form(id){
    const it = id ? db.inventory.find(x=>x.id===id) : {};
    App.modal(id?'Sửa lô vật tư':'Nhập vật tư vào kho', `
    <form class="form-grid" onsubmit="Inv.save(event,'${id||''}')">
      <div class="f full"><label>Tên vật tư / hàng hóa</label>
        ${Combo.html('cbVL','name', it.name||'', this.goiYTen(), 'Gõ tên vật tư…', v => Inv.chonTen(v),
          'Gõ vài chữ là ra gợi ý từ danh mục phòng khám, chọn xong tự điền đơn vị tính. Không có trong danh mục thì cứ gõ tự do.')}</div>
      <div class="f"><label>Đơn vị</label><input name="unit" value="${h(it.unit||'')}" placeholder="hộp, tuýp, cái..."></div>
      <div class="f"><label>Tồn kho</label><input type="number" name="stock" value="${it.stock??''}" required></div>
      <div class="f"><label>Định mức tối thiểu</label><input type="number" name="min" value="${it.min??''}"></div>
      <div class="f"><label>Hạn sử dụng</label><input type="date" name="expiry" value="${h(it.expiry||'')}"></div>
      <div class="f full"><label>Nơi bán (nhà cung cấp)</label>
        ${Combo.html('cbSupplier','supplier', it.supplier||'', [...new Set(db.inventory.map(x=>x.supplier).filter(Boolean))],
          'Gõ tên nhà cung cấp', null, 'Nhà cung cấp mới thì cứ gõ tự do.')}</div>
      <div class="f"><label>Giá nhập (₫)</label>${Tien.o('buy', it.buy)}</div>
      <div class="f"><label>Giá bán (₫, nếu bán lẻ)</label>${Tien.o('sell', it.sell)}</div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Inv.del('${id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    ['stock','min','buy','sell'].forEach(k=>d[k]=num(d[k]));
    if (id) Object.assign(db.inventory.find(x=>x.id===id), d);
    else db.inventory.push(Object.assign({id:uid()}, d));
    save(); App.closeModal(); App.render(); App.toast('Đã lưu vật tư ✓');
  },
  del(id){
    if (!confirm('Xóa vật tư này khỏi kho?')) return;
    db.inventory = db.inventory.filter(x=>x.id!==id);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa');
  },
  /* Thêm một LÔ MỚI cho vật tư đã có — dùng khi mua lô khác hạn sử dụng */
  formTen(name){
    const g = this.nhomCua(name);
    this.form();
    setTimeout(() => {
      const b = document.getElementById('modalBody'); if (!b || !g) return;
      const inp = b.querySelector('[name="name"]'); if (inp) inp.value = g.name;
      const dv = b.querySelector('[name="unit"]'); if (dv) dv.value = g.unit || '';
      const mn = b.querySelector('[name="min"]'); if (mn && g.min) mn.value = g.min;
      const ex = b.querySelector('[name="expiry"]'); if (ex) ex.focus();
    }, 0);
  },

  /* Nhập thêm vào đúng một lô đã có (không đổi hạn sử dụng) */
  nhapLo(id){
    const it = db.inventory.find(x=>x.id===id); if (!it) return;
    const v = prompt('Nhập thêm vào lô' + (it.expiry ? ' HSD ' + fmtD(it.expiry) : ' không ghi hạn') +
      ' — số lượng (' + (it.unit||'') + '):', '1');
    const n = num(v); if (!n) return;
    it.stock = Math.max(0, (+it.stock||0) + n);
    this.ghiNhatKy({name:it.name, unit:it.unit, qty:n, sign:1, reason:'Nhập kho', lots:[{expiry:it.expiry||'', qty:n}]});
    save(); App.render(); App.toast('+' + n + ' ' + (it.unit||'') + ' → lô còn ' + it.stock);
  },

  /* Tính trước xem xuất bấy nhiêu thì trừ vào những lô nào — hạn gần nhất trước */
  chiaLo(name, sl){
    const g = this.nhomCua(name);
    const ra = [];
    let con = sl;
    if (!g) return {ra, con, thieu: sl};
    g.los.filter(l => (+l.stock||0) > 0).sort(this.hanCmp).forEach(l => {
      if (con <= 0) return;
      const lay = Math.min(con, +l.stock||0);
      ra.push({lo:l, qty:lay});
      con -= lay;
    });
    return {ra, thieu: Math.max(0, con)};
  },

  xuatForm(name){
    const g = this.nhomCua(name);
    if (!g) { App.toast('Không tìm thấy vật tư này'); return; }
    const T = todayISO();
    const loRows = g.los.map(l => {
      const qua = l.expiry && l.expiry < T;
      return `<tr><td>${l.expiry ? fmtD(l.expiry) : '<span class="sub-line">không ghi hạn</span>'}
        ${qua ? '<span class="pill danger">quá hạn</span>' : ''}</td>
        <td class="r num">${l.stock}</td><td class="sub-line">${h(l.supplier||'—')}</td></tr>`;
    }).join('');
    App.modal('Xuất kho — ' + g.name, `
    <form class="form-grid" onsubmit="Inv.xuatSave(event,'${h(g.name).replace(/'/g,"\\'")}')">
      <div class="note-block full">Tồn tất cả các lô: <b>${g.tong} ${h(g.unit)}</b> · ${g.los.length} lô.
        Phần mềm <b>tự trừ lô có hạn sử dụng gần nhất trước</b>, hết lô đó mới sang lô sau.</div>
      <div class="f"><label>Số lượng xuất (${h(g.unit||'đơn vị')})</label>
        <input type="number" name="qty" min="1" step="1" value="1" required oninput="Inv.xemTruoc('${h(g.name).replace(/'/g,"\\'")}')"></div>
      <div class="f"><label>Ngày xuất</label><input type="date" name="date" value="${T}"></div>
      <div class="f full"><label>Lý do xuất</label>
        <select name="reason" onchange="Inv.hienOKhac(this.value)">
          ${LY_DO_XUAT.map(x => `<option value="${h(x)}">${h(x)}</option>`).join('')}
          <option value="khac">Lý do khác…</option>
        </select></div>
      <div class="f full" id="oKhac" style="display:none"><label>Ghi rõ lý do</label>
        <input name="reasonOther" placeholder="Vd: trả hàng lỗi, hủy do quá hạn…"></div>
      <div class="full" id="xemTruoc"></div>
      <div class="card full" style="margin-top:4px"><div class="card-h"><h2>Các lô đang có</h2></div>
        <div class="tbl-wrap"><table><thead><tr><th>Hạn sử dụng</th><th class="r">Tồn</th><th>Nơi mua</th></tr></thead>
          <tbody>${loRows}</tbody></table></div></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Xuất kho</button></div>
    </form>`);
    this.xemTruoc(g.name);
  },
  hienOKhac(v){
    const o = document.getElementById('oKhac');
    if (o) o.style.display = v === 'khac' ? '' : 'none';
  },
  xemTruoc(name){
    const box = document.getElementById('xemTruoc'); if (!box) return;
    const sl = num((document.querySelector('#modalBody [name="qty"]')||{}).value);
    if (!sl) { box.innerHTML = ''; return; }
    const {ra, thieu} = this.chiaLo(name, sl);
    const g = this.nhomCua(name);
    box.innerHTML = `<div class="note-block">Sẽ trừ: ${ra.map(x =>
      `<b>${x.qty} ${h(g.unit)}</b> ở lô ${x.lo.expiry ? 'HSD ' + fmtD(x.lo.expiry) : 'không ghi hạn'}`).join(' · ') || '—'}
      ${thieu ? `<br><span style="color:var(--danger);font-weight:700">Thiếu ${thieu} ${h(g.unit)} — kho không đủ.</span>` : ''}</div>`;
  },
  xuatSave(ev, name){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const sl = num(d.qty);
    if (!sl) { App.toast('Chưa nhập số lượng'); return; }
    const lyDo = d.reason === 'khac' ? (d.reasonOther || '').trim() : d.reason;
    if (!lyDo) { App.toast('Chọn "Lý do khác" thì phải ghi rõ lý do'); return; }
    const {ra, thieu} = this.chiaLo(name, sl);
    if (thieu) { App.toast('Kho chỉ còn ' + (sl - thieu) + ' — không xuất được ' + sl); return; }
    const g = this.nhomCua(name);
    ra.forEach(x => { x.lo.stock = Math.max(0, (+x.lo.stock||0) - x.qty); });
    this.ghiNhatKy({name: g.name, unit: g.unit, qty: sl, sign: -1, reason: lyDo, date: d.date || todayISO(),
      lots: ra.map(x => ({expiry: x.lo.expiry || '', qty: x.qty}))});
    save(); App.closeModal(); App.render();
    App.toast('Đã xuất ' + sl + ' ' + (g.unit||'') + ' — ' + lyDo);
  },

  ghiNhatKy(o){
    if (!db.invLog) db.invLog = [];
    const me = (typeof Att !== 'undefined' && Att.myStaff && Att.myStaff()) || null;
    db.invLog.unshift(Object.assign({id: uid(), date: todayISO(), time: nowHM(),
      staffId: me ? me.id : '', staffName: me ? me.name : (Cloud.who() || '')}, o));
    if (db.invLog.length > 4000) db.invLog.length = 4000;
  },

  nhatKy(){
    const rows = (db.invLog || []).slice(0, 300).map(r => `<tr>
      <td class="num">${fmtD(r.date)}<br><span class="sub-line">${h(r.time||'')}</span></td>
      <td><b>${h(r.name)}</b><br><span class="sub-line">${(r.lots||[]).map(l =>
        (l.qty + ' × ' + (l.expiry ? 'HSD ' + fmtD(l.expiry) : 'không hạn'))).join(' · ')}</span></td>
      <td class="r num" style="font-weight:700;color:${r.sign>0?'var(--ok)':'var(--danger)'}">${r.sign>0?'+':'−'}${r.qty} ${h(r.unit||'')}</td>
      <td>${h(r.reason||'')}</td><td class="sub-line">${h(r.staffName||'')}</td></tr>`).join('')
      || '<tr><td colspan="5" class="sub-line">Chưa có lần nhập xuất nào.</td></tr>';
    App.modal('Nhật ký nhập — xuất kho', `
      <div class="tbl-wrap"><table style="min-width:640px">
        <thead><tr><th>Ngày</th><th>Vật tư / lô</th><th class="r">Số lượng</th><th>Lý do</th><th>Người làm</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`);
  },
};

SCREENS.inventory = () => {
  const q = Combo.norm(App.state.invQ);
  const nhom = Inv.nhom().filter(g => !q || Combo.norm(g.name).includes(q)
    || g.los.some(l => Combo.norm(l.supplier||'').includes(q)));
  const warn = db.inventory.filter(it => invStatus(it)[0] !== 'ok').length;
  const value = db.inventory.reduce((s,it)=>s+(it.buy||0)*(+it.stock||0),0);
  const nhieuLo = Inv.nhom().filter(g => g.los.length > 1).length;
  const esc = s => h(s).replace(/'/g, "\\'");

  const rows = nhom.map(g => {
    /* Trạng thái của cả mặt hàng lấy theo lô xấu nhất — hết hạn / dưới định mức */
    const tt = g.los.map(l => invStatus(Object.assign({}, l, {min:g.min})));
    const k = tt.some(x=>x[0]==='danger') ? 'danger' : tt.some(x=>x[0]==='warn') ? 'warn' : 'ok';
    const label = (tt.find(x=>x[0]===k) || ['ok','Đủ hàng'])[1];
    const dau = g.los[0];
    const head = `<tr>
      <td><b>${h(g.name)}</b><br><span class="sub-line">${g.los.length} lô${g.los.length>1?' · xuất lô hạn gần nhất trước':''}</span></td>
      <td>${h(g.unit)}</td>
      <td class="r num" style="font-weight:700${k==='danger'?';color:var(--danger)':k==='warn'?';color:var(--warn)':''}">${g.tong}</td>
      <td class="r num">${g.min||0}</td>
      <td class="num">${dau && dau.expiry ? fmtD(dau.expiry) : '—'}</td>
      <td><span class="pill ${k}">${h(label)}</span></td>
      <td style="white-space:nowrap">
        <button class="btn small primary" onclick="Inv.xuatForm('${esc(g.name)}')">−Xuất</button>
        <button class="btn small" onclick="Inv.formTen('${esc(g.name)}')">+Lô mới</button></td></tr>`;
    /* Chỉ trải các lô ra khi mặt hàng có nhiều hơn một lô — một lô thì bày ra rối mắt */
    const los = g.los.length < 2 ? '' : g.los.map((l,i) => {
      const [lk,ll] = invStatus(Object.assign({}, l, {min:g.min}));
      return `<tr style="background:var(--bg-soft)">
        <td style="padding-left:26px"><span class="sub-line">${i===0?'▸ xuất trước — ':'▸ '}${l.expiry?'HSD '+fmtD(l.expiry):'không ghi hạn'}
          ${l.supplier?' · '+h(l.supplier):''}</span></td>
        <td></td>
        <td class="r num" ${lk==='danger'?'style="color:var(--danger)"':''}>${l.stock}</td>
        <td></td><td class="num">${l.expiry?fmtD(l.expiry):'—'}</td>
        <td><span class="pill ${lk}">${h(ll)}</span></td>
        <td style="white-space:nowrap"><button class="btn small" onclick="Inv.nhapLo('${l.id}')">+Nhập</button>
          <button class="btn small" onclick="Inv.form('${l.id}')">Sửa</button></td></tr>`;
    }).join('');
    const motLo = g.los.length === 1
      ? `<tr style="background:var(--bg-soft)"><td style="padding-left:26px"><span class="sub-line">${dau.supplier?h(dau.supplier):'chưa ghi nơi bán'}
          · giá nhập ${dau.buy?money(dau.buy):'—'}${dau.sell?' · giá bán '+money(dau.sell):''}</span></td>
        <td></td><td></td><td></td><td></td><td></td>
        <td style="white-space:nowrap"><button class="btn small" onclick="Inv.nhapLo('${dau.id}')">+Nhập</button>
          <button class="btn small" onclick="Inv.form('${dau.id}')">Sửa</button></td></tr>` : '';
    return head + los + motLo;
  }).join('') || '<tr><td colspan="7" class="sub-line">Không tìm thấy vật tư.</td></tr>';

  return `
  <div class="page-head"><h1>Kho vật tư</h1><span class="spacer"></span>
    <button class="btn" onclick="Inv.nhatKy()">Nhật ký nhập xuất</button>
    <button class="btn primary" onclick="Inv.form()">${IC.plus} Nhập vật tư</button>
    <div class="sub">${nhom.length} mặt hàng · ${db.inventory.length} lô${nhieuLo?' · '+nhieuLo+' mặt hàng có nhiều lô':''} · ${warn} cần chú ý · giá trị tồn ${money(value)}</div></div>
  <div class="searchbar">${IC.search}<input placeholder="Tìm vật tư, nhà cung cấp..." value="${h(App.state.invQ)}"
    oninput="App.state.invQ=this.value;App.render();const i=document.querySelector('.searchbar input');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
  <div class="card"><div class="tbl-wrap"><table style="min-width:760px">
    <thead><tr><th>Vật tư · lô</th><th>ĐV</th><th class="r">Tồn</th><th class="r">Định mức</th><th>HSD gần nhất</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>
  <div class="note-block" style="margin-top:12px">Cùng một tên vật tư nhưng <b>khác hạn sử dụng thì tách thành từng lô riêng</b>.
    Khi xuất, phần mềm <b>tự trừ lô có hạn gần nhất trước</b>, hết lô đó mới sang lô sau — hàng cũ đi trước, đỡ phải bỏ vì quá hạn.<br>
    Cảnh báo tự động: <b>Quá hạn</b> (đỏ) khi HSD đã qua · <b>Sắp hết hạn</b> (vàng) khi còn ≤ 60 ngày · <b>Dưới định mức</b> (đỏ) khi tồn ≤ định mức tối thiểu.</div>`;
};

/* ---------- Chấm công bằng mã QR ---------- */
const QR_PREFIX = 'NKHB-CC:';
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
const hm2m = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t||'')); return m ? (+m[1])*60 + (+m[2]) : null; };
const m2hm = n => n == null ? '' : String(Math.floor(n/60)).padStart(2,'0') + ':' + String(Math.round(n)%60).padStart(2,'0');
const gioPhut = n => { n = Math.round(n); const g = Math.floor(n/60), p = n%60; return !n ? '—' : (g ? g+'h' : '') + (p ? String(p).padStart(g?2:1,'0')+"'" : (g?'':'0')); };

const Att = {
  stream: null, timer: null,

  logOf(staffId, date){ return (db.attLog||[]).find(x => x.staffId === staffId && x.date === date); },

  /* ---------- Ca làm việc ----------
     Giờ nghỉ trưa nằm ngoài cả hai ca nên không được tính công. Nhờ vậy người ở lại
     buổi trưa và người về rồi quay lại đều ra cùng số giờ, khỏi phải chấm công bốn
     lần một ngày. Ai về trưa không quay lại thì chỉ được công buổi sáng.

     Cơ sở Thời Đại đóng cửa sớm hơn vào thứ Bảy và Chủ nhật, nên giờ phải đặt được
     RIÊNG CHO TỪNG NGÀY trong tuần. Một cặp giờ dùng chung cho cả tuần sẽ báo nhầm
     "về sớm 2 tiếng" cho mọi người vào hai ngày cuối tuần, rồi trừ công oan.
     db.clinic.caTuan['0'..'6'] (0 = Chủ nhật) ghi giờ riêng; ngày nào không có thì
     lấy cặp giờ chung caSangVao/caSangRa/caChieuVao/caChieuRa. */
  THU: ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'],
  gioCua(ngay){
    const c = db.clinic || {};
    const chung = {sangVao: c.caSangVao || '07:00', sangRa: c.caSangRa || '12:00',
                   chieuVao: c.caChieuVao || '13:00', chieuRa: c.caChieuRa || '17:00'};
    if (!ngay) return chung;
    const d = new Date(String(ngay).slice(0,10) + 'T00:00');
    if (isNaN(d)) return chung;
    const r = ((c.caTuan || {})[String(d.getDay())]) || null;
    return r ? Object.assign({}, chung, r) : chung;
  },
  ca(ngay){
    const g = this.gioCua(ngay);
    return [{ten:'Sáng',  s: hm2m(g.sangVao),  e: hm2m(g.sangRa)},
            {ten:'Chiều', s: hm2m(g.chieuVao), e: hm2m(g.chieuRa)}];
  },
  phutChuan(ngay){ return this.ca(ngay).reduce((s,c) => s + Math.max(0, c.e - c.s), 0); },
  moTaCa(ngay){ const c = this.ca(ngay); return `Sáng ${m2hm(c[0].s)}–${m2hm(c[0].e)} · Chiều ${m2hm(c[1].s)}–${m2hm(c[1].e)}`; },
  /* Mô tả cả tuần, gộp những ngày giống nhau cho gọn */
  moTaTuan(){
    const nhom = {};
    for (let i = 0; i < 7; i++) {
      const k = this.moTaCa(this.ngayCuaThu(i));
      (nhom[k] || (nhom[k] = [])).push(this.THU[i]);
    }
    return Object.entries(nhom).map(([gio, ds]) => ds.join(', ') + ': ' + gio).join(' · ');
  },
  /* Một ngày bất kỳ rơi đúng vào thứ cần xem — chỉ dùng để tra giờ, không dùng tính công */
  ngayCuaThu(thu){
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + thu);
    return isoOf(d);
  },

  /* Tính một ngày công: số phút làm thật, trễ bao lâu, về sớm bao lâu, làm buổi nào */
  tinh(log){
    const r = {phut:0, cong:0, tre:0, som:0, buoi:[], veTrua:false, dangLam:false};
    if (!log || !log.inAt) return r;
    const ca = this.ca(log.date), cho = +(db.clinic.treCho ?? 5);
    const vao = hm2m(log.inAt), ra = log.outAt ? hm2m(log.outAt) : null;
    /* Chưa chấm ra: hôm nay thì tạm tính tới lúc này, ngày cũ thì để trống chờ sửa tay */
    const het = ra != null ? ra : (log.date === todayISO() ? hm2m(nowHM()) : null);
    r.dangLam = ra == null;
    if (vao == null || het == null) return r;
    ca.forEach(c => {
      let a = Math.max(vao, c.s), b = Math.min(het, c.e);
      /* Đã tha trễ mấy phút thì cũng đừng trừ công mấy phút đó, kẻo tha mà vẫn phạt.
         Chỉ làm tròn khi đã chấm ra hẳn, đang làm dở thì tính thật tới lúc này. */
      if (ra != null) { if (vao <= c.s + cho) a = c.s; if (ra >= c.e - cho) b = c.e; }
      const p = b - a;
      if (p > 0) { r.phut += p; r.buoi.push(c.ten); }
    });
    const chuan = this.phutChuan(log.date);
    r.cong = chuan ? r.phut / chuan : 0;
    /* Đi trễ: tính theo buổi mà người đó bắt đầu làm */
    if (vao > ca[0].s + cho && vao < ca[0].e) r.tre = vao - ca[0].s;
    else if (vao > ca[1].s + cho && vao < ca[1].e) r.tre = vao - ca[1].s;
    if (ra != null) {
      /* Ra trong khoảng nghỉ trưa = về trưa, nghỉ buổi chiều — không coi là về sớm */
      if (ra >= ca[0].e - cho && ra <= ca[1].s + cho) r.veTrua = true;
      else if (ra < ca[0].e - cho) r.som = ca[0].e - ra;
      else if (ra > ca[1].s && ra < ca[1].e - cho) r.som = ca[1].e - ra;
    }
    return r;
  },

  /* Quét được mã → vào ca, quét lần nữa → ra ca */
  async record(staffId, viaQR){
    const st = staffById(staffId);
    if (!st) { App.toast('Mã QR không thuộc nhân viên nào của phòng khám'); return; }
    if (!db.attLog) db.attLog = [];
    const date = todayISO(), t = nowHM();
    let log = this.logOf(staffId, date);
    const net = await this.checkNetwork();
    if (!log) {
      log = {id:uid(), staffId, date, inAt:t, outAt:'', net, viaQR:!!viaQR};
      db.attLog.push(log);
      App.toast(st.name + ' — vào ca ' + t + (net==='outside' ? ' ⚠ ngoài mạng phòng khám' : ''));
    } else if (!log.outAt) {
      log.outAt = t; log.netOut = net;
      App.toast(st.name + ' — ra ca ' + t);
    } else {
      log.outAt = t;
      App.toast(st.name + ' — cập nhật giờ ra ' + t);
    }
    save(); App.render();
    if (Cloud.configured() && Cloud.loggedIn()) {
      try { await Cloud.pushAtt([log]); } catch(e){ App.toast('Đã lưu trên máy, chưa gửi lên đám mây được'); }
    }
  },

  /* ---------- Nhân viên tự quét mã QR của phòng khám ---------- */
  /* Mã QR phòng khám mang luôn khóa kết nối, để điện thoại nhân viên quét phát là
     tự nối vào phòng khám rồi mở thẳng màn hình chấm công. */
  cfgPayload(){
    if (!Cloud.configured()) return '';
    return btoa(unescape(encodeURIComponent(JSON.stringify({u: Cloud.cfg.url, k: Cloud.cfg.key}))));
  },
  clinicUrl(){
    const p = this.cfgPayload();
    return location.origin + location.pathname + '#cc' + (p ? '=' + p : '');
  },
  clinicQR(){
    App.modal('Mã QR chấm công của phòng khám', `
      <div style="text-align:center">
        <div style="display:inline-block;padding:10px;background:#fff;border-radius:12px;border:1px solid var(--line)">${QR.svg(Att.clinicUrl(), 240)}</div>
        <div style="margin-top:10px;font-weight:700">${h(db.clinic.name)}</div>
        <div class="sub-line">Dán mã này ở cửa hoặc quầy lễ tân</div>
      </div>
      <div class="note-block" style="margin-top:12px">Nhân viên đến phòng khám, nối wifi phòng khám, mở camera điện thoại quét mã này
        → phần mềm mở ra màn hình chấm công, đăng nhập một lần là xong. Những lần sau chỉ quét và bấm.</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
        <button type="button" class="btn primary" onclick="Att.printClinicQR()">${IC.print} In mã</button></div>`);
  },
  printClinicQR(){
    App.print(`<div style="text-align:center">
      <h1>CHẤM CÔNG</h1>
      <p style="margin:2px 0"><b>${h(db.clinic.name)}</b><br>${h(db.clinic.addr)}</p>
      <div style="margin:16px auto">${QR.svg(Att.clinicUrl(), 260)}</div>
      <p style="font-size:13px">Nối wifi phòng khám → quét mã → chấm công</p></div>`);
  },

  /* Thẻ chấm công ngay trên Tổng quan — để nhân viên khỏi phải quét mã QR mỗi ngày.
     Chỉ hiện khi đã đăng nhập và nhận ra là nhân viên nào. */
  myCardHTML(){
    const st = this.myStaff();
    if (!st) return '';
    const T = todayISO(), l = this.logOf(st.id, T);
    const t = this.tinh(l);
    const nut = !l ? 'Chấm công vào ca' : (!l.outAt ? 'Chấm công ra ca' : 'Cập nhật giờ ra');
    return `<div class="card mb"><div class="card-b" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <div class="sub-line">Chấm công hôm nay · ${h(st.name)} · ${h(this.moTaCa(todayISO()))}</div>
        <div style="display:flex;gap:18px;margin-top:4px;flex-wrap:wrap;align-items:center">
          <div><span class="sub-line">Vào</span> <b class="num" style="font-size:16px">${l&&l.inAt?h(l.inAt):'—'}</b>
            ${t.tre?'<span class="pill warn">trễ '+gioPhut(t.tre)+'</span>':''}</div>
          <div><span class="sub-line">Ra</span> <b class="num" style="font-size:16px">${l&&l.outAt?h(l.outAt):'—'}</b>
            ${t.veTrua?'<span class="pill mutedp">về trưa</span>':''}${t.som?'<span class="pill warn">về sớm '+gioPhut(t.som)+'</span>':''}</div>
          ${l&&l.inAt?`<div><span class="sub-line">Làm được</span> <b class="num" style="font-size:16px">${gioPhut(t.phut)}</b>
            ${t.dangLam?'<span class="pill info">đang tính</span>':''}</div>`:''}
        </div>
      </div>
      <button class="btn primary" onclick="Att.selfCheck('${st.id}')">${nut}</button>
    </div></div>`;
  },

  /* Màn hình riêng khi mở app từ mã QR của phòng khám */
  /* Tìm nhân viên ứng với tài khoản đang đăng nhập.
     Bỏ qua hoa/thường và khoảng trắng thừa. Người đã nghỉ thì không nhận. */
  matchStaff(){
    const email = (Cloud.who() || '').trim().toLowerCase();
    if (!email) return null;
    return db.staff.find(s => (s.email || '').trim().toLowerCase() === email) || null;
  },
  myStaff(){
    const s = this.matchStaff();
    return (s && s.active === false) ? null : s;
  },
  checkinScreen(){
    const T = todayISO();
    let body;
    if (!Cloud.configured()) {
      body = `<div class="note-block">Phòng khám chưa bật cơ sở dữ liệu chung nên chưa dùng được kiểu tự quét.
        Quản lý vào <b>Nhân sự → Chấm công → Cài đặt → Cấu hình kết nối</b> để bật.</div>`;
    } else if (!Cloud.loggedIn()) {
      body = `<div class="note-block">Đăng nhập một lần để phần mềm biết bạn là ai. Lần sau quét mã là chấm công được ngay.</div>
        <div class="form-actions"><button class="btn primary" onclick="Att.loginForm()">Đăng nhập</button></div>`;
    } else {
      const st = this.myStaff();
      const locked = this.matchStaff();
      if (!st && locked) {
        body = `<div class="note-block" style="background:var(--danger-soft);color:var(--danger)">
          Tài khoản của <b>${h(locked.name)}</b> đã bị khóa truy cập. Liên hệ quản lý nếu đây là nhầm lẫn.</div>
          <div class="form-actions"><button class="btn" onclick="Att.logout()">Đăng xuất</button></div>`;
      } else if (!st) {
        const ds = db.staff.map(x => (x.email || '(chưa gắn email)') + ' — ' + x.name).join('<br>');
        body = `<div class="note-block" style="background:var(--danger-soft);color:var(--danger)">
          Tài khoản <b>${h(Cloud.who())}</b> chưa khớp với nhân viên nào trên máy này.</div>
          <div class="card mb"><div class="card-b">
            <div class="sub-line">Bạn đang đăng nhập bằng</div><b>${h(Cloud.who())}</b>
            <div class="sub-line" style="margin-top:10px">Email đã gắn trong danh sách nhân viên (${db.staff.length} người)</div>
            <div style="font-size:12.5px;margin-top:4px">${ds || '<i>máy này chưa có danh sách nhân viên — bấm Tải lại</i>'}</div>
          </div></div>
          <div class="note-block">Thường là do máy này chưa tải danh sách nhân viên về. Bấm <b>Tải lại</b> trước.
            Nếu tải xong vẫn không khớp, nhờ quản lý vào <b>Nhân sự → Bảng lương → Sửa</b> điền đúng email này.</div>
          <div class="form-actions">
            <button class="btn primary" onclick="Att.reloadStaff()">Tải lại</button>
            <span class="spacer"></span>
            <button class="btn" onclick="Att.logout()">Đăng xuất</button></div>`;
      } else {
        const l = this.logOf(st.id, T);
        const next = !l ? 'Chấm công vào ca' : (!l.outAt ? 'Chấm công ra ca' : 'Cập nhật giờ ra');
        body = `
          <div class="card mb"><div class="card-b" style="text-align:center">
            <div class="avatar" style="width:56px;height:56px;font-size:20px;margin:0 auto 8px">${h(st.name.split(' ').slice(-1)[0].slice(0,2))}</div>
            <div style="font-size:17px;font-weight:700">${h(st.name)}</div>
            <div class="sub-line">${h(st.role)} · ${fmtD(T)}</div>
            <div style="margin-top:12px;display:flex;gap:18px;justify-content:center">
              <div><div class="sub-line">Giờ vào</div><div class="num" style="font-size:20px;font-weight:700">${l&&l.inAt?l.inAt:'—'}</div></div>
              <div><div class="sub-line">Giờ ra</div><div class="num" style="font-size:20px;font-weight:700">${l&&l.outAt?l.outAt:'—'}</div></div>
              <div><div class="sub-line">Làm được</div><div class="num" style="font-size:20px;font-weight:700">${gioPhut(Att.tinh(l).phut)}</div></div>
            </div>
            <div class="sub-line" style="margin-top:8px">${h(Att.moTaCa(todayISO()))} · nghỉ trưa không tính công</div>
            ${l&&l.net==='outside'?'<div class="pill danger" style="margin-top:10px">Chấm ngoài mạng phòng khám</div>':''}
          </div></div>
          <button class="btn primary" style="width:100%;justify-content:center;padding:14px" onclick="Att.selfCheck('${st.id}')">${next}</button>
          <div class="form-actions" style="margin-top:14px">
            <button class="btn small" onclick="Att.sync()">Tải lại</button>
            <span class="spacer"></span>
            <button class="btn small" onclick="Att.logout()">Đăng xuất</button>
            <button class="btn small" onclick="location.hash='';location.reload()">Vào phần mềm</button></div>`;
      }
    }
    return `<div style="max-width:420px;margin:0 auto">
      <div class="page-head"><h1>Chấm công</h1><div class="sub">${h(db.clinic.name)} · ${h(db.clinic.addr)}</div></div>
      ${body}</div>`;
  },
  async reloadStaff(){
    App.toast('Đang tải danh sách nhân viên…');
    await Sync.run(true);
    App.render();
    const st = this.myStaff();
    App.toast(st ? 'Đã nhận ra bạn: ' + st.name : 'Vẫn chưa khớp — nhờ quản lý kiểm tra email');
  },
  async selfCheck(staffId){
    await this.record(staffId, true);
    if (Cloud.loggedIn()) {
      const T = todayISO(), l = this.logOf(staffId, T);
      try { await Cloud.pushAtt([l]); } catch(e){ App.toast('Đã lưu trên máy, chưa gửi lên được: ' + e.message); }
    }
    App.render();
  },

  /* Không đọc được tên wifi từ trình duyệt — đối chiếu địa chỉ mạng công cộng thay thế */
  async checkNetwork(){
    const want = (db.clinic && db.clinic.wifiIp || '').trim();
    if (!want) return 'unknown';
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch('https://api.ipify.org?format=json', {signal: ctrl.signal});
      const j = await r.json();
      return j.ip === want ? 'clinic' : 'outside';
    } catch(e){ return 'unknown'; }
  },

  /* Lưu địa chỉ mạng hiện tại làm mạng phòng khám */
  async saveClinicIp(){
    App.toast('Đang lấy địa chỉ mạng…');
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const j = await r.json();
      db.clinic.wifiIp = j.ip; save(); App.render();
      App.toast('Đã ghi nhận mạng phòng khám: ' + j.ip);
    } catch(e){ App.toast('Không lấy được địa chỉ mạng (máy đang offline?)'); }
  },

  /* Máy chấm công: bật camera quét mã nhân viên */
  scanner(){
    App.modal('Máy chấm công — quét mã QR', `
      <div id="scanWrap">
        <video id="scanVid" playsinline muted style="width:100%;border-radius:10px;background:#000;aspect-ratio:4/3;object-fit:cover"></video>
        <div id="scanMsg" class="note-block" style="margin-top:10px">Đang mở camera…</div>
      </div>
      <div class="f" style="margin-top:12px"><label>Hoặc nhập mã nhân viên bằng tay</label>
        <select id="scanManual">${db.staff.map(s=>`<option value="${s.id}">${h(s.name)}</option>`).join('')}</select></div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="Att.stopScan();App.closeModal()">Đóng</button>
        <button type="button" class="btn primary" onclick="Att.record(document.getElementById('scanManual').value,false)">Chấm công thủ công</button>
      </div>`);
    this.startScan();
  },
  async startScan(){
    const msg = () => document.getElementById('scanMsg');
    if (!('BarcodeDetector' in window)) {
      const el = msg(); if (el) el.innerHTML = 'Trình duyệt này chưa hỗ trợ quét mã QR. Hãy dùng <b>Chrome trên Android</b> hoặc <b>Safari trên iPhone (iOS 17 trở lên)</b>, hoặc chấm công thủ công bên dưới.';
      const v = document.getElementById('scanVid'); if (v) v.style.display = 'none';
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      const v = document.getElementById('scanVid');
      if (!v) { this.stopScan(); return; }
      v.srcObject = this.stream; await v.play();
      const el = msg(); if (el) el.textContent = 'Đưa mã QR của nhân viên vào khung hình.';
      const det = new BarcodeDetector({formats:['qr_code']});
      let busy = false;
      this.timer = setInterval(async () => {
        if (busy || !document.getElementById('scanVid')) return;
        busy = true;
        try {
          const codes = await det.detect(v);
          if (codes.length) {
            const raw = codes[0].rawValue || '';
            if (raw.startsWith(QR_PREFIX)) {
              this.stopScan();
              await this.record(raw.slice(QR_PREFIX.length), true);
              App.closeModal();
            } else { const e2 = msg(); if (e2) e2.textContent = 'Mã này không phải mã chấm công của phòng khám.'; }
          }
        } catch(e){}
        busy = false;
      }, 400);
    } catch(e){
      const el = msg(); if (el) el.textContent = 'Không mở được camera: ' + e.message + '. Hãy cho phép quyền camera, hoặc chấm công thủ công bên dưới.';
    }
  },
  stopScan(){
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
  },

  /* Mã QR cá nhân — in ra thẻ hoặc để nhân viên lưu trong máy */
  showCard(staffId){
    const st = staffById(staffId);
    App.modal('Mã QR chấm công — ' + st.name, `
      <div style="text-align:center">
        <div style="display:inline-block;padding:10px;background:#fff;border-radius:12px;border:1px solid var(--line)">${QR.svg(QR_PREFIX + st.id, 230)}</div>
        <div style="margin-top:10px;font-weight:700">${h(st.name)}</div>
        <div class="sub-line">${h(st.role)} · ${h(db.clinic.name)}</div>
      </div>
      <div class="note-block" style="margin-top:12px">In mã này dán lên thẻ nhân viên, hoặc chụp màn hình để trong điện thoại. Đưa mã vào máy chấm công ở quầy để ghi giờ vào/ra.</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
        <button type="button" class="btn primary" onclick="Att.printCard('${st.id}')">${IC.print} In thẻ</button></div>`);
  },
  printCard(staffId){
    const st = staffById(staffId);
    App.print(`<div style="text-align:center">
      <h1>THẺ CHẤM CÔNG</h1>
      <p style="margin:2px 0"><b>${h(db.clinic.name)}</b><br>${h(db.clinic.addr)}</p>
      <div style="margin:14px auto">${QR.svg(QR_PREFIX + st.id, 240)}</div>
      <p style="font-size:15px;margin:2px 0"><b>${h(st.name)}</b></p>
      <p style="margin:2px 0">${h(st.role)}</p></div>`);
  },

  /* Sửa tay một dòng công */
  editForm(staffId, date){
    const log = this.logOf(staffId, date) || {inAt:'', outAt:''};
    const st = staffById(staffId);
    App.modal('Sửa công — ' + st.name + ' · ' + fmtD(date), `
    <form class="form-grid" onsubmit="Att.editSave(event,'${staffId}','${date}')">
      <div class="f"><label>Giờ vào</label><input type="time" name="inAt" value="${h(log.inAt||'')}"></div>
      <div class="f"><label>Giờ ra</label><input type="time" name="outAt" value="${h(log.outAt||'')}"></div>
      <div class="f full"><label>Ghi chú</label><input name="note" value="${h(log.note||'')}" placeholder="Vd: xin về sớm, đi công tác…"></div>
      <div class="form-actions full">
        ${this.logOf(staffId,date)?`<button type="button" class="btn danger" onclick="Att.del('${staffId}','${date}')">Xóa dòng công</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  editSave(ev, staffId, date){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!db.attLog) db.attLog = [];
    let log = this.logOf(staffId, date);
    if (!log) { log = {id:uid(), staffId, date, net:'unknown', viaQR:false}; db.attLog.push(log); }
    Object.assign(log, {inAt:d.inAt, outAt:d.outAt, note:d.note});
    save(); App.closeModal(); App.render(); App.toast('Đã lưu công ✓');
  },
  del(staffId, date){
    if (!confirm('Xóa dòng chấm công này?')) return;
    db.attLog = (db.attLog||[]).filter(x => !(x.staffId===staffId && x.date===date));
    save(); App.closeModal(); App.render(); App.toast('Đã xóa');
  },

  /* Tổng hợp tháng từ nhật ký quét — dùng cho bảng lương */
  summary(staffId, month){
    const logs = (db.attLog||[]).filter(x => x.staffId===staffId && monthOf(x.date)===month);
    let days = 0, late = 0, outside = 0, phut = 0, cong = 0, veTrua = 0, som = 0, phutTre = 0;
    logs.forEach(l => {
      if (!l.inAt) return;
      days++;
      if (l.net === 'outside') outside++;
      const t = Att.tinh(l);
      phut += t.phut; cong += t.cong;
      if (t.tre) { late++; phutTre += t.tre; }
      if (t.som) som++;
      if (t.veTrua) veTrua++;
    });
    return {days, late, outside, logs, phut, cong, veTrua, som, phutTre};
  },
  /* ---------- Link mời: nhân viên bấm vào là máy tự cấu hình ---------- */
  inviteUrl(){
    const p = this.cfgPayload();
    return p ? (location.origin + location.pathname + '#setup=' + p) : '';
  },
  /* Đọc cấu hình từ link mời (#setup=…) hoặc từ mã QR chấm công (#cc=…) */
  applyInvite(){
    const m = location.hash.match(/^#(setup|cc)=(.+)$/);
    if (!m) return false;
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
      if (o.u && o.k) {
        Cloud.saveCfg(o.u, o.k);
        /* giữ lại #cc để vẫn vào thẳng màn hình chấm công */
        history.replaceState(null, '', location.pathname + (m[1] === 'cc' ? '#cc' : ''));
        return m[1];
      }
    } catch(e){}
    return false;
  },
  /* Dán liên kết mời vào ô trên màn hình chào để nối máy mới */
  useInvite(){
    const el = document.getElementById('inviteIn');
    const raw = ((el && el.value) || '').trim();
    if (!raw) { App.toast('Chưa dán liên kết nào'); return; }
    const m = raw.match(/#(?:setup|cc)=([A-Za-z0-9+/=_-]+)/);
    if (!m) { App.toast('Liên kết không đúng — phải có đoạn #setup=… ở cuối'); return; }
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      if (!o.u || !o.k) throw 0;
      Cloud.saveCfg(o.u, o.k);
      App.render();
      App.toast('Đã nối vào phòng khám ✓ — hãy đăng nhập');
      Att.loginForm();
    } catch(e){ App.toast('Liên kết hỏng hoặc chép thiếu — xin quản lý gửi lại'); }
  },

  /* Mở từ biểu tượng ngoài màn hình thì không có thanh địa chỉ để dán —
     nút này lấy thẳng liên kết đang nằm trong bộ nhớ tạm của máy. */
  async pasteInvite(){
    const el = document.getElementById('inviteIn');
    if (!el) return;
    try {
      const t = await navigator.clipboard.readText();
      if (!t || !/#(setup|cc)=/.test(t)) { App.toast('Bộ nhớ tạm chưa có liên kết mời — chép lại bên Zalo/Safari'); return; }
      el.value = t.trim();
      this.useInvite();
    } catch(e){ App.toast('Máy không cho đọc bộ nhớ tạm — bấm giữ vào ô trên rồi chọn Dán'); }
  },

  inviteForm(){
    const url = this.inviteUrl();
    if (!url) { App.toast('Chưa cấu hình kết nối — làm Hướng dẫn kết nối trước'); this.wizard(); return; }
    App.modal('Mời nhân viên vào phần mềm', `
      <div class="note-block mb">Gửi liên kết này cho nhân viên (Zalo, tin nhắn…). Họ bấm vào là máy <b>tự nối vào phòng khám</b>,
        chỉ cần đăng nhập bằng tài khoản bạn đã cấp là thấy đủ dữ liệu.</div>
      <div class="f mb"><label>Liên kết mời</label>
        <textarea id="inviteTxt" readonly style="min-height:70px;font-size:12px">${h(url)}</textarea></div>
      <div class="form-actions" style="justify-content:flex-start">
        <button type="button" class="btn primary" onclick="Att.copy(document.getElementById('inviteTxt').value,this)">Sao chép liên kết</button></div>
      <div style="text-align:center;margin-top:14px">
        <div style="display:inline-block;padding:10px;background:#fff;border-radius:12px;border:1px solid var(--line)">${QR.svg(url, 220)}</div>
        <div class="sub-line" style="margin-top:6px">Hoặc cho nhân viên quét mã này</div></div>
      <div class="note-block" style="margin-top:12px;background:var(--warn-soft);color:var(--warn)">
        Liên kết chứa khóa kết nối của phòng khám. Khóa này vốn được thiết kế để công khai và
        <b>không tự mở được dữ liệu</b> — vẫn phải đăng nhập mới xem được. Nhưng chỉ nên gửi cho người trong phòng khám.</div>
      <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },

  /* ---------- Màn hình chào khi máy chưa nối vào phòng khám ---------- */
  welcomeScreen(){
    const buoc = (n, t, d, btn) => `<div class="rx mb"><div class="rx-head"><b>${n}. ${t}</b></div>
      <div class="card-b">${d}${btn ? `<div class="form-actions" style="justify-content:flex-start;margin-top:8px">${btn}</div>` : ''}</div></div>`;
    if (!Cloud.configured()) {
      return `<div style="max-width:520px;margin:0 auto">
        <div class="page-head"><h1>${h(db.clinic.name)}</h1>
          <div class="sub">Máy này chưa nối vào dữ liệu chung của phòng khám</div></div>
        <div class="note-block mb">Mỗi trình duyệt — và cả biểu tượng bạn kéo ra màn hình điện thoại —
          được máy coi là <b>một ngăn riêng</b>, không thấy được ngăn kia. Nên nối ở Safari xong,
          mở từ biểu tượng vẫn phải nối lại <b>một lần</b> ở đây. Nối rồi thì lần sau chỉ cần đăng nhập.</div>
        <div class="card mb"><div class="card-b">
          <div class="f"><label>Dán liên kết mời từ quản lý</label>
            <input id="inviteIn" placeholder="https://…#setup=…" autocomplete="off"></div>
          <div class="form-actions" style="justify-content:flex-start;margin-top:10px">
            <button class="btn primary" onclick="Att.useInvite()">Nối vào phòng khám</button>
            <button class="btn" onclick="Att.pasteInvite()">Dán từ bộ nhớ tạm</button></div>
          <div class="combo-hint">Quản lý lấy liên kết này ở <b>Nhân sự → Chấm công → Cài đặt → Mời nhân viên</b>.
            Chép liên kết bên Zalo/Safari rồi bấm <b>Dán từ bộ nhớ tạm</b> cho nhanh.</div>
        </div></div>
        ${buoc('•', 'Bạn là quản lý, đang cài lần đầu?', 'Tạo cơ sở dữ liệu chung trên Supabase (miễn phí) rồi dán khóa vào đây.',
          `<button class="btn" onclick="Att.wizard()">Bắt đầu cài đặt</button>`)}
        ${buoc('•', 'Chỉ muốn dùng thử trên máy này?', 'Dùng được ngay, dữ liệu lưu trên máy này thôi, không dùng chung với ai.',
          `<button class="btn" onclick="App.state.skipWelcome=1;App.render()">Dùng riêng máy này</button>`)}
      </div>`;
    }
    return `<div style="max-width:420px;margin:0 auto">
      <div class="page-head"><h1>${h(db.clinic.name)}</h1><div class="sub">Đăng nhập để xem dữ liệu phòng khám</div></div>
      <div class="card"><div class="card-b">
        <div class="note-block mb">Máy này đã nối vào phòng khám. Đăng nhập bằng tài khoản quản lý cấp cho bạn.</div>
        <div class="form-actions" style="justify-content:flex-start">
          <button class="btn primary" onclick="Att.loginForm()">Đăng nhập</button></div>
        <div class="combo-hint" style="margin-top:10px">Quên mật khẩu thì nhắn quản lý cấp lại.
          Không có nút bỏ qua — dữ liệu bệnh nhân chỉ mở khi đã đăng nhập.</div>
      </div></div></div>`;
  },

  /* ---------- Trình hướng dẫn kết nối ---------- */
  SQL: `create table if not exists staff (
  id text primary key, name text not null, role text,
  active boolean default true, updated_at timestamptz default now());

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null references staff(id) on delete cascade,
  date date not null, in_at text, out_at text, net text, ip text,
  via_qr boolean default true, note text, updated_at timestamptz default now(),
  unique (staff_id, date));

create table if not exists settings (
  key text primary key, value text, updated_at timestamptz default now());

create table if not exists records (
  id text primary key, tbl text not null, data jsonb not null,
  deleted boolean default false, updated_at timestamptz default now());
create index if not exists records_tbl_idx on records(tbl);

alter table staff      enable row level security;
alter table attendance enable row level security;
alter table settings   enable row level security;
alter table records    enable row level security;

drop policy if exists p_staff on staff;
drop policy if exists p_att   on attendance;
drop policy if exists p_set   on settings;
drop policy if exists p_rec   on records;

create policy p_staff on staff      for all to authenticated using (true) with check (true);
create policy p_att   on attendance for all to authenticated using (true) with check (true);
create policy p_set   on settings   for all to authenticated using (true) with check (true);
create policy p_rec   on records    for all to authenticated using (true) with check (true);`,

  copy(text, btn){
    navigator.clipboard.writeText(text).then(() => {
      App.toast('Đã sao chép ✓');
      if (btn) { const o = btn.textContent; btn.textContent = 'Đã chép ✓'; setTimeout(() => btn.textContent = o, 1800); }
    }).catch(() => App.toast('Máy không cho sao chép tự động — hãy bôi đen rồi chép tay'));
  },
  wizard(){
    App.modal('Kết nối đám mây — làm theo 4 bước', `
      <div style="display:grid;gap:14px">
        <div class="rx"><div class="rx-head"><b>Bước 1 · Tạo dự án</b><span class="pill mutedp">~3 phút</span></div>
          <div class="card-b">
            Mở <a href="https://supabase.com/dashboard" target="_blank" rel="noopener"><b>supabase.com/dashboard</b></a>
            → đăng nhập bằng Google → <b>New project</b>.<br>
            <div style="margin-top:6px">Tên dự án: <code>nha-khoa-hoang-bach</code> · Vùng: <b>Southeast Asia (Singapore)</b><br>
            Mật khẩu cơ sở dữ liệu: bấm <b>Generate</b> rồi lưu lại chỗ an toàn.</div>
          </div></div>

        <div class="rx"><div class="rx-head"><b>Bước 2 · Tạo bảng dữ liệu</b><span class="pill mutedp">~1 phút</span></div>
          <div class="card-b">
            Trong dự án chọn <b>SQL Editor → New query</b>, dán đoạn dưới rồi bấm <b>Run</b>.
            <div class="form-actions" style="justify-content:flex-start;margin:8px 0">
              <button type="button" class="btn small primary" onclick="Att.copy(Att.SQL,this)">Sao chép đoạn SQL</button></div>
            <textarea readonly style="width:100%;min-height:120px;font-family:ui-monospace,monospace;font-size:11.5px">${h(this.SQL)}</textarea>
          </div></div>

        <div class="rx"><div class="rx-head"><b>Bước 3 · Tắt xác nhận email</b><span class="pill mutedp">~30 giây</span></div>
          <div class="card-b">Vào <b>Authentication → Sign In / Providers → Email</b>, tắt mục <b>Confirm email</b> rồi Save.
            <br><span class="sub-line">Để tạo tài khoản nhân viên ngay trong phần mềm mà không phải đi xác nhận email.</span></div></div>

        <div class="rx"><div class="rx-head"><b>Bước 4 · Dán khoá vào phần mềm</b><span class="pill mutedp">~1 phút</span></div>
          <div class="card-b">Vào <b>Project Settings → API</b>, chép <b>Project URL</b> và <b>anon public</b> rồi bấm nút dưới.
            <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
              <button type="button" class="btn small primary" onclick="Att.cloudForm()">Dán khoá kết nối</button></div>
            <span class="sub-line">Chỉ dùng khoá <b>anon public</b>. Tuyệt đối không dùng <b>service_role</b>.</span>
          </div></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
        <button type="button" class="btn primary" onclick="Att.checkSetup()">Kiểm tra đã xong chưa</button></div>`);
  },
  async checkSetup(){
    App.toast('Đang kiểm tra…');
    const r = await Cloud.diagnose();
    const row = (ok, txt) => `<div class="alert-line"><span class="alert-ico ${ok===true?'info':ok==='warn'?'warn':'danger'}">${ok===true?'✓':'!'}</span><div>${txt}</div></div>`;
    let html = '';
    html += row(r.cfg, r.cfg ? 'Đã dán khoá kết nối' + (r.url ? ' — <code>' + h(r.url) + '</code>' : '') : 'Chưa dán Project URL / anon key — làm Bước 4');
    if (r.cfg) html += row(r.reach, r.reach ? 'Gọi tới máy chủ Supabase được' : h(r.msg));
    if (r.reach) ['staff','attendance','settings','records'].forEach(t => {
      const v = r.tables[t];
      html += row(v === true ? true : (v === 'locked' || v === 'cache') ? 'warn' : false,
        v === true ? `Bảng <b>${t}</b> đã có`
        : v === 'locked' ? `Bảng <b>${t}</b> đã có và đang khoá — bình thường, đăng nhập là đọc được`
        : v === 'cache' ? `Bảng <b>${t}</b> vừa tạo nhưng Supabase chưa nạp lại danh mục — chạy lệnh <code>NOTIFY pgrst, 'reload schema';</code> trong SQL Editor rồi bấm Kiểm tra lại`
        : `Chưa đọc được bảng <b>${t}</b>`)
        + ((r.errs && r.errs[t]) ? `<div class="sub-line" style="margin:-6px 0 6px 36px">Supabase trả lời: <code>${h(r.errs[t])}</code></div>` : '');
    });
    html += row(r.login ? true : 'warn', r.login ? 'Đã đăng nhập: <b>' + h(Cloud.who()) + '</b>' : 'Chưa đăng nhập — tạo tài khoản rồi đăng nhập ở bước dưới');
    App.modal('Kết quả kiểm tra', html + `
      <div class="form-actions">
        <button type="button" class="btn" onclick="Att.wizard()">← Quay lại hướng dẫn</button>
        <span class="spacer"></span>
        ${r.reach ? '<button type="button" class="btn" onclick="Att.accountsForm()">Tạo tài khoản nhân viên</button>' : ''}
        ${r.reach && !r.login ? '<button type="button" class="btn primary" onclick="Att.loginForm()">Đăng nhập</button>' : ''}
      </div>`);
  },

  /* ---------- Quản lý tài khoản truy cập (chỉ quản lý) ---------- */
  accountsPanel(){
    const rows = db.staff.map(s => {
      const role = s.perm || guessRole(s.role);
      const off = s.active === false;
      return `<tr${off?' style="opacity:.55"':''}>
        <td><b>${h(s.name)}</b><br><span class="sub-line">${h(s.role||'')}</span></td>
        <td>${s.email ? `<span class="num">${h(s.email)}</span>` : '<span class="sub-line">chưa có tài khoản</span>'}</td>
        <td><span class="pill ${role==='quanly'?'info':'mutedp'}">${h((ROLES[role]||{}).label||role)}</span></td>
        <td>${off?'<span class="pill danger">Đã khóa</span>':'<span class="pill ok">Đang làm</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn small" onclick="HR.staffForm('${s.id}','tk')">Sửa</button>
          ${s.email ? (off
            ? `<button class="btn small" onclick="Att.setActive('${s.id}',true)">Mở lại</button>`
            : `<button class="btn small danger" onclick="Att.setActive('${s.id}',false)">Khóa</button>`) : ''}
        </td></tr>`;
    }).join('');
    App.modal('Tài khoản truy cập', `
      <div class="tbl-wrap"><table style="min-width:620px">
        <thead><tr><th>Nhân viên</th><th>Email đăng nhập</th><th>Quyền</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="sub-line">Chưa có nhân viên nào.</td></tr>'}</tbody></table></div>
      <div class="note-block" style="margin-top:12px">
        <b>Khóa</b> = người đó đăng nhập vào sẽ không còn quyền xem gì, dùng khi nhân viên nghỉ việc.<br>
        <b>Mỗi người tự đổi mật khẩu</b> ở nút tròn góc trên phải → <i>Đổi mật khẩu</i>.</div>
      <div class="note-block" style="background:var(--warn-soft);color:var(--warn)">
        <b>Về việc xem mật khẩu:</b> không ai xem được mật khẩu của người khác, kể cả bạn — hệ thống
        không lưu mật khẩu dạng đọc được mà chỉ lưu bản mã hóa một chiều. Đây là cách bảo vệ tiêu chuẩn.<br>
        Nhân viên quên mật khẩu thì bạn <b>cấp lại cái mới</b>: vào Supabase → <b>Authentication → Users</b>
        → bấm dấu <b>⋮</b> cuối dòng người đó → <b>Update user</b> → đặt mật khẩu mới rồi báo cho họ.
        Xóa hẳn tài khoản cũng ở đó (⋮ → Delete user).</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
        <button type="button" class="btn" onclick="HR.staffForm('','tk')">${IC.plus} Thêm nhân viên</button>
        <button type="button" class="btn primary" onclick="Att.accountsForm()">Cấp tài khoản mới</button></div>`);
  },
  setActive(id, on){
    const st = staffById(id); if (!st) return;
    if (!on && !confirm('Khóa truy cập của "' + st.name + '"? Người này đăng nhập vào sẽ không xem được gì.')) return;
    st.active = on; save(); this.accountsPanel(); App.render();
    App.toast(on ? 'Đã mở lại quyền cho ' + st.name : 'Đã khóa truy cập của ' + st.name);
  },

  /* Tạo tài khoản đăng nhập cho nhân viên ngay trong phần mềm */
  accountsForm(){
    const rows = db.staff.map(s => `
      <div class="form-grid" style="grid-template-columns:1.2fr 1.4fr 1fr;gap:8px;align-items:end">
        <div class="f"><label>${h(s.name)}</label><input value="${h(s.role||'')}" disabled></div>
        <div class="f"><input name="em_${s.id}" type="email" value="${h(s.email||'')}" placeholder="email đăng nhập"></div>
        <div class="f"><input name="pw_${s.id}" placeholder="mật khẩu ≥ 6 ký tự"></div>
      </div>`).join('');
    App.modal('Tạo tài khoản cho nhân viên', `
      <form onsubmit="Att.accountsSave(event)">
        <div class="note-block mb">Điền email và mật khẩu cho từng người rồi bấm Tạo. Phần mềm sẽ tạo tài khoản trên Supabase
          và gắn email đó vào hồ sơ nhân viên. Ai đã có tài khoản thì bỏ trống ô mật khẩu.</div>
        ${rows}
        <div class="form-actions"><button type="button" class="btn" onclick="App.closeModal()">Đóng</button>
          <button class="btn primary">Tạo tài khoản</button></div>
      </form>`);
  },
  async accountsSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    let made = 0, linked = 0; const errs = [];
    for (const s of db.staff) {
      const em = (d['em_' + s.id] || '').trim(), pw = (d['pw_' + s.id] || '').trim();
      if (em && em !== s.email) { s.email = em; linked++; }
      if (em && pw) {
        try { await Cloud.signup(em, pw); made++; }
        catch(e){ errs.push(s.name + ': ' + e.message); }
      }
    }
    save(); App.closeModal(); App.render();
    App.toast(`Tạo ${made} tài khoản, gắn ${linked} email` + (errs.length ? ' · ' + errs.length + ' lỗi' : ' ✓'));
    if (errs.length) App.modal('Một số tài khoản chưa tạo được', errs.map(x => `<div class="alert-line"><span class="alert-ico danger">!</span><div>${h(x)}</div></div>`).join('')
      + '<div class="note-block" style="margin-top:10px">Lỗi <b>email address is invalid</b> thường do email dùng đuôi lạ — thử đuôi <code>@gmail.com</code>. Lỗi <b>already registered</b> nghĩa là tài khoản đã có sẵn, không cần tạo lại.</div>'
      + '<div class="form-actions"><button class="btn" onclick="App.closeModal()">Đóng</button></div>');
  },

  /* ---------- Kết nối đám mây ---------- */
  cloudForm(){
    const c = Cloud.cfg || {};
    App.modal('Kết nối đám mây', `
    <form class="form-grid" onsubmit="Att.cloudSave(event)">
      <div class="f full"><label>Project URL</label><input name="url" value="${h(c.url||'')}" placeholder="https://xxxx.supabase.co" required></div>
      <div class="f full"><label>anon public key</label><textarea name="key" required placeholder="eyJ...">${h(c.key||'')}</textarea></div>
      <div class="note-block full">Lấy hai giá trị này trong Supabase → <b>Project Settings → API</b>.
        Chỉ dùng khoá <b>anon public</b>, tuyệt đối không dùng <b>service_role</b>.
        Chưa tạo dự án? Xem file <b>HUONG-DAN-KET-NOI.md</b> trong kho mã nguồn.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu &amp; kiểm tra</button></div>
    </form>`);
  },
  async cloudSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    Cloud.saveCfg(d.url, d.key);
    App.toast('Đang kiểm tra kết nối…');
    try { await Cloud.test(); App.closeModal(); App.render(); App.toast('Kết nối thành công ✓ — giờ hãy đăng nhập'); }
    catch(e){ App.toast('Không kết nối được: ' + e.message); }
  },
  loginForm(){
    App.modal('Đăng nhập', `
    <form class="form-grid" onsubmit="Att.doLogin(event)">
      <div class="f full"><label>Email</label><input name="email" type="email" required autocomplete="username"></div>
      <div class="f full"><label>Mật khẩu</label><input name="password" type="password" required autocomplete="current-password"></div>
      <div class="note-block full">Tài khoản do quản lý tạo trong Supabase → <b>Authentication → Users</b>.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Đăng nhập</button></div>
    </form>`);
  },
  async doLogin(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    App.toast('Đang đăng nhập…');
    try {
      await Cloud.login(d.email, d.password);
      App.closeModal(); App.render();
      App.toast('Đang tải dữ liệu phòng khám…');
      /* Phải kéo cả danh sách nhân viên về thì mới nhận ra người đăng nhập là ai */
      await Sync.run(true);
      await Att.sync();
      /* Ghi vết sau khi đã kéo nhân viên về, lúc đó mới biết người đăng nhập là ai */
      if (typeof Vet !== 'undefined') { Vet.chup(); Vet.ghi('dangnhap', 'Đăng nhập vào ' + Vet.may()); }
      App.render();
      /* Đăng nhập được mà không có hồ sơ nhân viên nào mang email này thì người đó
         vào phần mềm với quyền thấp nhất và không chấm công được — phải nói ngay,
         không thì họ tưởng phần mềm hỏng. */
      const toi = Att.myStaff();
      if (!toi) {
        App.modal('Vào được, nhưng chưa nhận ra bạn là ai', `
          <div class="note-block warn-block">Tài khoản <b>${h(Cloud.who())}</b> đăng nhập thành công,
            nhưng <b>không có nhân viên nào trong phần mềm gắn email này</b>.</div>
          <div class="note-block">Quản lý mở <b>Nhân sự → Tài khoản truy cập</b>, bấm <b>Sửa</b> ở dòng của bạn
            rồi điền đúng email <b>${h(Cloud.who())}</b> vào ô <b>Email đăng nhập</b>.</div>
          <div class="form-actions"><button class="btn primary" onclick="App.closeModal()">Đã hiểu</button></div>`);
        return;
      }
      App.toast('Xin chào ' + toi.name);
    } catch(e){ App.loiDangNhap(e); }
  },
  /* Dịch mấy câu lỗi của Supabase ra việc phải làm. Nguyên nhân khác nhau mà cứ hiện
     một dòng tiếng Anh thô thì không ai biết đường sửa. */
  loiDangNhap(e){
    const m = String((e && e.message) || e);
    let vi = '', cach = '';
    if (/invalid login credentials|invalid_grant/i.test(m)) {
      vi = 'Sai email hoặc sai mật khẩu — hoặc Supabase chưa hề có tài khoản với email này.';
      cach = `<b>Tên có trong phần mềm không có nghĩa là đã có tài khoản.</b> Thêm nhân viên chỉ tạo hồ sơ;
        tài khoản đăng nhập phải tạo riêng.<br><br>
        Quản lý vào <b>Supabase → Authentication → Users</b>, tìm đúng email đó.
        Không thấy thì bấm <b>Add user</b> để tạo (nhớ bật <b>Auto Confirm User</b>).
        Có rồi thì bấm <b>⋮ → Update user</b> đặt lại mật khẩu mới.`;
    } else if (/email not confirmed|not confirmed/i.test(m)) {
      vi = 'Tài khoản đã tạo nhưng chưa được xác nhận email, nên Supabase chưa cho vào.';
      cach = `Vào <b>Supabase → Authentication → Users</b>, bấm <b>⋮</b> ở dòng người đó → <b>Update user</b>
        → bật <b>Auto Confirm User</b> (hoặc xóa đi rồi tạo lại và nhớ tick ô đó).`;
    } else if (/rate limit|too many/i.test(m)) {
      vi = 'Thử sai nhiều lần quá nên Supabase chặn tạm.';
      cach = 'Đợi vài phút rồi đăng nhập lại.';
    } else if (/password/i.test(m) && /short|least|6/i.test(m)) {
      vi = 'Mật khẩu ngắn hơn mức Supabase cho phép.';
      cach = 'Đặt lại mật khẩu dài ít nhất 6 ký tự.';
    } else if (/failed to fetch|networkerror|abort|timeout/i.test(m)) {
      vi = 'Không nối được tới máy chủ.';
      cach = `Kiểm tra mạng. Vẫn không được thì vào <b>supabase.com</b> xem dự án có đang
        <b>Paused</b> không — bản miễn phí tự ngủ khi khoảng một tuần không ai dùng, bấm <b>Restore</b> là chạy lại.`;
    } else {
      vi = m;
      cach = 'Chụp màn hình câu lỗi này gửi quản lý.';
    }
    App.modal('Đăng nhập không được', `
      <div class="note-block warn-block">${vi}</div>
      <div class="note-block">${cach}</div>
      <div class="sub-line" style="margin-top:8px">Máy chủ trả về: <span class="num">${h(m)}</span></div>
      <div class="form-actions"><button class="btn primary" onclick="App.closeModal()">Đóng</button></div>`);
  },
  /* Mọi nút Đăng xuất đều đi chung một đường: đẩy dữ liệu lên rồi mới thoát */
  logout(){ App.doLogout(); },

  /* Đẩy công lên đám mây rồi lấy về bản mới nhất */
  async sync(){
    if (!Cloud.configured() || !Cloud.loggedIn()) return;
    try {
      await Cloud.pushStaff(db.staff);
      const M = monthOf(todayISO());
      const mine = (db.attLog||[]).filter(x => monthOf(x.date) === M);
      if (mine.length) await Cloud.pushAtt(mine);
      const remote = await Cloud.pullAtt(M + '-01');
      const others = (db.attLog||[]).filter(x => monthOf(x.date) !== M);
      db.attLog = others.concat(remote);
      save(); App.render();
      App.toast('Đã đồng bộ ' + remote.length + ' dòng chấm công ✓');
    } catch(e){ App.toast('Đồng bộ lỗi: ' + e.message); }
  },

  settingsForm(){
    const conn = Cloud.configured()
      ? (Cloud.loggedIn()
          ? `<span class="pill ok">Đã kết nối · ${h(Cloud.who())}</span>`
          : `<span class="pill warn">Đã cấu hình, chưa đăng nhập</span>`)
      : `<span class="pill mutedp">Chưa kết nối — dữ liệu chỉ ở máy này</span>`;
    App.modal('Cài đặt chấm công', `
    <form class="form-grid" onsubmit="Att.settingsSave(event)">
      <div class="f full"><label>Cơ sở dữ liệu chung</label><div>${conn}</div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
          <button type="button" class="btn small primary" onclick="Att.wizard()">Hướng dẫn kết nối</button>
          ${Cloud.configured() ? `<button type="button" class="btn small" onclick="Att.inviteForm()">Mời nhân viên</button>` : ''}
          <button type="button" class="btn small" onclick="Att.checkSetup()">Kiểm tra</button>
          ${Cloud.configured() ? (Cloud.loggedIn()
            ? `<button type="button" class="btn small" onclick="Att.sync()">Đồng bộ ngay</button>
               <button type="button" class="btn small" onclick="Att.logout()">Đăng xuất</button>`
            : `<button type="button" class="btn small primary" onclick="Att.loginForm()">Đăng nhập</button>`) : ''}
        </div></div>
      <div class="f"><label>Ca sáng — vào</label><input type="time" name="caSangVao" value="${h(db.clinic.caSangVao||'07:00')}"></div>
      <div class="f"><label>Ca sáng — ra</label><input type="time" name="caSangRa" value="${h(db.clinic.caSangRa||'12:00')}"></div>
      <div class="f"><label>Ca chiều — vào</label><input type="time" name="caChieuVao" value="${h(db.clinic.caChieuVao||'13:00')}"></div>
      <div class="f"><label>Ca chiều — ra</label><input type="time" name="caChieuRa" value="${h(db.clinic.caChieuRa||'17:00')}"></div>
      <div class="f"><label>Cho phép trễ (phút)</label><input type="number" name="treCho" min="0" max="60" value="${h(String(db.clinic.treCho ?? 5))}"></div>
      <div class="f full"><label>Giờ riêng theo từng ngày trong tuần</label>
        <div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>Ngày</th><th>Sáng vào</th><th>Sáng ra</th><th>Chiều vào</th><th>Chiều ra</th></tr></thead>
          <tbody>${Att.THU.map((ten, i) => { const g = Att.gioCua(Att.ngayCuaThu(i)); return `<tr>
            <td>${h(ten)}</td>
            <td><input type="time" name="t${i}_sangVao" value="${h(g.sangVao)}"></td>
            <td><input type="time" name="t${i}_sangRa" value="${h(g.sangRa)}"></td>
            <td><input type="time" name="t${i}_chieuVao" value="${h(g.chieuVao)}"></td>
            <td><input type="time" name="t${i}_chieuRa" value="${h(g.chieuRa)}"></td></tr>`; }).join('')}</tbody></table></div>
        <div class="combo-hint">Bốn ô ở trên là giờ chung. Bảng này đè lên giờ chung cho từng ngày —
          cơ sở Thời Đại đóng cửa sớm thứ Bảy và Chủ nhật nên phải đặt riêng,
          nếu không hai ngày đó ai cũng bị tính là về sớm rồi trừ công oan.</div></div>
      <div class="note-block full">Khoảng <b>giữa hai ca là giờ nghỉ trưa, không tính công</b>. Nhờ vậy người ở lại buổi trưa
        và người về rồi quay lại đều ra cùng số giờ — không ai phải chấm công bốn lần một ngày.
        Ai về trưa rồi nghỉ luôn thì phần mềm chỉ tính công buổi sáng.</div>
      <div class="f"><label>Tiền tố mã khách hàng</label>
        <input name="maKH" value="${h(Cust.tienTo())}" maxlength="6" style="text-transform:uppercase" placeholder="RG">
        <div class="combo-hint">Mã khách mới sẽ là <b>${h(Cust.tienTo())}-1</b>, <b>${h(Cust.tienTo())}-2</b>…
          Mã đã cấp rồi thì giữ nguyên, không đổi theo.</div></div>
      <div class="f"><label>Điện thoại phòng khám</label><input name="phone" value="${h(db.clinic.phone||'')}" placeholder="0986 262 242"></div>
      <div class="f"><label>Điện thoại thứ hai</label><input name="phone2" value="${h(db.clinic.phone2||'')}" placeholder="0707 262 242"></div>
      <div class="f full"><label>Địa chỉ mạng phòng khám</label><input name="wifiIp" value="${h(db.clinic.wifiIp||'')}" placeholder="chưa đặt"></div>
      <div class="note-block full">Trình duyệt không đọc được tên wifi, nên phần mềm đối chiếu <b>địa chỉ mạng (IP)</b> của phòng khám thay thế: đứng ở phòng khám dùng wifi phòng khám thì IP trùng, chấm công ở nhà thì bị đánh dấu <b>ngoài mạng phòng khám</b>.
        Bấm nút bên dưới khi đang ngồi tại phòng khám và <b>đã nối wifi phòng khám</b> để ghi nhận.</div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="Att.saveClinicIp()">Lấy IP hiện tại làm mạng phòng khám</button>
        <span class="spacer"></span>
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  settingsSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    /* Kiểm tra trước khi ghi, kẻo giờ sai lọt vào rồi tính công lệch */
    const g = ['caSangVao','caSangRa','caChieuVao','caChieuRa'].map(k => hm2m(d[k]));
    if (g.some(x => x == null)) { App.toast('Chưa nhập đủ bốn mốc giờ của hai ca'); return; }
    if (g[1] <= g[0] || g[3] <= g[2] || g[2] < g[1]) { App.toast('Giờ ca chưa hợp lý — ca chiều phải bắt đầu sau khi ca sáng kết thúc'); return; }
    ['caSangVao','caSangRa','caChieuVao','caChieuRa'].forEach(k => db.clinic[k] = d[k]);
    /* Bảng giờ từng ngày: kiểm từng dòng rồi mới ghi, một dòng sai thì bỏ cả bảng
       chứ không ghi nửa vời — giờ nửa vời tính công còn tệ hơn giờ chung. */
    const tuan = {};
    for (let i = 0; i < 7; i++) {
      const o = {sangVao: d['t'+i+'_sangVao'], sangRa: d['t'+i+'_sangRa'],
                 chieuVao: d['t'+i+'_chieuVao'], chieuRa: d['t'+i+'_chieuRa']};
      const m = [o.sangVao, o.sangRa, o.chieuVao, o.chieuRa].map(hm2m);
      if (m.some(x => x == null)) { App.toast('Thiếu giờ ở dòng ' + Att.THU[i]); return; }
      if (m[1] <= m[0] || m[3] <= m[2] || m[2] < m[1]) {
        App.toast('Giờ ngày ' + Att.THU[i] + ' chưa hợp lý — ca chiều phải bắt đầu sau ca sáng'); return;
      }
      tuan[String(i)] = o;
    }
    db.clinic.caTuan = tuan;
    db.clinic.treCho = Math.max(0, +d.treCho || 0);
    /* Bỏ dấu gạch và khoảng trắng, vì phần mềm tự nối "-" vào sau tiền tố —
       để lọt vào thì ra mã kiểu "RG--12". Gõ bậy thì giữ nguyên tiền tố cũ. */
    const tt = (d.maKH || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (tt) db.clinic.maKH = tt;
    db.clinic.phone = (d.phone||'').trim();
    db.clinic.phone2 = (d.phone2||'').trim();
    db.clinic.wifiIp = (d.wifiIp||'').trim();
    save(); App.closeModal(); App.render(); App.toast('Đã lưu cài đặt ✓');
  },
};

/* ================= Hoa hồng theo công đoạn =================
   Mỗi loại dịch vụ có một quy trình gồm nhiều công đoạn, mỗi công đoạn ăn một tỷ lệ
   (hoặc một số tiền cố định). Ai làm công đoạn nào thì hưởng phần đó — nên cùng một ca
   có thể chia cho nhiều người. Với phục hình thì TRỪ TIỀN LAB trước rồi mới tính %.
   Tỷ lệ mặc định lấy theo bảng của phòng khám, nhưng đặt riêng cho từng người được. */
const QT = {
  /* Bảng gốc của phòng khám. b = mã bước (giữ cố định để không mất dữ liệu khi đổi tên),
     t = tên, p = phần trăm, tien = số tiền cố định (dùng thay cho %). */
  /* Chép từ "BẢNG TÍNH LƯƠNG THEO %" của phòng khám.
     tt   = tỷ trọng của công đoạn trong cả ca (chỉ để xem cho dễ hiểu)
     p10  = ăn bao nhiêu % doanh thu ròng, với người thuộc nhóm lương 10%
     p30  = ... với người thuộc nhóm lương 30%
     tien = trả khoán theo lần, không tính %.
     Vài dòng trong bảng gốc KHÔNG bằng tt × nhóm lương (Gắn hột, PRF, Vecni fluor,
     Phụ tiểu phẫu, Trám KT có đặt chốt) nên lấy đúng con số đã in trong bảng,
     không tự nhân lại. */
  MAU: [
    {id:'qt_su', ten:'Phục hình sứ', nhom:['Phục hình sứ'], truLab:true, labGY:[],
     buoc:[
      {b:'su_tv',   t:'Tư vấn',                           tt:10, p10:1,   p30:3},
      {b:'su_mai',  t:'Mài cùi',                          tt:30, p10:3,   p30:9},
      {b:'su_ld',   t:'Lấy dấu + che cùi / làm răng tạm', tt:10, p10:1,   p30:3},
      {b:'su_thu',  t:'Thử răng / thử sườn',              tt:10, p10:1,   p30:3},
      {b:'su_gtam', t:'Gắn tạm sứ (GTS)',                 tt:15, p10:1.5, p30:4.5},
      {b:'su_gsht', t:'Gắn sứ hoàn tất (GSHT)',           tt:15, p10:1.5, p30:4.5},
      {b:'su_chinh',t:'Chỉnh đau',                        tt:2,  p10:0.2, p30:0.6},
     ]},
    {id:'qt_tlban', ten:'Tháo lắp bán hàm', nhom:[], truLab:true, labGY:[],
     buoc:[
      {b:'tlb_tv',  t:'Tư vấn',                       tt:10, p10:1,   p30:3},
      {b:'tlb_ld',  t:'Lấy dấu + mài chỉnh sơ khởi',  tt:25, p10:2.5, p30:7.5},
      {b:'tlb_thu', t:'Thử răng / thử khung',         tt:20, p10:2,   p30:6},
      {b:'tlb_giao',t:'Giao hàm',                     tt:25, p10:2.5, p30:7.5},
      {b:'tlb_dau', t:'Chỉnh đau',                    tt:5,  p10:0.5, p30:1.5},
     ]},
    {id:'qt_tltoan', ten:'Tháo lắp toàn hàm', nhom:['Phục hình tháo lắp'], truLab:true, labGY:[],
     buoc:[
      {b:'tlt_tv',   t:'Tư vấn',                         tt:10, p10:1,   p30:3},
      {b:'tlt_ldsk', t:'Lấy dấu sơ khởi (LDSK)',         tt:10, p10:1,   p30:3},
      {b:'tlt_vanh', t:'Chạy vành khít + lấy dấu lần 2', tt:25, p10:2.5, p30:7.5},
      {b:'tlt_tqt',  t:'Ghi tương quan tâm (TQT)',       tt:10, p10:1,   p30:3},
      {b:'tlt_thu',  t:'Thử răng',                       tt:10, p10:1,   p30:3},
      {b:'tlt_giao', t:'Giao hàm',                       tt:10, p10:1,   p30:3},
      {b:'tlt_dau',  t:'Chỉnh đau',                      tt:5,  p10:0.5, p30:1.5},
     ]},
    {id:'qt_noinha', ten:'Điều trị tủy', nhom:['Điều trị tủy'], truLab:false, labGY:[],
     dv:['Điều trị tủy + trám răng sữa'],
     buoc:[
      {b:'nn_tv',      t:'Tư vấn',                                  tt:10, p10:1,   p30:3},
      {b:'nn_ssot',    t:'Sửa soạn ống tuỷ (SSOT)',                 tt:50, p10:5,   p30:15},
      {b:'nn_bot',     t:'Trám bít ống tuỷ (BOT)',                  tt:10, p10:1,   p30:3},
      {b:'nn_thuoc',   t:'Đặt / thay thuốc (mỗi lần)',              tt:5,  p10:0.5, p30:1.5},
      {b:'nn_tram',    t:'Trám kết thúc',                           tt:10, p10:1,   p30:3},
      {b:'nn_tramchot',t:'Trám kết thúc CÓ ĐẶT CHỐT (đổi vật liệu)',tt:20, p10:2,   p30:6},
      {b:'nn_tk',      t:'Tái khám + chụp phim kiểm tra sau 6 tháng',tt:5, p10:0.5, p30:1.5},
     ]},
    {id:'qt_tram', ten:'Trám răng', nhom:['Trám răng'], truLab:false, labGY:[],
     dv:['Trám răng sữa (GIC)'],
     buoc:[
      {b:'tr_tv',   t:'Tư vấn',                     tt:10, p10:1,   p30:3},
      {b:'tr_xoang',t:'Tạo xoang',                   tt:20, p10:2,   p30:6},
      {b:'tr_hinh', t:'Tạo hình',                    tt:55, p10:5.5, p30:16.5},
      {b:'tr_bong', t:'Chỉnh khớp và đánh bóng',     tt:10, p10:1,   p30:3},
     ]},
    {id:'qt_nho', ten:'Nhổ răng', nhom:['Nhổ răng'], truLab:false, labGY:[],
     buoc:[
      {b:'nh_tv',   t:'Tư vấn',    tt:10, p10:1,   p30:3},
      {b:'nh_te',   t:'Gây tê',    tt:20, p10:2,   p30:6},
      {b:'nh_nho',  t:'Nhổ răng',  tt:55, p10:5.5, p30:16.5},
      {b:'nh_dan',  t:'Dặn dò',    tt:15, p10:1.5, p30:4.5},
     ]},
    /* Chụp phim tính doanh thu chung cho phòng khám, không chia cho ai — nên nhóm này
       bật cờ khongChia và không cần công đoạn nào. */
    {id:'qt_cdha', ten:'Chẩn đoán hình ảnh', nhom:['Chẩn đoán hình ảnh'], truLab:false,
     khongChia:true, labGY:[], buoc:[]},
    {id:'qt_caovoi', ten:'Cạo vôi răng', nhom:['Nha chu'], truLab:false, labGY:[],
     buoc:[
      {b:'cv_l1', t:'Lần 1', tt:50, p10:5, p30:15},
      {b:'cv_l2', t:'Lần 2', tt:50, p10:5, p30:15},
     ]},
    {id:'qt_prf', ten:'PRF', nhom:[], truLab:false, labGY:[],
     buoc:[
      {b:'prf_tv',  t:'Tư vấn',              p10:5, p30:10},
      {b:'prf_mau', t:'Rút máu / thực hiện', p10:5, p30:10},
     ]},
    {id:'qt_duphong', ten:'Dự phòng', nhom:[], truLab:false, labGY:[],
     buoc:[
      {b:'dp_fluor', t:'Vecni Fluor',           p10:5, p30:10},
      {b:'dp_hot',   t:'Gắn hột (mỗi lần)', tt:50, p10:5, p30:10},
     ]},
    {id:'qt_tay', ten:'Tẩy trắng', nhom:['Thẩm mỹ'], truLab:false, labGY:[],
     buoc:[
      {b:'ty_tv',  t:'Tư vấn',         p10:1, p30:1},
      {b:'ty_lam', t:'Làm tẩy trắng',  tien:50000},
     ]},
    {id:'qt_implant', ten:'Implant', nhom:['Implant'], truLab:false, labGY:[],
     buoc:[
      {b:'im_tv',  t:'Tư vấn implant',          tien:300000},
      {b:'im_phu', t:'Phụ implant (mỗi trụ)',   tien:50000},
     ]},
    {id:'qt_tieuphau', ten:'Tiểu phẫu', nhom:[], truLab:false, labGY:[],
     buoc:[{b:'tp_phu', t:'Phụ tiểu phẫu', p10:1, p30:1}]},

    /* ---- Răng trẻ em ----
       Nhóm này KHÔNG dùng một bộ công đoạn chung: gói chăm sóc, vệ sinh dự phòng,
       bọc mão và điều trị tủy ăn bốn mức khác hẳn nhau. Nên gán theo DANH MỤC RIÊNG,
       không gán theo nhóm (nhom để rỗng) — danh mục riêng thắng nhóm nên mỗi dịch vụ
       chạy đúng mức của nó. Điều trị tủy răng sữa và trám răng sữa thì dùng chung bộ
       của người lớn, gán ở phần dv của hai kỹ thuật đó. */
    {id:'qt_tre_goi', ten:'Gói chăm sóc răng miệng trẻ em', nhom:[], truLab:false, labGY:[],
     dv:['Gói chăm sóc Robot (1 năm)','Gói chăm sóc Siêu Nhân (1 năm)','Gói chăm sóc Super Man (1 năm)'],
     buoc:[{b:'tg_tv', t:'Tư vấn', p10:1, p30:1}]},
    {id:'qt_tre_dp', ten:'Vệ sinh & dự phòng răng trẻ em', nhom:[], truLab:false, labGY:[],
     dv:['Vệ sinh răng trẻ em','Phủ vecni fluor'],
     buoc:[{b:'td_lam', t:'Thực hiện', p10:10, p30:10}]},
    {id:'qt_tre_mao', ten:'Bọc mão răng sữa', nhom:[], truLab:true, labGY:[],
     dv:['Bọc mão kim loại răng sữa'],
     buoc:[{b:'tm_lam', t:'Thực hiện', p10:10, p30:10}]},
  ],

  /* ---------- Nhóm lương và các mức bị trừ ----------
     Bảng 1 của tài liệu: người ở nhóm lương 30% mà ca đó giảm giá 20–30% thì chỉ còn
     ăn như nhóm 10%; giảm từ 50% trở lên thì không có hoa hồng; không có ảnh
     trước–sau thì nhóm 10% còn 7, nhóm 30% còn 20. Để sửa được vì đây là chính sách,
     không phải luật. */
  QUY_TAC: {giamNhe:10, giamNang:50, mucKhiGiam:10, khongAnh10:7, khongAnh30:20},
  quyTac(){ return Object.assign({}, this.QUY_TAC, (db.clinic || {}).hhQuyTac || {}); },
  /* Nhóm lương của một người; chưa đặt thì coi là 10% cho an toàn (trả thiếu còn bù được,
     trả dư rồi đòi lại thì không). */
  mucCua(st){
    const v = st && st.nhomHH != null && st.nhomHH !== '' ? +st.nhomHH : 10;
    return isNaN(v) || v < 0 ? 10 : v;
  },
  /* Nội suy giữa cột 10% và cột 30% cho một mức bất kỳ.
     M = 10 ra đúng a, M = 30 ra đúng b; dưới 10 thì co lại theo tỷ lệ cho về 0. */
  noiSuy(a, b, muc){
    a = +a || 0; b = +b || 0;
    const v = muc >= 10 ? a + (b - a) * (muc - 10) / 20 : a * muc / 10;
    return Math.max(0, +v.toFixed(4));
  },
  /* Ca này thực tế giảm bao nhiêu phần trăm — tính cả giảm theo % lẫn giảm bằng tiền */
  giamCua(t){
    const goc = (+t.donGia || 0) * (+t.sl || 1);
    if (!goc) return +t.giamPct || 0;
    return Math.max(0, Math.min(100, (1 - (+t.price || 0) / goc) * 100));
  },
  /* Nhân vào tiền công: 1 là ăn đủ, 0 là không có gì.
     Bảng 1 là mấy CỘT RỜI NHAU, không nói ca vừa giảm giá vừa thiếu ảnh thì tính sao.
     Ở đây lấy cột THẤP NHẤT áp dụng được. Nếu nhân chồng hai mức vào nhau thì có lúc
     bác sĩ nhận ít hơn phụ tá trên cùng một ca (33.000 so với 34.650) — vô lý. */
  heSo(t, st){
    if (!t) return 1;
    const qt = this.quyTac(), muc = this.mucCua(st);
    if (!muc) return 0;
    let eff = muc;
    const g = this.giamCua(t);
    if (g >= qt.giamNang) eff = 0;
    else if (g > qt.giamNhe) eff = Math.min(eff, qt.mucKhiGiam);
    if (t.coAnh === false) eff = Math.min(eff, this.noiSuy(qt.khongAnh10, qt.khongAnh30, muc));
    return eff / muc;
  },
  /* Vì sao bị trừ — để hiện ra cho người làm biết, đừng để họ tự đoán */
  lyDoTru(t, st){
    if (!t) return '';
    const qt = this.quyTac(), g = this.giamCua(t), ra = [];
    if (g >= qt.giamNang) ra.push('ca giảm ' + Math.round(g) + '% nên không có hoa hồng');
    else if (g > qt.giamNhe) ra.push('ca giảm ' + Math.round(g) + '% nên hạ về mức 10%');
    if (t.coAnh === false) ra.push('chưa có ảnh trước–sau');
    return ra.join(' · ');
  },

  ds(){ return (db.quyTrinh || []).filter(q => !q.an); },
  dsAn(){ return (db.quyTrinh || []).filter(q => q.an); },
  /* Tìm cả kỹ thuật đã bỏ, để còn bấm "Dùng lại" được */
  boId(id){ return (db.quyTrinh || []).find(q => q.id === id) || null; },
  /* Quy trình dùng cho một hạng mục: gán tay thì theo đó, chưa gán thì đoán theo nhóm */
  cua(t){
    if (!t) return null;
    if (t.qtId) { const q = this.boId(t.qtId); return (q && !q.an) ? q : null; }
    /* Danh mục gán tay THẮNG nhóm dịch vụ. Nhổ răng khôn mọc lệch nằm trong nhóm
       "Nhổ răng" nhưng ăn hoa hồng theo kỹ thuật Tiểu phẫu — đoán theo nhóm thì
       không bao giờ ra đúng. Gán theo nhóm chỉ là lưới hứng cho phần còn lại. */
    const ten = Combo.norm(t.name || '');
    if (ten) {
      const q = this.ds().find(x => (x.dv || []).some(y => Combo.norm(y) === ten));
      if (q) return q;
    }
    return this.ds().find(q => (q.nhom||[]).includes(t.group)) || null;
  },
  /* Danh mục nào đang thuộc kỹ thuật khác — để cảnh báo, một dịch vụ chỉ nên thuộc một */
  chuCua(ten, tru){
    const k = Combo.norm(ten);
    return this.ds().find(x => x.id !== tru && (x.dv || []).some(y => Combo.norm(y) === k)) || null;
  },
  buocCua(q, b){ return q ? (q.buoc||[]).find(x => x.b === b) : null; },
  /* Tỷ lệ áp cho một người ở một bước. Tiền từng công đoạn dùng CHUNG cho cả phòng
     khám; thứ riêng của mỗi người chỉ là con số % trong hồ sơ. Bản cũ còn cho đặt
     riêng từng công đoạn (st.model.cd) — đã bỏ, vì hai cách chồng nhau thì cái riêng
     đè lên cái chung, sửa ô % mà tiền không đổi, không ai hiểu vì sao.
     buoc.p là của bản cũ hơn nữa, giữ để dữ liệu cũ không vỡ. */
  pctCua(st, buoc){
    const muc = this.mucCua(st);
    if (buoc.p10 != null || buoc.p30 != null) {
      return this.noiSuy(buoc.p10 != null ? buoc.p10 : buoc.p30,
                         buoc.p30 != null ? buoc.p30 : buoc.p10, muc);
    }
    return buoc.p != null ? +buoc.p : null;
  },
  /* Tiền công ĐẦY ĐỦ của một bước, chưa xét khách đã trả tới đâu */
  tienBuocDay(t, q, buoc, st){
    if (buoc.tien != null) return +buoc.tien || 0;
    const goc = Math.max(0, (+t.price || 0) - (q && q.truLab ? (+t.tienLab || 0) : 0));
    const p = this.pctCua(st, buoc);
    return p == null ? 0 : goc * p / 100 * this.heSo(t, st);
  },
  /* Tiền công THỰC HƯỞNG = tiền đầy đủ × phần khách đã thanh toán cho hạng mục đó.
     Khách trả 60% thì mọi người trong ca cùng nhận 60%, trả nốt thì nhận nốt. */
  tienBuoc(t, q, buoc, st){
    return this.tienBuocDay(t, q, buoc, st) * this.tyLeThu(t);
  },

  /* ---------- Khách đã trả tới đâu cho từng hạng mục ----------
     Phiếu thu ghi theo khách chứ không theo từng hạng mục, nên phải rải tiền ra:
     phiếu nào có ghi nhóm dịch vụ thì rải vào hạng mục cùng nhóm trước, hết mới rải
     sang hạng mục khác; trong mỗi nhóm thì hạng mục làm trước được trả trước.
     Phiếu thu chuyển từ sổ cũ (old) không rải, vì đó là số dư đầu kỳ. */
  _thu: null,
  phanBoThu(){
    if (this._thu) return this._thu;
    const m = {}, theoKhach = {};
    db.treatments.forEach(t => {
      if (t.status === 'Báo giá') return;
      (theoKhach[t.customerId] = theoKhach[t.customerId] || []).push(t);
      m[t.id] = 0;
    });
    const sxNgay = (a, b) => (a.date || '') < (b.date || '') ? -1 : 1;
    Object.keys(theoKhach).forEach(cid => {
      const muc = theoKhach[cid].sort(sxNgay);
      db.receipts.filter(r => r.customerId === cid && !r.old).sort(sxNgay).forEach(r => {
        let con = +r.amount || 0;
        const rai = ds => ds.forEach(t => {
          if (con <= 0) return;
          const lay = Math.min(con, Math.max(0, (+t.price || 0) - m[t.id]));
          m[t.id] += lay; con -= lay;
        });
        /* Phiếu thu có ghi rõ thu cho hạng mục nào thì rải đúng vào đó trước — chính
           xác hơn hẳn việc đoán theo nhóm dịch vụ như trước. */
        if ((r.mucIds || []).length) rai(muc.filter(t => r.mucIds.includes(t.id)));
        if (r.group) rai(muc.filter(t => t.group === r.group));
        rai(muc);
      });
    });
    this._thu = m;
    return m;
  },
  daThu(t){ return t ? (this.phanBoThu()[t.id] || 0) : 0; },
  tyLeThu(t){
    if (!t || !(+t.price)) return 1;          /* giá 0 thì coi như không còn gì để thu */
    return Math.min(1, this.daThu(t) / (+t.price));
  },

  /* Các lần làm công đoạn trong tháng, kèm tiền — dùng cho bảng lương và bảng hoa hồng */
  congThang(month, staffId){
    const ra = [];
    db.treatments.forEach(t => {
      const q = this.cua(t); if (!q) return;
      (t.cd || []).forEach(x => {
        if (!x.d || monthOf(x.d) !== month) return;
        if (staffId && x.s !== staffId) return;
        /* Nhóm đánh dấu "không chia" thì doanh thu tính chung cho phòng khám,
           không ai được hoa hồng — kể cả khi lỡ ghi công đoạn. */
        if (q.khongChia) return;
        const buoc = this.buocCua(q, x.b); if (!buoc) return;
        const st = staffById(x.s);
        ra.push({t, q, buoc, staffId: x.s, date: x.d, tien: this.tienBuoc(t, q, buoc, st)});
      });
    });
    return ra.sort((a,b) => a.date < b.date ? 1 : -1);
  },
  hoaHong(staffId, month){ return this.congThang(month, staffId).reduce((s,x) => s + x.tien, 0); },

  /* ---------- Ghi công đoạn đã làm trên một hạng mục ---------- */
  ghi(tid){
    const t = db.treatments.find(x => x.id === tid); if (!t) return;
    const q = this.cua(t);
    const c = custById(t.customerId);
    const nv = db.staff.filter(s => s.active !== false);
    if (!q) {
      App.modal('Công đoạn — ' + t.name, `
        <div class="note-block">Dịch vụ này thuộc nhóm <b>${h(t.group||'—')}</b>, chưa gắn quy trình công đoạn nào.</div>
        <div class="f full" style="margin-top:10px"><label>Chọn quy trình áp dụng</label>
          <select id="qtChon">${this.ds().map(x=>`<option value="${x.id}">${h(x.ten)}</option>`).join('')}</select></div>
        <div class="form-actions full"><button class="btn" onclick="App.closeModal()">Hủy</button>
          <button class="btn primary" onclick="QT.ganQT('${tid}')">Áp dụng</button></div>`);
      return;
    }
    if (q.khongChia) {
      App.modal('Công đoạn — ' + t.name, `
        <div class="note-block">Nhóm <b>${h(t.group || q.ten)}</b> được đặt là
          <b>không chia hoa hồng</b> — doanh thu tính chung cho cả phòng khám, không cần ghi tên bác sĩ.</div>
        <div class="note-block">Muốn đổi thì vào <b>Cài đặt → Bảng giá dịch vụ → Nhóm dịch vụ</b>,
          mở nhóm này rồi bỏ đánh dấu.</div>
        <div class="form-actions"><button class="btn primary" onclick="App.closeModal()">Đã hiểu</button></div>`);
      return;
    }
    const daLam = t.cd || [];
    const ty = this.tyLeThu(t), thu = this.daThu(t);
    const rows = q.buoc.map(b => {
      const x = daLam.find(y => y.b === b.b) || {};
      const st = staffById(x.s);
      /* Chưa chọn người làm thì để gạch ngang, đừng hiện số — hiện số lúc chưa có ai
         trông như đã có người được trả, mà thật ra là tiền giả định ở mức 10%. */
      const day = st ? this.tienBuocDay(t, q, b, st) : null;
      const thuc = day == null ? null : day * ty;
      return `<tr>
        <td><label style="display:flex;gap:8px;align-items:center;cursor:pointer">
          <input type="checkbox" name="lam" value="${b.b}"${x.s?' checked':''}> <b>${h(b.t)}</b></label>
          <span class="sub-line" id="ty_${b.b}">${st ? this.moTaBuocCho(b, st) + ' · ' + this.mucCua(st) + '%'
                                      : this.moTaBuoc(b) + ' (10% · 30%)'}</span></td>
        <td><select name="ng_${b.b}" onchange="QT.tinhLai('${tid}')">
          <option value="">— chọn người làm —</option>
          ${nv.map(s=>`<option value="${s.id}"${x.s===s.id?' selected':''}>${h(s.name)}${
            s.nhomHH != null && s.nhomHH !== '' ? ' — ' + QT.mucCua(s) + '%' : ''}</option>`).join('')}</select></td>
        <td><input type="date" name="ngay_${b.b}" value="${h(x.d||todayISO())}"></td>
        <td class="r num" id="day_${b.b}">${day==null?'—':money(day)}</td>
        <td class="r num" style="font-weight:600" id="thuc_${b.b}">${thuc==null?'—':money(thuc)}</td></tr>`;
    }).join('');
    const goc = Math.max(0, (+t.price||0) - (q.truLab ? (+t.tienLab||0) : 0));
    App.modal('Công đoạn — ' + t.name + (t.tooth ? ' (R' + t.tooth + ')' : ''), `
    <form class="form-grid" onsubmit="QT.ghiSave(event,'${tid}')">
      <div class="note-block full">Khách: <b>${h(c?c.name:'')}</b> · Quy trình: <b>${h(q.ten)}</b> ·
        Giá dịch vụ: <b>${money(t.price)}</b>${q.truLab?` · Tiền lab: <b>${money(t.tienLab||0)}</b> → tính % trên <b id="qtGoc">${money(goc)}</b>`:''}</div>
      <div class="note-block full" style="border-color:var(--accent)">Khách đã thanh toán cho hạng mục này:
        <b>${money(thu)} / ${money(t.price)}</b> = <b>${Math.round(ty*100)}%</b>.
        Tiền công mọi người nhận <b>đúng bằng phần khách đã trả</b>; khách trả nốt thì phần còn lại tự cộng vào.</div>
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="coAnh"${t.coAnh===false?'':' checked'} onchange="QT.tinhLai('${tid}')"> Ca này <b>có ảnh trước – sau</b></label></div>
        <div class="combo-hint">Bỏ tick thì hoa hồng cả ca bị hạ xuống
          ${this.quyTac().khongAnh10}% / ${this.quyTac().khongAnh30}% theo quy tắc phòng khám.</div></div>
      ${(() => { const g = this.giamCua(t), r = this.quyTac();
        if (g <= r.giamNhe) return '';
        return `<div class="note-block full warn-block">Ca này giảm <b>${Math.round(g)}%</b> —
          ${g >= r.giamNang ? 'theo quy tắc thì <b>không có hoa hồng</b>.'
                            : `hoa hồng bị hạ về mức <b>${r.mucKhiGiam}%</b>.`}</div>`; })()}
      ${q.truLab?`<div class="f full"><label>Tiền lab (trừ trước khi tính %)</label>
        ${Tien.o('tienLab', t.tienLab||0, `oninput="QT.tinhLai('${tid}')"`)}
        ${(() => { const gy = GiaLab.goiY().length ? GiaLab.goiY() : q.labGY; return gy.length?`<div class="combo-hint">Mức thường dùng: ${gy.map(([n,v])=>
          `<button type="button" class="link-btn" onclick="this.form.tienLab.value=Tien.dinh('${v}')">${h(n)} ${money(v)}</button>`).join(' · ')}</div>`:''; })()}</div>`:''}
      <div class="f full"><label>Làm xong hết trong một lần hẹn?</label>
        <div class="form-actions" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
          <select id="nguoiTatCa" style="max-width:260px">
            <option value="">— chọn người làm tất cả —</option>
            ${nv.map(s => `<option value="${s.id}">${h(s.name)}${s.nhomHH != null && s.nhomHH !== '' ? ' — ' + QT.mucCua(s) + '%' : ''}</option>`).join('')}
          </select>
          <button type="button" class="btn" onclick="QT.chonTatCa('${tid}')">Chọn tất cả công đoạn</button>
          <button type="button" class="btn" onclick="QT.boTatCa('${tid}')">Bỏ chọn hết</button></div>
        <div class="combo-hint">Ca làm gọn trong một buổi thì chọn người rồi bấm <b>Chọn tất cả</b> —
          khỏi tick từng dòng. Chọn xong vẫn sửa lại từng dòng được.</div></div>
      <div class="full"><div class="tbl-wrap"><table style="min-width:560px">
        <thead><tr><th>Công đoạn</th><th>Người làm</th><th>Ngày</th><th class="r">Đủ 100%</th><th class="r">Thực nhận</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
      <div class="f full"><label>Đổi quy trình áp dụng</label>
        <select name="qtId">${this.ds().map(x=>`<option value="${x.id}"${x.id===q.id?' selected':''}>${h(x.ten)}</option>`).join('')}</select></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">Lưu công đoạn</button></div>
    </form>`);
  },
  /* Ca làm gọn một buổi: tick hết công đoạn và gán cùng một người, khỏi bấm từng dòng */
  chonTatCa(tid){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const ai = (document.getElementById('nguoiTatCa') || {}).value || '';
    if (!ai) { App.toast('Chọn người làm trước đã'); return; }
    f.querySelectorAll('[name="lam"]').forEach(x => { x.checked = true; });
    f.querySelectorAll('select[name^="ng_"]').forEach(x => { x.value = ai; });
    this.tinhLai(tid);
    App.toast('Đã gán cả ' + f.querySelectorAll('[name="lam"]').length + ' công đoạn cho '
      + ((staffById(ai) || {}).name || ''));
  },
  boTatCa(tid){
    const f = document.querySelector('#modalBody form'); if (!f) return;
    f.querySelectorAll('[name="lam"]').forEach(x => { x.checked = false; });
    f.querySelectorAll('select[name^="ng_"]').forEach(x => { x.value = ''; });
    this.tinhLai(tid);
  },

  /* Tính lại cả bảng ngay khi lễ tân đổi người làm, sửa tiền lab hoặc bỏ tick ảnh —
     không phải lưu rồi mở lại mới thấy số. Chỉ đọc form, KHÔNG ghi gì vào db. */
  tinhLai(tid){
    const t = db.treatments.find(x => x.id === tid); if (!t) return;
    const f = document.querySelector('#modalBody form'); if (!f) return;
    const q = (f.qtId && this.boId(f.qtId.value)) || this.cua(t); if (!q) return;
    const tam = Object.assign({}, t);
    if (f.tienLab) tam.tienLab = num(f.tienLab.value);
    tam.coAnh = !!f.querySelector('[name="coAnh"]:checked');
    const ty = this.tyLeThu(t);
    (q.buoc || []).forEach(b => {
      const sel = f.querySelector('[name="ng_' + b.b + '"]');
      const st = sel && sel.value ? staffById(sel.value) : null;
      const day = st ? this.tienBuocDay(tam, q, b, st) : null;
      const oTy = document.getElementById('ty_' + b.b);
      const oDay = document.getElementById('day_' + b.b);
      const oThuc = document.getElementById('thuc_' + b.b);
      if (oTy) oTy.textContent = st ? this.moTaBuocCho(b, st) + ' · ' + this.mucCua(st) + '%'
                                    : this.moTaBuoc(b) + ' (10% · 30%)';
      if (oDay) oDay.textContent = day == null ? '—' : money(day);
      if (oThuc) oThuc.textContent = day == null ? '—' : money(day * ty);
    });
    const goc = Math.max(0, (+t.price || 0) - (q.truLab ? (+tam.tienLab || 0) : 0));
    const oGoc = document.getElementById('qtGoc');
    if (oGoc) oGoc.textContent = money(goc);
  },
  ganQT(tid){
    const t = db.treatments.find(x => x.id === tid);
    t.qtId = document.getElementById('qtChon').value;
    save(); App.closeModal(); this.ghi(tid);
  },
  ghiSave(ev, tid){
    ev.preventDefault();
    const f = ev.target, t = db.treatments.find(x => x.id === tid);
    const d = Object.fromEntries(new FormData(f).entries());
    if (d.tienLab != null) t.tienLab = num(d.tienLab);
    t.qtId = d.qtId;
    t.coAnh = !!f.querySelector('[name="coAnh"]:checked');
    const lam = [...f.querySelectorAll('[name="lam"]:checked')].map(x => x.value);
    const thieu = [];
    t.cd = lam.map(b => {
      const s = (f.querySelector(`[name="ng_${b}"]`)||{}).value || '';
      if (!s) thieu.push(b);
      return {b, s, d: (f.querySelector(`[name="ngay_${b}"]`)||{}).value || todayISO()};
    }).filter(x => x.s);
    save(); App.closeModal(); App.render();
    App.toast(thieu.length ? 'Đã lưu — ' + thieu.length + ' công đoạn chưa chọn người làm nên bỏ qua'
                           : 'Đã lưu công đoạn ✓');
  },

  /* ---------- Công đoạn của MỘT nhóm dịch vụ ----------
     Cách phòng khám muốn quản lý: nhóm dịch vụ mang bộ công đoạn, dịch vụ nào nằm
     trong nhóm thì ăn theo bộ đó. Bên trong vẫn là một "kỹ thuật" gắn với nhóm —
     chưa có thì tạo luôn, khỏi bắt người dùng hiểu thêm một khái niệm nữa. */
  choNhom(g){
    let q = this.ds().find(x => (x.nhom || []).includes(g));
    if (!q) {
      q = {id: 'qt' + uid(), ten: g, nhom: [g], dv: [], labGY: [], buoc: [],
           truLab: /sứ|tháo lắp|implant/i.test(g)};
      db.quyTrinh.push(q);
      save();
    }
    return q;
  },
  /* Mở màn công đoạn của một kỹ thuật theo id — dùng cho những kỹ thuật gán theo
     danh mục riêng, không thuộc nhóm nào nên không mở từ bảng Nhóm dịch vụ được. */
  bangKT(qid){
    const q = this.boId(qid); if (!q) { App.toast('Không tìm thấy'); return; }
    const g = (q.nhom || [])[0];
    if (g) { this.bangNhom(g); return; }
    this._veNhom = null;
    App.modal('Công đoạn & hoa hồng — ' + q.ten, `
      <div class="note-block mb">Kỹ thuật này áp theo <b>danh mục riêng</b>, không theo nhóm dịch vụ.
        Áp cho: ${(q.dv || []).length ? (q.dv).map(h).join(' · ') : '<i>chưa gán danh mục nào</i>'}</div>
      ${(q.buoc || []).length ? `<div class="tbl-wrap"><table style="min-width:480px">
        <thead><tr><th>Công đoạn</th><th class="r">Lương 10%</th><th class="r">Lương 30%</th><th></th></tr></thead>
        <tbody>${q.buoc.map((b, i) => `<tr><td>${h(b.t)}</td>
          <td class="r num">${b.tien != null ? money(b.tien) : (b.p10 != null ? b.p10 : (b.p || 0)) + '%'}</td>
          <td class="r num">${b.tien != null ? money(b.tien) : (b.p30 != null ? b.p30 : (b.p || 0)) + '%'}</td>
          <td style="white-space:nowrap">
            <button class="btn small" ${i === 0 ? 'disabled' : ''} onclick="QT.buocDoiCho('${q.id}',${i},-1)">↑</button>
            <button class="btn small" ${i === q.buoc.length - 1 ? 'disabled' : ''} onclick="QT.buocDoiCho('${q.id}',${i},1)">↓</button>
            <button class="btn small" onclick="QT.buocForm('${q.id}','${b.b}')">Sửa</button></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="note-block warn-block">Chưa có công đoạn nào.</div>'}
      <div class="form-actions" style="margin-top:12px;flex-wrap:wrap;gap:6px">
        <button class="btn primary" onclick="QT.buocForm('${q.id}')">${IC.plus} Thêm công đoạn</button>
        <button class="btn" onclick="QT.qtForm('${q.id}')">Sửa danh mục áp dụng</button>
        <span class="spacer"></span>
        <button class="btn" onclick="App.closeModal()">Xong</button></div>`);
  },
  bangNhom(g){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được'); return; }
    const q = this.choNhom(g);
    this._veNhom = g;
    const dv = (db.services || []).filter(x => x.group === g);
    const tong = this.tongPct(q);
    App.modal('Công đoạn & hoa hồng — ' + g, `
      ${q.khongChia ? `<div class="note-block warn-block mb">Nhóm này đang đặt <b>không chia hoa hồng</b>:
        doanh thu tính chung cho cả phòng khám, không cần ghi tên bác sĩ và không ai được phần.
        Bộ công đoạn bên dưới (nếu có) sẽ bị bỏ qua.</div>` : ''}
      ${(() => {
        /* Đếm đúng số dịch vụ THẬT SỰ ăn theo bộ chung — món nào đã có kỹ thuật riêng
           nhận thì không tính vào, không thì câu này nói sai. */
        const soRieng = dv.filter(x => QT.ds().some(k => k.id !== q.id
          && (k.dv || []).some(y => Combo.norm(y) === Combo.norm(x.name)))).length;
        const soChung = dv.length - soRieng;
        return `<div class="note-block mb">${soChung
          ? `<b>${soChung} dịch vụ</b> trong nhóm này ăn theo bộ công đoạn dưới đây${soRieng ? `, ${soRieng} dịch vụ còn lại có mức riêng (xem cuối trang)` : ''}.`
          : `Cả <b>${dv.length} dịch vụ</b> trong nhóm này đều đã có <b>mức riêng</b> (xem cuối trang) — bộ công đoạn dưới đây hiện không áp cho món nào.`}
          Ai làm công đoạn nào thì hưởng phần đó; một ca chia được cho nhiều người.
          ${q.truLab ? 'Nhóm này <b>trừ tiền lab trước rồi mới tính %</b>.' : ''}</div>`;
      })()}
      ${(q.buoc || []).length ? `<div class="tbl-wrap"><table style="min-width:520px">
        <thead><tr><th>Công đoạn</th><th class="r">Tỷ trọng</th><th class="r">Lương 10%</th><th class="r">Lương 30%</th><th></th></tr></thead>
        <tbody>${q.buoc.map((b, i) => `<tr><td>${h(b.t)}</td>
          <td class="r num">${b.tien != null ? '—' : (b.tt != null ? b.tt + '%' : '—')}</td>
          <td class="r num">${b.tien != null ? money(b.tien) : (b.p10 != null ? b.p10 : (b.p || 0)) + '%'}</td>
          <td class="r num">${b.tien != null ? money(b.tien) : (b.p30 != null ? b.p30 : (b.p || 0)) + '%'}</td>
          <td style="white-space:nowrap">
            <button class="btn small" ${i === 0 ? 'disabled' : ''} onclick="QT.buocDoiCho('${q.id}',${i},-1)">↑</button>
            <button class="btn small" ${i === q.buoc.length - 1 ? 'disabled' : ''} onclick="QT.buocDoiCho('${q.id}',${i},1)">↓</button>
            <button class="btn small" onclick="QT.buocForm('${q.id}','${b.b}')">Sửa</button></td></tr>`).join('')}</tbody>
        <tfoot><tr><td><b>Cộng</b></td><td class="r num"><b>${tong}%</b></td><td class="r num">${+(tong*0.1).toFixed(1)}%</td>
          <td class="r num">${+(tong*0.3).toFixed(1)}%</td><td></td></tr></tfoot></table></div>`
        : '<div class="note-block warn-block">Chưa có công đoạn nào — mọi dịch vụ trong nhóm này hiện <b>không chia hoa hồng cho ai</b>.</div>'}
      <div class="form-actions" style="margin-top:12px;flex-wrap:wrap;gap:6px">
        <button class="btn primary" onclick="QT.buocForm('${q.id}')">${IC.plus} Thêm công đoạn</button>
        <button class="btn" onclick="QT.truLabDoi('${q.id}')">${q.truLab ? 'Bỏ trừ tiền lab' : 'Trừ tiền lab trước khi tính %'}</button>
        <button class="btn ${q.khongChia ? 'danger' : ''}" onclick="QT.chiaDoi('${q.id}')">${
          q.khongChia ? 'Cho chia hoa hồng lại' : 'Không chia hoa hồng (tính chung phòng khám)'}</button>
        <span class="spacer"></span>
        <button class="btn" onclick="QT._veNhom=null;Svc.nhomBang()">Xong</button></div>
      ${(() => {
        /* Dịch vụ nào trong nhóm đã bị một kỹ thuật khác "nhận riêng" thì nó KHÔNG ăn
           theo bộ trên — phải nói rõ, không thì nhìn vào tưởng cả nhóm chạy như nhau. */
        const rieng = dv.map(x => ({x, q: QT.ds().find(k => (k.dv || []).some(y => Combo.norm(y) === Combo.norm(x.name)))}))
          .filter(o => o.q && o.q.id !== q.id);
        const chung = dv.filter(x => !rieng.some(o => o.x.id === x.id));
        return `${chung.length ? `<div class="sub-line" style="margin-top:10px">Áp bộ trên cho:
            ${chung.slice(0,10).map(x=>h(x.name)).join(' · ')}${chung.length>10?' … và '+(chung.length-10)+' dịch vụ nữa':''}</div>` : ''}
          ${rieng.length ? `<div class="note-block" style="margin-top:10px">Những dịch vụ sau
            <b>không theo bộ trên</b> mà có mức riêng:<br>
            ${rieng.map(o => `• ${h(o.x.name)} → <b>${h(o.q.ten)}</b>
              <button class="btn small" onclick="QT.bangKT('${o.q.id}')">Xem</button>`).join('<br>')}</div>` : ''}`;
      })()}`);
  },
  /* Đổi thứ tự công đoạn — thứ tự này là thứ tự làm thật ở ghế nên phải sửa được */
  buocDoiCho(qid, i, huong){
    const q = this.boId(qid); if (!q || !q.buoc) return;
    const j = i + huong;
    if (j < 0 || j >= q.buoc.length) return;
    const t = q.buoc[i]; q.buoc[i] = q.buoc[j]; q.buoc[j] = t;
    q._up = Date.now();
    save();
    if (this._veNhom) this.bangNhom(this._veNhom); else this.bang();
  },
  chiaDoi(qid){
    const q = this.boId(qid); if (!q) return;
    q.khongChia = !q.khongChia; q._up = Date.now();
    save();
    App.toast(q.khongChia ? 'Nhóm này không chia hoa hồng nữa — doanh thu tính chung phòng khám'
                          : 'Nhóm này chia hoa hồng theo công đoạn trở lại');
    if (this._veNhom) this.bangNhom(this._veNhom); else this.bang();
  },
  truLabDoi(qid){
    const q = this.boId(qid); if (!q) return;
    q.truLab = !q.truLab; q._up = Date.now();
    save();
    if (this._veNhom) this.bangNhom(this._veNhom); else this.bang();
  },

  /* ---------- Cài đặt quy trình (quản lý) ---------- */
  bang(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được quy trình'); return; }
    const an = this.dsAn();
    App.modal('Quy trình & tỷ lệ hoa hồng theo công đoạn', `
      <div class="note-block mb">Mỗi <b>kỹ thuật</b> (quy trình) gồm nhiều công đoạn. Ai làm công đoạn nào thì
        hưởng phần đó — một ca chia được cho nhiều người. Phục hình thì <b>trừ tiền lab rồi mới tính %</b>.
        Muốn một người có tỷ lệ riêng thì sửa trong <b>hồ sơ nhân viên</b>.</div>
      <div class="note-block mb">Người làm thuộc <b>nhóm lương 10%</b> hay <b>30%</b> thì ăn theo cột tương ứng —
        đặt trong hồ sơ từng nhân viên. Ca có giảm giá hoặc thiếu ảnh trước–sau thì bị hạ,
        theo <button class="link-btn" onclick="QT.quyTacForm()">quy tắc này</button>.</div>
      <div class="form-actions" style="justify-content:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:6px">
        <button class="btn primary" onclick="QT.qtForm()">${IC.plus} Thêm kỹ thuật</button>
        <button class="btn" onclick="QT.napMau()">Nạp lại theo bảng tính lương</button></div>
      ${this.ds().length ? '' : '<div class="note-block warn-block mb">Chưa có kỹ thuật nào. Bấm <b>Thêm kỹ thuật</b> để tạo, không thì không tính được hoa hồng theo công đoạn.</div>'}
      ${this.ds().map(q => `<div class="rx mb"><div class="rx-head">
          <b>${h(q.ten)}</b> <span class="sub-line">${q.truLab?'· trừ tiền lab trước':''}
          ${(q.nhom||[]).length?'· nhóm: '+h(q.nhom.join(', ')):'· chưa gắn nhóm dịch vụ'}${
          (q.dv||[]).length?' · '+q.dv.length+' danh mục riêng':''}</span>
          <span class="spacer"></span><span class="pill ${this.tongPct(q)>100?'danger':'mutedp'}">${this.tongPct(q)}%</span></div>
        <div class="card-b">${(q.buoc||[]).length ? `<div class="tbl-wrap"><table style="min-width:520px">
          <thead><tr><th>Công đoạn</th><th class="r">Tỷ trọng</th><th class="r">Lương 10%</th><th class="r">Lương 30%</th><th></th></tr></thead>
          <tbody>${q.buoc.map(b=>`<tr><td>${h(b.t)}</td>
            <td class="r num">${b.tien!=null?'—':(b.tt!=null?b.tt+'%':'—')}</td>
            <td class="r num">${b.tien!=null?money(b.tien):(b.p10!=null?b.p10:(b.p||0))+'%'}</td>
            <td class="r num">${b.tien!=null?money(b.tien):(b.p30!=null?b.p30:(b.p||0))+'%'}</td>
            <td><button class="btn small" onclick="QT.buocForm('${q.id}','${b.b}')">Sửa</button></td></tr>`).join('')}</tbody></table></div>`
          : '<div class="sub-line">Chưa có công đoạn nào — chưa chia hoa hồng được.</div>'}
          <div class="form-actions" style="justify-content:flex-start;margin-top:8px;flex-wrap:wrap;gap:6px">
            <button class="btn small" onclick="QT.buocForm('${q.id}')">${IC.plus} Thêm công đoạn</button>
            <button class="btn small" onclick="QT.qtForm('${q.id}')">Sửa kỹ thuật</button>
            <button class="btn small danger" onclick="QT.qtDel('${q.id}')">Bỏ kỹ thuật này</button></div>
        </div></div>`).join('')}
      ${an.length ? `<div class="note-block"><b>Kỹ thuật đã bỏ</b> — phần đã đặt vẫn còn, bấm là dùng lại được:<br>
        ${an.map(q => `<span style="display:inline-block;margin:6px 8px 0 0">${h(q.ten)}
          <button class="btn small" onclick="QT.qtDungLai('${q.id}')">Dùng lại</button></span>`).join('')}</div>` : ''}`);
  },
  tongPct(q){ return +(q.buoc||[]).reduce((s,b) => s + (b.tt != null ? +b.tt : (b.p || 0)), 0).toFixed(1); },
  /* Mô tả một công đoạn cho gọn: trả khoán thì ghi tiền, còn lại ghi cả hai nhóm lương */
  moTaBuoc(b){
    if (b.tien != null) return money(b.tien) + '/lần';
    if (b.p10 != null || b.p30 != null) return (b.p10 != null ? b.p10 : 0) + '% · ' + (b.p30 != null ? b.p30 : 0) + '%';
    return (b.p || 0) + '%';
  },
  moTaBuocCho(b, st){
    if (b.tien != null) return money(b.tien) + '/lần';
    const p = this.pctCua(st, b);
    return (p == null ? 0 : p) + '%';
  },
  buocForm(qid, bid){
    const q = this.boId(qid); const b = bid ? this.buocCua(q, bid) : {};
    App.modal((bid?'Sửa':'Thêm') + ' công đoạn — ' + q.ten, `
    <form class="form-grid" onsubmit="QT.buocSave(event,'${qid}','${bid||''}')">
      <div class="f full"><label>Tên công đoạn</label><input name="t" required value="${h(b.t||'')}"></div>
      <div class="f"><label>Tỷ trọng trong cả ca (%)</label>
        <input type="number" name="tt" step="0.5" min="0" max="100" value="${b.tt!=null?b.tt:''}" placeholder="Vd: 30"
               oninput="QT.doiTT(this)"></div>
      <div class="f"><label>Người nhóm lương 10% ăn (%)</label>
        <input type="number" name="p10" step="0.1" min="0" max="100" value="${b.p10!=null?b.p10:(b.p!=null?b.p:'')}"></div>
      <div class="f"><label>Người nhóm lương 30% ăn (%)</label>
        <input type="number" name="p30" step="0.1" min="0" max="100" value="${b.p30!=null?b.p30:(b.p!=null?b.p:'')}"></div>
      <div class="f"><label>Hoặc trả khoán theo lần (₫)</label>${Tien.o('tien', b.tien!=null?b.tien:'')}</div>
      <div class="note-block full">Gõ <b>tỷ trọng</b> thì hai ô dưới tự điền (tỷ trọng × 10% và × 30%) — sửa đè lên được
        nếu bảng của phòng khám ghi khác. Có <b>tiền khoán</b> thì mọi phần trăm bị bỏ qua, dùng cho
        tư vấn implant, làm tẩy trắng, phụ implant.</div>
      <div class="form-actions full">
        ${bid?`<button type="button" class="btn danger" onclick="QT.buocDel('${qid}','${bid}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="QT._veNhom?QT.bangNhom(QT._veNhom):QT.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  /* Gõ tỷ trọng thì điền sẵn hai ô nhóm lương — đỡ phải bấm máy tính */
  doiTT(o){
    const f = o.form, v = parseFloat(o.value);
    if (isNaN(v)) return;
    if (f.p10) f.p10.value = +(v * 0.1).toFixed(2);
    if (f.p30) f.p30.value = +(v * 0.3).toFixed(2);
  },
  buocSave(ev, qid, bid){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const q = this.boId(qid);
    const tien = num(d.tien);
    const so = k => (d[k] === '' || d[k] == null) ? null : num(d[k]);
    const p10 = so('p10'), p30 = so('p30'), tt = so('tt');
    if (!tien && p10 == null && p30 == null) {
      App.toast('Phải nhập phần trăm cho ít nhất một nhóm lương, hoặc tiền khoán'); return;
    }
    const o = {t: (d.t||'').trim()};
    if (tien) o.tien = tien;
    else {
      if (tt != null) o.tt = tt;
      o.p10 = p10 != null ? p10 : 0;
      o.p30 = p30 != null ? p30 : 0;
    }
    let b = bid && this.buocCua(q, bid);
    if (b) { delete b.p; delete b.p10; delete b.p30; delete b.tt; delete b.tien; Object.assign(b, o); }
    else q.buoc.push(Object.assign({b: 'b' + uid()}, o));
    save();
    if (this._veNhom) this.bangNhom(this._veNhom); else this.bang();
    App.toast('Đã lưu công đoạn ✓');
  },

  /* ---------- Quy tắc trừ (Bảng 1 của tài liệu) ---------- */
  quyTacForm(){
    const r = this.quyTac();
    App.modal('Quy tắc hạ hoa hồng', `
    <form class="form-grid" onsubmit="QT.quyTacSave(event)">
      <div class="note-block full">Theo bảng tính lương của phòng khám: ca giảm giá nhiều hoặc thiếu ảnh
        trước–sau thì người làm ăn ít đi. Đây là chính sách của phòng khám nên sửa được.</div>
      <div class="f"><label>Giảm tới mức này thì vẫn ăn đủ (%)</label>
        <input type="number" name="giamNhe" min="0" max="100" value="${r.giamNhe}"></div>
      <div class="f"><label>Giảm quá mức trên thì hạ về nhóm (%)</label>
        <input type="number" name="mucKhiGiam" min="0" max="100" value="${r.mucKhiGiam}"></div>
      <div class="f"><label>Giảm từ mức này trở lên thì không có hoa hồng (%)</label>
        <input type="number" name="giamNang" min="0" max="100" value="${r.giamNang}"></div>
      <div class="f"></div>
      <div class="f"><label>Không có ảnh — nhóm 10% còn (%)</label>
        <input type="number" name="khongAnh10" step="0.5" min="0" max="100" value="${r.khongAnh10}"></div>
      <div class="f"><label>Không có ảnh — nhóm 30% còn (%)</label>
        <input type="number" name="khongAnh30" step="0.5" min="0" max="100" value="${r.khongAnh30}"></div>
      <div class="note-block full">Bảng gốc không nói rõ ca giảm trong khoảng <b>trên 30% tới dưới 50%</b> thì sao,
        nên phần mềm đang xếp chung với nhóm "giảm nhiều" — tức hạ về ${r.mucKhiGiam}%. Muốn khác thì sửa ô trên.</div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="QT._veNhom?QT.bangNhom(QT._veNhom):QT.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  quyTacSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    db.clinic.hhQuyTac = {};
    Object.keys(this.QUY_TAC).forEach(k => { if (d[k] !== '' && d[k] != null) db.clinic.hhQuyTac[k] = num(d[k]); });
    save(); this.bang(); App.toast('Đã lưu quy tắc ✓');
  },

  /* ---------- Nạp lại bảng gốc ----------
     Vòng nạp lúc mở app chỉ thêm kỹ thuật CÒN THIẾU, nên bản cũ đã nằm trong máy sẽ
     không tự đổi theo. Phải có nút bấm tay, và nói rõ cái gì bị ghi đè. */
  napMau(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới nạp được'); return; }
    const co = this.MAU.filter(m => (db.quyTrinh||[]).some(q => q.id === m.id)).length;
    if (!confirm('Nạp lại ' + this.MAU.length + ' kỹ thuật theo BẢNG TÍNH LƯƠNG THEO % của phòng khám?\n\n'
      + co + ' kỹ thuật đang có sẽ bị GHI ĐÈ tên, tỷ trọng và phần trăm hai nhóm lương.\n'
      + 'Kỹ thuật anh tự thêm và tỷ lệ riêng của từng người vẫn giữ nguyên.')) return;
    this.MAU.forEach(m => {
      const i = (db.quyTrinh||[]).findIndex(q => q.id === m.id);
      const moi = JSON.parse(JSON.stringify(m));
      if (i < 0) db.quyTrinh.push(moi);
      else {
        /* giữ lại việc gắn nhóm nếu quản lý đã chỉnh tay khác bản gốc */
        const cu = db.quyTrinh[i];
        if ((cu.nhom||[]).length && JSON.stringify(cu.nhom) !== JSON.stringify(m.nhom)) moi.nhom = cu.nhom;
        delete moi.an;
        db.quyTrinh[i] = moi;
      }
    });
    save(); this.bang(); App.toast('Đã nạp ' + this.MAU.length + ' kỹ thuật ✓');
  },
  buocDel(qid, bid){
    const q = this.boId(qid), b = this.buocCua(q, bid);
    const dung = db.treatments.filter(t => (t.cd||[]).some(x => x.b === bid)).length;
    if (!confirm('Xóa công đoạn "' + b.t + '"?' + (dung ? '\n\n' + dung + ' hạng mục đã ghi công đoạn này, phần hoa hồng đó sẽ không còn được tính.' : ''))) return;
    q.buoc = q.buoc.filter(x => x.b !== bid);
    save();
    if (this._veNhom) this.bangNhom(this._veNhom); else this.bang();
    App.toast('Đã xóa');
  },
  /* Thêm mới hoặc sửa một kỹ thuật. Không truyền qid thì là thêm mới. */
  _dvTam: [],
  /* Danh sách danh mục đang sửa giữ tạm ở đây, chốt xuống q.dv lúc bấm Lưu */
  dvThem(){
    const o = document.querySelector('#cbQTDv .combo-input');
    const ten = ((o || {}).value || '').trim();
    if (!ten) { App.toast('Gõ tên dịch vụ trước đã'); return; }
    if (this._dvTam.some(x => Combo.norm(x) === Combo.norm(ten))) { App.toast('Đã có trong danh sách'); return; }
    this._dvTam.push(ten);
    if (o) o.value = '';
    this.veDv();
  },
  dvBo(i){ this._dvTam.splice(i, 1); this.veDv(); },
  veDv(qid){
    const o = document.getElementById('qtDvList'); if (!o) return;
    o.innerHTML = this._dvTam.length
      ? this._dvTam.map((x, i) => {
          const chu = this.chuCua(x, qid || (this._dvQid || ''));
          return `<span class="pill ${chu ? 'warn' : 'mutedp'}" style="margin:0 6px 6px 0;display:inline-block">
            ${h(x)}${chu ? ' — đang thuộc ' + h(chu.ten) : ''}
            <button type="button" class="link-btn" onclick="QT.dvBo(${i})">✕</button></span>`;
        }).join('')
      : '<span class="sub-line">Chưa gán danh mục nào — kỹ thuật này chỉ áp theo nhóm dịch vụ ở trên.</span>';
  },
  qtForm(qid){
    const q = (qid && this.boId(qid)) || {};
    this._dvTam = (q.dv || []).slice();
    this._dvQid = qid || '';
    setTimeout(() => this.veDv(qid), 0);
    App.modal((qid ? 'Sửa kỹ thuật — ' + q.ten : 'Thêm kỹ thuật'), `
    <form class="form-grid" onsubmit="QT.qtSave(event,'${qid||''}')">
      <div class="f full"><label>Tên kỹ thuật</label>
        <input name="ten" required value="${h(q.ten||'')}" placeholder="Vd: Nhổ răng khôn, Trám răng, Cạo vôi…"></div>
      <div class="f full"><label>Hạng mục thuộc những nhóm này sẽ tự dùng kỹ thuật trên</label>
        <div class="check-list">${NHOM_DV.map(g => {
          const chu = this.ds().find(x => x.id !== qid && (x.nhom||[]).includes(g));
          return `<label><input type="checkbox" name="nhom" value="${h(g)}"${(q.nhom||[]).includes(g)?' checked':''}> ${h(g)}${
            chu ? ` <span class="sub-line">— đang thuộc ${h(chu.ten)}</span>` : ''}</label>`;
        }).join('')}</div>
        <div class="combo-hint">Một nhóm chỉ thuộc được một kỹ thuật. Tick vào nhóm đang thuộc kỹ thuật khác
          thì nhóm đó được chuyển hẳn sang đây.</div></div>
      <div class="f full"><label>Danh mục riêng thuộc kỹ thuật này</label>
        ${Combo.html('cbQTDv', '', '', Svc.goiY(1), 'Gõ tên dịch vụ rồi bấm Thêm…', null, '')}
        <div class="form-actions" style="justify-content:flex-start;margin-top:6px">
          <button type="button" class="btn small" onclick="QT.dvThem()">${IC.plus} Thêm danh mục</button></div>
        <div id="qtDvList" style="margin-top:8px"></div>
        <div class="combo-hint">Dùng khi một dịch vụ <b>không ăn theo nhóm của nó</b> — ví dụ
          "Nhổ răng khôn mọc lệch" nằm trong nhóm Nhổ răng nhưng phải tính theo kỹ thuật Tiểu phẫu.
          Danh mục gán ở đây <b>được ưu tiên hơn</b> cách gán theo nhóm.</div></div>
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="truLab"${q.truLab?' checked':''}> Trừ tiền lab trước khi tính %</label></div>
        <div class="combo-hint">Bật cho phục hình sứ, tháo lắp — những món phải trả tiền cho labo.</div></div>
      ${qid ? '' : '<div class="note-block full">Tạo xong thì nhớ <b>thêm công đoạn</b> cho nó, chưa có công đoạn thì chưa chia hoa hồng được.</div>'}
      <div class="form-actions full">
        ${qid ? `<button type="button" class="btn danger" onclick="QT.qtDel('${qid}')">Bỏ kỹ thuật này</button><span class="spacer"></span>` : ''}
        <button type="button" class="btn" onclick="QT._veNhom?QT.bangNhom(QT._veNhom):QT.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  qtSave(ev, qid){
    ev.preventDefault();
    const f = ev.target, d = Object.fromEntries(new FormData(f).entries());
    const ten = (d.ten || '').trim();
    if (!ten) { App.toast('Phải đặt tên kỹ thuật'); return; }
    const nhom = [...f.querySelectorAll('[name="nhom"]:checked')].map(x => x.value);
    const truLab = !!f.querySelector('[name="truLab"]:checked');
    const dv = (this._dvTam || []).slice();
    let q = qid && this.boId(qid);
    if (q) Object.assign(q, {ten, nhom, truLab, dv});
    else { q = {id: 'qt' + uid(), ten, nhom, truLab, dv, labGY: [], buoc: []}; db.quyTrinh.push(q); }
    /* Một danh mục chỉ thuộc một kỹ thuật, cùng lý do với nhóm dịch vụ */
    let goDV = 0;
    this.ds().forEach(x => {
      if (x.id === q.id) return;
      const truoc = (x.dv || []).length;
      x.dv = (x.dv || []).filter(y => !dv.some(z => Combo.norm(z) === Combo.norm(y)));
      goDV += truoc - x.dv.length;
    });
    /* cua() lấy kỹ thuật ĐẦU TIÊN khớp nhóm, nên để hai kỹ thuật cùng ôm một nhóm là
       hoa hồng chạy theo cái nào xếp trước — khó lần ra. Gỡ nhóm khỏi những cái kia. */
    let go = 0;
    this.ds().forEach(x => {
      if (x.id === q.id) return;
      const truoc = (x.nhom || []).length;
      x.nhom = (x.nhom || []).filter(g => !nhom.includes(g));
      go += truoc - x.nhom.length;
    });
    save(); this.bang();
    App.toast((qid ? 'Đã lưu kỹ thuật ✓' : 'Đã thêm kỹ thuật ✓')
      + (go ? ' — chuyển ' + go + ' nhóm' : '') + (goDV ? ' — chuyển ' + goDV + ' danh mục' : ''));
  },
  qtDel(qid){
    const q = this.boId(qid); if (!q) return;
    const ma = new Set((q.buoc || []).map(b => b.b));
    const dung = db.treatments.filter(t => (t.cd || []).some(x => ma.has(x.b))).length;
    if (!confirm('Bỏ kỹ thuật "' + q.ten + '"?'
      + (dung ? '\n\n' + dung + ' hạng mục đã ghi công đoạn của kỹ thuật này. Bỏ đi thì phần hoa hồng đó KHÔNG còn được tính nữa, kể cả những tháng đã qua.' : '')
      + '\n\nPhần đã đặt vẫn được giữ lại — bấm "Dùng lại" là khôi phục.')) return;
    q.an = 1;
    save(); this.bang(); App.toast('Đã bỏ "' + q.ten + '"');
  },
  qtDungLai(qid){
    const q = this.boId(qid); if (!q) return;
    delete q.an;
    save(); this.bang(); App.toast('Đã dùng lại "' + q.ten + '" ✓');
  },

  /* ---------- Bảng hoa hồng theo công đoạn ---------- */
  bangThang(month){
    const ds = this.congThang(month);
    if (!ds.length) return '<div class="sub-line">Chưa ghi công đoạn nào trong tháng này. Vào tab Điều trị, bấm một hạng mục rồi chọn <b>Công đoạn</b>.</div>';
    return `<div class="tbl-wrap"><table style="min-width:720px">
      <thead><tr><th>Ngày</th><th>Người làm</th><th>Khách · hạng mục</th><th>Công đoạn</th><th class="r">Tỷ lệ</th><th class="r">Khách đã trả</th><th class="r">Tiền công</th></tr></thead>
      <tbody>${ds.map(x => {
        const st = staffById(x.staffId), c = custById(x.t.customerId);
        const p = this.pctCua(st, x.buoc);
        return `<tr><td class="num">${fmtD(x.date)}</td>
          <td><b>${h(st?st.name:'?')}</b></td>
          <td>${h(c?c.name:'?')}<br><span class="sub-line">${h(x.t.name)}${x.t.tooth?' — R'+h(x.t.tooth):''}</span></td>
          <td>${h(x.buoc.t)}<br><span class="sub-line">${h(x.q.ten)}</span></td>
          <td class="r num">${x.buoc.tien!=null?'theo lần':p+'%'}
            ${(() => { const ld = this.lyDoTru(x.t, st); return ld ? `<br><span class="sub-line">${h(ld)}</span>` : ''; })()}</td>
          <td class="r num">${Math.round(this.tyLeThu(x.t)*100)}%</td>
          <td class="r num" style="font-weight:600">${money(x.tien)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  },
};

/* ================= Đặt hẹn online =================
   Khách tự đặt hẹn qua một trang riêng, không cần đăng nhập. Trang đó chỉ hỏi máy chủ
   "ngày này giờ nào đã kín" (không lấy tên ai), rồi chỉ cho chọn khung giờ còn trống
   trong giờ làm việc. Đặt xong rơi vào danh sách chờ, lễ tân duyệt thì mới thành lịch
   hẹn chính thức. */
const DatHen = {
  BUOC: 30,                       /* mỗi khung 30 phút */
  key: 'nkhb_dathen_da_xem',

  /* ---------- Khung giờ ---------- */
  /* Các mốc giờ trong ca làm việc, bỏ giờ nghỉ trưa */
  khungGio(){
    const ca = Att.ca(todayISO()), ra = [];
    ca.forEach(c => { for (let t = c.s; t + this.BUOC <= c.e; t += this.BUOC) ra.push(t); });
    return ra;
  },
  /* Khung nào đã kín: đủ số ghế thì thôi, chưa đủ thì vẫn nhận thêm */
  ban(ngay, lich){
    const dem = {};
    (lich || []).forEach(a => {
      const b = hm2m(a.gio || a.time); if (b == null) return;
      const dur = +(a.dur || 30);
      for (let t = b; t < b + dur; t += this.BUOC) dem[t] = (dem[t] || 0) + 1;
    });
    return dem;
  },
  soGhe(){ return (typeof CHAIRS !== 'undefined' ? CHAIRS.length : 2); },

  /* Khung còn nhận được khách, kèm số chỗ còn lại */
  slotTrong(ngay, lich, batDauTu){
    const dem = this.ban(ngay, lich), ghe = this.soGhe();
    const homNay = ngay === todayISO();
    const bayGio = hm2m(nowHM());
    return this.khungGio().map(t => ({
      t, hm: m2hm(t),
      con: Math.max(0, ghe - (dem[t] || 0)),
      quaGio: homNay && t <= bayGio + (batDauTu || 0),
    }));
  },

  /* ---------- Trang đặt hẹn của khách (#book) ---------- */
  trangKhach(){
    const ngay = App.state.bkNgay || todayISO();
    const st = App.state.bkStatus || {};
    const cl = db.clinic || {};
    return `<div style="max-width:520px;margin:0 auto">
      <div class="page-head"><h1>Đặt lịch hẹn</h1>
        <div class="sub"><b>${h(cl.name || '')}</b>${cl.addr ? '<br>' + h(cl.addr) : ''}
          ${cl.phone ? '<br>Điện thoại: <b>' + h(cl.phone) + '</b>' + (cl.phone2 ? ' — ' + h(cl.phone2) : '') : ''}</div></div>
      ${st.xong ? `<div class="card"><div class="card-b" style="text-align:center">
          <div style="font-size:40px;line-height:1">✓</div>
          <h2 style="margin:8px 0">Đã gửi yêu cầu đặt hẹn</h2>
          <p>Hẹn <b>${h(st.gio)}</b> ngày <b>${fmtD(st.ngay)}</b> cho <b>${h(st.ten)}</b>.</p>
          <p class="sub-line">Phòng khám sẽ gọi lại xác nhận. Nếu cần đổi, gọi <b>${h(cl.phone || 'phòng khám')}</b>${cl.phone2?' hoặc <b>'+h(cl.phone2)+'</b>':''}.</p>
          <div class="form-actions" style="justify-content:center;margin-top:12px">
            <button class="btn" onclick="App.state.bkStatus={};App.render()">Đặt thêm lịch khác</button></div>
        </div></div>`
      : `<form class="card" onsubmit="DatHen.gui(event)"><div class="card-b">
        <div class="form-grid">
          <div class="f full"><label>Họ và tên</label><input name="ten" required placeholder="Nguyễn Văn A"></div>
          <div class="f"><label>Số điện thoại</label><input name="sdt" required inputmode="tel" placeholder="09xx xxx xxx"></div>
          <div class="f"><label>Ngày hẹn</label><input type="date" name="ngay" required value="${h(ngay)}"
            min="${todayISO()}" max="${isoAdd(todayISO(), 60)}" onchange="DatHen.doiNgay(this.value)"></div>
          <div class="f full"><label>Dịch vụ muốn làm</label>
            <select name="dichvu">
              <option value="">— chưa rõ, nhờ bác sĩ tư vấn —</option>
              ${[...new Set((db.services||[]).map(s => s.group))].map(g => `<option>${h(g)}</option>`).join('')}
            </select></div>
          <div class="f full"><label>Chọn giờ còn trống</label>
            <div id="bkSlot">${this.slotHTML(ngay)}</div>
            <input type="hidden" name="gio" id="bkGio" value="">
          </div>
          <div class="f full"><label>Ghi chú (không bắt buộc)</label>
            <input name="ghichu" placeholder="Vd: đau răng hàm dưới bên phải"></div>
        </div>
        <div class="note-block" style="margin-top:10px">Giờ làm việc hôm nay: <b>${h(Att.moTaCa(todayISO()))}</b>.
          Đây mới là <b>yêu cầu đặt hẹn</b> — phòng khám sẽ gọi lại xác nhận.
          ${cl.phone?`<br>Cần gấp xin gọi thẳng <b>${h(cl.phone)}</b>${cl.phone2?' hoặc <b>'+h(cl.phone2)+'</b>':''}.`:''}</div>
        <div class="form-actions" style="margin-top:12px">
          <button class="btn primary" style="width:100%;justify-content:center;padding:13px">Gửi yêu cầu đặt hẹn</button></div>
      </div></form>`}
    </div>`;
  },
  slotHTML(ngay){
    const lich = (db.appointments || []).filter(a => a.date === ngay && a.status !== 'Hủy')
      .concat((db.datlich || []).filter(x => x.ngay === ngay && x.trangThai !== 'Từ chối'));
    const ds = this.slotTrong(ngay, lich, 30);
    if (!ds.length) return '<div class="sub-line">Chưa đặt giờ làm việc cho phòng khám.</div>';
    const con = ds.filter(s => s.con > 0 && !s.quaGio);
    if (!con.length) return '<div class="note-block">Ngày này đã kín lịch. Xin chọn ngày khác.</div>';
    return `<div class="slot-ds">${ds.map(s => {
      const duoc = s.con > 0 && !s.quaGio;
      return `<button type="button" class="slot ${duoc ? '' : 'het'}" ${duoc ? '' : 'disabled'}
        onclick="DatHen.chonGio('${s.hm}',this)" title="${s.quaGio ? 'Đã qua giờ' : s.con ? 'Còn ' + s.con + ' chỗ' : 'Đã kín'}">
        ${s.hm}</button>`;
    }).join('')}</div>`;
  },
  doiNgay(v){
    App.state.bkNgay = v;
    const o = document.getElementById('bkSlot');
    if (o) o.innerHTML = this.slotHTML(v);
    const g = document.getElementById('bkGio'); if (g) g.value = '';
  },
  chonGio(hm, nut){
    document.querySelectorAll('#bkSlot .slot').forEach(x => x.classList.remove('chon'));
    nut.classList.add('chon');
    document.getElementById('bkGio').value = hm;
  },
  async gui(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!d.gio) { App.toast('Hãy chọn một khung giờ còn trống'); return; }
    const sdt = (d.sdt || '').replace(/\D/g, '');
    if (sdt.length < 9) { App.toast('Số điện thoại chưa đúng'); return; }
    /* Kiểm lại lần cuối phòng khi có người khác vừa đặt trùng giờ */
    await this.taiLich(d.ngay);
    const lich = (db.appointments || []).filter(a => a.date === d.ngay && a.status !== 'Hủy')
      .concat((db.datlich || []).filter(x => x.ngay === d.ngay && x.trangThai !== 'Từ chối'));
    const s = this.slotTrong(d.ngay, lich, 30).find(x => x.hm === d.gio);
    if (!s || !s.con || s.quaGio) {
      App.toast('Vừa có người đặt mất khung giờ này, xin chọn giờ khác');
      this.doiNgay(d.ngay); return;
    }
    App.toast('Đang gửi…');
    const o = {ten: (d.ten||'').trim(), sdt: (d.sdt||'').trim(), ngay: d.ngay, gio: d.gio,
               dichvu: d.dichvu || '', ghichu: (d.ghichu||'').trim()};
    try {
      await Cloud.req('/rest/v1/datlich', {method:'POST',
        headers:{Authorization:'Bearer ' + Cloud.cfg.key, Prefer:'return=minimal'}, body:[o]});
      App.state.bkStatus = {xong:1, ten:o.ten, ngay:o.ngay, gio:o.gio};
      App.render();
    } catch(e){
      App.toast('Chưa gửi được: ' + e.message + ' — xin gọi thẳng phòng khám');
    }
  },
  /* Lấy các giờ đã kín trong ngày (chỉ giờ, không có tên ai) */
  async taiLich(ngay){
    if (!Cloud.configured()) return;
    try {
      const r = await Cloud.req('/rest/v1/rpc/gio_ban', {method:'POST',
        headers:{Authorization:'Bearer ' + Cloud.cfg.key}, body:{ngay}});
      db.appointments = (r || []).map((x,i) => ({id:'busy'+i, date:ngay, time:x.gio, dur:x.dur||30, status:'Đã xác nhận'}));
      db.datlich = [];
    } catch(e){ /* không lấy được thì cứ để khách chọn, lễ tân duyệt sau */ }
  },

  /* ---------- Phía phòng khám: duyệt yêu cầu ---------- */
  /* SQL đặt mặc định là 'Cho xac nhan' (không dấu, cho chắc khi chạy trên máy chủ),
     còn phần mềm ghi lại bằng chữ có dấu. Nên phải so sánh kiểu bỏ dấu, không thì
     yêu cầu mới gửi lên sẽ không được coi là đang chờ và mất luôn nút duyệt. */
  trangThai(x){
    const t = Combo.norm((x && (x.trangthai || x.trangThai)) || '');
    if (t.includes('da xac nhan')) return 'Đã xác nhận';
    if (t.includes('tu choi'))     return 'Từ chối';
    return 'Chờ xác nhận';
  },
  /* Đếm số yêu cầu đang chờ để hiện lên nút, chỉ vẽ lại khi con số đổi */
  _cho: null, _ds: null, _dangDem: false,
  async capNhatDem(){
    if (this._dangDem || !Cloud.configured() || !Cloud.loggedIn()) return;
    this._dangDem = true;
    try {
      const ds = await this.tai();
      const cho = ds.filter(x => this.trangThai(x) === 'Chờ xác nhận');
      const doi = cho.length !== this._cho || JSON.stringify(cho.map(x=>x.id)) !== JSON.stringify((this._ds||[]).map(x=>x.id));
      this._cho = cho.length; this._ds = cho;
      if (doi) App.render();
    } catch(e){} finally { this._dangDem = false; }
  },

  /* Bảng yêu cầu đang chờ, vẽ thẳng trên màn hình Lịch hẹn cho dễ thấy mà duyệt */
  bangChoHTML(){
    if (!Cloud.configured() || !Cloud.loggedIn()) return '';
    const ds = this._ds || [];
    if (!ds.length) return '';
    const rows = ds.map(x => {
      const sdt = (x.sdt||'').replace(/\D/g,'');
      const cu = db.customers.find(y => sdt && (y.phone||'').replace(/\D/g,'') === sdt);
      const dung = Cal.trungGio({date:x.ngay, time:x.gio, dur:30});
      return `<tr>
        <td class="num"><b>${h(x.gio)}</b><br><span class="sub-line">${fmtD(x.ngay)}</span></td>
        <td><b>${h(x.ten)}</b><br><span class="sub-line num">${h(x.sdt)}</span>
          ${cu?`<br><span class="pill ok">khách cũ · ${h(cu.code||'')}</span>`:'<span class="pill info">khách mới</span>'}</td>
        <td>${h(x.dichvu || 'chưa rõ, nhờ tư vấn')}${x.ghichu?`<br><span class="sub-line">${h(x.ghichu)}</span>`:''}</td>
        <td>${dung.length?`<span class="pill warn">Giờ này đã có ${dung.length} hẹn</span>`:'<span class="pill ok">Giờ còn trống</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn small primary" onclick="DatHen.duyet('${x.id}')">Nhận lịch</button>
          <button class="btn small danger" onclick="DatHen.tuChoi('${x.id}')">Từ chối</button></td></tr>`;
    }).join('');
    return `<div class="card mb" style="border-color:var(--warn)">
      <div class="card-h"><h2>Khách đặt hẹn online — ${ds.length} yêu cầu đang chờ</h2>
        <span class="hint">nhận là vào thẳng lịch hẹn</span><span class="spacer"></span>
        <button class="btn small" onclick="DatHen.moDanhSach()">Xem tất cả</button></div>
      <div class="tbl-wrap"><table style="min-width:680px">
        <thead><tr><th>Giờ hẹn</th><th>Khách</th><th>Dịch vụ · ghi chú</th><th>Kiểm tra</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  },

  async tai(){
    if (!Cloud.configured() || !Cloud.loggedIn()) return [];
    try { return await Cloud.auth('/rest/v1/datlich?select=*&order=created_at.desc') || []; }
    catch(e){ return []; }
  },
  async moDanhSach(){
    App.modal('Yêu cầu đặt hẹn online', '<div class="sub-line">Đang tải…</div>');
    const ds = await this.tai();
    const cho = ds.filter(x => this.trangThai(x) === 'Chờ xác nhận');
    this._cho = cho.length;
    const rows = ds.map(x => {
      const tt = this.trangThai(x);
      const k = tt === 'Đã xác nhận' ? 'ok' : tt === 'Từ chối' ? 'danger' : 'warn';
      return `<tr><td class="num">${fmtD(x.ngay)}<br><b>${h(x.gio)}</b></td>
        <td><b>${h(x.ten)}</b><br><span class="sub-line num">${h(x.sdt)}</span></td>
        <td>${h(x.dichvu || '—')}<br><span class="sub-line">${h(x.ghichu || '')}</span></td>
        <td><span class="pill ${k}">${h(tt)}</span></td>
        <td style="white-space:nowrap">${tt === 'Chờ xác nhận'
          ? `<button class="btn small primary" onclick="DatHen.duyet('${x.id}')">Nhận lịch</button>
             <button class="btn small danger" onclick="DatHen.tuChoi('${x.id}')">Từ chối</button>` : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="sub-line">Chưa có yêu cầu nào.</td></tr>';
    App.modal('Yêu cầu đặt hẹn online', `
      <div class="note-block mb">${cho.length ? '<b>' + cho.length + ' yêu cầu</b> đang chờ xác nhận.' : 'Không có yêu cầu nào đang chờ.'}
        Bấm <b>Nhận lịch</b> để đưa vào lịch hẹn chính thức — nếu khách chưa có hồ sơ thì phần mềm tạo hồ sơ mới.</div>
      <div class="tbl-wrap"><table style="min-width:600px">
        <thead><tr><th>Ngày · giờ</th><th>Khách</th><th>Dịch vụ · ghi chú</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="form-actions" style="margin-top:10px">
        <button class="btn" onclick="DatHen.moLienKet()">Lấy liên kết & mã QR cho khách</button></div>`);
  },
  async duyet(id){
    const ds = await this.tai();
    const x = ds.find(y => String(y.id) === String(id)); if (!x) return;
    const sdt = (x.sdt || '').replace(/\D/g, '');
    let c = db.customers.find(y => (y.phone || '').replace(/\D/g, '') === sdt && sdt);
    if (!c) {
      c = {id: uid(), code: Cust.tienTo() + '-' + (db.seq.cust++), name: (x.ten || '').toUpperCase().trim(),
           phone: x.sdt, createdAt: todayISO(), teeth: {}, record: {dienBien: []}, source: 'Đặt hẹn online'};
      db.customers.unshift(c);
    }
    db.appointments.push({id: uid(), customerId: c.id, date: x.ngay, time: x.gio, dur: 30,
      service: x.dichvu || 'Khám và tư vấn', chair: CHAIRS[0], doctorId: '',
      status: 'Đã xác nhận', note: x.ghichu || '', tuOnline: true});
    save();
    try { await Cloud.auth('/rest/v1/datlich?id=eq.' + encodeURIComponent(id),
      {method:'PATCH', headers:{Prefer:'return=minimal'}, body:{trangthai:'Đã xác nhận'}}); } catch(e){}
    this._ds = (this._ds||[]).filter(y => String(y.id) !== String(id));
    this._cho = this._ds.length;
    App.closeModal(); App.render();
    App.toast('Đã nhận lịch cho ' + c.name + ' ✓');
  },
  async tuChoi(id){
    if (!confirm('Từ chối yêu cầu này? Nhớ gọi báo khách.')) return;
    try { await Cloud.auth('/rest/v1/datlich?id=eq.' + encodeURIComponent(id),
      {method:'PATCH', headers:{Prefer:'return=minimal'}, body:{trangthai:'Từ chối'}}); } catch(e){}
    this._ds = (this._ds||[]).filter(y => String(y.id) !== String(id));
    this._cho = this._ds.length;
    App.closeModal(); App.render(); App.toast('Đã từ chối');
  },
  lienKet(){ return location.origin + location.pathname + '#book'; },
  SQL: `-- Bang nhan yeu cau dat hen tu khach. Khach CHI duoc them, khong doc duoc gi.
create table if not exists datlich (
  id uuid primary key default gen_random_uuid(),
  ten text not null, sdt text not null,
  ngay date not null, gio text not null,
  dichvu text, ghichu text,
  trangthai text default 'Cho xac nhan',
  created_at timestamptz default now());

alter table datlich enable row level security;
drop policy if exists p_datlich_them on datlich;
drop policy if exists p_datlich_ql   on datlich;
-- khach vang lai: chi INSERT
create policy p_datlich_them on datlich for insert to anon with check (true);
-- nhan vien da dang nhap: toan quyen
create policy p_datlich_ql on datlich for all to authenticated using (true) with check (true);

-- Ham tra ve CAC GIO DA KIN trong mot ngay. Chi tra gio va thoi luong,
-- KHONG tra ten hay so dien thoai cua benh nhan nao.
create or replace function gio_ban(ngay date)
returns table(gio text, dur int)
language sql security definer set search_path = public as $$
  select data->>'time', coalesce(nullif(data->>'dur','')::int, 30)
  from records
  where tbl = 'appointments' and not deleted
    and data->>'date' = ngay::text
    and coalesce(data->>'status','') <> 'Huy'
  union all
  select gio, 30 from datlich
  where ngay = gio_ban.ngay and trangthai <> 'Tu choi'
$$;
revoke all on function gio_ban(date) from public;
grant execute on function gio_ban(date) to anon, authenticated;`,

  moSQL(){
    App.modal('SQL cho trang đặt hẹn online', `
      <div class="note-block mb">Chạy một lần trong Supabase → <b>SQL Editor</b> → dán vào → <b>Run</b>.
        Sau đó trang đặt hẹn mới nhận được yêu cầu của khách.</div>
      <div class="note-block mb">Khách <b>chỉ gửi được yêu cầu</b>, không đọc được bất kỳ dữ liệu nào.
        Hàm tra giờ trống chỉ trả về <b>giờ và thời lượng</b> — không có tên hay số điện thoại của ai.</div>
      <textarea readonly rows="16" style="font:12px/1.5 ui-monospace,Consolas,monospace" onclick="this.select()">${h(this.SQL)}</textarea>
      <div class="form-actions" style="margin-top:10px">
        <button class="btn" onclick="navigator.clipboard.writeText(DatHen.SQL).then(()=>App.toast('Đã chép SQL ✓'))">Chép SQL</button>
        <span class="spacer"></span><button class="btn" onclick="DatHen.moLienKet()">Quay lại</button></div>`);
  },

  moLienKet(){
    const u = this.lienKet();
    App.modal('Liên kết đặt hẹn cho khách', `
      <div class="note-block mb">Gửi liên kết này cho khách (Zalo, Facebook, website), hoặc in mã QR dán ở quầy.
        Khách <b>không cần đăng nhập</b>, chỉ thấy khung giờ còn trống, không thấy thông tin bệnh nhân nào.</div>
      <div class="f full"><label>Liên kết</label><input value="${h(u)}" readonly onclick="this.select()"></div>
      <div style="text-align:center;margin:14px 0">
        <div style="display:inline-block;padding:10px;background:#fff;border-radius:12px;border:1px solid var(--line)">${QR.svg(u, 220)}</div></div>
      <div class="form-actions"><button class="btn" onclick="navigator.clipboard.writeText('${h(u)}').then(()=>App.toast('Đã chép liên kết ✓'))">Chép liên kết</button>
        ${Perm.only('caidat', `<button class="btn" onclick="DatHen.moSQL()">SQL cài đặt (chạy một lần)</button>`)}
        <span class="spacer"></span><button class="btn" onclick="App.closeModal()">Đóng</button></div>`);
  },
};

/* ---------- Nhân sự ---------- */
const HR = {
  tab(t){ App.state.hrTab = t; App.render(); },
  commissionOf(st, month){
    const recs = db.receipts.filter(r => monthOf(r.date) === month);
    /* Hoa hồng theo công đoạn: ai làm bước nào hưởng bước đó, cộng thẳng vào lương */
    const cd = QT.hoaHong(st.id, month);
    if (!st.model || st.model.type === 'congDoan') return cd;
    if (st.model.type === 'svcGroup') {
      return cd + recs.filter(r=>r.doctorId===st.id).reduce((s,r)=> s + r.amount * ((st.model.rates[r.group] ?? st.model.def) / 100), 0);
    }
    if (st.model.type === 'perCase') return cd + recs.reduce((s,r)=>s+r.amount,0) * st.model.rate / 100;
    if (st.model.type === 'referral') {
      const newIds = db.customers.filter(c=>monthOf(c.createdAt)===month).map(c=>c.id);
      return cd + recs.filter(r=>newIds.includes(r.customerId)).reduce((s,r)=>s+r.amount,0) * st.model.rate / 100;
    }
    return cd;
  },
  revenueOf(st, month){ return db.receipts.filter(r => monthOf(r.date)===month && r.doctorId===st.id).reduce((s,r)=>s+r.amount,0); },
  bonusOf(stId, month){ return db.bonuses.filter(b=>b.staffId===stId && monthOf(b.date)===month && b.amount>0).reduce((s,b)=>s+b.amount,0); },
  penaltyOf(stId, month){ return -db.bonuses.filter(b=>b.staffId===stId && monthOf(b.date)===month && b.amount<0).reduce((s,b)=>s+b.amount,0); },
  /* ---------- Kéo thả đổi thứ tự nhân viên trong bảng lương ----------
     Điện thoại không dùng được kéo thả của trình duyệt nên có thêm hai nút mũi tên. */
  _keo: null,
  keoBatDau(ev){
    const tr = ev.target.closest('tr');
    this._keo = tr.dataset.id;
    tr.classList.add('dang-keo');
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', this._keo); } catch(e){}
  },
  keoQua(ev){
    if (!this._keo) return;
    ev.preventDefault();
    const tr = ev.target.closest('tr');
    if (!tr || tr.dataset.id === this._keo) return;
    document.querySelectorAll('#bangLuong tr').forEach(x => x.classList.remove('tha-tren','tha-duoi'));
    const r = tr.getBoundingClientRect();
    tr.classList.add(ev.clientY < r.top + r.height / 2 ? 'tha-tren' : 'tha-duoi');
  },
  keoTha(ev){
    ev.preventDefault();
    const tr = ev.target.closest('tr');
    if (!tr || !this._keo || tr.dataset.id === this._keo) return;
    const r = tr.getBoundingClientRect();
    this.chuyen(this._keo, tr.dataset.id, ev.clientY < r.top + r.height / 2);
  },
  keoXong(){
    this._keo = null;
    document.querySelectorAll('#bangLuong tr').forEach(x => x.classList.remove('dang-keo','tha-tren','tha-duoi'));
  },
  /* Rút người ra rồi chèn lại trước/sau người kia, xong đánh số lại từ đầu */
  chuyen(id, moc, truoc){
    const i = db.staff.findIndex(x => x.id === id);
    if (i < 0) return;
    const [st] = db.staff.splice(i, 1);
    let j = db.staff.findIndex(x => x.id === moc);
    if (j < 0) j = db.staff.length; else if (!truoc) j++;
    db.staff.splice(j, 0, st);
    this.danhSoLai();
  },
  doiCho(id, huong){
    const i = db.staff.findIndex(x => x.id === id), j = i + huong;
    if (i < 0 || j < 0 || j >= db.staff.length) return;
    const t = db.staff[i]; db.staff[i] = db.staff[j]; db.staff[j] = t;
    this.danhSoLai();
  },
  danhSoLai(){
    const now = Date.now();
    db.staff.forEach((x, k) => { if (x.thuTu !== k) { x.thuTu = k; x._up = now; } });
    save(); App.render();
  },

  /* Danh sách nhân viên để sửa tên, chức danh, quyền — mở được từ cả hai mục Nhân sự */
  dsNhanVien(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được hồ sơ nhân viên'); return; }
    const rows = db.staff.map(s => `<tr>
      <td><b>${h(s.name)}</b><br><span class="sub-line">${h(s.email||'chưa gắn email')}</span></td>
      <td>${h(s.role||'—')}<br><span class="sub-line">quyền: ${h((ROLES[Perm.roleOf(s)]||{}).label||'—')}</span></td>
      <td>${s.active===false?'<span class="pill danger">Đã nghỉ</span>':'<span class="pill ok">Đang làm</span>'}</td>
      <td><button class="btn small" onclick="HR.staffForm('${s.id}','ds')">Sửa</button></td></tr>`).join('')
      || '<tr><td colspan="4" class="sub-line">Chưa có nhân viên nào.</td></tr>';
    App.modal('Danh sách nhân viên', `
      <div class="form-actions" style="justify-content:flex-start;margin-bottom:10px">
        <button class="btn primary" onclick="HR.staffForm('','ds')">${IC.plus} Thêm nhân viên</button></div>
      <div class="tbl-wrap"><table style="min-width:520px">
        <thead><tr><th>Họ tên · email</th><th>Chức danh · quyền</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="note-block" style="margin-top:12px">Sửa tên ở đây thì <b>mọi hồ sơ cũ cũng hiện tên mới</b> —
        phần mềm lưu theo mã nhân viên, không lưu tên rời rạc.</div>`);
  },

  /* Nhớ mình được mở ra từ bảng nào, để lưu xong còn biết đường quay lại.
     'ds' = Danh sách nhân viên · 'tk' = Tài khoản truy cập · bỏ trống = mở thẳng
     từ màn Nhân sự, đóng khung là thấy lại bảng lương nên không cần quay đâu cả. */
  _ve: null,
  quayVe(){
    const v = this._ve; this._ve = null;
    if (v === 'ds') { this.dsNhanVien(); return true; }
    if (v === 'tk') { Att.accountsPanel(); return true; }
    return false;
  },
  /* Nút Hủy cũng về bảng cũ chứ không đóng sạch */
  huyStaff(){ if (!HR.quayVe()) App.closeModal(); },
  staffForm(id, ve){
    this._ve = ve || null;
    const st = id ? staffById(id) : {role:'Bác sĩ điều trị', base:0, kpiTarget:0, model:{type:'svcGroup', rates:{}, def:10}};
    App.modal(id ? 'Sửa nhân viên' : 'Thêm nhân viên', `
    <form class="form-grid" onsubmit="HR.staffSave(event,'${id||''}')">
      <div class="f full"><label>Họ và tên</label><input name="name" required value="${h(st.name||'')}"></div>
      <div class="f"><label>Chức danh</label><input name="role" value="${h(st.role||'')}" list="roleList">
        <datalist id="roleList">${['Bác sĩ điều trị','Phụ tá','Lễ tân','Quản lý','Kế toán'].map(r=>`<option value="${r}">`).join('')}</datalist></div>
      <div class="f"><label>Email đăng nhập</label><input name="email" type="email" value="${h(st.email||'')}" placeholder="bsduc@hoangbach.vn"></div>
      <div class="f"><label>Quyền truy cập</label><select name="perm">
        ${Object.entries(ROLES).map(([k,v])=>`<option value="${k}"${(st.perm||guessRole(st.role))===k?' selected':''}>${v.label}</option>`).join('')}
      </select></div>
      <div class="f"><label>Trạng thái</label><select name="active">
        <option value="1"${st.active!==false?' selected':''}>Đang làm việc</option>
        <option value="0"${st.active===false?' selected':''}>Đã nghỉ — khóa truy cập</option>
      </select></div>
      <div class="f"><label>Lương cứng (₫)</label>${Tien.o('base', st.base||0)}</div>
      <div class="f"><label>Chỉ tiêu KPI doanh thu (₫)</label>${Tien.o('kpiTarget', st.kpiTarget||0)}</div>
      <div class="f"><label>Tỷ lệ hoa hồng (%)</label>
        <input type="number" name="nhomHH" step="0.5" min="0" max="100" value="${QT.mucCua(st)}">
        <div class="combo-hint">
          ${[10,15,20,25,30].map(v=>`<button type="button" class="link-btn" onclick="this.closest('.f').querySelector('[name=nhomHH]').value=${v}">${v}%</button>`).join(' · ')}
          <br>Bảng công đoạn in sẵn hai cột <b>10%</b> và <b>30%</b>. Điền đúng hai số đó thì ăn đúng cột;
          điền số ở giữa (15, 20, 25) thì phần mềm chia đều giữa hai cột. Chưa đặt thì coi là 10%.</div></div>
      <div class="note-block full">Tiền từng công đoạn <b>dùng chung cho cả phòng khám</b>, đặt một lần ở
        Cài đặt → Quy trình. Riêng của mỗi người chỉ là ô <b>tỷ lệ %</b> ở trên.</div>
      <div class="note-block full">Email phải trùng với tài khoản đã tạo trong Supabase → <b>Authentication → Users</b>
        thì nhân viên mới tự quét mã QR chấm công được.</div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="HR.staffDel('${id}')">Xóa nhân viên</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="HR.huyStaff()">${this._ve ? 'Quay lại' : 'Hủy'}</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  staffSave(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.base = num(d.base); d.kpiTarget = num(d.kpiTarget); d.email = (d.email||'').trim();
    d.active = d.active !== '0';
    d.nhomHH = num(d.nhomHH) || 10;
    if (id) Object.assign(staffById(id), d);
    else db.staff.push(Object.assign({id:uid(), model:{type:'svcGroup', rates:{}, def:10}}, d));
    save(); App.render();
    if (!this.quayVe()) App.closeModal();
    App.toast('Đã lưu nhân viên ✓');
  },
  staffDel(id){
    const st = staffById(id);
    if (!confirm('Xóa nhân viên "' + st.name + '"? Dữ liệu chấm công, thưởng phạt của người này cũng bị xóa.')) return;
    db.staff = db.staff.filter(x => x.id !== id);
    db.attLog = (db.attLog||[]).filter(x => x.staffId !== id);
    db.bonuses = (db.bonuses||[]).filter(x => x.staffId !== id);
    save(); App.render();
    if (!this.quayVe()) App.closeModal();
    App.toast('Đã xóa nhân viên');
  },
  bonusForm(){
    App.modal('Thêm thưởng / phạt', `
    <form class="form-grid" onsubmit="HR.bonusSave(event)">
      <div class="f full"><label>Nhân viên</label><select name="staffId">${db.staff.map(s=>`<option value="${s.id}">${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Loại</label><select name="kind"><option value="1">Thưởng (+)</option><option value="-1">Phạt (−)</option></select></div>
      <div class="f"><label>Số tiền (₫)</label>${Tien.o('amount', '', 'required')}</div>
      <div class="f full"><label>Lý do</label><input name="reason" required></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  bonusSave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    db.bonuses.push({id:uid(), date:todayISO(), staffId:d.staffId, amount:num(d.amount)*num(d.kind), reason:d.reason});
    save(); App.closeModal(); App.render(); App.toast('Đã ghi nhận ✓');
  },
};

SCREENS.hr = () => {
  const M = monthOf(todayISO());
  /* Không phải quản lý thì chỉ thấy Chấm công — không xem được lương, hoa hồng của người khác */
  const HRTABS = Perm.can('luong')
    ? [['payroll','Bảng lương'],['attendance','Chấm công'],['congviec','Phân công việc'],['commission','Hoa hồng'],['kpi','KPI · Thưởng · Phạt'],['danhgia','Đánh giá tháng']]
    : [['attendance','Chấm công'],['congviec','Phân công việc']];
  if (!HRTABS.some(t => t[0] === App.state.hrTab)) App.state.hrTab = HRTABS[0][0];
  const tab = App.state.hrTab;
  const payRows = db.staff.map(st => {
    const com = HR.commissionOf(st, M), bon = HR.bonusOf(st.id, M), pen = HR.penaltyOf(st.id, M), bhxh = st.base*0.105;
    const net = st.base + com + bon - pen - bhxh;
    return {st, com, bon, pen, bhxh, net};
  });
  const fund = payRows.reduce((s,r)=>s+r.net,0);
  const bhxhTotal = db.staff.reduce((s,st)=>s+st.base*0.32,0);

  let body = '';
  if (tab === 'payroll') body = `
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="k-label">Tổng quỹ lương tạm tính</div><div class="k-value num">${money(fund)}</div><div class="k-note">${db.staff.length} nhân viên</div></div>
      <div class="card kpi"><div class="k-label">BHXH phải nộp (32%)</div><div class="k-value num">${money(bhxhTotal)}</div><div class="k-note num">DN 21,5% + NLĐ 10,5%</div></div>
      <div class="card kpi"><div class="k-label">Trạng thái kỳ</div><div class="k-value" style="font-size:18px"><span class="pill warn">Chưa chốt</span></div><div class="k-note">tự tổng hợp từ phiếu thu, chấm công</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>Bảng lương tháng ${M.slice(5)}/${M.slice(0,4)}</h2><span class="hint">hoa hồng, thưởng, phạt tự động</span>
      <span class="spacer"></span>
      ${Perm.only('caidat', `<button class="btn small" onclick="Att.accountsPanel()">Tài khoản truy cập</button>`)}
      <button class="btn small" onclick="HR.staffForm()">${IC.plus} Thêm nhân viên</button></div>
    <div class="tbl-wrap"><table style="min-width:900px">
      <thead><tr><th>Nhân viên</th><th class="r">Công</th><th class="r">Lương cứng</th><th class="r">Hoa hồng</th><th class="r">Thưởng</th><th class="r">Phạt</th><th class="r">BHXH (10,5%)</th><th class="r">Thực lãnh</th><th></th></tr></thead>
      <tbody id="bangLuong">${payRows.map(({st,com,bon,pen,bhxh,net}, i) => `<tr draggable="true" data-id="${st.id}"
        ondragstart="HR.keoBatDau(event)" ondragover="HR.keoQua(event)" ondrop="HR.keoTha(event)" ondragend="HR.keoXong(event)">
        <td><span class="cell-who"><span class="keo-tay" title="Kéo để đổi thứ tự">⋮⋮</span>
          <span class="avatar">${h(st.name.split(' ').slice(-1)[0].slice(0,2))}</span>
          <span><b>${h(st.name)}</b><span>${h(st.role)}</span></span>
          <span class="keo-nut">
            <button class="btn small" title="Lên" ${i===0?'disabled':''} onclick="HR.doiCho('${st.id}',-1)">↑</button>
            <button class="btn small" title="Xuống" ${i===payRows.length-1?'disabled':''} onclick="HR.doiCho('${st.id}',1)">↓</button>
          </span></span></td>
        <td class="r num">${(() => { const s = Att.summary(st.id, M); return s.cong ? s.cong.toFixed(2).replace(/\.?0+$/,'') + '<br><span class="sub-line">' + gioPhut(s.phut) + '</span>' : '—'; })()}</td>
        <td class="r num">${money(st.base)}</td><td class="r num">${money(com)}</td>
        <td class="r num" style="color:var(--ok)">${bon?'+'+money(bon):'0'}</td>
        <td class="r num" style="color:var(--danger)">${pen?'−'+money(pen):'0'}</td>
        <td class="r num" style="color:var(--danger)">−${money(bhxh)}</td>
        <td class="r num" style="font-weight:700">${money(net)}</td>
        <td><button class="btn small" onclick="HR.staffForm('${st.id}')">Sửa</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Kéo dấu <b>⋮⋮</b> để đổi thứ tự nhân viên trong bảng —
      trên điện thoại thì dùng hai nút <b>↑ ↓</b>. Thứ tự này đồng bộ sang mọi máy.</div>
    <div class="note-block" style="margin-top:12px">BHXH khấu trừ <b>10,5%</b> lương đóng bảo hiểm của người lao động; doanh nghiệp đóng thêm <b>21,5%</b> hạch toán chi phí.</div>`;

  if (tab === 'attendance') {
    const T = todayISO();
    const netPill = n => n==='clinic' ? '<span class="pill ok">Tại phòng khám</span>'
      : n==='outside' ? '<span class="pill danger">Ngoài mạng phòng khám</span>' : '<span class="pill mutedp">Chưa rõ mạng</span>';
    const today = db.staff.map(st => {
      const l = Att.logOf(st.id, T), t = Att.tinh(l);
      const nhan = !l || !l.inAt ? '' : [
        t.tre    ? `<span class="pill warn">trễ ${gioPhut(t.tre)}</span>` : '',
        t.veTrua ? `<span class="pill mutedp">về trưa</span>` : '',
        t.som    ? `<span class="pill warn">về sớm ${gioPhut(t.som)}</span>` : '',
        t.dangLam? `<span class="pill info">đang làm</span>` : '',
      ].filter(Boolean).join(' ');
      return `<tr><td><b>${h(st.name)}</b><br><span class="sub-line">${h(st.role)}</span></td>
        <td class="num">${l&&l.inAt ? h(l.inAt) : '—'}</td>
        <td class="num">${l&&l.outAt ? h(l.outAt) : '—'}</td>
        <td class="num">${l&&l.inAt ? gioPhut(t.phut) : '—'}<br><span class="sub-line">${t.buoi.join(' + ')||''}</span></td>
        <td>${l ? (netPill(l.net) + (nhan ? '<br>' + nhan : '')) : '<span class="sub-line">chưa chấm công</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn small" onclick="Att.showCard('${st.id}')">Mã QR</button>
          <button class="btn small" onclick="Att.editForm('${st.id}','${T}')">Sửa</button></td></tr>`;
    }).join('');
    const sum = db.staff.map(st => {
      const s = Att.summary(st.id, M);
      return `<tr><td><b>${h(st.name)}</b></td>
        <td class="r num" style="font-weight:700">${s.cong ? s.cong.toFixed(2).replace(/\.?0+$/,'') : '0'}</td>
        <td class="r num">${gioPhut(s.phut)}</td>
        <td class="r num">${s.days}</td>
        <td class="r num" ${s.late?'style="color:var(--warn);font-weight:700"':''}>${s.late?s.late+' ('+gioPhut(s.phutTre)+')':'0'}</td>
        <td class="r num" ${s.som?'style="color:var(--warn)"':''}>${s.som}</td>
        <td class="r num">${s.veTrua}</td>
        <td class="r num" ${s.outside?'style="color:var(--danger);font-weight:700"':''}>${s.outside}</td></tr>`;
    }).join('');
    body = `
    <div class="page-head" style="margin-bottom:12px">
      <button class="btn primary" onclick="Att.scanner()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h10"/></svg>
        Mở máy chấm công</button>
      ${Perm.only('caidat', `<button class="btn" onclick="HR.dsNhanVien()">Sửa nhân viên</button>
      <button class="btn" onclick="Att.clinicQR()">Mã QR phòng khám</button>
      <button class="btn" onclick="Att.settingsForm()">Cài đặt</button>`)}
      <span class="spacer"></span>
      <span class="sub-line">${h(Att.moTaTuan())}${db.clinic.wifiIp?' · mạng phòng khám đã đặt':' · chưa đặt mạng phòng khám'}</span>
    </div>
    <div class="card mb"><div class="card-h"><h2>Hôm nay — ${fmtD(T)}</h2><span class="hint">nhân viên quét mã QR ở quầy để ghi giờ vào / giờ ra</span></div>
      <div class="tbl-wrap"><table style="min-width:780px">
        <thead><tr><th>Nhân viên</th><th>Giờ vào</th><th>Giờ ra</th><th>Làm được</th><th>Ghi nhận</th><th></th></tr></thead>
        <tbody>${today}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Tổng hợp tháng ${M.slice(5)}/${M.slice(0,4)}</h2><span class="hint">tự cộng từ nhật ký quét mã</span></div>
      <div class="tbl-wrap"><table style="min-width:760px">
        <thead><tr><th>Nhân viên</th><th class="r">Số công</th><th class="r">Tổng giờ</th><th class="r">Ngày có mặt</th><th class="r">Đi trễ</th><th class="r">Về sớm</th><th class="r">Về trưa</th><th class="r">Chấm ngoài PK</th></tr></thead>
        <tbody>${sum}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Một ngày đủ ca hôm nay = <b>${gioPhut(Att.phutChuan(todayISO()))}</b> (${h(Att.moTaCa(todayISO()))}) = <b>1 công</b>.
      Giờ nghỉ trưa không tính công, nên <b>ai ở lại buổi trưa và ai về rồi quay lại đều ra cùng số giờ</b> — chỉ cần chấm vào lúc đến và chấm ra lúc về hẳn.
      Ai về trưa không quay lại thì chỉ được công buổi sáng.</div>`;
  }

  if (tab === 'congviec') body = CV.manNhanSu();

  if (tab === 'commission') body = `
    <div class="page-head" style="margin-bottom:12px">
      ${Perm.only('caidat', `<button class="btn" onclick="QT.bang()">Quy trình & tỷ lệ công đoạn</button>`)}
      <span class="spacer"></span></div>
    <div class="note-block mb">Hoa hồng tính theo <b>công đoạn đã làm</b>: ai làm bước nào hưởng bước đó,
      nên một ca chia được cho nhiều người. Phục hình thì <b>trừ tiền lab rồi mới tính %</b>.
      Tiền công <b>tính theo mức khách đã thanh toán</b> cho hạng mục đó: khách trả 60% thì cả ca nhận 60%,
      trả nốt thì phần còn lại tự cộng vào tháng thu tiền.
      Ghi công đoạn ở tab <b>Điều trị</b> → cột <b>Công đoạn</b> của từng hạng mục.</div>
    <div class="card mb"><div class="card-h"><h2>Tổng hoa hồng tháng ${M.slice(5)}/${M.slice(0,4)}</h2></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Nhân viên</th><th class="r">Số công đoạn</th><th class="r">Theo công đoạn</th><th class="r">Tổng hoa hồng</th><th></th></tr></thead>
      <tbody>${db.staff.map(st => {
        const ds = QT.congThang(M, st.id);
        return `<tr><td><b>${h(st.name)}</b><br><span class="sub-line">${h(st.role||'')}</span></td>
          <td class="r num">${ds.length}</td>
          <td class="r num">${money(QT.hoaHong(st.id, M))}</td>
          <td class="r num" style="font-weight:700">${money(HR.commissionOf(st, M))}</td>
          <td>${Perm.only('caidat', `<button class="btn small" onclick="HR.staffForm('${st.id}')">${QT.mucCua(st)}%</button>`)}</td></tr>`;
      }).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Chi tiết công đoạn đã làm</h2>
      <span class="hint">tháng ${M.slice(5)}/${M.slice(0,4)}</span></div>
      <div class="card-b">${QT.bangThang(M)}</div></div>`;

  if (tab === 'kpi') body = `
    <div class="card mb"><div class="card-h"><h2>KPI doanh thu bác sĩ — tháng ${M.slice(5)}</h2></div><div class="card-b hbars" style="gap:16px">
      ${db.staff.filter(s=>s.kpiTarget>0).map(st => { const rev = HR.revenueOf(st, M); const pct = Math.min(100, Math.round(rev/st.kpiTarget*100));
        return `<div class="hbar"><div class="hb-top"><b>${h(st.name)}</b><span class="num">${money(rev)} / ${money(st.kpiTarget)} · ${pct}%</span></div><div class="hb-track"><div class="hb-fill" style="width:${pct}%"></div></div></div>`;}).join('')}
    </div></div>
    <div class="card"><div class="card-h"><h2>Thưởng & phạt tháng này</h2><span class="spacer"></span><button class="btn small" onclick="HR.bonusForm()">${IC.plus} Thêm</button></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Ngày</th><th>Nhân viên</th><th>Lý do</th><th class="r">Số tiền</th></tr></thead>
      <tbody>${db.bonuses.filter(b=>monthOf(b.date)===M).map(b=>`<tr><td class="num">${fmtD(b.date)}</td><td>${h((staffById(b.staffId)||{}).name)}</td><td>${h(b.reason)}</td>
        <td class="r num" style="font-weight:700;color:var(--${b.amount>0?'ok':'danger'})">${b.amount>0?'+':'−'}${money(Math.abs(b.amount))}</td></tr>`).join('') || '<tr><td colspan="4" class="sub-line">Chưa có ghi nhận.</td></tr>'}</tbody></table></div></div>`;

  if (tab === 'danhgia') body = DanhGia.tab();

  return `
  <div class="page-head"><h1>Nhân sự</h1><span class="spacer"></span></div>
  <div class="subtabs">
    ${HRTABS.map(([k,l])=>`<button class="subtab ${tab===k?'active':''}" onclick="HR.tab('${k}')">${l}</button>`).join('')}
  </div>${body}`;
};

/* ---------- Lab ---------- */
/* ---------- Bảng giá gia công răng sứ (lab) ----------
   Trước đây mức tiền lab nằm cứng trong từng quy trình, muốn đổi phải sửa mã.
   Nay để thành một bảng giá riêng, quản lý tự sửa trong tab Cài đặt. */
const GiaLab = {
  /* Chép từ Bảng 7 "TIỀN LAB — TRỪ RA TRƯỚC KHI TÍNH %" trong bảng tính lương của phòng khám */
  MAC_DINH: [
    {n:'Sứ kim loại',               d:'răng', p:180000},
    {n:'Sứ Titan',                  d:'răng', p:280000},
    {n:'Sứ Zirconia',               d:'răng', p:600000},
    {n:'Sứ DDbio',                  d:'răng', p:700000},
    {n:'Sứ Cercon',                 d:'răng', p:1000000},
    {n:'Sứ Lava 3M',                d:'răng', p:1400000},
    {n:'Veneer',                    d:'răng', p:1200000},
    {n:'Cùi giả Zirconia',          d:'răng', p:400000},
    {n:'RTL Nhật',                  d:'răng', p:50000},
    {n:'RTL Mỹ',                    d:'răng', p:90000},
    {n:'RTL Composite',             d:'răng', p:120000},
    {n:'RTL Excellent',             d:'răng', p:250000},
    {n:'Chốt bi Rhein83 (Cetec)',   d:'cái',  p:1200000},
    {n:'Khung liên kết (Ozean)',    d:'cái',  p:600000},
    {n:'Mắc cài bi (Ozean)',        d:'cái',  p:1500000},
    {n:'Mắc cài đơn (Ozean)',       d:'cái',  p:400000},
    {n:'Lưới',                      d:'cái',  p:100000},
    {n:'Móc dẻo',                   d:'cái',  p:150000},
    {n:'Hàm khung titan',           d:'hàm',  p:400000},
  ],
  ds(){
    if (!db.giaLab || !db.giaLab.length) db.giaLab = this.MAC_DINH.map(x => Object.assign({id: uid()}, x));
    return db.giaLab;
  },
  /* Dùng cho nút điền nhanh "Tiền lab" trong bảng công đoạn */
  goiY(){ return this.ds().map(x => [x.n, +x.p || 0]); },
  bang(){
    const sua = Perm.can('caidat');
    const rows = this.ds().map(x => `<tr>
      <td>${sua ? `<input value="${h(x.n)}" onchange="GiaLab.sua('${x.id}','n',this.value)">` : h(x.n)}</td>
      <td style="width:110px">${sua ? `<input value="${h(x.d||'')}" onchange="GiaLab.sua('${x.id}','d',this.value)">` : h(x.d||'')}</td>
      <td class="r" style="width:150px">${sua ? Tien.o('', x.p, `onchange="GiaLab.sua('${x.id}','p',this.value)"`) : money(x.p)}</td>
      <td style="width:56px">${sua ? `<button class="btn small danger" onclick="GiaLab.xoa('${x.id}')">Xóa</button>` : ''}</td></tr>`).join('');
    App.modal('Bảng giá gia công răng sứ (lab)', `
      <div class="note-block mb">Đây là <b>tiền trả cho lab</b>, không phải giá bán cho khách.
        Khi tính hoa hồng phục hình, phần mềm <b>trừ tiền lab trước rồi mới tính %</b> —
        mức ở đây hiện ra thành nút bấm nhanh trong bảng công đoạn.</div>
      <div class="tbl-wrap"><table style="min-width:520px">
        <thead><tr><th>Loại gia công</th><th>Đơn vị</th><th class="r">Giá lab</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="sub-line">Chưa có dòng nào.</td></tr>'}</tbody></table></div>
      <div class="form-actions">
        ${sua ? `<button class="btn" onclick="GiaLab.them()">${IC.plus} Thêm dòng</button>
        <button class="btn" onclick="GiaLab.datLai()">Nạp lại bảng mặc định</button>` : ''}
        <span class="spacer"></span><button class="btn primary" onclick="App.closeModal()">Xong</button></div>`);
  },
  sua(id, k, v){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được bảng giá lab'); return; }
    const x = this.ds().find(y => y.id === id); if (!x) return;
    x[k] = (k === 'p') ? num(v) : v;
    save(); App.toast('Đã lưu ✓');
  },
  them(){
    this.ds().push({id: uid(), n: '', d: 'răng', p: 0});
    save(); this.bang();
  },
  xoa(id){
    if (!confirm('Xóa dòng này khỏi bảng giá lab?')) return;
    db.giaLab = this.ds().filter(x => x.id !== id);
    save(); this.bang();
  },
  datLai(){
    if (!confirm('Nạp lại bảng giá lab mặc định? Những dòng đã sửa sẽ mất.')) return;
    db.giaLab = this.MAC_DINH.map(x => Object.assign({id: uid()}, x));
    save(); this.bang(); App.toast('Đã nạp lại ✓');
  },
};

const Lab = {
  form(id){
    const l = id ? db.labs.find(x=>x.id===id) : {sent:todayISO(), due:isoAdd(todayISO(),5), qty:1};
    App.modal(id?'Sửa phiếu gởi lab':'Gởi hàng lab', `
    <form class="form-grid" onsubmit="Lab.save(event,'${id||''}')">
      <div class="f full"><label>Khách hàng</label>
        ${Combo.html('cbLabCust','customerName', custLabel(custById(l.customerId)), custOptions(),
          'Gõ tên, số điện thoại hoặc mã KH', pickCustomerInto)}
        <input type="hidden" name="customerId" value="${h(l.customerId||'')}"></div>
      <div class="f full"><label>Lab</label>
        ${Combo.html('cbLabName','labName', l.labName||'', LABS, 'Gõ tên lab', null, 'Lab mới thì cứ gõ tự do.')}</div>
      <div class="f"><label>Loại răng / phục hình</label>
        ${Combo.html('cbLabType','type', l.type||'', LAB_TYPES, 'Gõ loại phục hình')}</div>
      <div class="f"><label>Vị trí răng</label><input name="teeth" value="${h(l.teeth||'')}" placeholder="R36, R44–R46..."></div>
      <div class="f"><label>Số lượng (đơn vị)</label><input type="number" name="qty" value="${l.qty||1}" min="1"></div>
      <div class="f"><label>Ngày gởi</label><input type="date" name="sent" value="${h(l.sent||'')}" required></div>
      <div class="f"><label>Hẹn nhận về</label><input type="date" name="due" value="${h(l.due||'')}" required></div>
      <div class="f full"><label>Gắn với lịch hẹn khách (để cảnh báo)</label><select name="apptId"><option value="">— không —</option>
        ${db.appointments.filter(a=>a.date>=todayISO()).map(a=>`<option value="${a.id}"${l.apptId===a.id?' selected':''}>${fmtD(a.date)} ${a.time} — ${h((custById(a.customerId)||{}).name)} (${h(a.service)})</option>`).join('')}</select></div>
      <div class="f full"><label>Ghi chú (màu răng...)</label><input name="note" value="${h(l.note||'')}"></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Lab.del('${id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!d.customerId) { App.toast('Hãy chọn khách hàng từ danh sách gợi ý'); return; }
    delete d.customerName;
    d.qty = num(d.qty)||1;
    if (id) Object.assign(db.labs.find(x=>x.id===id), d);
    else db.labs.push(Object.assign({id:uid(), received:''}, d));
    if (d.apptId) { const a = db.appointments.find(x=>x.id===d.apptId); if (a) a.labOrderId = id || db.labs[db.labs.length-1].id; }
    save(); App.closeModal(); App.render(); App.toast('Đã lưu phiếu lab ✓');
  },
  del(id){
    if (!confirm('Xóa phiếu gởi lab này?')) return;
    db.labs = db.labs.filter(x=>x.id!==id);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa');
  },
  receive(id){
    const l = db.labs.find(x=>x.id===id);
    l.received = todayISO();
    save(); App.render(); App.toast('Đã nhận hàng từ ' + l.labName + ' ✓');
  },
};

SCREENS.lab = () => {
  const T = todayISO();
  const urgent = db.labs.filter(l => { if (l.received) return false; const a = db.appointments.find(x=>x.id===l.apptId); return (a && a.date <= isoAdd(T,2)) || (l.due && l.due < T); });
  const rows = db.labs.slice().sort((a,b)=>(a.received?1:0)-(b.received?1:0) || (a.due<b.due?-1:1)).map(l => {
    const [k,label] = labStatus(l); const c = custById(l.customerId);
    const a = db.appointments.find(x=>x.id===l.apptId);
    return `<tr><td><b>${h(c?c.name:'?')}</b><br><span class="sub-line">${h(l.note||'')}</span></td>
    <td>${h(l.type)}<br><span class="sub-line">${h(l.labName)}</span></td>
    <td class="num">${h(l.teeth||'—')}</td><td class="r num">${l.qty}</td>
    <td class="num">${fmtD(l.sent)}</td><td class="num" ${!l.received && l.due<T?'style="color:var(--danger);font-weight:700"':''}>${fmtD(l.due)}</td>
    <td>${a?`${fmtD(a.date)} ${a.time}`:'—'}</td>
    <td><span class="pill ${k}">${label}</span>${l.received?`<br><span class="sub-line num">về ${fmtD(l.received)}</span>`:''}</td>
    <td style="white-space:nowrap">${l.received?'':`<button class="btn small primary" onclick="Lab.receive('${l.id}')">Đã nhận</button>`}
      <button class="btn small" onclick="Lab.form('${l.id}')">Sửa</button></td></tr>`;
  }).join('') || '<tr><td colspan="9" class="sub-line">Chưa có phiếu gởi lab.</td></tr>';

  return `
  <div class="page-head"><h1>Lab — phục hình</h1><span class="spacer"></span>
    <button class="btn primary" onclick="Lab.form()">${IC.plus} Gởi hàng lab</button>
    <div class="sub">${db.labs.filter(l=>!l.received).length} phiếu đang chờ hàng về</div></div>
  ${urgent.length?`<div class="card mb" style="border-color:var(--danger)"><div class="card-h"><h2 style="color:var(--danger)">⚠ Cần gọi lab ngay</h2></div><div class="card-b">
    ${urgent.map(l => { const a = db.appointments.find(x=>x.id===l.apptId); const c = custById(l.customerId);
      return `<div class="alert-line"><span class="alert-ico danger">⚠</span><div><b>${h(l.type)} ${h(l.teeth)}</b> của ${h(c?c.name:'')} (${h(l.labName)}) — hẹn về ${fmtD(l.due)}${a?`, khách hẹn <b>${fmtD(a.date)} ${a.time}</b>`:''} mà chưa nhận được hàng.</div></div>`;}).join('')}
  </div></div>`:''}
  <div class="card"><div class="tbl-wrap"><table style="min-width:940px">
    <thead><tr><th>Khách hàng</th><th>Loại · Lab</th><th>Răng</th><th class="r">SL</th><th>Ngày gởi</th><th>Hẹn về</th><th>Lịch hẹn khách</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>`;
};

/* ---------- Báo cáo ---------- */
const Rep = {
  set(k, v){ App.state.rp[k] = k==='type'?v:num(v); App.render(); },
  range(){
    const {type, y, m, q} = App.state.rp;
    if (type==='month') { const mm = String(m).padStart(2,'0'); return [y+'-'+mm+'-01', y+'-'+mm+'-31', 'tháng '+m+'/'+y]; }
    if (type==='quarter') { const sm = (q-1)*3+1, em = q*3; return [y+'-'+String(sm).padStart(2,'0')+'-01', y+'-'+String(em).padStart(2,'0')+'-31', 'quý '+q+'/'+y]; }
    return [y+'-01-01', y+'-12-31', 'năm '+y];
  },
  csv(){
    const [from, to, label] = this.range();
    const recs = db.receipts.filter(r=>r.date>=from && r.date<=to).sort((a,b)=>a.date<b.date?-1:1);
    let csv = '﻿Ngày,Số phiếu,Khách hàng,Nội dung,Nhóm dịch vụ,Hình thức,Số tiền,Số HĐĐT,Mã tra cứu\n';
    recs.forEach(r => { const c = custById(r.customerId);
      csv += [fmtD(r.date), r.no, '"'+(c?c.name:'')+'"', '"'+(r.desc||'').replace(/"/g,'""')+'"', r.group||'', r.method, r.amount, r.invoice?r.invoice.no:'', r.invoice?r.invoice.code:''].join(',') + '\n'; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    a.download = 'bao-cao-thu-' + label.replace(/[ /]/g,'-') + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
    App.toast('Đã xuất file CSV — mở bằng Excel ✓');
  },
  printReport(){
    const html = $('#reportBody');
    const [,,label] = this.range();
    App.print(`<h1>BÁO CÁO KINH DOANH — ${h(db.clinic.name).toUpperCase()}</h1><p style="text-align:center">Kỳ báo cáo: <b>${label}</b> · Lập ngày ${fmtD(todayISO())}</p>` + (html?html.innerHTML.replace(/<button[^>]*>.*?<\/button>/g,''):''));
  },
};

/* ================= Cài đặt =================
   Gom mọi thứ chỉ-sửa-một-lần về một chỗ, thay vì rải rác trong các tab nghiệp vụ. */
SCREENS.settings = () => {
  const cl = db.clinic || {};
  const the = (ten, mo, nut) => `<div class="ho-so-file">
    <div class="hsf-than"><div class="hsf-dau"><b>${ten}</b></div>
      <div class="hsf-mo">${mo}</div></div>
    <div class="hsf-nut">${nut}</div></div>`;
  const q = Perm.can('caidat');
  const khoa = q ? '' : ' disabled title="Chỉ quản lý mới sửa được"';

  return `
  <div class="page-head"><h1>Cài đặt</h1>
    <div class="sub">${h(cl.name || '')} · ${h(cl.addr || '')}</div></div>

  <div class="card mb"><div class="card-h"><h2>Giá và quy trình</h2>
    <span class="hint">sửa ở đây, mọi nơi trong phần mềm dùng theo</span></div>
    <div class="card-b">
      ${the('Bảng giá dịch vụ', `${(db.services||[]).length} dịch vụ · giá bán cho khách, dùng cho kế hoạch điều trị và phiếu thu`,
        `<button class="btn small primary" onclick="Svc.bang()"${khoa}>Mở bảng giá</button>`)}
      ${the('Bảng giá gia công răng sứ (lab)', `${GiaLab.ds().length} loại · tiền trả cho lab, trừ trước khi tính hoa hồng phục hình`,
        `<button class="btn small primary" onclick="GiaLab.bang()"${khoa}>Mở bảng giá lab</button>`)}
      ${the('Quy trình &amp; tỷ lệ hoa hồng theo công đoạn', 'Ai làm công đoạn nào hưởng phần đó · đặt được tỷ lệ riêng cho từng người',
        `<button class="btn small primary" onclick="QT.bang()"${khoa}>Mở quy trình</button>`)}
      ${the('Vật tư — danh mục', `${(typeof VAT_LIEU!=='undefined'?VAT_LIEU.length:0)} tên vật tư gợi ý sẵn khi nhập kho`,
        `<button class="btn small" onclick="App.go('inventory')">Vào kho</button>`)}
    </div></div>

  <div class="card mb"><div class="card-h"><h2>Phòng khám và nhân sự</h2></div>
    <div class="card-b">
      ${the('Thông tin phòng khám, giờ làm việc, chấm công',
        `${h(Att.moTaTuan())}${cl.wifiIp ? ' · đã đặt mạng phòng khám' : ' · chưa đặt mạng phòng khám'}`,
        `<button class="btn small primary" onclick="Att.settingsForm()"${khoa}>Mở cài đặt</button>`)}
      ${the('Nhân viên', `${db.staff.filter(x=>x.active!==false).length} người đang làm việc · tên, chức danh, vai trò, tỷ lệ riêng`,
        `<button class="btn small primary" onclick="HR.dsNhanVien()"${khoa}>Sửa nhân viên</button>`)}
      ${the('Tài khoản truy cập', 'Mời nhân viên, đặt quyền vào từng mục',
        `<button class="btn small" onclick="Att.accountsPanel()"${khoa}>Quản lý tài khoản</button>`)}
      ${the('Phân quyền theo vai trò', Perm.moTaBang(),
        `<button class="btn small primary" onclick="Perm.hopQuyen()"${khoa}>Đặt phân quyền</button>`)}
      ${the('Mã QR chấm công', 'Dán ở quầy để nhân viên quét ghi giờ vào — giờ ra',
        `<button class="btn small" onclick="Att.clinicQR()"${khoa}>Xem mã QR</button>`)}
      ${the('An toàn truy cập', KG.moTa(),
        `<button class="btn small primary" onclick="KG.hop()"${khoa}>Đặt giới hạn</button>`)}
      ${the('Mã hóa dữ liệu lưu trên máy', Mahoa.moTa(),
        `<button class="btn small" onclick="Mahoa.hop()"${khoa}>${Mahoa.bat() ? 'Xem, tắt' : 'Bật mã hóa'}</button>`)}
    </div></div>

  <div class="card mb"><div class="card-h"><h2>Đặt hẹn online</h2></div>
    <div class="card-b">
      ${the('Liên kết đặt hẹn cho khách', 'Khách tự chọn khung giờ còn trống · lịch đặt chạy thẳng vào Lịch hẹn chờ duyệt',
        `<button class="btn small primary" onclick="DatHen.moLienKet()">Lấy liên kết &amp; mã QR</button>`)}
    </div></div>

  <div class="card"><div class="card-h"><h2>Dữ liệu</h2></div>
    <div class="card-b">
      ${the('Đồng bộ đám mây', (() => { const st = Sync.status(); return `<span class="pill ${st.k}">${h(st.t)}</span>`; })(),
        `<button class="btn small" onclick="App.syncNow()">Đồng bộ ngay</button>`)}
      ${the('Kho dữ liệu bệnh án', `${Sync.moTaKho()} ${Sync.pillKho()}`,
        `<button class="btn small" onclick="Sync.sqlKho()"${khoa}>Xem cách tách kho</button>`)}
      ${the('Sao lưu tự động', `${SL.moTa()} ${SL.pill()}`,
        `<button class="btn small primary" onclick="SL.bang()">Mở sao lưu</button>`)}
      ${the('Nhập hồ sơ từ ảnh chụp phiếu giấy', 'Chụp phiếu điều trị cũ, trợ lý AI đọc thành bảng, dán vào đây',
        `<button class="btn small primary" onclick="Importer.anhForm()">Nhập từ ảnh chụp</button>`)}
      ${the('Nhập khách hàng từ Google Sheet', 'Dán bảng từ Sheet để nạp hàng loạt hồ sơ khách',
        `<button class="btn small" onclick="Importer.form()"${khoa}>Mở trình nhập</button>`)}
      ${the('Dọn trùng lặp', 'Gộp hồ sơ trùng mã và bỏ phiếu thu trùng số — không mất lịch sử điều trị',
        `<button class="btn small" onclick="App.dedupeForm()"${khoa}>Kiểm tra</button>`)}
      ${the('Nhật ký lưu vết', `${(db.vet||[]).length} dòng · ai thêm, sửa, xóa hồ sơ nào, lúc nào — bắt buộc với bệnh án điện tử`,
        `<button class="btn small primary" onclick="Vet.bang()">Mở nhật ký</button>`)}
      ${the('Kết xuất liên thông hồ sơ bệnh án', 'Tệp XML hoặc JSON theo Phụ lục "Mô tả dữ liệu trao đổi hồ sơ bệnh án điện tử" của Bộ Y tế',
        `<button class="btn small" onclick="LT.hop()">Một hồ sơ</button>
         <button class="btn small" onclick="LT.taiTatCa()"${khoa}>Toàn bộ</button>`)}
    </div></div>

  ${q ? '' : '<div class="note-block" style="margin-top:12px">Bạn đang xem với quyền <b>' + h(Perm.label()) +
    '</b> — chỉ quản lý mới sửa được các mục có khóa.</div>'}`;
};

SCREENS.work = () => CV.man();

SCREENS.reports = () => {
  const {type, y, m, q} = App.state.rp;
  const [from, to, label] = Rep.range();
  const recs = db.receipts.filter(r=>r.date>=from && r.date<=to);
  const total = recs.reduce((s,r)=>s+r.amount,0);
  const invCount = recs.filter(r=>r.invoice).length;
  const newCust = db.customers.filter(c=>c.createdAt>=from && c.createdAt<=to).length;
  const debtTotal = db.customers.reduce((s,c)=>s+custDebt(c),0);
  const invValue = db.inventory.reduce((s,it)=>s+(it.buy||0)*it.stock,0);

  const byGroup = {}; recs.forEach(r=>byGroup[r.group||'Khác']=(byGroup[r.group||'Khác']||0)+r.amount);
  const gRows = Object.entries(byGroup).sort((a,b)=>b[1]-a[1]);
  const byDoc = {}; recs.forEach(r=>{ if(r.doctorId) byDoc[r.doctorId]=(byDoc[r.doctorId]||0)+r.amount; });
  const byMethod = {}; recs.forEach(r=>byMethod[r.method]=(byMethod[r.method]||0)+r.amount);

  // Lương ước tính trong kỳ (số tháng trong kỳ × quỹ lương hiện tại)
  const months = type==='month'?1:type==='quarter'?3:12;
  const M = monthOf(todayISO());
  const payroll = db.staff.reduce((s,st)=>s + st.base + HR.commissionOf(st,M) + HR.bonusOf(st.id,M) - HR.penaltyOf(st.id,M),0);

  const mm = Array.from({length:12},(_,i)=>i+1);
  return `
  <div class="page-head"><h1>Báo cáo</h1><span class="spacer"></span>
    <button class="btn" onclick="Rep.csv()">Xuất CSV (Excel)</button>
    <button class="btn primary" onclick="Rep.printReport()">${IC.print} In báo cáo</button>
    <div class="sub">dành cho kế toán — tổng hợp theo tháng, quý, năm từ sổ phiếu thu</div></div>
  <div class="date-nav mb">
    <select onchange="Rep.set('type',this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit">
      ${[['month','Theo tháng'],['quarter','Theo quý'],['year','Theo năm']].map(([k,l])=>`<option value="${k}"${type===k?' selected':''}>${l}</option>`).join('')}</select>
    ${type==='month'?`<select onchange="Rep.set('m',this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit">${mm.map(x=>`<option value="${x}"${m===x?' selected':''}>Tháng ${x}</option>`).join('')}</select>`:''}
    ${type==='quarter'?`<select onchange="Rep.set('q',this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit">${[1,2,3,4].map(x=>`<option value="${x}"${q===x?' selected':''}>Quý ${x}</option>`).join('')}</select>`:''}
    <input type="number" value="${y}" min="2020" max="2040" onchange="Rep.set('y',this.value)" style="width:90px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit">
  </div>
  <div id="reportBody">
  <div class="kpis">
    <div class="card kpi"><div class="k-label">Tổng doanh thu (${label})</div><div class="k-value num">${money(total)}</div><div class="k-note">${recs.length} phiếu thu</div></div>
    <div class="card kpi"><div class="k-label">HĐĐT đã phát hành</div><div class="k-value num">${invCount}/${recs.length}</div><div class="k-note">${recs.length-invCount} phiếu chưa xuất hóa đơn</div></div>
    <div class="card kpi"><div class="k-label">Khách hàng mới</div><div class="k-value num">${newCust}</div><div class="k-note">trong kỳ</div></div>
    <div class="card kpi"><div class="k-label">Công nợ hiện tại</div><div class="k-value num">${money(debtTotal)}</div><div class="k-note">giá trị kho: ${money(invValue)}</div></div>
  </div>
  <div class="grid-2">
    <div class="col">
      <div class="card"><div class="card-h"><h2>Doanh thu theo nhóm dịch vụ</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Nhóm</th><th class="r">Doanh thu</th><th class="r">Tỷ trọng</th></tr></thead>
      <tbody>${gRows.map(([g,v])=>`<tr><td><b>${h(g)}</b></td><td class="r num">${money(v)}</td><td class="r num">${total?Math.round(v/total*100):0}%</td></tr>`).join('')||'<tr><td colspan="3" class="sub-line">Không có dữ liệu trong kỳ.</td></tr>'}
      ${gRows.length?`<tr><td style="font-weight:700">Tổng</td><td class="r num" style="font-weight:700">${money(total)}</td><td class="r num">100%</td></tr>`:''}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h2>Doanh thu theo bác sĩ</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Bác sĩ</th><th class="r">Doanh thu</th></tr></thead>
      <tbody>${Object.entries(byDoc).sort((a,b)=>b[1]-a[1]).map(([id,v])=>`<tr><td><b>${h((staffById(id)||{}).name||'—')}</b></td><td class="r num">${money(v)}</td></tr>`).join('')||'<tr><td colspan="2" class="sub-line">Không có dữ liệu.</td></tr>'}</tbody></table></div></div>
    </div>
    <div class="col">
      <div class="card"><div class="card-h"><h2>Theo hình thức thanh toán</h2></div>
      <div class="tbl-wrap"><table><thead><tr><th>Hình thức</th><th class="r">Số tiền</th></tr></thead>
      <tbody>${Object.entries(byMethod).map(([k,v])=>`<tr><td>${h(k)}</td><td class="r num">${money(v)}</td></tr>`).join('')||'<tr><td colspan="2" class="sub-line">Không có dữ liệu.</td></tr>'}</tbody></table></div></div>
      <div class="card"><div class="card-h"><h2>Chi phí nhân sự (ước tính kỳ)</h2></div>
      <div class="card-b">
        <div class="hbar"><div class="hb-top"><b>Quỹ lương ${months} tháng (theo tháng hiện tại)</b><span class="num">${money(payroll*months)}</span></div></div>
        <div class="sub-line" style="margin-top:6px">Gồm lương cứng + hoa hồng + thưởng − phạt. BHXH doanh nghiệp đóng thêm ${money(db.staff.reduce((s,st)=>s+st.base*0.215,0)*months)}.</div>
      </div></div>
      <div class="card"><div class="card-h"><h2>Tỷ suất nhanh</h2></div>
      <div class="card-b hbars">
        <div class="hbar"><div class="hb-top"><b>Chi phí nhân sự / doanh thu</b><span class="num">${total?Math.round(payroll*months/total*100):0}%</span></div><div class="hb-track"><div class="hb-fill" style="width:${total?Math.min(100,Math.round(payroll*months/total*100)):0}%"></div></div></div>
        <div class="hbar"><div class="hb-top"><b>Phiếu thu đã có HĐĐT</b><span class="num">${recs.length?Math.round(invCount/recs.length*100):0}%</span></div><div class="hb-track"><div class="hb-fill" style="width:${recs.length?Math.round(invCount/recs.length*100):0}%"></div></div></div>
      </div></div>
    </div>
  </div>
  </div>`;
};

/* ================= Khởi động ================= */
load();
document.addEventListener('DOMContentLoaded', () => {
  $('#restoreFile').addEventListener('change', ev => {
    const f = ev.target.files[0]; if (!f) return;
    if (!confirm('Phục hồi từ file "' + f.name + '"? Dữ liệu hiện tại trên máy sẽ bị THAY THẾ toàn bộ.')) { ev.target.value=''; return; }
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result); if (!d.customers) throw 0;
        /* Phục hồi là thay cả kho, không phải người dùng sửa từng bản ghi. Để nguyên
           thì bản chụp cũ so với bản vừa nạp sẽ đẻ ra hàng nghìn dòng "xóa" và "thêm"
           vô nghĩa, lại kèm bản sao, đủ làm đầy kho. Ngưng ghi vết, chụp lại từ đầu,
           rồi ghi đúng một dòng. */
        if (typeof Vet !== 'undefined') Vet.ngung();
        db = d;
        try { save(); } finally { if (typeof Vet !== 'undefined') Vet.chay(); }
        if (typeof Vet !== 'undefined')
          Vet.ghi('khoiphuc', 'Phục hồi toàn bộ dữ liệu từ file "' + f.name + '" — ' +
            (d.customers || []).length + ' hồ sơ khách hàng');
        if (typeof Sync !== 'undefined') Sync.snapshot();
        App.render(); App.toast('Đã phục hồi dữ liệu ✓');
      } catch(e){ App.toast('File không hợp lệ'); }
      ev.target.value='';
    };
    rd.readAsText(f);
  });
  /* Trước đây bấm ra nền ngoài là đóng khung nhập liệu — gõ hồ sơ nửa chừng lỡ tay
     bấm hụt một cái là mất sạch, không hỏi han gì. Nay phải bấm nút Hủy hoặc dấu ✕
     mới đóng. Giữ lại sự kiện để nuốt cú bấm, khỏi lọt xuống trang phía dưới. */
  $('#modalBack').addEventListener('click', ev => { if (ev.target.id === 'modalBack') ev.stopPropagation(); });
  Sync.snapshot();
  /* Mở từ liên kết mời hoặc mã QR chấm công → tự lưu cấu hình rồi mời đăng nhập */
  const invited = Att.applyInvite();
  App.render();
  if (invited) {
    App.toast('Đã nối vào phòng khám ✓ — hãy đăng nhập');
    if (!Cloud.loggedIn()) Att.loginForm();
  }
  /* Có kết nối sẵn thì lặng lẽ đồng bộ khi mở app */
  /* Lấy mốc so sánh NGAY BÂY GIỜ, sau khi migrate() đã chuẩn hóa xong dữ liệu.
     Lấy muộn hơn thì hoặc là mất thay đổi gõ trước lần đồng bộ đầu, hoặc là cả kho bị
     đóng dấu thời gian mới rồi đè lên dấu xóa của máy khác. */
  if (typeof Sync !== 'undefined' && Sync.moBaiDau) { try { Sync.moBaiDau(); } catch(e){} }
  if (Cloud.configured() && Cloud.loggedIn()) setTimeout(() => { Sync.run(true).then(() => Att.sync()); }, 800);
  /* Từ nay máy nào nhập gì thì máy khác thấy trong vòng một phút, khỏi bấm nút ⟳ */
  if (typeof Sync !== 'undefined') Sync.khoiDongTuDong();
  /* Sao lưu: đọc trạng thái để vẽ đúng ô trong Cài đặt, rồi chụp bản của ngày hôm
     nay nếu chưa có. Để chậm một nhịp cho màn hình hiện ra trước. */
  setTimeout(() => {
    SL.docTT().then(() => { if (App.cur === 'settings') App.render(); })
      .then(() => SL.tuDong());
  }, 2500);
  /* Canh giờ và canh máy bỏ không */
  KG.khoiDong();
  /* Việc lặp theo lịch: sinh bản của hôm nay nếu chưa có, rồi nhắc báo cáo cuối ngày */
  setTimeout(() => {
    try { CV.sinhHomNay(); CV.nhacCuoiNgay(); App.render(); } catch(e){}
  }, 1200);
  /* Dữ liệu trên máy đang mã hóa: thử mở bằng khóa còn trong tab, không được thì hỏi */
  if (App.choMoKhoa) {
    Mahoa.tuMo().then(ok => {
      App.choMoKhoa = !ok;
      if (!ok) { Mahoa.manHinhMo(); return; }
      if (typeof Vet !== 'undefined') Vet.chup();
      Sync.snapshot();
      App.render();
    });
  }
});
