/* Nha Khoa Hoàng Bách - Gò Quao — ứng dụng quản lý phòng khám (v1, dữ liệu lưu trên thiết bị) */
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
const SERVICE_GROUPS = ['Phục hình sứ','Phục hình tháo lắp','Trám răng','Nhổ răng','Điều trị tủy','Implant','Chỉnh nha','Nha chu','Thẩm mỹ'];

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
  ['sauNong', 'Sâu ngà nông'],
  ['sauSau',  'Sâu ngà sâu'],
  ['sauTuy',  'Sâu vỡ lớn đến tủy'],
  ['filled',  'Đã trám'],
  ['crown',   'Răng sứ'],
  ['thaolap', 'Răng tháo lắp'],
  ['implant', 'Implant'],
  ['missing', 'Mất răng'],
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
const SU_LOAI = [['crownKL', 'Kim loại'], ['crownTS', 'Toàn sứ']];
/* Một cái răng sứ trong miệng luôn ở một trong hai vai: nó là RĂNG TRỤ (răng thật
   được mài rồi bọc) hay là NHỊP CẦU (răng giả treo giữa hai trụ, bên dưới không có
   chân răng). Hỏi riêng thay vì bắt chọn trong danh sách tình trạng, vì hai chuyện
   này độc lập: nhịp cầu cũng có loại kim loại hay toàn sứ như thường. */
const SU_VAI = [['tru', 'Răng trụ (răng thật bọc sứ)'], ['nhipcau', 'Nhịp cầu (răng giả treo)']];
const laSu = s => s === 'crown' || s === 'crownKL' || s === 'crownTS';
const sChon = s => laSu(s) ? 'crown' : s;          /* giá trị hiện trong ô chọn */

/* Ba mức sâu răng — dùng ở chỗ nào chỉ cần biết "răng này đang sâu" */
const TT_SAU = ['sauNong', 'sauSau', 'sauTuy', 'caries'];
/* Chọn được mặt răng: sâu ngà nông, sâu ngà sâu, đã trám. Răng vỡ lớn đến tủy thì
   mô răng gần như không còn, đánh dấu từng mặt không còn ý nghĩa. */
const TT_CO_MAT = ['sauNong', 'sauSau', 'filled', 'caries'];
/* Lỗ dò và sưng đáy hành lang là dấu nhiễm trùng vùng chóp — chỉ hỏi ở răng đã hở
   tủy và ở răng sứ (răng sứ đã chữa tủy vẫn có thể tái nhiễm). */
const TT_CO_CHOP = ['sauTuy', 'crown', 'crownKL', 'crownTS'];
const TT_CO_NOI_NHA = ['sauNong', 'sauSau', 'filled', 'crown', 'crownKL', 'crownTS', 'caries'];
/* Hồ sơ cũ ghi 'caries' (sâu răng chưa phân độ). Không tự gán bừa một mức nào —
   giữ nguyên, chỉ cho hiện lại trong ô chọn của đúng cái răng đó, để lỡ mở ra
   lưu lại thì không bị nhảy về "Bình thường". */
const TT_CU = {caries: 'Sâu răng (hồ sơ cũ, chưa phân độ)'};
const oTinhTrang = (sNay, them) => {
  const v = sChon(sNay);
  return `<select name="s"${them || ''}>${TOOTH_STATES
    .concat(TT_CU[v] ? [[v, TT_CU[v]]] : [])
    .map(([k, l]) => `<option value="${k}"${v === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
};
const oLoaiSu = (sNay, tNay) => `<div class="f full" id="oLoaiSu" style="display:${laSu(sNay) ? '' : 'none'}">
  <label>Loại răng sứ</label><div class="check-row">${SU_LOAI.map(([k, l]) =>
    `<label><input type="radio" name="loaiSu" value="${k}"${(sNay === k || (!laSu(sNay) && k === 'crownTS')) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
  <label style="margin-top:8px">Vai trò trên cung hàm</label><div class="check-row">${SU_VAI.map(([k, l]) =>
    `<label><input type="radio" name="vaiSu" value="${k}"${((tNay && tNay.nhipCau ? 'nhipcau' : 'tru') === k) ? ' checked' : ''}> ${l}</label>`).join('')}</div></div>`;

/* 6 mặt răng. k = mã lưu, l = tên đầy đủ, z = vùng vẽ trên sơ đồ */
const TOOTH_SURF = [
  ['G',  'Mặt gần',   'gan'],
  ['X',  'Mặt xa',    'xa'],
  ['N',  'Mặt ngoài', 'ngoai'],
  ['T',  'Mặt trong', 'trong'],
  ['NH', 'Mặt nhai',  'nhai'],
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
    clinic: {name:'Nha Khoa Hoàng Bách - Gò Quao', legal:'Công ty TNHH Nha Khoa Hoàng Bách – Gò Quao',
             authority:'Sở Y tế An Giang', addr:'Số 33 đường 3/2, Xã Gò Quao, An Giang',
             phone:'0776 262 242', taxCode:'', maCSKCB:'',
             phone2:'0707 262 242',
             caSangVao:'07:00', caSangRa:'12:00', caChieuVao:'13:00', caChieuRa:'17:00',
             treCho:5, wifiIp:''},
    seq: {cust: 1, receipt: 1},
    services, staff: [], customers: [], treatments: [], receipts: [], rx: [],
    inventory: [], appointments: [], labs: [], attLog: [], bonuses: [], datlich: []};
}

function load() {
  db = null;
  try { const raw = localStorage.getItem(DB_KEY); if (raw) db = JSON.parse(raw); } catch(e){ db = null; }
  if (!db || !Array.isArray(db.customers)) db = seed();
  migrate(); save();
}
function save() {
  /* Bảng phân bổ tiền đã thu tính sẵn cho nhanh — dữ liệu đổi thì phải tính lại */
  if (typeof QT !== 'undefined') QT._thu = null;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
/* Nâng cấp dữ liệu cũ về một ô địa chỉ duy nhất (số nhà + đường gộp chung) */
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
  if (!cl.tenGQ) {
    cl.name = 'Nha Khoa Hoàng Bách - Gò Quao';
    cl.addr = 'Số 33 đường 3/2, Xã Gò Quao, An Giang';
    cl.tenGQ = 1;
  }
  /* Số điện thoại phòng khám — điền một lần cho máy nào chưa có */
  if (!cl.phone) cl.phone = '0776 262 242';
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
  {id:'inventory', label:'Kho', icon:IC.inv},
  {id:'hr', label:'Nhân sự', icon:IC.hr},
  {id:'lab', label:'Lab', icon:IC.lab},
  {id:'reports', label:'Báo cáo', icon:IC.rep},
  {id:'settings', label:'Cài đặt', icon:IC.cog},
];

const App = {
  cur:'dashboard',
  state:{calDate:todayISO(), custSel:'c1', custQ:'', treatCust:'c1', hrTab:'payroll', invQ:'', rp:{type:'month', y:(new Date()).getFullYear(), m:(new Date()).getMonth()+1, q:Math.floor((new Date()).getMonth()/3)+1}, toothSel:null},

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
      </div></div>
      <div class="note-block">Phần mềm sẽ giữ lại hồ sơ có <b>nhiều lịch sử điều trị nhất</b> của mỗi mã khách,
        và <b>chuyển toàn bộ</b> điều trị, phiếu thu, lịch hẹn, phiếu lab của hồ sơ thừa sang hồ sơ được giữ.
        Không mất dữ liệu điều trị nào.</div>
      <div class="note-block" style="background:var(--warn-soft);color:var(--warn)">
        Nên <b>sao lưu</b> (nút ⬇ góc trên) trước khi dọn, để lỡ có gì còn quay lại được.</div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button type="button" class="btn primary" onclick="App.dedupeRun()">Dọn ngay</button></div>`);
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
        <button class="btn" onclick="Svc.bang()">Bảng giá dịch vụ</button>
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
  print(html, kho){
    const a5 = kho === 'A5';
    $('#printArea').innerHTML = html;
    $('#printArea').className = a5 ? 'kho-a5' : '';
    let st = document.getElementById('printPage');
    if (!st) { st = document.createElement('style'); st.id = 'printPage'; document.head.appendChild(st); }
    st.textContent = a5 ? '@page{size:A5 portrait;margin:10mm}' : '@page{size:A4 portrait;margin:14mm}';
    setTimeout(() => window.print(), 60);
  },
};

/* ================= PHÂN QUYỀN THEO VAI TRÒ ================= */
const ROLES = {
  quanly: {label:'Quản lý',  can:['thu','luong','baocao','xoa','caidat','kho','nhansu']},
  bacsi:  {label:'Bác sĩ',   can:['thu','kho']},
  trothu: {label:'Trợ thủ',  can:['kho']},
  letan:  {label:'Lễ tân',   can:['thu']},
};
const ROLE_TABS = {
  quanly: ['dashboard','customers','calendar','treatment','inventory','hr','lab','reports','settings'],
  bacsi:  ['dashboard','customers','calendar','treatment','inventory','hr','lab'],
  trothu: ['dashboard','customers','calendar','treatment','inventory','hr','lab'],
  letan:  ['dashboard','customers','calendar','treatment','inventory','hr','lab'],
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
    const email = (Cloud.who() || '').toLowerCase();
    if (!email) return null;
    const s = db.staff.find(x => (x.email || '').toLowerCase() === email);
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
  can(x){ return (ROLES[this.role()] || ROLES.letan).can.includes(x); },
  tabs(){ return ROLE_TABS[this.role()] || ROLE_TABS.letan; },
  /* Ẩn hẳn phần tử khỏi giao diện khi không đủ quyền */
  only(x, html){ return this.can(x) ? html : ''; },
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
  form(id){
    const c = id ? custById(id) : {doiTuong:'Thu phí'};
    const f = (label, name, val, ph, type) => `<div class="f"><label>${label}</label><input name="${name}" value="${h(val||'')}" placeholder="${ph||''}" type="${type||'text'}"></div>`;
    App.modal(id ? 'Sửa hồ sơ khách hàng' : 'Thêm khách hàng (theo mẫu BA-18)', `
    <form id="custForm" class="form-grid" onsubmit="Cust.save(event,'${id||''}')">
      <div class="f"><label>Mã khách hàng</label>
        <input name="code" value="${h(c.code || Cust.maTiepTheo())}" placeholder="KH-1"
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
      ${f('11. Số CCCD / Hộ chiếu / Định danh','cccd',c.cccd)}
      ${f('Nguồn khách','source',c.source,'Facebook / Giới thiệu / Walk-in...')}
      ${f('12. Thân nhân báo tin (họ tên, quan hệ)','kinName',c.kinName)}
      ${f('Điện thoại thân nhân','kinPhone',c.kinPhone)}
      <div class="f full"><label>Dị ứng / lưu ý y khoa</label><input name="allergy" value="${h(c.allergy||'')}" placeholder="Vd: dị ứng Penicillin, tăng huyết áp..."></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">${id?'Lưu thay đổi':'Thêm khách hàng'}</button></div>
    </form>`);
  },
  /* Bấm tiêu đề cột: lần đầu sắp tăng dần, bấm lại thì đảo chiều */
  sapXep(k){
    const sx = App.state.custSort || {k:'code', d:1};
    App.state.custSort = (sx.k === k) ? {k, d: -sx.d} : {k, d: 1};
    App.render();
  },

  /* Mã kế tiếp theo bộ đếm, nhưng nhảy qua mã nào đã có người dùng */
  maTiepTheo(){
    const co = new Set(db.customers.map(x => Combo.norm(x.code || '')));
    let n = (db.seq && db.seq.cust) || 1, ma;
    do { ma = 'KH-' + n; n++; } while (co.has(Combo.norm(ma)) && n < 1e6);
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
    d.province = (d.province || '').trim();
    d.ward = (d.ward || '').trim();
    d.street = (d.street || '').trim();
    if (d.oldAddr !== undefined) d.oldAddr = (d.oldAddr || '').trim();
    if (id) { Object.assign(custById(id), d); App.toast('Đã cập nhật hồ sơ ✓'); }
    else {
      /* Bộ đếm vẫn chạy để lần sau gợi ý đúng, kể cả khi lễ tân tự đặt mã */
      db.seq.cust++;
      const c = Object.assign({id:uid(), code: d.code || ('KH-'+db.seq.cust), createdAt: d.createdAt || todayISO(),
        teeth:{}, record:{dienBien:[], vanDe:[]}}, d);
      db.customers.unshift(c); App.state.custSel = c.id; App.toast('Đã thêm khách hàng ✓');
    }
    save(); App.closeModal(); App.render();
  },
  pick(id){
    App.state.custSel = id; App.render();
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
    App.state.custSel = id;
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

  toothClick(n, lop){
    lop = lop || 'teeth';
    if (App.state.rangChon) { this.chonRang(n); return; }
    const c = custById(App.state.custSel); if (!c) return;
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
    App.modal('Răng ' + n + (Tooth.hamTren(n)?' · hàm trên':' · hàm dưới') + (Tooth.benPhai(n)?' bên phải':' bên trái')
      + (kh ? ' — SƠ ĐỒ KẾ HOẠCH' : st ? ' — SAU ĐIỀU TRỊ' : ''), `
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
        ${oTinhTrang(t.s, ' onchange="Cust.toothMatHien(this.value)"')}</div>
      ${oLoaiSu(t.s, t)}
      ${kh ? `<div class="f full"><label>Chẩn đoán</label>
        ${Combo.html('cbRangDX','chanDoan', icdName(t.chanDoan||'')||'', Cust.icdHopVoi(t.s, hienTai),
          'Gõ tên bệnh hoặc mã ICD', null, 'Mã hợp với tình trạng răng được xếp lên đầu; gõ để tra cả bảng ICD.')}</div>
      <div class="f full"><label>Kế hoạch điều trị</label>
        ${Combo.html('cbRangDV','dichVu', t.dichVu||'', Svc.goiYTen(), 'Gõ tên dịch vụ, vd: boc su, noi nha',
          null, 'Gợi ý lấy từ bảng giá phòng khám. Lưu xong bấm "Đưa vào điều trị" để tạo hạng mục.')}</div>
      <div class="f full"><label>Dịch vụ gợi ý cho tình trạng trên</label>
        <div class="check-row" id="dvGoiY" data-rang="${n}">${Cust.dvHopVoi(t.s, hienTai).map(x =>
          `<button type="button" class="btn small" onclick="Combo.pick('cbRangDV',this.dataset.v)" data-v="${h(x)}">${h(x)}</button>`).join('')
          || '<span class="sub-line">Chọn kế hoạch ở ô trên để thấy gợi ý.</span>'}</div></div>` : ''}
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
      ${kh ? '' : `<div class="note-block full">Nội nha để riêng vì răng <b>đã nội nha rồi bọc sứ</b> là chuyện thường —
        chọn "Răng sứ" mà vẫn tick được nội nha, sơ đồ hiện cả hai.</div>`}
      <div class="form-actions full">
        ${(c[lop]||{})[n]?`<button type="button" class="btn danger" onclick="Cust.toothXoa(${n},'${lop}')">Xóa đánh dấu</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        ${kh?`<button type="button" class="btn" onclick="Cust.rangSangDieuTri(${n})">Lưu &amp; đưa vào điều trị →</button>`:''}
        <button class="btn primary">Lưu</button></div>
    </form>`);
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
    const f = document.querySelector('#modalBody form');
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
    App.state.treatCust = c.id;
    setTimeout(() => Treat.itemForm(t.id), 60);
  },

  toothMatHien(v){
    const keHoach = (App.state.lopRang === 'teethKH');
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
    /* Trên sơ đồ kế hoạch: đổi kết quả mong muốn thì đổi luôn danh sách dịch vụ gợi ý */
    const gy = document.getElementById('dvGoiY');
    if (gy) {
      const c = custById(App.state.custSel);
      const n = +(gy.dataset.rang || 0);
      const ds = this.dvHopVoi(v, c && (c.teeth||{})[n]);
      gy.innerHTML = ds.map(x => `<button type="button" class="btn small" onclick="Combo.pick('cbRangDV',this.dataset.v)" data-v="${h(x)}">${h(x)}</button>`).join('')
        || '<span class="sub-line">Không có dịch vụ nào hợp — cứ gõ tự do ở ô trên.</span>';
    }
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
    /* "Răng sứ" trong ô chọn -> lưu xuống là crownKL hay crownTS tùy loại đã tick */
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
      c[lop][n] = {s:d.s, mat, nn, loDo, sung, note:d.note, dichVu:(d.dichVu||'').trim(),
        chanRang: d.s === 'thaolap' && !!f.querySelector('[name="chanRang"]:checked'),
        nhipCau: laSu(d.s) && ((f.querySelector('[name="vaiSu"]:checked')||{}).value === 'nhipcau'),
        chanDoan: icdCode((d.chanDoan||'').trim()), dv: cu.dv || []};
      /* Đánh dấu "sửa tay" để lần dựng lại sơ đồ sau điều trị không ghi đè */
      if (lop === 'teethST') c[lop][n].tay = 1;
    }
    this.luuHamKhung(f, c, lop, [n]);
    save(); App.closeModal(); App.render();
    App.toast('Đã lưu răng ' + n
      + (lop === 'teethKH' ? ' (kế hoạch) ✓' : lop === 'teethST' ? ' (sau điều trị) ✓' : ' ✓'));
  },
  toothXoa(n, lop){
    lop = lop || 'teeth';
    const c = custById(App.state.custSel);
    if (c[lop]) delete c[lop][n];
    save(); App.closeModal(); App.render(); App.toast('Đã xóa đánh dấu răng ' + n);
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
    App.state.rangChon = ds; App.render();
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
      else c.teeth[n] = {s: d.s, mat, nn, loDo, sung, note,
        chanRang: d.s === 'thaolap' && !!f.querySelector('[name="chanRang"]:checked'),
        nhipCau: laSu(d.s) && ((f.querySelector('[name="vaiSu"]:checked')||{}).value === 'nhipcau')};
    });
    this.luuHamKhung(f, c, 'teeth', ds);
    c._up = Date.now();
    App.state.rangChon = null;
    save(); App.closeModal(); App.render();
    App.toast('Đã ghi tình trạng cho ' + ds.length + ' răng ✓');
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
        ${Combo.html('cbNhieuDV','dichVu', '', Svc.goiYTen(), 'Gõ tên dịch vụ, vd: boc su, tram',
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
  dongBoChanDoan(c){
    const ds = this.vanDe(c);
    if (!c.record) c.record = {};
    if (!ds.length) return;
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
      <td><b>${h(icdName(v.icd))}</b>${v.note?`<br><span class="sub-line">${h(v.note)}</span>`:''}</td>
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
      <div class="f"><label>Ngày</label><input type="date" name="date" value="${h((v&&v.date)||todayISO())}" required></div>
      <div class="f"><label>Bác sĩ thực hiện</label><select name="doctorId">
        <option value="">— chưa ghi —</option>
        ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${v&&v.doctorId===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`).join('')}</select></div>
      <div class="f"><label>Người phụ (trợ thủ)</label><select name="assistantId">
        <option value="">— không có —</option>
        ${db.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}"${v&&v.assistantId===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`).join('')}</select></div>
      <div class="f full"><label>Điền nhanh theo mẫu phòng khám</label>
        <select onchange="Cust.mauBuoi(this)">
          <option value="">— chọn buổi điều trị theo mẫu —</option>
          ${GY.buoiCho(HoSo.lyDoDang(c)).map((b, i) =>
            `<option value="${i}">${h(b.ten)}${b.l ? ' · ' + h(b.l) : ''}</option>`).join('')
            || '<option value="" disabled>Điền lý do vào viện trong Bệnh án điện tử trước</option>'}</select>
        <div class="combo-hint">Câu chữ lấy đúng từ mẫu "Phiếu theo dõi điều trị" của phòng khám — chọn xong sửa lại tùy ý.</div></div>
      <div class="f full"><label>Thuộc đợt điều trị</label><select name="episodeId">
        <option value="">— không gắn đợt nào —</option>
        ${Dot.cua(c.id).map(e=>`<option value="${e.id}"${(v?v.episodeId:(Dot.dangChon(c)||{}).id)===e.id?' selected':''}>${h(e.ten||'(chưa đặt tên)')} — ${fmtD(e.tuNgay)}</option>`).join('')}</select></div>
      <div class="f full"><label>Diễn biến bệnh</label><textarea name="db" rows="3" required>${h((v&&v.db)||'')}</textarea></div>
      <div class="f full"><label>Chỉ định — xử trí</label><textarea name="xt" rows="3">${h((v&&v.xt)||'')}</textarea></div>
      <div class="f full"><label>Dặn dò sau điều trị</label><textarea name="dan" rows="2">${h((v&&v.dan)||'')}</textarea></div>
      <div class="form-actions full">
        ${vid?`<button type="button" class="btn danger" onclick="Cust.visitDel('${vid}','${c.id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button>
        <button class="btn primary">${v?'Lưu':'Thêm'}</button></div>
    </form>`);
  },
  /* Chọn một buổi trong mẫu -> đổ thẳng vào ba ô diễn biến / chỉ định / dặn dò */
  mauBuoi(sel){
    const c = this.aiDangXem(); if (!c || sel.value === '') return;
    const b = GY.buoiCho(HoSo.lyDoDang(c))[+sel.value]; if (!b) return;
    const f = sel.closest('form'); if (!f) return;
    const dat = (n, v) => { const o = f.querySelector(`[name="${n}"]`); if (o && v) o.value = v; };
    dat('db', b.db); dat('xt', b.cd); dat('dan', b.dan);
    sel.value = '';
    App.toast('Đã điền theo mẫu — sửa lại tùy ý');
  },
  visitSave(ev, vid, cid){
    ev.preventDefault();
    const c = custById(cid) || this.aiDangXem(); if (!c) return;
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!c.record) c.record = {};
    if (!c.record.dienBien) c.record.dienBien = [];
    const cu = vid && c.record.dienBien.find(x => x.id === vid);
    if (cu) Object.assign(cu, d);
    else c.record.dienBien.push(Object.assign({id: uid()}, d));
    save(); App.closeModal(); App.render(); App.toast(cu ? 'Đã lưu diễn biến ✓' : 'Đã thêm diễn biến ✓');
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
        <b>${h(v.db)}</b><p>${h(v.xt||'')}${bs?` <span class="sub-line">· BS ${h(bs.name)}</span>`:''}${
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
    if (App.state.custSel===id) App.state.custSel = db.customers[0] && db.customers[0].id;
    save(); App.render(); App.toast('Đã xóa hồ sơ');
  },
};

SCREENS.customers = () => {
  const q = Combo.norm(App.state.custQ);
  /* Tìm theo tên, số điện thoại hoặc mã KH */
  const filtered = !q ? db.customers.slice() : db.customers.filter(c =>
    Combo.norm(c.name).includes(q)
    || (c.phone||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')) && /\d/.test(q)
    || Combo.norm(c.code||'').includes(q));
  /* Sắp xếp theo cột đang chọn, bấm lại tiêu đề cột thì đảo chiều */
  const sx = App.state.custSort || {k:'code', d:1};
  const codeNum = c => { const m = String(c.code||'').match(/(\d+)/); return m ? +m[1] : Infinity; };
  const khoa = {
    code: c => [codeNum(c), String(c.code||'')],
    name: c => [Combo.norm(c.name||'')],
    kham: c => [custLastVisit(c) || ''],
    no:   c => [custDebt(c)],
  };
  const lay = khoa[sx.k] || khoa.code;
  const list = filtered.sort((a,b) => {
    const x = lay(a), y = lay(b);
    for (let i = 0; i < x.length; i++) {
      if (x[i] < y[i]) return -sx.d;
      if (x[i] > y[i]) return sx.d;
    }
    return 0;
  });
  const th = (k, nhan, phai) => `<th class="${phai?'r ':''}sap ${sx.k===k?'dang':''}" onclick="Cust.sapXep('${k}')"
    title="Bấm để sắp xếp">${nhan}<span class="sap-mui">${sx.k===k?(sx.d>0?'▲':'▼'):'⇅'}</span></th>`;
  const rows = list.map(c => {
    const debt = custDebt(c);
    const lastV = custLastVisit(c);
    return `<tr class="clickable ${c.id===App.state.custSel?'sel-row':''}" onclick="Cust.pick('${c.id}')">
      <td><span class="cell-who"><span class="avatar">${h(c.name.split(' ').slice(-1)[0].slice(0,2))}</span><span><b>${h(c.name)}</b><span>${h(c.phone||'')} · ${c.gender||''}${c.dob?', '+c.dob.slice(0,4):''}</span></span></span></td>
      <td class="num">${h(c.code)}</td><td class="num">${lastV?fmtD(lastV):'—'}</td>
      ${Perm.can('thu') ? `<td class="r num" ${debt?'style="color:var(--danger);font-weight:600"':''}>${money(debt)}</td>` : ''}</tr>`;
  }).join('') || '<tr><td colspan="4" class="sub-line">Không tìm thấy khách hàng.</td></tr>';

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
        <button class="btn small" onclick="App.state.treatCust='${c.id}';App.go('treatment')">Điều trị & thu tiền →</button>
        ${Perm.only('xoa', `<button class="btn small danger" onclick="Cust.del('${c.id}')">Xóa</button>`)}</div>
      <div class="card-b">
        <div class="form-grid" style="gap:8px 16px">
          <div class="f"><label>Ngày sinh</label><b class="num">${fmtD(c.dob)}</b></div>
          <div class="f"><label>Điện thoại</label><b class="num">${h(c.phone||'—')}</b></div>
          <div class="f"><label>Địa chỉ</label><b>${h(fullAddr(c)||'—')}</b></div>
          <div class="f"><label>Đối tượng · CCCD</label><b>${h(c.doiTuong||'—')} · ${h(c.cccd||'—')}</b></div>
          <div class="f"><label>Thân nhân báo tin</label><b>${h(c.kinName||'—')} ${c.kinPhone?'· '+h(c.kinPhone):''}</b></div>
          <div class="f"><label>Nguồn khách</label><b>${h(c.source||'—')}</b></div>
        </div>
        <div class="check-row" style="margin-top:8px">${tags.join(' ')}</div>
      </div>
    </div>
    ${(() => {
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
        {k: 'teeth',   so: 1, ten: 'Khám tình trạng ban đầu',
         mo: soHT ? soHT + ' răng đã ghi' : 'chưa ghi răng nào', xong: soHT > 0},
        {k: 'teethKH', so: 2, ten: 'Lên kế hoạch điều trị',
         mo: soKH ? soKH + ' răng · ' + money(tienKH) : 'chưa có kế hoạch', xong: soKH > 0},
        {k: 'teethST', so: 3, ten: 'Tình trạng sau điều trị',
         mo: soST ? soST + ' răng đã xong' : 'chưa có gì', xong: soST > 0},
      ];
      const iNay = BUOC.findIndex(b => b.k === lop);

      return `<div class="card mb">
      <div class="card-h"><h2>Sơ đồ răng</h2>
        <span class="hint">${sauDT ? 'nhấn vào răng để xem lịch sử điều trị của răng đó' : 'nhấn vào răng để ghi tình trạng'}</span><span class="spacer"></span>
        ${keHoach ? `<button class="btn small" onclick="Cust.chepSangKH()">Chép lại từ hiện trạng</button>
          ${coKH?`<button class="btn small danger" onclick="Cust.xoaKH()">Xóa kế hoạch</button>`:''}` : ''}
        ${sauDT ? `<button class="btn small primary" onclick="Cust.dungST()">Dựng lại từ hạng mục đã hoàn tất</button>
          ${coST?`<button class="btn small danger" onclick="Cust.xoaST()">Xóa sơ đồ</button>`:''}` : ''}</div>
      <div class="card-b">
        <div class="quy-trinh">${BUOC.map((b, i) => `${i ? '<span class="qt-noi"></span>' : ''}
          <button class="buoc ${b.k === lop ? 'dang' : ''} ${b.xong ? 'xong' : ''}" onclick="Cust.doiLopRang('${b.k}')">
            <span class="buoc-so">${b.xong && b.k !== lop ? '✓' : b.so}</span>
            <span class="buoc-chu"><b>${b.ten}</b><span class="buoc-mo">${h(b.mo)}</span></span>
          </button>`).join('')}</div>

        ${lop === 'teeth' ? `<div class="note-block mb">Bấm vào từng răng để ghi <b>tình trạng lúc mới đến khám</b>:
          sâu mặt nào, đã trám, răng sứ, mất răng, lỗ dò… Đây là sơ đồ gốc, hai bước sau đều dựa vào nó
          và không sửa ngược lại nó.
          ${App.state.rangChon ? '' : `<br>Nhiều răng <b>cùng một tình trạng</b> (mất nhiều răng, cao răng cả hàm)?
            Bấm <button type="button" class="link-btn" onclick="Cust.batChonNhieu()">Chọn nhiều răng</button>
            rồi quét qua các răng đó, ghi một lần cho cả nhóm.`}</div>` : ''}
        ${keHoach ? `<div class="note-block mb">Bấm vào răng cần làm: ô <b>Tình trạng hiện tại</b> đã lấy sẵn từ bước 1,
          bạn chỉ cần chọn <b>chẩn đoán</b> và <b>dịch vụ sẽ làm</b>.
          ${App.state.rangChon ? '' : `<br>Làm <b>cùng một dịch vụ cho nhiều răng</b> (cầu răng, niềng, tháo lắp)?
            Bấm <button type="button" class="link-btn" onclick="Cust.batChonNhieu()">Chọn nhiều răng</button>
            rồi quét qua các răng đó, phần mềm gộp thành một hạng mục có số lượng.`}</div>` : ''}
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
        <div class="qt-chan">
          ${iNay > 0 ? `<button class="btn small" onclick="Cust.doiLopRang('${BUOC[iNay-1].k}')">← Bước ${BUOC[iNay-1].so}: ${BUOC[iNay-1].ten}</button>` : '<span></span>'}
          <span class="spacer"></span>
          ${iNay === 0 ? `<button class="btn ${App.state.rangChon?'':'primary'}" onclick="Cust.batChonNhieu()">
              ${App.state.rangChon ? 'Thoát chọn nhiều răng' : 'Chọn nhiều răng cùng lúc'}</button>
            <button class="btn primary" onclick="Cust.doiLopRang('teethKH')">Xong khám — sang bước 2: lên kế hoạch →</button>` : ''}
          ${iNay === 1 ? `<button class="btn ${App.state.rangChon?'':'primary'}" onclick="Cust.batChonNhieu()">
              ${App.state.rangChon ? 'Thoát chọn nhiều răng' : 'Chọn nhiều răng cùng lúc'}</button>
            <button class="btn primary" onclick="Cust.doiLopRang('teethST')">Xong kế hoạch — sang bước 3 →</button>` : ''}
          ${iNay === 2 ? `<button class="btn primary" onclick="App.go('treatment')">Sang tab Điều trị để thu tiền →</button>` : ''}
        </div>
      </div>
    </div>`;
    })()}
    ${Cal.cardKhachHTML(c)}
    ${HoSo.cardHTML(c)}
    ${Photo.cardHTML(c)}
    <div class="card">
      <div class="card-h"><h2>Quá trình điều trị</h2><span class="hint">bấm vào một dòng để sửa</span><span class="spacer"></span>
        <button class="btn small" onclick="Cust.visitForm('','${c.id}')">${IC.plus} Thêm diễn biến</button></div>
      <div class="card-b"><div class="timeline">${Cust.timelineHTML(c)}</div></div>
    </div>`;
  }

  return `
  <div class="page-head"><h1>Khách hàng</h1><span class="spacer"></span>
    ${Perm.only('caidat', `<button class="btn" onclick="App.dedupeForm()">Dọn trùng lặp</button>`)}
    <button class="btn" onclick="Importer.anhForm()">${IC.cam} Nhập từ ảnh chụp</button>
    <button class="btn primary" onclick="Cust.form()">${IC.plus} Thêm khách hàng</button>
    <div class="sub">${db.customers.length} hồ sơ · thông tin hành chính theo mẫu BA-18</div></div>
  <div class="searchbar">${IC.search}<input placeholder="Tìm theo tên, số điện thoại, mã KH..." value="${h(App.state.custQ)}"
    oninput="App.state.custQ=this.value;App.render();const i=document.querySelector('.searchbar input');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
  <div class="card mb"><div class="tbl-wrap"><table>
    <thead><tr>${th('name','Khách hàng')}${th('code','Mã')}${th('kham','Khám gần nhất')}${Perm.can('thu')?th('no','Công nợ',1):''}</tr></thead>
    <tbody id="custRows">${rows}</tbody></table></div></div>
  ${detail}`;
};

/* ---------- Lịch hẹn ---------- */
const Cal = {
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
  form(id){
    const a = id ? db.appointments.find(x=>x.id===id) : {date:App.state.calDate, time:'09:00', dur:30, status:'Chờ xác nhận'};
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
      <div class="f"><label>Bác sĩ</label><select name="doctorId">${db.staff.filter(s=>s.role.includes('Bác sĩ')).map(s=>`<option value="${s.id}"${a.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
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
  setCust(id){ App.state.treatCust = id; App.render(); },
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
  themChoRang(rang){
    App.closeModal();
    setTimeout(() => {
      this.itemForm();
      const f = document.querySelector('#modalBody form');
      const o = f && f.querySelector('[name="tooth"]');
      if (o) { o.value = rang; if (typeof Treat.tinhLai === 'function') Treat.tinhLai(); }
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
        <div class="combo-hint">Sửa tên, loại hoặc giá dịch vụ ở
          <button type="button" class="link-btn" onclick="Svc.bang()">Bảng giá dịch vụ</button>.</div></div>
      <input type="hidden" name="group" value="${h(t.group||'')}">
      <div class="f full"><label>Răng / vị trí</label>
        <input name="tooth" value="${h(t.tooth||'')}" placeholder="Vd: 36, 37, 46 — cách nhau bằng dấu phẩy" oninput="Treat.tinhLai()">
        <div class="combo-hint">Ghi nhiều răng thì <b>số lượng tự đếm theo số răng</b>. Ghi kiểu "2 hàm" thì số lượng để 1.</div></div>
      <div class="f"><label>Đơn giá / răng (₫)</label>${Tien.o('donGia', t.donGia != null ? t.donGia : t.price, 'required oninput="Treat.tinhLai()"')}</div>
      <div class="f"><label>Số lượng</label><input type="number" name="sl" min="1" step="1" value="${t.sl||1}" oninput="Treat.tinhLai()"></div>
      <div class="f"><label>Giảm giá (%)</label><input type="number" name="giamPct" min="0" max="100" step="0.5" value="${t.giamPct||''}" placeholder="0" oninput="Treat.tinhLai()"></div>
      <div class="f"><label>Giảm thêm (₫)</label>${Tien.o('giamTien', t.giamTien, 'oninput="Treat.tinhLai()"')}</div>
      <div class="f full"><div class="note-block" id="thanhTien"></div></div>
      <div class="f"><label>Bác sĩ</label><select name="doctorId">
        <option value="">— chưa phân —</option>
        ${db.staff.filter(s=>s.active!==false && (Perm.roleOf(s)==='bacsi' || /bác sĩ/i.test(s.role||'')))
          .map(s=>`<option value="${s.id}"${t.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Người phụ (trợ thủ)</label><select name="assistantId">
        <option value="">— không có —</option>
        ${db.staff.filter(s=>s.active!==false && s.id!==t.doctorId)
          .map(s=>`<option value="${s.id}"${t.assistantId===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`).join('')}</select></div>
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
  payForm(){
    const c = custById(App.state.treatCust);
    const debt = custDebt(c);
    App.modal('Thu tiền — ' + c.name, `
    <form class="form-grid" onsubmit="Treat.paySave(event)">
      <div class="f full"><label>Nội dung</label><input name="desc" required placeholder="Vd: Trả góp đợt 2 — bọc sứ R36"></div>
      <div class="f"><label>Số tiền (₫)</label>${Tien.o('amount', debt, 'required')}</div>
      <div class="f"><label>Hình thức</label><select name="method">${PAY_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="f"><label>Bác sĩ thực hiện</label><select name="doctorId">${db.staff.filter(s=>s.role.includes('Bác sĩ')).map(s=>`<option value="${s.id}">${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Nhóm dịch vụ (tính hoa hồng)</label><select name="group">${SERVICE_GROUPS.concat(['Khác']).map(g=>`<option>${g}</option>`).join('')}</select></div>
      <div class="f"><label>Người thu tiền</label><select name="staffId">
        ${db.staff.filter(s=>s.active!==false).map(s=>{const me=Att.myStaff();
          return `<option value="${s.id}"${me&&me.id===s.id?' selected':''}>${h(s.name)}${s.role?' · '+h(s.role):''}</option>`;}).join('')}</select></div>
      <div class="note-block full">Công nợ hiện tại của khách: <b>${money(debt)}</b>. Phiếu thu sẽ vào sổ quỹ và bảng hoa hồng tự động.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lập phiếu thu</button></div>
    </form>`);
  },
  paySave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const me = Att.myStaff();
    const r = {id:uid(), no:'PT-'+(db.seq.receipt++), date:todayISO(), customerId:App.state.treatCust, desc:d.desc, method:d.method, amount:num(d.amount), staffId:d.staffId || (me?me.id:''), doctorId:d.doctorId, group:d.group, invoice:null};
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
    r.code = '79-' + (c.code||'').replace('KH-','') + '-' + r.date.replace(/-/g,'').slice(2) + '-' + Math.floor(1000+Math.random()*9000);
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
  const cid = App.state.treatCust || (db.customers[0] && db.customers[0].id);
  App.state.treatCust = cid;
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
    <td>${h((staffById(t.doctorId)||{}).name||'—')}${phu?`<br><span class="sub-line">phụ: ${h(phu.name)}</span>`:''}</td>
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

  return `
  <div class="page-head"><h1>Điều trị & thanh toán</h1><span class="spacer"></span>
    <span style="min-width:300px;flex:2;max-width:620px">${Combo.html('cbTreatCust','treatCust', custLabel(c), custOptions(),
      'Đổi khách: gõ tên, SĐT hoặc mã KH', Treat.onCustPick)}</span>
    <button class="btn primary" onclick="Treat.payForm()">Thu tiền</button></div>
  <div class="card mb"><div class="card-b" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">
    <div style="flex:1;min-width:200px">
      <b style="font-size:15px">${h(c.name)}</b> <span class="sub-line">· ${h(c.code||'')}</span><br>
      <span class="sub-line">${h(c.phone||'chưa có SĐT')} · ${fmtD(c.dob)||'chưa có ngày sinh'} · ${h(fullAddr(c)||'chưa có địa chỉ')}</span>
      ${c.allergy?`<br><span class="pill danger">⚕ ${h(c.allergy)}</span>`:''}
    </div>
    <button class="btn small" onclick="Cust.moHoSo('${c.id}')">Xem hồ sơ đầy đủ →</button>
  </div></div>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="card kpi"><div class="k-label">Tổng kế hoạch (đã duyệt)</div><div class="k-value num">${money(total)}</div><div class="k-note">${items.length} hạng mục · ${items.filter(t=>t.status==='Báo giá').length} đang báo giá</div></div>
    <div class="card kpi"><div class="k-label">Đã thanh toán</div><div class="k-value num" style="color:var(--ok)">${money(paid)}</div><div class="k-note">${total?Math.min(100,Math.round(paid/total*100)):0}% kế hoạch</div></div>
    <div class="card kpi"><div class="k-label">Còn lại</div><div class="k-value num" ${debt?'style="color:var(--danger)"':''}>${money(debt)}</div><div class="k-note">${debt?'nhắc khách theo lịch trả góp':'không còn công nợ'}</div></div>
  </div>
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
  <div class="card mb"><div class="card-h"><h2>Kế hoạch điều trị — ${h(c.name)}</h2><span class="spacer"></span>
    <button class="btn small" onclick="Svc.bang()">Bảng giá · sửa giá dịch vụ</button>
    <button class="btn small" onclick="Treat.itemForm()">${IC.plus} Thêm hạng mục</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Hạng mục</th><th>Răng</th><th>Bác sĩ · người phụ</th><th>Trạng thái</th><th class="r">Đơn giá</th><th>Công đoạn</th></tr></thead><tbody>${itemRows}</tbody></table></div></div>
  <div class="card mb"><div class="card-h"><h2>Quá trình điều trị</h2><span class="hint">bấm vào một dòng để sửa</span><span class="spacer"></span>
    <button class="btn small" onclick="Cust.visitForm('','${c.id}')">${IC.plus} Thêm diễn biến</button></div>
    <div class="card-b"><div class="timeline">${Cust.timelineHTML(c)}</div></div></div>
  <div class="card mb"><div class="card-h"><h2>Đơn thuốc</h2><span class="hint">liên thông Đơn thuốc quốc gia</span><span class="spacer"></span>
    <button class="btn small" onclick="Treat.rxForm()">${IC.plus} Kê đơn mới</button></div>
    <div class="card-b">${rxBlocks}</div></div>
  <div class="card"><div class="card-h"><h2>Phiếu thu</h2><span class="hint">hóa đơn điện tử Viettel SInvoice</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Ngày / Số</th><th>Nội dung</th><th class="r">Số tiền</th><th>Hóa đơn điện tử</th><th></th></tr></thead><tbody>${recRows}</tbody></table></div></div>`;
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
        </div>
        <div class="hsf-nut">
          <button class="btn small primary" onclick="HoSo.dien('${d.k}')">${daDien?'Sửa':'Điền'}</button>
          ${d.k === 'ba18' ? `<button class="btn small" onclick="Cust.vanDeBang()">Chẩn đoán</button>` : ''}
          <button class="btn small" onclick="HoSo.in('${d.k}')">${IC.print} In</button>
        </div></div>`;
    };

    return `<div class="card mb"><div class="card-h"><h2>Bệnh án điện tử</h2>
      <span class="hint">điền trên máy rồi in khổ A4</span></div>
      <div class="card-b">${this.DS.map(dong).join('')}</div></div>`;
  },

  /* ---------- Hộp thoại điền ---------- */
  dien(k){
    const c = custById(App.state.custSel); if (!c) { App.toast('Chưa chọn khách hàng'); return; }
    const ep = Dot.dangChon(c);
    /* Bệnh án ngoại trú là của khách nên lập được ngay, chưa cần đợt nào */
    if (!ep && !this.cuaKhach(k)) { App.toast('Mở một đợt điều trị trước đã'); Dot.form(); return; }
    const E = ep || {};
    const than = this['f_' + k];
    if (!than) { App.toast('Chưa có mẫu này'); return; }
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
    App.print(fn.call(this, c, ep || {}));
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
      ['12. Thân nhân báo tin', c.kinName ? c.kinName + (c.kinPhone ? ' · ' + c.kinPhone : '') : ''],
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
    ${this.dau(c, 'BỆNH ÁN NGOẠI TRÚ<br>RĂNG HÀM MẶT', 'MS: BA-18')}
    <h2>A. THÔNG TIN CHUNG</h2>
    <table class="no-border">
      <tr><td style="width:22%">1. Họ và tên:</td><td colspan="3"><b>${h((c.name||'').toUpperCase())}</b></td></tr>
      <tr><td>2. Ngày sinh:</td><td style="width:30%">${c.dob?fmtD(c.dob):'……/……/………'} — Tuổi: ${this.gach(this.tuoi(c),4)}</td>
          <td style="width:16%">3. Giới tính:</td><td>${this.o(c.gender==='Nam','Nam')} &nbsp; ${this.o(c.gender==='Nữ','Nữ')}</td></tr>
      <tr><td>4. Điện thoại:</td><td>${this.gach(c.phone,18)}</td><td>5. Nghề nghiệp:</td><td>${this.gach(g('job',c.job),22)}</td></tr>
      <tr><td>6. Dân tộc:</td><td>${this.gach(g('danToc',c.danToc),14)}</td><td>7. Quốc tịch:</td><td>${this.gach(g('quocTich','Việt Nam'),14)}</td></tr>
      <tr><td>8. Địa chỉ:</td><td colspan="3">${this.gach(fullAddr(c),90)}</td></tr>
      <tr><td>9. Đối tượng:</td><td colspan="3">${this.o(c.doiTuong==='BHYT','BHYT')} &nbsp; ${this.o(!c.doiTuong||c.doiTuong==='Thu phí','Thu phí')} &nbsp; ${this.o(c.doiTuong==='Miễn','Miễn')} &nbsp; ${this.o(c.doiTuong==='Khác','Khác')}</td></tr>
      <tr><td>10. Số thẻ BHYT:</td><td colspan="3">${this.gach(c.bhyt,40)}</td></tr>
      <tr><td>11. Số Căn cước:</td><td colspan="3">${this.gach(c.cccd,40)}</td></tr>
      <tr><td>12. Thân nhân báo tin:</td><td colspan="3">${this.gach(c.kinName,32)} — Điện thoại: ${this.gach(c.kinPhone,18)}</td></tr>
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
      4. Tóm tắt bệnh án: ${this.gach(g('tomTat'),62)}</p>
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
    <p style="margin-top:8px"><b>VII. THỜI GIAN ĐIỀU TRỊ</b><br>Điều trị từ ngày ${tuN} đến ngày ${denN}</p>
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
      return `<tr><td style="width:104px">${fmtD(v.date)}</td>
        <td>${h(v.db||'')}</td>
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
    if (t.nn && TT_CO_NOI_NHA.includes(t.s)) g.push(`<path d="M16 6v20" stroke="var(--warn)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="28" r="2.6" fill="var(--warn)"/>`);
    return g.length ? `<svg class="tooth-ov" viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">${g.join('')}</svg>` : '';
  },
  /* Câu mô tả ngắn để hiện khi rê chuột và in ra bệnh án */
  moTa(n, t){
    if (!t || (t.s === 'ok' && !t.nn && !t.loDo && !t.sung && !(t.mat||[]).length && !t.note)) return 'Bình thường';
    const p = [];
    const ten = (TOOTH_STATES.find(x=>x[0]===t.s)||[])[1];
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
      const dangChon = (App.state.rangChon || []).includes(n);
      return `<button class="tooth ${co?'co-van-de':''} ${khac?'doi-theo-kh':''} ${dangChon?'dang-chon':''}"
        onclick="Cust.toothClick(${n},'${lop}')" title="Răng ${n} — ${h(this.moTa(n,t))}">
        <span class="tooth-svg">${this.svg(n,t)}${this.deLen(n,t)}</span>
        <span class="tooth-no num">${n}</span></button>`;
    }).join('');
    return `<div class="arch-lb"><span>Hàm trên · phải bệnh nhân</span><span>trái bệnh nhân</span></div>
      <div class="arch" style="margin-bottom:10px">${hang(TEETH_UP.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_UP.slice(8))}</div>
      <div class="arch">${hang(TEETH_DN.slice(0,8))}<span class="gap-mid"></span>${hang(TEETH_DN.slice(8))}</div>
      <div class="arch-lb"><span>Hàm dưới · phải bệnh nhân</span><span>trái bệnh nhân</span></div>`;
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
      <span><i class="lg-mat"></i>Mất răng</span>
      <span><i class="lg-lodo"></i>Lỗ dò</span>
      <span><i class="lg-sung"></i>Sưng đáy hành lang</span>
    </div>
    <div class="combo-hint" style="margin-top:8px">Mỗi răng chia 5 vùng — <b>trên/dưới là mặt ngoài và mặt trong</b> (đổi chiều theo hàm trên hay hàm dưới),
      <b>trái/phải là mặt gần và mặt xa</b> (mặt gần luôn quay về đường giữa), <b>ô giữa là mặt nhai</b>.
      Vạch dưới cùng là <b>cổ răng</b>. Rê chuột vào từng vùng để xem tên mặt.</div>`;
  },
};

/* ---------- Bảng giá dịch vụ ---------- */
const NHOM_DV = ['Chẩn đoán hình ảnh','Nha chu','Trám răng','Nhổ răng','Điều trị tủy',
                 'Phục hình sứ','Phục hình tháo lắp','Implant','Chỉnh nha','Thẩm mỹ',
                 'Răng trẻ em','Khác'];
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
      .sort((a, b) => thu(a.group) - thu(b.group) || String(a.name).localeCompare(String(b.name), 'vi'))
      .map(x => ({t: x.name, s: (x.group || '') + (coGia && x.price ? ' · ' + money(x.price) : '')}));
  },

  /* Gợi ý chỉ có TÊN dịch vụ — dùng cho ô hẹp như "Kế hoạch điều trị" của từng răng,
     ở đó tên nhóm hiện bên phải làm chữ chồng lên nhau, đọc không ra. */
  goiYTen(){ return this.goiY().map(x => x.t); },

  bang(q){
    if (q != null) App.state.svcQ = q;
    const tim = Combo.norm(App.state.svcQ || '');
    const sua = Perm.can('caidat');
    const loc = ds => ds.filter(s => !tim || Combo.norm(s.name).includes(tim) || Combo.norm(s.group||'').includes(tim));
    const theoNhom = NHOM_DV.map(g => ({g, ds: loc(db.services.filter(s => s.group === g))}))
      .concat([{g:'(chưa xếp nhóm)', ds: loc(db.services.filter(s => !NHOM_DV.includes(s.group)))}])
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

  /* ---------- Ca làm việc: sáng 7–12, chiều 13–17 ----------
     Giờ nghỉ trưa 12–13 nằm ngoài cả hai ca nên không được tính công. Nhờ vậy người
     ở lại buổi trưa và người về rồi quay lại đều ra cùng số giờ, khỏi phải chấm công
     bốn lần một ngày. Ai về trưa không quay lại thì chỉ được công buổi sáng. */
  ca(){
    const c = db.clinic || {};
    return [{ten:'Sáng',  s: hm2m(c.caSangVao  || '07:00'), e: hm2m(c.caSangRa  || '12:00')},
            {ten:'Chiều', s: hm2m(c.caChieuVao || '13:00'), e: hm2m(c.caChieuRa || '17:00')}];
  },
  phutChuan(){ return this.ca().reduce((s,c) => s + Math.max(0, c.e - c.s), 0); },
  moTaCa(){ const c = this.ca(); return `Sáng ${m2hm(c[0].s)}–${m2hm(c[0].e)} · Chiều ${m2hm(c[1].s)}–${m2hm(c[1].e)}`; },

  /* Tính một ngày công: số phút làm thật, trễ bao lâu, về sớm bao lâu, làm buổi nào */
  tinh(log){
    const r = {phut:0, cong:0, tre:0, som:0, buoi:[], veTrua:false, dangLam:false};
    if (!log || !log.inAt) return r;
    const ca = this.ca(), cho = +(db.clinic.treCho ?? 5);
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
    r.cong = this.phutChuan() ? r.phut / this.phutChuan() : 0;
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
        <div class="sub-line">Chấm công hôm nay · ${h(st.name)} · ${h(this.moTaCa())}</div>
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
            <div class="sub-line" style="margin-top:8px">${h(Att.moTaCa())} · nghỉ trưa không tính công</div>
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
          <button class="btn small" onclick="HR.staffForm('${s.id}')">Sửa</button>
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
        <button type="button" class="btn" onclick="HR.staffForm()">${IC.plus} Thêm nhân viên</button>
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
      App.render();
      App.toast('Xin chào ' + ((Att.myStaff() || {}).name || Cloud.who()));
    } catch(e){ App.toast('Đăng nhập không được: ' + e.message); }
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
      <div class="note-block full">Khoảng <b>giữa hai ca là giờ nghỉ trưa, không tính công</b>. Nhờ vậy người ở lại buổi trưa
        và người về rồi quay lại đều ra cùng số giờ — không ai phải chấm công bốn lần một ngày.
        Ai về trưa rồi nghỉ luôn thì phần mềm chỉ tính công buổi sáng.</div>
      <div class="f"><label>Điện thoại phòng khám</label><input name="phone" value="${h(db.clinic.phone||'')}" placeholder="0776 262 242"></div>
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
    db.clinic.treCho = Math.max(0, +d.treCho || 0);
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
  MAU: [
    {id:'qt_su', ten:'Phục hình sứ', nhom:['Phục hình sứ'], truLab:true,
     labGY:[['Sứ kim loại',180000],['Titan',280000],['Zirconia',600000]],
     buoc:[
      {b:'su_tv',   t:'Tư vấn',                          p:10},
      {b:'su_mai',  t:'Mài cùi',                         p:30},
      {b:'su_ld',   t:'Lấy dấu + che cùi / làm răng tạm', p:10},
      {b:'su_thu',  t:'Thử răng / thử sườn',             p:10},
      {b:'su_gtam', t:'Gắn tạm sứ',                      p:15},
      {b:'su_gsht', t:'Gắn sứ hoàn tất (GSHT)',          p:15},
      {b:'su_chinh',t:'Chỉnh ê / đau',                   p:2},
     ]},
    {id:'qt_tlban', ten:'Tháo lắp bán hàm', nhom:[], truLab:true, labGY:[],
     buoc:[
      {b:'tlb_tv',  t:'Tư vấn',                     p:10},
      {b:'tlb_ld',  t:'LD + mài chỉnh sơ khởi',     p:25},
      {b:'tlb_thu', t:'Thử răng / thử khung',       p:20},
      {b:'tlb_giao',t:'Giao hàm',                   p:25},
      {b:'tlb_dau', t:'Chỉnh đau',                  p:5},
     ]},
    {id:'qt_tltoan', ten:'Tháo lắp toàn hàm', nhom:['Phục hình tháo lắp'], truLab:true,
     labGY:[['Răng 300k',50000],['Răng 400k',90000],['Răng 500k',120000],['Răng 1.000k',250000]],
     buoc:[
      {b:'tlt_tv',   t:'Tư vấn',                        p:10},
      {b:'tlt_ldsk', t:'LDSK',                          p:10},
      {b:'tlt_vanh', t:'Chạy vành khít + LD lần 2',     p:25},
      {b:'tlt_tqt',  t:'Ghi tương quan tâm',            p:10},
      {b:'tlt_thu',  t:'Thử răng',                      p:10},
      {b:'tlt_giao', t:'Giao hàm',                      p:10},
      {b:'tlt_dau',  t:'Chỉnh đau',                     p:5},
     ]},
    {id:'qt_noinha', ten:'Nội nha', nhom:['Điều trị tủy'], truLab:false, labGY:[],
     buoc:[
      {b:'nn_tv',   t:'Tư vấn',                            p:10},
      {b:'nn_ssot', t:'SSOT',                              p:50},
      {b:'nn_thuoc',t:'Thay thuốc',                        p:5},
      {b:'nn_bot',  t:'BOT',                               p:10},
      {b:'nn_tram', t:'Trám kết thúc',                     p:10},
      {b:'nn_tk',   t:'Tái khám chụp phim KT sau 6 tháng', p:5},
     ]},
    {id:'qt_tay', ten:'Tẩy trắng', nhom:['Thẩm mỹ'], truLab:false, labGY:[],
     buoc:[
      {b:'ty_tv',  t:'Tư vấn',    tien:10000},
      {b:'ty_lam', t:'Tẩy trắng', tien:50000},
     ]},
    {id:'qt_implant', ten:'Implant', nhom:['Implant'], truLab:false, labGY:[],
     buoc:[{b:'im_tv', t:'Tư vấn', tien:300000}]},
    {id:'qt_prf', ten:'PRF', nhom:[], truLab:false, labGY:[],
     buoc:[{b:'prf_tv', t:'Tư vấn', p:5}, {b:'prf_mau', t:'Rút máu', p:5}]},
  ],

  ds(){ return db.quyTrinh || []; },
  boId(id){ return this.ds().find(q => q.id === id) || null; },
  /* Quy trình dùng cho một hạng mục: gán tay thì theo đó, chưa gán thì đoán theo nhóm */
  cua(t){
    if (!t) return null;
    if (t.qtId) return this.boId(t.qtId);
    return this.ds().find(q => (q.nhom||[]).includes(t.group)) || null;
  },
  buocCua(q, b){ return q ? (q.buoc||[]).find(x => x.b === b) : null; },
  /* Tỷ lệ áp cho một người ở một bước: đặt riêng thì theo riêng, không thì theo bảng gốc */
  pctCua(st, buoc){
    const r = st && st.model && st.model.cd;
    return (r && r[buoc.b] != null && r[buoc.b] !== '') ? +r[buoc.b] : (buoc.p != null ? +buoc.p : null);
  },
  /* Tiền công ĐẦY ĐỦ của một bước, chưa xét khách đã trả tới đâu */
  tienBuocDay(t, q, buoc, st){
    if (buoc.tien != null) return +buoc.tien || 0;
    const goc = Math.max(0, (+t.price || 0) - (q && q.truLab ? (+t.tienLab || 0) : 0));
    const p = this.pctCua(st, buoc);
    return p == null ? 0 : goc * p / 100;
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
    const daLam = t.cd || [];
    const ty = this.tyLeThu(t), thu = this.daThu(t);
    const rows = q.buoc.map(b => {
      const x = daLam.find(y => y.b === b.b) || {};
      const st = staffById(x.s);
      const day = this.tienBuocDay(t, q, b, st);
      const thuc = day * ty;
      return `<tr>
        <td><label style="display:flex;gap:8px;align-items:center;cursor:pointer">
          <input type="checkbox" name="lam" value="${b.b}"${x.s?' checked':''}> <b>${h(b.t)}</b></label>
          <span class="sub-line">${b.tien != null ? money(b.tien) : b.p + '%'}</span></td>
        <td><select name="ng_${b.b}">
          <option value="">— chọn người làm —</option>
          ${nv.map(s=>`<option value="${s.id}"${x.s===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></td>
        <td><input type="date" name="ngay_${b.b}" value="${h(x.d||todayISO())}"></td>
        <td class="r num">${money(day)}</td>
        <td class="r num" style="font-weight:600">${money(thuc)}</td></tr>`;
    }).join('');
    const goc = Math.max(0, (+t.price||0) - (q.truLab ? (+t.tienLab||0) : 0));
    App.modal('Công đoạn — ' + t.name + (t.tooth ? ' (R' + t.tooth + ')' : ''), `
    <form class="form-grid" onsubmit="QT.ghiSave(event,'${tid}')">
      <div class="note-block full">Khách: <b>${h(c?c.name:'')}</b> · Quy trình: <b>${h(q.ten)}</b> ·
        Giá dịch vụ: <b>${money(t.price)}</b>${q.truLab?` · Tiền lab: <b>${money(t.tienLab||0)}</b> → tính % trên <b>${money(goc)}</b>`:''}</div>
      <div class="note-block full" style="border-color:var(--accent)">Khách đã thanh toán cho hạng mục này:
        <b>${money(thu)} / ${money(t.price)}</b> = <b>${Math.round(ty*100)}%</b>.
        Tiền công mọi người nhận <b>đúng bằng phần khách đã trả</b>; khách trả nốt thì phần còn lại tự cộng vào.</div>
      ${q.truLab?`<div class="f full"><label>Tiền lab (trừ trước khi tính %)</label>
        ${Tien.o('tienLab', t.tienLab||0)}
        ${(() => { const gy = GiaLab.goiY().length ? GiaLab.goiY() : q.labGY; return gy.length?`<div class="combo-hint">Mức thường dùng: ${gy.map(([n,v])=>
          `<button type="button" class="link-btn" onclick="this.form.tienLab.value=Tien.dinh('${v}')">${h(n)} ${money(v)}</button>`).join(' · ')}</div>`:''; })()}</div>`:''}
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

  /* ---------- Cài đặt quy trình (quản lý) ---------- */
  bang(){
    if (!Perm.can('caidat')) { App.toast('Chỉ quản lý mới sửa được quy trình'); return; }
    App.modal('Quy trình & tỷ lệ hoa hồng theo công đoạn', `
      <div class="note-block mb">Mỗi loại dịch vụ có một quy trình. Ai làm công đoạn nào thì hưởng phần đó —
        một ca chia được cho nhiều người. Phục hình thì <b>trừ tiền lab rồi mới tính %</b>.
        Muốn một người có tỷ lệ riêng thì sửa trong <b>hồ sơ nhân viên</b>.</div>
      ${this.ds().map(q => `<div class="rx mb"><div class="rx-head">
          <b>${h(q.ten)}</b> <span class="sub-line">${q.truLab?'· trừ tiền lab trước':''}
          ${(q.nhom||[]).length?'· nhóm: '+h(q.nhom.join(', ')):'· chưa gắn nhóm dịch vụ'}</span>
          <span class="spacer"></span><span class="pill ${this.tongPct(q)>100?'danger':'mutedp'}">${this.tongPct(q)}%</span></div>
        <div class="card-b"><div class="tbl-wrap"><table style="min-width:420px">
          <thead><tr><th>Công đoạn</th><th class="r">Tỷ lệ / số tiền</th><th></th></tr></thead>
          <tbody>${q.buoc.map(b=>`<tr><td>${h(b.t)}</td>
            <td class="r num">${b.tien!=null?money(b.tien):b.p+'%'}</td>
            <td><button class="btn small" onclick="QT.buocForm('${q.id}','${b.b}')">Sửa</button></td></tr>`).join('')}</tbody></table></div>
          <div class="form-actions" style="justify-content:flex-start;margin-top:8px">
            <button class="btn small" onclick="QT.buocForm('${q.id}')">${IC.plus} Thêm công đoạn</button>
            <button class="btn small" onclick="QT.nhomForm('${q.id}')">Gắn nhóm dịch vụ</button></div>
        </div></div>`).join('')}`);
  },
  tongPct(q){ return (q.buoc||[]).reduce((s,b) => s + (b.p || 0), 0); },
  buocForm(qid, bid){
    const q = this.boId(qid); const b = bid ? this.buocCua(q, bid) : {};
    App.modal((bid?'Sửa':'Thêm') + ' công đoạn — ' + q.ten, `
    <form class="form-grid" onsubmit="QT.buocSave(event,'${qid}','${bid||''}')">
      <div class="f full"><label>Tên công đoạn</label><input name="t" required value="${h(b.t||'')}"></div>
      <div class="f"><label>Tỷ lệ (%)</label><input type="number" name="p" step="0.5" min="0" max="100" value="${b.p!=null?b.p:''}" placeholder="Vd: 30"></div>
      <div class="f"><label>Hoặc số tiền cố định (₫)</label>${Tien.o('tien', b.tien!=null?b.tien:'')}</div>
      <div class="note-block full">Điền <b>một trong hai</b>. Có số tiền cố định thì phần trăm bị bỏ qua —
        dùng cho những việc trả theo lần như tư vấn implant, tẩy trắng.</div>
      <div class="form-actions full">
        ${bid?`<button type="button" class="btn danger" onclick="QT.buocDel('${qid}','${bid}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="QT.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  buocSave(ev, qid, bid){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const q = this.boId(qid);
    const tien = num(d.tien), p = d.p === '' ? null : num(d.p);
    if (!tien && p == null) { App.toast('Phải nhập tỷ lệ % hoặc số tiền cố định'); return; }
    const o = {t: (d.t||'').trim()};
    if (tien) o.tien = tien; else o.p = p;
    let b = bid && this.buocCua(q, bid);
    if (b) { delete b.p; delete b.tien; Object.assign(b, o); }
    else q.buoc.push(Object.assign({b: 'b' + uid()}, o));
    save(); this.bang(); App.toast('Đã lưu công đoạn ✓');
  },
  buocDel(qid, bid){
    const q = this.boId(qid), b = this.buocCua(q, bid);
    const dung = db.treatments.filter(t => (t.cd||[]).some(x => x.b === bid)).length;
    if (!confirm('Xóa công đoạn "' + b.t + '"?' + (dung ? '\n\n' + dung + ' hạng mục đã ghi công đoạn này, phần hoa hồng đó sẽ không còn được tính.' : ''))) return;
    q.buoc = q.buoc.filter(x => x.b !== bid);
    save(); this.bang(); App.toast('Đã xóa');
  },
  nhomForm(qid){
    const q = this.boId(qid);
    App.modal('Gắn nhóm dịch vụ — ' + q.ten, `
    <form class="form-grid" onsubmit="QT.nhomSave(event,'${qid}')">
      <div class="f full"><label>Hạng mục thuộc những nhóm này sẽ tự dùng quy trình trên</label>
        <div class="check-list">${NHOM_DV.map(g=>`<label><input type="checkbox" name="nhom" value="${h(g)}"${(q.nhom||[]).includes(g)?' checked':''}> ${h(g)}</label>`).join('')}</div></div>
      <div class="f full"><div class="check-row">
        <label><input type="checkbox" name="truLab"${q.truLab?' checked':''}> Trừ tiền lab trước khi tính %</label></div></div>
      <div class="form-actions full">
        <button type="button" class="btn" onclick="QT.bang()">Quay lại</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  nhomSave(ev, qid){
    ev.preventDefault();
    const f = ev.target, q = this.boId(qid);
    q.nhom = [...f.querySelectorAll('[name="nhom"]:checked')].map(x => x.value);
    q.truLab = !!f.querySelector('[name="truLab"]:checked');
    save(); this.bang(); App.toast('Đã lưu ✓');
  },

  /* ---------- Tỷ lệ riêng của từng người ---------- */
  riengForm(stId){
    const st = staffById(stId); if (!st) return;
    const r = (st.model && st.model.cd) || {};
    App.modal('Tỷ lệ hoa hồng riêng — ' + st.name, `
    <form class="form-grid" onsubmit="QT.riengSave(event,'${stId}')">
      <div class="note-block full">Để trống thì dùng tỷ lệ chung của phòng khám. Chỉ điền ô nào muốn khác đi.</div>
      ${this.ds().map(q => `<div class="full"><div class="rx"><div class="rx-head"><b>${h(q.ten)}</b></div>
        <div class="card-b"><div class="form-grid">
          ${q.buoc.map(b => `<div class="f"><label>${h(b.t)}
            <span class="sub-line">chung: ${b.tien!=null?money(b.tien):b.p+'%'}</span></label>
            ${b.tien!=null ? `<div class="sub-line" style="padding:8px 0">Trả theo lần — không đổi bằng %</div>` :
              `<input type="number" step="0.5" min="0" max="100" name="${b.b}" value="${r[b.b]!=null?r[b.b]:''}" placeholder="theo chung">`}</div>`).join('')}
        </div></div></div></div>`).join('')}
      <div class="form-actions full">
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  riengSave(ev, stId){
    ev.preventDefault();
    const st = staffById(stId);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const cd = {};
    Object.keys(d).forEach(k => { if (d[k] !== '' && d[k] != null) cd[k] = num(d[k]); });
    if (!st.model) st.model = {};
    st.model.cd = cd;
    save(); App.closeModal(); App.render();
    App.toast(Object.keys(cd).length ? 'Đã đặt ' + Object.keys(cd).length + ' tỷ lệ riêng ✓' : 'Đã bỏ hết tỷ lệ riêng, dùng chung');
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
        const rieng = st && st.model && st.model.cd && st.model.cd[x.buoc.b] != null;
        return `<tr><td class="num">${fmtD(x.date)}</td>
          <td><b>${h(st?st.name:'?')}</b></td>
          <td>${h(c?c.name:'?')}<br><span class="sub-line">${h(x.t.name)}${x.t.tooth?' — R'+h(x.t.tooth):''}</span></td>
          <td>${h(x.buoc.t)}<br><span class="sub-line">${h(x.q.ten)}</span></td>
          <td class="r num">${x.buoc.tien!=null?'theo lần':p+'%'}${rieng?' <span class="pill info">riêng</span>':''}</td>
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
    const ca = Att.ca(), ra = [];
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
        <div class="note-block" style="margin-top:10px">Giờ làm việc: <b>${h(Att.moTaCa())}</b>.
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
      c = {id: uid(), code: 'KH-' + (db.seq.cust++), name: (x.ten || '').toUpperCase().trim(),
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
      <td><button class="btn small" onclick="HR.staffForm('${s.id}')">Sửa</button></td></tr>`).join('')
      || '<tr><td colspan="4" class="sub-line">Chưa có nhân viên nào.</td></tr>';
    App.modal('Danh sách nhân viên', `
      <div class="form-actions" style="justify-content:flex-start;margin-bottom:10px">
        <button class="btn primary" onclick="HR.staffForm()">${IC.plus} Thêm nhân viên</button></div>
      <div class="tbl-wrap"><table style="min-width:520px">
        <thead><tr><th>Họ tên · email</th><th>Chức danh · quyền</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="note-block" style="margin-top:12px">Sửa tên ở đây thì <b>mọi hồ sơ cũ cũng hiện tên mới</b> —
        phần mềm lưu theo mã nhân viên, không lưu tên rời rạc.</div>`);
  },

  staffForm(id){
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
      <div class="f full"><label>Hoa hồng theo công đoạn</label>
        ${id?`<button type="button" class="btn" onclick="QT.riengForm('${id}')">Đặt tỷ lệ riêng cho người này</button>
        <div class="combo-hint">Không đặt gì thì dùng tỷ lệ chung của phòng khám.</div>`
        :'<div class="combo-hint">Lưu nhân viên xong mới đặt được tỷ lệ riêng.</div>'}</div>
      <div class="note-block full">Email phải trùng với tài khoản đã tạo trong Supabase → <b>Authentication → Users</b>
        thì nhân viên mới tự quét mã QR chấm công được.</div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="HR.staffDel('${id}')">Xóa nhân viên</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  staffSave(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.base = num(d.base); d.kpiTarget = num(d.kpiTarget); d.email = (d.email||'').trim();
    d.active = d.active !== '0';
    if (id) Object.assign(staffById(id), d);
    else db.staff.push(Object.assign({id:uid(), model:{type:'svcGroup', rates:{}, def:10}}, d));
    save(); App.closeModal(); App.render(); App.toast('Đã lưu nhân viên ✓');
  },
  staffDel(id){
    const st = staffById(id);
    if (!confirm('Xóa nhân viên "' + st.name + '"? Dữ liệu chấm công, thưởng phạt của người này cũng bị xóa.')) return;
    db.staff = db.staff.filter(x => x.id !== id);
    db.attLog = (db.attLog||[]).filter(x => x.staffId !== id);
    db.bonuses = (db.bonuses||[]).filter(x => x.staffId !== id);
    save(); App.closeModal(); App.render(); App.toast('Đã xóa nhân viên');
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
    ? [['payroll','Bảng lương'],['attendance','Chấm công'],['commission','Hoa hồng'],['kpi','KPI · Thưởng · Phạt']]
    : [['attendance','Chấm công']];
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
      <span class="sub-line">${h(Att.moTaCa())}${db.clinic.wifiIp?' · mạng phòng khám đã đặt':' · chưa đặt mạng phòng khám'}</span>
    </div>
    <div class="card mb"><div class="card-h"><h2>Hôm nay — ${fmtD(T)}</h2><span class="hint">nhân viên quét mã QR ở quầy để ghi giờ vào / giờ ra</span></div>
      <div class="tbl-wrap"><table style="min-width:780px">
        <thead><tr><th>Nhân viên</th><th>Giờ vào</th><th>Giờ ra</th><th>Làm được</th><th>Ghi nhận</th><th></th></tr></thead>
        <tbody>${today}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Tổng hợp tháng ${M.slice(5)}/${M.slice(0,4)}</h2><span class="hint">tự cộng từ nhật ký quét mã</span></div>
      <div class="tbl-wrap"><table style="min-width:760px">
        <thead><tr><th>Nhân viên</th><th class="r">Số công</th><th class="r">Tổng giờ</th><th class="r">Ngày có mặt</th><th class="r">Đi trễ</th><th class="r">Về sớm</th><th class="r">Về trưa</th><th class="r">Chấm ngoài PK</th></tr></thead>
        <tbody>${sum}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">Một ngày đủ ca = <b>${gioPhut(Att.phutChuan())}</b> (${h(Att.moTaCa())}) = <b>1 công</b>.
      Giờ nghỉ trưa không tính công, nên <b>ai ở lại buổi trưa và ai về rồi quay lại đều ra cùng số giờ</b> — chỉ cần chấm vào lúc đến và chấm ra lúc về hẳn.
      Ai về trưa không quay lại thì chỉ được công buổi sáng.</div>`;
  }

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
          <td>${Perm.only('caidat', `<button class="btn small" onclick="QT.riengForm('${st.id}')">Tỷ lệ riêng</button>`)}</td></tr>`;
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
  MAC_DINH: [
    {n:'Mão sứ kim loại (Cr-Co)', d:'răng', p:180000},
    {n:'Mão sứ Titan',            d:'răng', p:280000},
    {n:'Mão sứ Zirconia',         d:'răng', p:600000},
    {n:'Mão toàn sứ Emax',        d:'răng', p:900000},
    {n:'Dán sứ Veneer',           d:'răng', p:900000},
    {n:'Cầu răng sứ',             d:'đơn vị', p:600000},
    {n:'Sườn Implant / Abutment', d:'cái', p:1200000},
    {n:'Hàm khung kim loại',      d:'hàm', p:1200000},
    {n:'Hàm nhựa dẻo',            d:'hàm', p:700000},
    {n:'Hàm nhựa cứng',           d:'hàm', p:500000},
    {n:'Răng nhựa trên hàm',      d:'răng', p:50000},
    {n:'Máng tẩy trắng',          d:'hàm', p:300000},
    {n:'Máng chống nghiến',       d:'hàm', p:500000},
    {n:'Máng duy trì chỉnh nha',  d:'hàm', p:300000},
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
        `${h(Att.moTaCa())}${cl.wifiIp ? ' · đã đặt mạng phòng khám' : ' · chưa đặt mạng phòng khám'}`,
        `<button class="btn small primary" onclick="Att.settingsForm()"${khoa}>Mở cài đặt</button>`)}
      ${the('Nhân viên', `${db.staff.filter(x=>x.active!==false).length} người đang làm việc · tên, chức danh, vai trò, tỷ lệ riêng`,
        `<button class="btn small primary" onclick="HR.dsNhanVien()"${khoa}>Sửa nhân viên</button>`)}
      ${the('Tài khoản truy cập', 'Mời nhân viên, đặt quyền vào từng mục',
        `<button class="btn small" onclick="Att.accountsPanel()"${khoa}>Quản lý tài khoản</button>`)}
      ${the('Mã QR chấm công', 'Dán ở quầy để nhân viên quét ghi giờ vào — giờ ra',
        `<button class="btn small" onclick="Att.clinicQR()"${khoa}>Xem mã QR</button>`)}
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
      ${the('Nhập hồ sơ từ ảnh chụp phiếu giấy', 'Chụp phiếu điều trị cũ, trợ lý AI đọc thành bảng, dán vào đây',
        `<button class="btn small primary" onclick="Importer.anhForm()">Nhập từ ảnh chụp</button>`)}
      ${the('Nhập khách hàng từ Google Sheet', 'Dán bảng từ Sheet để nạp hàng loạt hồ sơ khách',
        `<button class="btn small" onclick="Importer.form()"${khoa}>Mở trình nhập</button>`)}
      ${the('Dọn trùng lặp', 'Gộp hồ sơ trùng mã và bỏ phiếu thu trùng số — không mất lịch sử điều trị',
        `<button class="btn small" onclick="App.dedupeForm()"${khoa}>Kiểm tra</button>`)}
    </div></div>

  ${q ? '' : '<div class="note-block" style="margin-top:12px">Bạn đang xem với quyền <b>' + h(Perm.label()) +
    '</b> — chỉ quản lý mới sửa được các mục có khóa.</div>'}`;
};

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
    rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.customers) throw 0; db = d; save(); App.render(); App.toast('Đã phục hồi dữ liệu ✓'); } catch(e){ App.toast('File không hợp lệ'); } ev.target.value=''; };
    rd.readAsText(f);
  });
  $('#modalBack').addEventListener('click', ev => { if (ev.target.id === 'modalBack') App.closeModal(); });
  Sync.snapshot();
  /* Mở từ liên kết mời hoặc mã QR chấm công → tự lưu cấu hình rồi mời đăng nhập */
  const invited = Att.applyInvite();
  App.render();
  if (invited) {
    App.toast('Đã nối vào phòng khám ✓ — hãy đăng nhập');
    if (!Cloud.loggedIn()) Att.loginForm();
  }
  /* Có kết nối sẵn thì lặng lẽ đồng bộ khi mở app */
  if (Cloud.configured() && Cloud.loggedIn()) setTimeout(() => { Sync.run(true).then(() => Att.sync()); }, 800);
});
