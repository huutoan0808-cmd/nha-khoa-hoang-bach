/* Nha Khoa Hoàng Bách — ứng dụng quản lý phòng khám (v1, dữ liệu lưu trên thiết bị) */
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
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

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
const TOOTH_STATES = [['ok','Bình thường'],['caries','Sâu răng'],['filled','Đã trám'],['rct','Điều trị tủy'],['crown','Bọc sứ'],['implant','Implant'],['missing','Mất răng']];
const APPT_STATUS = ['Chờ xác nhận','Đã xác nhận','Đang điều trị','Hoàn tất','Hủy'];
const TREAT_STATUS = ['Báo giá','Chờ điều trị','Đang điều trị','Hoàn tất'];
const PAY_METHODS = ['Tiền mặt','Chuyển khoản','Quẹt thẻ'];

/* ================= Dữ liệu ================= */
const DB_KEY = 'nkhb_v1';
let db = null;

function seed() {
  const T = todayISO();
  const services = [];
  const svc = (group, name, price) => { const s = {id: uid()+services.length, group, name, price}; services.push(s); return s; };
  svc('Phục hình sứ','Mão sứ Zirconia',4500000); svc('Phục hình sứ','Mão sứ Titan',2500000); svc('Phục hình sứ','Mão toàn sứ Emax',6000000); svc('Phục hình sứ','Dán sứ Veneer',6000000); svc('Phục hình sứ','Cầu răng sứ (3 đơn vị)',10500000);
  svc('Phục hình tháo lắp','Hàm khung kim loại',3500000); svc('Phục hình tháo lắp','Hàm nhựa dẻo',2500000); svc('Phục hình tháo lắp','Răng tháo lắp (1 đơn vị)',500000);
  svc('Trám răng','Trám composite',450000); svc('Trám răng','Trám GIC',300000); svc('Trám răng','Trám cổ răng',350000);
  svc('Nhổ răng','Nhổ răng sữa',100000); svc('Nhổ răng','Nhổ răng vĩnh viễn',500000); svc('Nhổ răng','Nhổ răng khôn',1500000); svc('Nhổ răng','Tiểu phẫu răng khôn lệch',2500000);
  svc('Điều trị tủy','Điều trị tủy răng cửa',1200000); svc('Điều trị tủy','Điều trị tủy răng cối nhỏ',1800000); svc('Điều trị tủy','Điều trị tủy răng cối lớn',2500000);
  svc('Implant','Implant Hàn Quốc (trụ + mão)',16000000); svc('Implant','Implant Thụy Sĩ (trụ + mão)',25000000);
  svc('Chỉnh nha','Mắc cài kim loại (2 hàm)',30000000); svc('Chỉnh nha','Mắc cài sứ (2 hàm)',42000000); svc('Chỉnh nha','Máng trong suốt',60000000);
  svc('Nha chu','Cạo vôi răng + đánh bóng',300000); svc('Nha chu','Nạo túi nha chu (1 vùng)',800000);
  svc('Thẩm mỹ','Tẩy trắng răng tại ghế',1500000); svc('Thẩm mỹ','Gắn hột (đá) thẩm mỹ',800000);
  svc('Khác','Khám + tư vấn + chụp phim',150000); svc('Khác','Cắt chỉ / tái khám',0);

  const staff = [
    {id:'st1', name:'BS. Trần Minh Đức', role:'Bác sĩ điều trị', email:'', base:20000000, kpiTarget:300000000, model:{type:'svcGroup', rates:{'Implant':20,'Phục hình sứ':15,'Chỉnh nha':12}, def:10}},
    {id:'st2', name:'BS. Lê Thu Hằng', role:'Bác sĩ điều trị', email:'', base:18000000, kpiTarget:250000000, model:{type:'svcGroup', rates:{'Implant':20,'Phục hình sứ':15,'Chỉnh nha':12}, def:10}},
    {id:'st3', name:'Nguyễn Văn Bình', role:'Phụ tá', email:'', base:9000000, kpiTarget:0, model:{type:'perCase', rate:2}},
    {id:'st4', name:'Phạm Thảo Vy', role:'Lễ tân', email:'', base:8000000, kpiTarget:0, model:{type:'referral', rate:1}},
  ];

  const cM = monthOf(T);
  const customers = [
    {id:'c1', code:'KH-0412', name:'NGUYỄN THỊ MAI', dob:'1992-03-14', gender:'Nữ', phone:'0903 214 856', job:'Giáo viên', ethnic:'Kinh', nation:'Việt Nam',
     addr1:'25, Nguyễn Trung Trực', ward:'Phường Rạch Giá', province:'An Giang', doiTuong:'Thu phí', bhyt:'', cccd:'091192001234',
     kinName:'Nguyễn Văn Hùng (chồng)', kinPhone:'0918 001 002', allergy:'Penicillin', source:'Facebook', createdAt:isoAdd(T,-30),
     teeth:{14:{s:'filled',note:'Trám composite '+fmtD(isoAdd(T,-14))},26:{s:'filled',note:'Trám cũ 2023 — theo dõi'},36:{s:'rct',note:'Đang điều trị tủy, kế hoạch bọc sứ'},46:{s:'caries',note:'Sâu lớn — đề xuất implant'},48:{s:'missing',note:'Đã nhổ 2021'},25:{s:'implant',note:'Implant 2024 — ổn định'}},
     record:{lyDo:'Đau nhức răng hàm dưới bên trái 5 ngày, đau tăng về đêm.', benhLy:'Đau âm ỉ răng 36 khoảng 2 tuần, 5 ngày nay đau nhiều, đau lan lên thái dương, uống thuốc giảm đau chỉ đỡ tạm.',
       tienSuBanThan:'Dị ứng Penicillin (nổi mề đay). Không bệnh nội khoa.', tienSuGiaDinh:'Chưa ghi nhận bất thường.',
       toanThan:'Bình thường. M 78 l/p, HA 120/80 mmHg.', ngoaiMieng:'Cân xứng, không sưng, hạch (-).',
       trongMieng:'R36 sâu ngà lớn mặt nhai, gõ dọc (+), lung lay độ 0. R46 sâu lớn vỡ múi. Vôi răng mức độ trung bình.',
       canLamSang:'X-quang quanh chóp R36: thấu quang sát tủy, dây chằng nha chu giãn nhẹ.',
       tomTat:'BN nữ 34 tuổi, viêm tủy không hồi phục R36 / sâu ngà lớn R46 trên nền vôi răng.',
       chanDoan:'K04.0', chanDoanKem:'K02.1', bienChung:'', keHoach:'1) Điều trị tủy R36 (3 buổi) + bọc sứ Zirconia.\n2) Tư vấn implant R46.\n3) Cạo vôi răng toàn hàm.',
       tuNgay:isoAdd(T,-14), denNgay:'', ketQua:'',
       dienBien:[
         {date:isoAdd(T,-14), db:'Khám tổng quát, chụp phim. Chẩn đoán viêm tủy R36.', xt:'Lập kế hoạch điều trị, cạo vôi răng. Trám composite R14.'},
         {date:isoAdd(T,-7), db:'Điều trị tủy R36 buổi 1.', xt:'Mở tủy, xác định 3 ống tủy, đo chiều dài làm việc, băng thuốc.'},
         {date:T, db:'Điều trị tủy R36 buổi 2. Hết đau tự phát.', xt:'Bơm rửa, tạo hình ống tủy, đặt Ca(OH)2, trám tạm. Hẹn buổi 3.'}
       ]}},
    {id:'c2', code:'KH-0871', name:'TRẦN VĂN HÙNG', dob:'1985-09-22', gender:'Nam', phone:'0918 552 730', job:'Kinh doanh', ethnic:'Kinh', nation:'Việt Nam',
     addr1:'102, Trần Phú', ward:'Phường Vĩnh Thông', province:'An Giang', doiTuong:'Thu phí', bhyt:'', cccd:'091085004567',
     kinName:'Trần Thị Hoa (vợ)', kinPhone:'0917 003 004', allergy:'', source:'Khách quen giới thiệu', createdAt:isoAdd(T,-200), teeth:{}, record:{dienBien:[]}},
    {id:'c3', code:'KH-1105', name:'ĐỖ MINH CHÂU', dob:'2008-12-05', gender:'Nữ', phone:'0937 664 219', job:'Học sinh', ethnic:'Kinh', nation:'Việt Nam',
     addr1:'88, Lạc Hồng', ward:'Xã Gò Quao', province:'An Giang', doiTuong:'Thu phí', bhyt:'', cccd:'',
     kinName:'Đỗ Văn Nam (cha)', kinPhone:'0937 664 219', allergy:'', source:'Walk-in', createdAt:isoAdd(T,-420),
     teeth:{}, record:{lyDo:'Chỉnh nha định kỳ.', chanDoan:'K07.3', keHoach:'Chỉnh nha mắc cài kim loại 2 hàm — tháng 14/24.', dienBien:[]}},
    {id:'c4', code:'KH-1201', name:'LÊ HOÀNG NAM', dob:'1979-01-30', gender:'Nam', phone:'0908 771 340', job:'Tài xế', ethnic:'Kinh', nation:'Việt Nam',
     addr1:'15, Mạc Cửu', ward:'Phường Long Xuyên', province:'An Giang', doiTuong:'Thu phí', bhyt:'', cccd:'091079008910',
     kinName:'Lê Thị Bé (vợ)', kinPhone:'0909 005 006', allergy:'Tăng huyết áp — hội chẩn trước tiểu phẫu', source:'Google Maps', createdAt:isoAdd(T,-9),
     teeth:{46:{s:'caries',note:'Sâu vỡ lớn — chờ báo giá implant'}}, record:{dienBien:[]}},
  ];

  const sv = n => services.find(s => s.name === n);
  const treatments = [
    {id:'t1', customerId:'c1', serviceId:sv('Điều trị tủy răng cối lớn').id, name:'Điều trị tủy răng cối lớn', group:'Điều trị tủy', tooth:'R36', doctorId:'st1', price:2500000, status:'Đang điều trị', date:isoAdd(T,-7)},
    {id:'t2', customerId:'c1', serviceId:sv('Mão sứ Zirconia').id, name:'Mão sứ Zirconia', group:'Phục hình sứ', tooth:'R36', doctorId:'st1', price:4500000, status:'Chờ điều trị', date:isoAdd(T,-7)},
    {id:'t3', customerId:'c1', serviceId:sv('Trám composite').id, name:'Trám composite', group:'Trám răng', tooth:'R14', doctorId:'st2', price:450000, status:'Hoàn tất', date:isoAdd(T,-14)},
    {id:'t4', customerId:'c1', serviceId:sv('Cạo vôi răng + đánh bóng').id, name:'Cạo vôi răng + đánh bóng', group:'Nha chu', tooth:'', doctorId:'st2', price:300000, status:'Hoàn tất', date:isoAdd(T,-14)},
    {id:'t5', customerId:'c1', serviceId:sv('Implant Hàn Quốc (trụ + mão)').id, name:'Implant Hàn Quốc (trụ + mão)', group:'Implant', tooth:'R46', doctorId:'st1', price:16000000, status:'Báo giá', date:isoAdd(T,-7)},
    {id:'t6', customerId:'c3', serviceId:sv('Mắc cài kim loại (2 hàm)').id, name:'Chỉnh nha mắc cài kim loại', group:'Chỉnh nha', tooth:'2 hàm', doctorId:'st2', price:30000000, status:'Đang điều trị', date:isoAdd(T,-420)},
    {id:'t7', customerId:'c4', serviceId:sv('Khám + tư vấn + chụp phim').id, name:'Khám + tư vấn + chụp phim', group:'Khác', tooth:'', doctorId:'st1', price:150000, status:'Hoàn tất', date:isoAdd(T,-9)},
  ];

  let rno = 1240;
  const receipts = [];
  const rc = (date, customerId, desc, method, amount, doctorId, group, inv) => {
    receipts.push({id:uid()+rno, no:'PT-'+(rno++), date, customerId, desc, method, amount, staffId:'st4', doctorId, group,
      invoice: inv ? {no:'1C26THB-'+String(1190+rno).padStart(8,'0'), code:Math.random().toString(16).slice(2,8).toUpperCase(), date} : null});
  };
  // Lịch sử các tháng trước (phục vụ báo cáo quý/năm)
  for (let m = 8; m >= 1; m--) {
    const base = isoAdd(T, -m*30);
    rc(base, 'c3', 'Chỉnh nha — thu định kỳ', 'Chuyển khoản', 1500000, 'st2', 'Chỉnh nha', true);
    rc(isoAdd(base,2), 'c2', 'Cạo vôi răng định kỳ', 'Tiền mặt', 300000, 'st2', 'Nha chu', true);
    rc(isoAdd(base,5), 'c2', 'Phục hình sứ', 'Chuyển khoản', 4500000 + (m%3)*2000000, 'st1', 'Phục hình sứ', true);
    rc(isoAdd(base,8), 'c4', 'Implant — thu theo đợt', 'Chuyển khoản', 8000000, 'st1', 'Implant', m%2===0);
  }
  rc(isoAdd(T,-14), 'c1', 'Trám composite R14 + cạo vôi + khám', 'Tiền mặt', 900000, 'st2', 'Trám răng', true);
  rc(isoAdd(T,-7), 'c1', 'Trả góp đợt 1 — điều trị tủy + bọc sứ R36', 'Chuyển khoản', 3000000, 'st1', 'Điều trị tủy', true);
  rc(T, 'c1', 'Trả góp đợt 2 — điều trị tủy + bọc sứ R36', 'Chuyển khoản', 2000000, 'st1', 'Điều trị tủy', false);
  rc(T, 'c3', 'Chỉnh nha — thu định kỳ tháng này', 'Tiền mặt', 1500000, 'st2', 'Chỉnh nha', false);

  const rx = [
    {id:'rx1', customerId:'c1', date:isoAdd(T,-14), doctorId:'st2', status:'sent', code:'79-0412-'+isoAdd(T,-14).replace(/-/g,'').slice(2)+'-1136',
     items:[{drug:'Paracetamol 500mg', qty:'6 viên', use:'Uống khi đau, cách nhau ≥ 4 giờ'},{drug:'Nước súc miệng Chlorhexidine 0,12%', qty:'1 chai', use:'Súc 2 lần/ngày sau đánh răng'}]},
    {id:'rx2', customerId:'c1', date:T, doctorId:'st1', status:'draft', code:'',
     items:[{drug:'Spiramycin 3 M.IU', qty:'10 viên', use:'Ngày 2 lần, mỗi lần 1 viên, sau ăn'},{drug:'Paracetamol 500mg', qty:'10 viên', use:'Uống khi đau, cách nhau ≥ 4 giờ'},{drug:'Alphachymotrypsin 4,2mg', qty:'10 viên', use:'Ngày 2 lần, mỗi lần 1 viên'}]},
  ];

  const inventory = [
    {id:'i1', name:'Composite 3M Filtek Z350 — A2', unit:'tuýp', stock:2, min:5, supplier:'Cty Nha khoa Việt Đăng (TP.HCM)', buy:520000, sell:0, expiry:isoAdd(T,45)},
    {id:'i2', name:'Thuốc tê Lidocain 2% (Septodont)', unit:'ống', stock:8, min:30, supplier:'Dược Sài Gòn — chi nhánh Rạch Giá', buy:9000, sell:0, expiry:isoAdd(T,120)},
    {id:'i3', name:'Găng tay nitrile size M', unit:'hộp', stock:4, min:10, supplier:'VT Y tế Kiên Hà', buy:95000, sell:0, expiry:''},
    {id:'i4', name:'Côn gutta-percha 04', unit:'hộp', stock:6, min:3, supplier:'Cty Nha khoa Việt Đăng (TP.HCM)', buy:180000, sell:0, expiry:isoAdd(T,700)},
    {id:'i5', name:'Bàn chải + kem P/S du lịch (bán lẻ)', unit:'bộ', stock:35, min:10, supplier:'Unilever — đại lý Rạch Giá', buy:18000, sell:35000, expiry:isoAdd(T,400)},
    {id:'i6', name:'Nước súc miệng Chlorhexidine 0,12%', unit:'chai', stock:14, min:6, supplier:'Dược Hậu Giang', buy:38000, sell:65000, expiry:isoAdd(T,25)},
    {id:'i7', name:'Mũi khoan kim cương (bộ trám)', unit:'cái', stock:18, min:10, supplier:'Mani — NPP miền Tây', buy:45000, sell:0, expiry:''},
    {id:'i8', name:'Khẩu trang y tế 4 lớp', unit:'hộp', stock:22, min:8, supplier:'VT Y tế Kiên Hà', buy:32000, sell:45000, expiry:''},
  ];

  const appointments = [
    {id:'a1', date:T, time:'08:30', dur:60, customerId:'c1', service:'Điều trị tủy R36 — buổi 2', doctorId:'st1', chair:'Ghế 1', status:'Đang điều trị', labOrderId:''},
    {id:'a2', date:T, time:'10:00', dur:45, customerId:'c2', service:'Cạo vôi răng', doctorId:'st1', chair:'Ghế 1', status:'Đã xác nhận', labOrderId:''},
    {id:'a3', date:T, time:'11:00', dur:30, customerId:'c3', service:'Tái khám chỉnh nha', doctorId:'st2', chair:'Ghế 2', status:'Đã xác nhận', labOrderId:''},
    {id:'a4', date:T, time:'14:00', dur:60, customerId:'c4', service:'Tư vấn implant R46', doctorId:'st1', chair:'Ghế 1', status:'Chờ xác nhận', labOrderId:''},
    {id:'a5', date:isoAdd(T,7), time:'09:00', dur:60, customerId:'c1', service:'Gắn mão sứ R36', doctorId:'st1', chair:'Ghế 1', status:'Đã xác nhận', labOrderId:'lb1'},
    {id:'a6', date:isoAdd(T,1), time:'15:00', dur:45, customerId:'c2', service:'Gắn cầu răng sứ', doctorId:'st1', chair:'Ghế 2', status:'Đã xác nhận', labOrderId:'lb2'},
  ];

  const labs = [
    {id:'lb1', customerId:'c1', labName:LABS[0], type:'Mão sứ Zirconia', teeth:'R36', qty:1, sent:T, due:isoAdd(T,5), received:'', apptId:'a5', note:'Màu A2'},
    {id:'lb2', customerId:'c2', labName:LABS[1], type:'Cầu răng sứ', teeth:'R44–R46', qty:3, sent:isoAdd(T,-6), due:isoAdd(T,-1), received:'', apptId:'a6', note:'Khách hẹn gắn ngày mai — GỌI LAB GẤP'},
    {id:'lb3', customerId:'c3', labName:LABS[0], type:'Máng chỉnh nha', teeth:'2 hàm', qty:2, sent:isoAdd(T,-20), due:isoAdd(T,-13), received:isoAdd(T,-13), apptId:'', note:''},
  ];

  /* Nhật ký chấm công mẫu: 10 ngày làm việc gần nhất */
  const attLog = [];
  const IN_T = {st1:'07:52', st2:'07:58', st3:'07:55', st4:'07:48'};
  for (let d = 12; d >= 0; d--) {
    const day = isoAdd(T, -d);
    if (new Date(day + 'T00:00').getDay() === 0) continue;          /* nghỉ chủ nhật */
    staff.forEach((st, i) => {
      if ((d + i) % 7 === 3) return;                                 /* rải vài ngày nghỉ */
      const base = IN_T[st.id] || '08:00';
      const late = (st.id === 'st3' && (d === 3 || d === 6)) ? '08:23' : base;   /* phụ tá đi trễ 2 hôm */
      attLog.push({id: uid()+d+i, staffId: st.id, date: day, inAt: late,
        outAt: d === 0 ? '' : (st.id === 'st2' ? '17:45' : '17:30'),
        net: (d === 4 && st.id === 'st4') ? 'outside' : 'clinic', viaQR: true});
    });
  }

  const bonuses = [
    {id:'b1', date:monthOf(T)+'-01', staffId:'st1', amount:2000000, reason:'Thưởng vượt KPI implant tháng trước'},
    {id:'b2', date:monthOf(T)+'-05', staffId:'st2', amount:1000000, reason:'Thưởng khách đánh giá 5★ (3 lượt liên tiếp)'},
    {id:'b3', date:monthOf(T)+'-01', staffId:'st3', amount:500000, reason:'Thưởng chuyên cần'},
    {id:'b4', date:monthOf(T)+'-01', staffId:'st4', amount:500000, reason:'Thưởng chuyên cần'},
    {id:'b5', date:monthOf(T)+'-08', staffId:'st3', amount:-200000, reason:'Phạt đi trễ 2 lần (nội quy)'},
  ];

  return {ver:1, clinic:{name:'Nha Khoa Hoàng Bách', legal:'Công ty TNHH Nha Khoa Hoàng Bách – Gò Quao', authority:'Sở Y tế An Giang', addr:'Rạch Giá, An Giang', phone:'0297 3xxx xxx', taxCode:'', maCSKCB:'', shiftStart:'08:00', wifiIp:''},
    seq:{cust:1300, receipt:rno}, services, staff, customers, treatments, receipts, rx, inventory, appointments, labs, attLog, bonuses};
}

function load() {
  db = null;
  try { const raw = localStorage.getItem(DB_KEY); if (raw) db = JSON.parse(raw); } catch(e){ db = null; }
  if (!db || !Array.isArray(db.customers)) db = seed();
  migrate(); save();
}
function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
/* Nâng cấp dữ liệu cũ về một ô địa chỉ duy nhất (số nhà + đường gộp chung) */
function migrate() {
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
];

const App = {
  cur:'dashboard',
  state:{calDate:todayISO(), custSel:'c1', custQ:'', treatCust:'c1', hrTab:'payroll', invQ:'', rp:{type:'month', y:(new Date()).getFullYear(), m:(new Date()).getMonth()+1, q:Math.floor((new Date()).getMonth()/3)+1}, toothSel:null},

  go(id){ this.cur = id; this.closeSheet(); this.render(); window.scrollTo({top:0}); },
  render(){
    /* Mở từ mã QR của phòng khám → chỉ hiện màn hình chấm công */
    if (location.hash.slice(0,3) === '#cc') {
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
      $('#mainArea').innerHTML = Att.checkinScreen();
      return;
    }
    $('#sideNav').innerHTML = NAV.map(n => `<button class="nav-item ${n.id===this.cur?'active':''}" onclick="App.go('${n.id}')">${n.icon} ${n.label}</button>`).join('') +
      `<div class="nav-foot">${(() => { const st = Sync.status(); return `<span class="pill ${st.k}">${st.t}</span>`; })()}<br>
        <span style="font-size:11px">Nút ⟳ ở góc trên để đồng bộ ngay.</span></div>`;
    const first4 = NAV.slice(0,4), rest = NAV.slice(4);
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
  print(html){ $('#printArea').innerHTML = html; setTimeout(()=>window.print(), 60); },
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
  <div class="kpis">
    <div class="card kpi"><div class="k-label">Doanh thu hôm nay</div><div class="k-value num">${money(revToday)}</div><div class="k-note">${db.receipts.filter(r=>r.date===T).length} phiếu thu</div></div>
    <div class="card kpi"><div class="k-label">Lịch hẹn hôm nay</div><div class="k-value num">${apptToday.length}</div><div class="k-note">${unconfirmed?`<span class="down">${unconfirmed} chưa xác nhận</span>`:'<span class="up">Đã xác nhận đủ</span>'}</div></div>
    <div class="card kpi"><div class="k-label">Khách mới tháng này</div><div class="k-value num">${newCust}</div><div class="k-note">tổng ${db.customers.length} hồ sơ</div></div>
    <div class="card kpi"><div class="k-label">Công nợ phải thu</div><div class="k-value num">${money(debtTotal)}</div><div class="k-note">${debtCount} khách còn nợ</div></div>
  </div>
  <div class="grid-2">
    <div class="col">
      <div class="card"><div class="card-h"><h2>Doanh thu 7 ngày gần nhất</h2></div><div class="card-b"><div class="chart">${bars}</div></div></div>
      <div class="card"><div class="card-h"><h2>Doanh thu theo nhóm dịch vụ</h2><span class="hint">tháng ${monthOf(T).slice(5)}/${monthOf(T).slice(0,4)}</span></div><div class="card-b hbars">${groupBars || '<span class="sub-line">Chưa có phiếu thu tháng này.</span>'}</div></div>
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
  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.name = (d.name||'').toUpperCase().trim();
    d.province = (d.province || '').trim();
    d.ward = (d.ward || '').trim();
    d.street = (d.street || '').trim();
    if (d.oldAddr !== undefined) d.oldAddr = (d.oldAddr || '').trim();
    if (id) { Object.assign(custById(id), d); App.toast('Đã cập nhật hồ sơ ✓'); }
    else {
      const c = Object.assign({id:uid(), code:'KH-'+(db.seq.cust++), createdAt:todayISO(), teeth:{}, record:{dienBien:[]}}, d);
      db.customers.unshift(c); App.state.custSel = c.id; App.toast('Đã thêm khách hàng ✓');
    }
    save(); App.closeModal(); App.render();
  },
  pick(id){ App.state.custSel = id; App.render(); const el = $('#custDetail'); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); },

  toothClick(n){
    const c = custById(App.state.custSel); if (!c) return;
    const t = (c.teeth||{})[n] || {s:'ok', note:''};
    App.modal('Răng ' + n, `
    <form class="form-grid" onsubmit="Cust.toothSave(event,${n})">
      <div class="f"><label>Tình trạng</label><select name="s">${TOOTH_STATES.map(([k,l])=>`<option value="${k}"${t.s===k?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="f"><label>Ghi chú</label><input name="note" value="${h(t.note||'')}"></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  toothSave(ev, n){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const c = custById(App.state.custSel);
    if (!c.teeth) c.teeth = {};
    if (d.s === 'ok' && !d.note) delete c.teeth[n]; else c.teeth[n] = {s:d.s, note:d.note};
    save(); App.closeModal(); App.render(); App.toast('Đã lưu răng ' + n + ' ✓');
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
  recordSave(ev){
    ev.preventDefault();
    const c = custById(App.state.custSel);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    ['chanDoan','chanDoanKem','bienChung'].forEach(k => d[k] = icdCode(d[k]));
    c.record = Object.assign({dienBien:(c.record&&c.record.dienBien)||[]}, c.record, d);
    save(); App.closeModal(); App.render(); App.toast('Đã lưu bệnh án ✓');
  },

  visitForm(){
    App.modal('Thêm diễn biến điều trị', `
    <form class="form-grid" onsubmit="Cust.visitSave(event)">
      <div class="f"><label>Ngày</label><input type="date" name="date" value="${todayISO()}" required></div>
      <div class="f full"><label>Diễn biến bệnh</label><textarea name="db" required></textarea></div>
      <div class="f full"><label>Xử trí</label><textarea name="xt"></textarea></div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Thêm</button></div>
    </form>`);
  },
  visitSave(ev){
    ev.preventDefault();
    const c = custById(App.state.custSel);
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!c.record) c.record = {dienBien:[]};
    if (!c.record.dienBien) c.record.dienBien = [];
    c.record.dienBien.push(d);
    save(); App.closeModal(); App.render(); App.toast('Đã thêm diễn biến ✓');
  },

  printBA18(){
    const c = custById(App.state.custSel); const r = c.record || {};
    const dot = v => v ? h(v) : '<span class="dots" style="display:inline-block;min-width:200px"></span>';
    const rows = (r.dienBien||[]).map(v=>`<tr><td style="width:80px">${fmtD(v.date)}</td><td>${h(v.db)}</td><td>${h(v.xt)}</td><td></td></tr>`).join('') || '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>';
    App.print(`
    <div class="p-head"><div>${h(db.clinic.authority||'')}<br><b>${h(db.clinic.legal||db.clinic.name)}</b></div><div>MS: <b>BA-18</b><br>Số HS: ................<br>Mã KH: <b>${h(c.code)}</b></div></div>
    <h1>BỆNH ÁN NGOẠI TRÚ RĂNG HÀM MẶT</h1>
    <h2>A. THÔNG TIN CHUNG</h2>
    <table class="no-border">
      <tr><td colspan="2">1. Họ và tên: <b>${h(c.name)}</b></td><td>2. Ngày sinh: ${fmtD(c.dob)}</td><td>3. Giới tính: ${h(c.gender)}</td></tr>
      <tr><td>4. Điện thoại: ${h(c.phone)}</td><td>5. Nghề nghiệp: ${h(c.job)}</td><td>6. Dân tộc: ${h(c.ethnic)}</td><td>7. Quốc tịch: ${h(c.nation)}</td></tr>
      <tr><td colspan="4">8. Địa chỉ: ${h(fullAddr(c))}</td></tr>
      <tr><td>9. Đối tượng: ${h(c.doiTuong)}</td><td>10. Số thẻ BHYT: ${h(c.bhyt)||'—'}</td><td colspan="2">11. Số CCCD/định danh: ${h(c.cccd)||'—'}</td></tr>
      <tr><td colspan="4">12. Thân nhân khi cần báo tin: ${h(c.kinName)} — ĐT: ${h(c.kinPhone)}</td></tr>
    </table>
    <h2>B. THÔNG TIN KHÁM BỆNH</h2>
    <p><b>I. Lý do vào viện, vấn đề sức khỏe:</b> ${dot(r.lyDo)}</p>
    <p><b>II.1. Quá trình bệnh lý:</b> ${dot(r.benhLy)}</p>
    <p><b>II.2. Tiền sử bản thân:</b> ${dot(r.tienSuBanThan || c.allergy)}<br><b>Tiền sử gia đình:</b> ${dot(r.tienSuGiaDinh)}</p>
    <p><b>III.1. Toàn thân:</b> ${dot(r.toanThan)}<br><b>III.2. Khám chuyên khoa — Ngoài miệng:</b> ${dot(r.ngoaiMieng)}<br><b>Trong miệng:</b> ${dot(r.trongMieng)}</p>
    <p><b>III.3. Cận lâm sàng:</b> ${dot(r.canLamSang)}<br><b>III.4. Tóm tắt bệnh án:</b> ${dot(r.tomTat)}</p>
    <p><b>IV. CHẨN ĐOÁN</b><br>Bệnh chính: <b>${h(icdName(r.chanDoan))||'—'}</b><br>Bệnh kèm theo: ${h(icdName(r.chanDoanKem))||'—'}<br>Biến chứng: ${h(icdName(r.bienChung))||'—'}</p>
    <p><b>V. Kế hoạch điều trị:</b><br>${h(r.keHoach||'').replace(/\n/g,'<br>')||'—'}</p>
    <h2>VI. QUÁ TRÌNH ĐIỀU TRỊ</h2>
    <table><tr><th>Ngày</th><th>Diễn biến bệnh</th><th>Xử trí</th><th>Ghi chú</th></tr>${rows}</table>
    <p><b>VII. Thời gian điều trị:</b> từ ${r.tuNgay?fmtD(r.tuNgay):'..../..../20....'} đến ${r.denNgay?fmtD(r.denNgay):'..../..../20....'}</p>
    <div class="sign"><div>Ngày ..... tháng ..... năm 20.....<br><b>Bác sỹ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br></div>
    <div>Ngày ..... tháng ..... năm 20.....<br><b>Đại diện cơ sở KB, CB</b><br>(Ký, đóng dấu)<br><br><br></div></div>
    <h2>C. TỔNG KẾT BỆNH ÁN</h2>
    <p><b>1. Tóm tắt quá trình bệnh lý và diễn biến lâm sàng:</b> ${dot(r.tomTat)}</p>
    <p><b>2. Những dấu hiệu lâm sàng chính:</b> ${dot(r.trongMieng)}</p>
    <p><b>3. Tóm tắt kết quả xét nghiệm, cận lâm sàng có giá trị chẩn đoán:</b> ${dot(r.canLamSang)}</p>
    <p><b>4. Phương pháp điều trị:</b> ${h(r.keHoach||'').replace(/\n/g,'<br>')||'—'}</p>
    <p><b>5. Tình trạng ra viện:</b> ${h(r.ketQua)||'☐ Khỏi &nbsp; ☐ Đỡ &nbsp; ☐ Không thay đổi &nbsp; ☐ Nặng hơn &nbsp; ☐ Chưa xác định'}</p>
    <p><b>6. Hướng điều trị và các chế độ tiếp theo:</b> <span class="dots" style="display:inline-block;min-width:300px"></span></p>
    <div class="sign"><div></div><div>Ngày ..... tháng ..... năm 20.....<br><b>Bác sỹ điều trị</b><br>(Ký, ghi rõ họ tên)<br><br><br></div></div>`);
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
  /* Danh sách sắp theo mã KH tăng dần */
  const codeNum = c => { const m = String(c.code||'').match(/(\d+)/); return m ? +m[1] : Infinity; };
  const list = filtered.sort((a,b) => codeNum(a) - codeNum(b) || String(a.code).localeCompare(String(b.code)));
  const rows = list.map(c => {
    const debt = custDebt(c);
    const lastV = custLastVisit(c);
    return `<tr class="clickable ${c.id===App.state.custSel?'sel-row':''}" onclick="Cust.pick('${c.id}')">
      <td><span class="cell-who"><span class="avatar">${h(c.name.split(' ').slice(-1)[0].slice(0,2))}</span><span><b>${h(c.name)}</b><span>${h(c.phone||'')} · ${c.gender||''}${c.dob?', '+c.dob.slice(0,4):''}</span></span></span></td>
      <td class="num">${h(c.code)}</td><td class="num">${lastV?fmtD(lastV):'—'}</td>
      <td class="r num" ${debt?'style="color:var(--danger);font-weight:600"':''}>${money(debt)}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="sub-line">Không tìm thấy khách hàng.</td></tr>';

  const c = custById(App.state.custSel);
  let detail = '';
  if (c) {
    const r = c.record || {};
    const teethRow = list2 => list2.map(n => { const t = (c.teeth||{})[n]; return `<button class="tooth ${t?'t-'+t.s:''}" onclick="Cust.toothClick(${n})" title="${t?h(t.note):'Bình thường'}">${n}</button>`; }).join('');
    const tl = (r.dienBien||[]).slice().reverse().map(v => `<div class="tl-item"><span class="tl-date num">${fmtD(v.date)}</span><b>${h(v.db)}</b><p>${h(v.xt||'')}</p></div>`).join('') || '<span class="sub-line">Chưa có diễn biến điều trị.</span>';
    const tags = [];
    if (c.allergy) tags.push(`<span class="pill danger">⚕ ${h(c.allergy)}</span>`);
    const debt = custDebt(c); if (debt) tags.push(`<span class="pill warn">Công nợ ${money(debt)}</span>`);
    if (r.chanDoan) tags.push(`<span class="pill info">${h(icdName(r.chanDoan))}</span>`);
    detail = `
    <div class="card mb" id="custDetail">
      <div class="card-h"><h2>Hồ sơ: ${h(c.name)}</h2><span class="hint">${h(c.code)}</span><span class="spacer"></span>
        <button class="btn small" onclick="Cust.form('${c.id}')">Sửa hồ sơ</button>
        <button class="btn small" onclick="App.state.treatCust='${c.id}';App.go('treatment')">Điều trị & thu tiền →</button>
        <button class="btn small danger" onclick="Cust.del('${c.id}')">Xóa</button></div>
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
    <div class="card mb">
      <div class="card-h"><h2>Sơ đồ răng</h2><span class="hint">nhấn vào răng để cập nhật tình trạng</span></div>
      <div class="card-b">
        <div class="arch" style="margin-bottom:6px">${teethRow(TEETH_UP.slice(0,8))}<span class="gap-mid"></span>${teethRow(TEETH_UP.slice(8))}</div>
        <div class="arch">${teethRow(TEETH_DN.slice(0,8))}<span class="gap-mid"></span>${teethRow(TEETH_DN.slice(8))}</div>
        <div class="legend"><span><i style="background:var(--danger)"></i>Sâu</span><span><i style="background:var(--info)"></i>Trám</span><span><i style="background:var(--warn)"></i>Nội nha</span><span><i style="background:var(--accent-ink)"></i>Bọc sứ</span><span><i style="background:var(--accent)"></i>Implant</span><span><i style="background:var(--muted)"></i>Mất</span></div>
      </div>
    </div>
    ${Photo.cardHTML(c)}
    <div class="card mb">
      <div class="card-h"><h2>Bệnh án ngoại trú (BA-18)</h2><span class="spacer"></span>
        <button class="btn small" onclick="Cust.recordForm()">Cập nhật bệnh án</button>
        <button class="btn small" onclick="Cust.printBA18()">${IC.print} In bệnh án</button></div>
      <div class="card-b">
        <div class="form-grid" style="gap:8px 16px">
          <div class="f full"><label>Lý do vào viện</label><b>${h(r.lyDo||'—')}</b></div>
          <div class="f"><label>Chẩn đoán chính (ICD)</label><b>${h(icdName(r.chanDoan))||'—'}</b></div>
          <div class="f"><label>Bệnh kèm theo</label><b>${h(icdName(r.chanDoanKem))||'—'}</b></div>
          <div class="f full"><label>Kế hoạch điều trị</label><b style="white-space:pre-wrap">${h(r.keHoach||'—')}</b></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h2>Quá trình điều trị</h2><span class="spacer"></span><button class="btn small" onclick="Cust.visitForm()">${IC.plus} Thêm diễn biến</button></div>
      <div class="card-b"><div class="timeline">${tl}</div></div>
    </div>`;
  }

  return `
  <div class="page-head"><h1>Khách hàng</h1><span class="spacer"></span>
    <button class="btn" onclick="Importer.form()">Nhập từ Google Sheet</button>
    <button class="btn primary" onclick="Cust.form()">${IC.plus} Thêm khách hàng</button>
    <div class="sub">${db.customers.length} hồ sơ · thông tin hành chính theo mẫu BA-18</div></div>
  <div class="searchbar">${IC.search}<input placeholder="Tìm theo tên, số điện thoại, mã KH..." value="${h(App.state.custQ)}"
    oninput="App.state.custQ=this.value;App.render();const i=document.querySelector('.searchbar input');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
  <div class="card mb"><div class="tbl-wrap"><table>
    <thead><tr><th>Khách hàng</th><th>Mã</th><th>Khám gần nhất</th><th class="r">Công nợ</th></tr></thead>
    <tbody id="custRows">${rows}</tbody></table></div></div>
  ${detail}`;
};

/* ---------- Lịch hẹn ---------- */
const Cal = {
  setDate(v){ App.state.calDate = v || todayISO(); App.render(); },
  shift(d){ App.state.calDate = isoAdd(App.state.calDate, d); App.render(); },
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
        ${Combo.html('cbApptSvc','service', a.service||'', db.services.map(s=>({t:s.name, s:s.group})),
          'Gõ tên dịch vụ, vd: cao voi, implant', null, 'Gõ tự do cũng được.')}</div>
      <div class="f"><label>Bác sĩ</label><select name="doctorId">${db.staff.filter(s=>s.role.includes('Bác sĩ')).map(s=>`<option value="${s.id}"${a.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Trạng thái</label><select name="status">${APPT_STATUS.map(s=>`<option${a.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="f full"><label>Chờ hàng lab (nếu có)</label><select name="labOrderId"><option value="">— không —</option>${labOpts}</select></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Cal.del('${id}')">Xóa lịch</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu lịch hẹn</button></div>
    </form>`);
  },
  save(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (!d.customerId) { App.toast('Hãy chọn khách hàng từ danh sách gợi ý'); return; }
    delete d.customerName;
    d.dur = num(d.dur) || 30;
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
  const D = App.state.calDate;
  const appts = db.appointments.filter(a=>a.date===D).sort((a,b)=>a.time<b.time?-1:1);
  const rows = appts.map(a => {
    const c = custById(a.customerId); const doc = staffById(a.doctorId);
    const lab = a.labOrderId ? db.labs.find(l=>l.id===a.labOrderId) : null;
    const labWarn = lab && !lab.received ? `<span class="pill danger">Răng chưa về từ lab!</span>` : (lab ? `<span class="pill ok">Hàng lab đã về</span>` : '');
    return `<div class="row-item">
      <span class="time-chip num">${a.time}</span>
      <span class="r-main"><b>${h(c?c.name:'?')}</b><span>${h(a.service)} · ${h(a.chair||'')} · ${h(doc?doc.name:'')}</span>${labWarn?'<span style="display:block;margin-top:3px">'+labWarn+'</span>':''}</span>
      <select onchange="Cal.status('${a.id}',this.value)" style="padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:12.5px">
        ${APPT_STATUS.map(s=>`<option${a.status===s?' selected':''}>${s}</option>`).join('')}</select>
      <button class="btn small" onclick="Cal.form('${a.id}')">Sửa</button>
    </div>`;
  }).join('') || '<div class="sub-line" style="padding:12px 4px">Không có lịch hẹn ngày này. Bấm "Đặt lịch" để thêm.</div>';

  return `
  <div class="page-head"><h1>Lịch hẹn</h1><span class="spacer"></span>
    <button class="btn primary" onclick="Cal.form()">${IC.plus} Đặt lịch</button></div>
  <div class="date-nav mb">
    <button class="btn small" onclick="Cal.shift(-1)">‹ Hôm trước</button>
    <input type="date" value="${D}" onchange="Cal.setDate(this.value)">
    <button class="btn small" onclick="Cal.shift(1)">Hôm sau ›</button>
    <button class="btn small" onclick="Cal.setDate('${todayISO()}')">Hôm nay</button>
  </div>
  <div class="card"><div class="card-h"><h2>${WEEKD[new Date(D+'T00:00').getDay()]}, ${fmtD(D)}</h2><span class="hint">${appts.length} lịch hẹn</span></div>
  <div class="card-b row-list">${rows}</div></div>
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
  itemForm(id){
    const t = id ? db.treatments.find(x=>x.id===id) : {status:'Báo giá', date:todayISO()};
    App.modal(id?'Sửa hạng mục điều trị':'Thêm hạng mục điều trị', `
    <form class="form-grid" onsubmit="Treat.itemSave(event,'${id||''}')">
      <div class="f full"><label>Dịch vụ</label>
        ${Combo.html('cbService','name', (db.services.find(s=>s.id===t.serviceId)||{}).name || t.name || '',
          db.services.map(s=>({t:s.name, s:s.group+' · '+money(s.price)})),
          'Gõ tên dịch vụ, vd: implant, tram, cao voi', Treat.onServicePick,
          'Gõ không dấu cũng ra. Dịch vụ mới thì cứ gõ rồi tự điền giá.')}</div>
      <input type="hidden" name="group" value="${h(t.group||'')}">
      <div class="f"><label>Răng / vị trí</label><input name="tooth" value="${h(t.tooth||'')}" placeholder="R36, 2 hàm..."></div>
      <div class="f"><label>Đơn giá (₫)</label><input type="number" name="price" value="${t.price||''}" required></div>
      <div class="f"><label>Bác sĩ</label><select name="doctorId">${db.staff.filter(s=>s.role.includes('Bác sĩ')).map(s=>`<option value="${s.id}"${t.doctorId===s.id?' selected':''}>${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Trạng thái</label><select name="status">${TREAT_STATUS.map(s=>`<option${t.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="form-actions full">
        ${id?`<button type="button" class="btn danger" onclick="Treat.itemDel('${id}')">Xóa</button><span class="spacer"></span>`:''}
        <button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lưu</button></div>
    </form>`);
  },
  onServicePick(v, inp){
    const s = db.services.find(x => x.name === v); if (!s) return;
    const f = inp.form;
    const price = f.querySelector('[name=price]'), grp = f.querySelector('[name=group]');
    if (price && !num(price.value)) price.value = s.price;
    if (grp) grp.value = s.group;
  },
  itemSave(ev, id){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    d.name = (d.name || '').trim();
    const s = db.services.find(x => x.name === d.name);
    d.serviceId = s ? s.id : '';
    d.price = num(d.price); d.name = d.name || 'Dịch vụ'; d.group = s ? s.group : (d.group || 'Khác');
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
      <div class="f"><label>Số tiền (₫)</label><input type="number" name="amount" required value="${debt||''}"></div>
      <div class="f"><label>Hình thức</label><select name="method">${PAY_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="f"><label>Bác sĩ thực hiện</label><select name="doctorId">${db.staff.filter(s=>s.role.includes('Bác sĩ')).map(s=>`<option value="${s.id}">${h(s.name)}</option>`).join('')}</select></div>
      <div class="f"><label>Nhóm dịch vụ (tính hoa hồng)</label><select name="group">${SERVICE_GROUPS.concat(['Khác']).map(g=>`<option>${g}</option>`).join('')}</select></div>
      <div class="note-block full">Công nợ hiện tại của khách: <b>${money(debt)}</b>. Phiếu thu sẽ vào sổ quỹ và bảng hoa hồng tự động.</div>
      <div class="form-actions full"><button type="button" class="btn" onclick="App.closeModal()">Hủy</button><button class="btn primary">Lập phiếu thu</button></div>
    </form>`);
  },
  paySave(ev){
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    const r = {id:uid(), no:'PT-'+(db.seq.receipt++), date:todayISO(), customerId:App.state.treatCust, desc:d.desc, method:d.method, amount:num(d.amount), staffId:'st4', doctorId:d.doctorId, group:d.group, invoice:null};
    db.receipts.push(r);
    save(); App.closeModal(); App.render(); App.toast('Đã lập ' + r.no + ' ✓');
  },
  invoice(rid){
    const r = db.receipts.find(x=>x.id===rid);
    r.invoice = {no:'1C26THB-'+String(db.seq.receipt+8000).padStart(8,'0'), code:Math.random().toString(16).slice(2,8).toUpperCase(), date:todayISO()};
    save(); App.render(); App.toast('Đã phát hành HĐĐT qua Viettel SInvoice ✓ (mô phỏng — bản thật cần tài khoản SInvoice)');
  },
  printReceipt(rid){
    const r = db.receipts.find(x=>x.id===rid); const c = custById(r.customerId);
    App.print(`
    <div class="p-head"><div><b>${h(db.clinic.name)}</b><br>${h(db.clinic.addr)}<br>ĐT: ${h(db.clinic.phone)}</div><div>Số: <b>${h(r.no)}</b><br>Ngày: ${fmtD(r.date)}</div></div>
    <h1>PHIẾU THU</h1>
    <table class="no-border">
      <tr><td>Họ tên người nộp:</td><td><b>${h(c?c.name:'')}</b> (${h(c?c.code:'')})</td></tr>
      <tr><td>Nội dung thu:</td><td>${h(r.desc)}</td></tr>
      <tr><td>Số tiền:</td><td><b>${money(r.amount)}</b></td></tr>
      <tr><td>Hình thức:</td><td>${h(r.method)}</td></tr>
      ${r.invoice?`<tr><td>Hóa đơn điện tử:</td><td>${h(r.invoice.no)} — mã tra cứu ${h(r.invoice.code)}</td></tr>`:''}
    </table>
    <div class="sign"><div><b>Người nộp tiền</b><br>(Ký, họ tên)<br><br><br></div><div><b>Người thu tiền</b><br>(Ký, họ tên)<br><br><br></div></div>`);
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
    const st = t.status==='Hoàn tất'?'ok':t.status==='Đang điều trị'?'info':t.status==='Chờ điều trị'?'warn':'mutedp';
    return `<tr class="clickable" onclick="Treat.itemForm('${t.id}')"><td><b>${h(t.name)}</b><br><span class="sub-line">${h(t.group)}</span></td>
    <td class="num">${h(t.tooth||'—')}</td><td>${h((staffById(t.doctorId)||{}).name||'—')}</td>
    <td><span class="pill ${st}">${t.status}</span></td><td class="r num">${money(t.price)}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="sub-line">Chưa có hạng mục — bấm "Thêm hạng mục".</td></tr>';

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
    <span style="min-width:230px;flex:1;max-width:320px">${Combo.html('cbTreatCust','treatCust', custLabel(c), custOptions(),
      'Đổi khách: gõ tên, SĐT hoặc mã KH', Treat.onCustPick)}</span>
    <button class="btn primary" onclick="Treat.payForm()">Thu tiền</button></div>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="card kpi"><div class="k-label">Tổng kế hoạch (đã duyệt)</div><div class="k-value num">${money(total)}</div><div class="k-note">${items.length} hạng mục · ${items.filter(t=>t.status==='Báo giá').length} đang báo giá</div></div>
    <div class="card kpi"><div class="k-label">Đã thanh toán</div><div class="k-value num" style="color:var(--ok)">${money(paid)}</div><div class="k-note">${total?Math.min(100,Math.round(paid/total*100)):0}% kế hoạch</div></div>
    <div class="card kpi"><div class="k-label">Còn lại</div><div class="k-value num" ${debt?'style="color:var(--danger)"':''}>${money(debt)}</div><div class="k-note">${debt?'nhắc khách theo lịch trả góp':'không còn công nợ'}</div></div>
  </div>
  <div class="card mb"><div class="card-h"><h2>Kế hoạch điều trị — ${h(c.name)}</h2><span class="spacer"></span>
    <button class="btn small" onclick="Treat.itemForm()">${IC.plus} Thêm hạng mục</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Hạng mục</th><th>Răng</th><th>Bác sĩ</th><th>Trạng thái</th><th class="r">Đơn giá</th></tr></thead><tbody>${itemRows}</tbody></table></div></div>
  <div class="card mb"><div class="card-h"><h2>Đơn thuốc</h2><span class="hint">liên thông Đơn thuốc quốc gia</span><span class="spacer"></span>
    <button class="btn small" onclick="Treat.rxForm()">${IC.plus} Kê đơn mới</button></div>
    <div class="card-b">${rxBlocks}</div></div>
  <div class="card"><div class="card-h"><h2>Phiếu thu</h2><span class="hint">hóa đơn điện tử Viettel SInvoice</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Ngày / Số</th><th>Nội dung</th><th class="r">Số tiền</th><th>Hóa đơn điện tử</th><th></th></tr></thead><tbody>${recRows}</tbody></table></div></div>`;
};

/* ---------- Kho ---------- */
const Inv = {
  form(id){
    const it = id ? db.inventory.find(x=>x.id===id) : {};
    App.modal(id?'Sửa vật tư':'Thêm vật tư', `
    <form class="form-grid" onsubmit="Inv.save(event,'${id||''}')">
      <div class="f full"><label>Tên vật tư / hàng hóa</label><input name="name" required value="${h(it.name||'')}"></div>
      <div class="f"><label>Đơn vị</label><input name="unit" value="${h(it.unit||'')}" placeholder="hộp, tuýp, cái..."></div>
      <div class="f"><label>Tồn kho</label><input type="number" name="stock" value="${it.stock??''}" required></div>
      <div class="f"><label>Định mức tối thiểu</label><input type="number" name="min" value="${it.min??''}"></div>
      <div class="f"><label>Hạn sử dụng</label><input type="date" name="expiry" value="${h(it.expiry||'')}"></div>
      <div class="f full"><label>Nơi bán (nhà cung cấp)</label>
        ${Combo.html('cbSupplier','supplier', it.supplier||'', [...new Set(db.inventory.map(x=>x.supplier).filter(Boolean))],
          'Gõ tên nhà cung cấp', null, 'Nhà cung cấp mới thì cứ gõ tự do.')}</div>
      <div class="f"><label>Giá nhập (₫)</label><input type="number" name="buy" value="${it.buy??''}"></div>
      <div class="f"><label>Giá bán (₫, nếu bán lẻ)</label><input type="number" name="sell" value="${it.sell??''}"></div>
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
  adjust(id, sign){
    const it = db.inventory.find(x=>x.id===id);
    const v = prompt((sign>0?'Nhập kho':'Xuất kho') + ' — số lượng (' + it.unit + '):', '1');
    const n = num(v); if (!n) return;
    it.stock = Math.max(0, it.stock + sign*n);
    save(); App.render(); App.toast((sign>0?'+':'−') + n + ' ' + it.unit + ' → tồn ' + it.stock);
  },
};

SCREENS.inventory = () => {
  const q = Combo.norm(App.state.invQ);
  const list = !q ? db.inventory : db.inventory.filter(it =>
    Combo.norm(it.name).includes(q) || Combo.norm(it.supplier||'').includes(q));
  const warn = db.inventory.filter(it => invStatus(it)[0] !== 'ok').length;
  const value = db.inventory.reduce((s,it)=>s+(it.buy||0)*it.stock,0);
  const rows = list.map(it => {
    const [k,label] = invStatus(it);
    return `<tr><td><b>${h(it.name)}</b><br><span class="sub-line">${h(it.supplier||'—')}</span></td>
    <td>${h(it.unit)}</td>
    <td class="r num" ${k==='danger'?'style="color:var(--danger);font-weight:700"':k==='warn'?'style="color:var(--warn);font-weight:700"':''}>${it.stock}</td>
    <td class="r num">${it.min||0}</td>
    <td class="num">${it.expiry?fmtD(it.expiry):'—'}</td>
    <td class="r num">${it.buy?money(it.buy):'—'}</td>
    <td class="r num">${it.sell?money(it.sell):'—'}</td>
    <td><span class="pill ${k}">${label}</span></td>
    <td style="white-space:nowrap"><button class="btn small" onclick="Inv.adjust('${it.id}',1)">+Nhập</button>
      <button class="btn small" onclick="Inv.adjust('${it.id}',-1)">−Xuất</button>
      <button class="btn small" onclick="Inv.form('${it.id}')">Sửa</button></td></tr>`;
  }).join('') || '<tr><td colspan="9" class="sub-line">Không tìm thấy vật tư.</td></tr>';

  return `
  <div class="page-head"><h1>Kho vật tư</h1><span class="spacer"></span>
    <button class="btn primary" onclick="Inv.form()">${IC.plus} Thêm vật tư</button>
    <div class="sub">${db.inventory.length} mặt hàng · ${warn} cần chú ý · giá trị tồn ${money(value)}</div></div>
  <div class="searchbar">${IC.search}<input placeholder="Tìm vật tư, nhà cung cấp..." value="${h(App.state.invQ)}"
    oninput="App.state.invQ=this.value;App.render();const i=document.querySelector('.searchbar input');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
  <div class="card"><div class="tbl-wrap"><table style="min-width:900px">
    <thead><tr><th>Vật tư · Nơi bán</th><th>ĐV</th><th class="r">Tồn</th><th class="r">Định mức</th><th>HSD</th><th class="r">Giá nhập</th><th class="r">Giá bán</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>
  <div class="note-block" style="margin-top:12px">Cảnh báo tự động: <b>Quá hạn</b> (đỏ) khi HSD đã qua · <b>Sắp hết hạn</b> (vàng) khi còn ≤ 60 ngày · <b>Dưới định mức</b> (đỏ) khi tồn ≤ định mức tối thiểu.</div>`;
};

/* ---------- Chấm công bằng mã QR ---------- */
const QR_PREFIX = 'NKHB-CC:';
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
const Att = {
  stream: null, timer: null,

  logOf(staffId, date){ return (db.attLog||[]).find(x => x.staffId === staffId && x.date === date); },

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
  clinicUrl(){ return location.origin + location.pathname + '#cc'; },
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

  /* Màn hình riêng khi mở app từ mã QR của phòng khám */
  myStaff(){
    const email = (Cloud.who() || '').toLowerCase();
    return db.staff.find(s => (s.email || '').toLowerCase() === email);
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
      if (!st) {
        body = `<div class="note-block" style="background:var(--danger-soft);color:var(--danger)">
          Tài khoản <b>${h(Cloud.who())}</b> chưa được gắn với nhân viên nào.
          Quản lý vào <b>Nhân sự → Bảng lương → Sửa</b> để điền email này cho đúng người.</div>
          <div class="form-actions"><button class="btn" onclick="Att.logout();App.render()">Đăng xuất</button></div>`;
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
            </div>
            ${l&&l.net==='outside'?'<div class="pill danger" style="margin-top:10px">Chấm ngoài mạng phòng khám</div>':''}
          </div></div>
          <button class="btn primary" style="width:100%;justify-content:center;padding:14px" onclick="Att.selfCheck('${st.id}')">${next}</button>
          <div class="form-actions" style="margin-top:14px">
            <button class="btn small" onclick="Att.sync()">Tải lại</button>
            <span class="spacer"></span>
            <button class="btn small" onclick="Att.logout();App.render()">Đăng xuất</button>
            <button class="btn small" onclick="location.hash='';location.reload()">Vào phần mềm</button></div>`;
      }
    }
    return `<div style="max-width:420px;margin:0 auto">
      <div class="page-head"><h1>Chấm công</h1><div class="sub">${h(db.clinic.name)} · ${h(db.clinic.addr)}</div></div>
      ${body}</div>`;
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
    const start = (db.clinic && db.clinic.shiftStart) || '08:00';
    let days = 0, late = 0, outside = 0;
    logs.forEach(l => { if (l.inAt) { days++; if (l.inAt > start) late++; if (l.net === 'outside') outside++; } });
    return {days, late, outside, logs};
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
      html += row(v === true ? true : v === 'locked' ? 'warn' : false,
        v === true ? `Bảng <b>${t}</b> đã có`
        : v === 'locked' ? `Bảng <b>${t}</b> đã có và đang khoá — bình thường, đăng nhập là đọc được`
        : `Chưa có bảng <b>${t}</b> — chạy lại đoạn SQL ở Bước 2`);
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
      App.toast('Xin chào ' + Cloud.who());
      Att.sync();
    } catch(e){ App.toast('Đăng nhập không được: ' + e.message); }
  },
  logout(){ Cloud.logout(); App.render(); App.toast('Đã đăng xuất'); },

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
          <button type="button" class="btn small" onclick="Att.checkSetup()">Kiểm tra</button>
          ${Cloud.configured() ? (Cloud.loggedIn()
            ? `<button type="button" class="btn small" onclick="Att.sync()">Đồng bộ ngay</button>
               <button type="button" class="btn small" onclick="Att.logout()">Đăng xuất</button>`
            : `<button type="button" class="btn small primary" onclick="Att.loginForm()">Đăng nhập</button>`) : ''}
        </div></div>
      <div class="f"><label>Giờ vào ca chuẩn</label><input type="time" name="shiftStart" value="${h(db.clinic.shiftStart||'08:00')}"></div>
      <div class="f"><label>Địa chỉ mạng phòng khám</label><input name="wifiIp" value="${h(db.clinic.wifiIp||'')}" placeholder="chưa đặt"></div>
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
    db.clinic.shiftStart = d.shiftStart; db.clinic.wifiIp = (d.wifiIp||'').trim();
    save(); App.closeModal(); App.render(); App.toast('Đã lưu cài đặt ✓');
  },
};

/* ---------- Nhân sự ---------- */
const HR = {
  tab(t){ App.state.hrTab = t; App.render(); },
  commissionOf(st, month){
    const recs = db.receipts.filter(r => monthOf(r.date) === month);
    if (st.model.type === 'svcGroup') {
      return recs.filter(r=>r.doctorId===st.id).reduce((s,r)=> s + r.amount * ((st.model.rates[r.group] ?? st.model.def) / 100), 0);
    }
    if (st.model.type === 'perCase') return recs.reduce((s,r)=>s+r.amount,0) * st.model.rate / 100;
    if (st.model.type === 'referral') {
      const newIds = db.customers.filter(c=>monthOf(c.createdAt)===month).map(c=>c.id);
      return recs.filter(r=>newIds.includes(r.customerId)).reduce((s,r)=>s+r.amount,0) * st.model.rate / 100;
    }
    return 0;
  },
  revenueOf(st, month){ return db.receipts.filter(r => monthOf(r.date)===month && r.doctorId===st.id).reduce((s,r)=>s+r.amount,0); },
  bonusOf(stId, month){ return db.bonuses.filter(b=>b.staffId===stId && monthOf(b.date)===month && b.amount>0).reduce((s,b)=>s+b.amount,0); },
  penaltyOf(stId, month){ return -db.bonuses.filter(b=>b.staffId===stId && monthOf(b.date)===month && b.amount<0).reduce((s,b)=>s+b.amount,0); },
  staffForm(id){
    const st = id ? staffById(id) : {role:'Bác sĩ điều trị', base:0, kpiTarget:0, model:{type:'svcGroup', rates:{}, def:10}};
    App.modal(id ? 'Sửa nhân viên' : 'Thêm nhân viên', `
    <form class="form-grid" onsubmit="HR.staffSave(event,'${id||''}')">
      <div class="f full"><label>Họ và tên</label><input name="name" required value="${h(st.name||'')}"></div>
      <div class="f"><label>Chức danh</label><input name="role" value="${h(st.role||'')}" list="roleList">
        <datalist id="roleList">${['Bác sĩ điều trị','Phụ tá','Lễ tân','Quản lý','Kế toán'].map(r=>`<option value="${r}">`).join('')}</datalist></div>
      <div class="f"><label>Email đăng nhập</label><input name="email" type="email" value="${h(st.email||'')}" placeholder="bsduc@hoangbach.vn"></div>
      <div class="f"><label>Lương cứng (₫)</label><input type="number" name="base" value="${st.base||0}"></div>
      <div class="f"><label>Chỉ tiêu KPI doanh thu (₫)</label><input type="number" name="kpiTarget" value="${st.kpiTarget||0}"></div>
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
      <div class="f"><label>Số tiền (₫)</label><input type="number" name="amount" required></div>
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
      <span class="spacer"></span><button class="btn small" onclick="HR.staffForm()">${IC.plus} Thêm nhân viên</button></div>
    <div class="tbl-wrap"><table style="min-width:900px">
      <thead><tr><th>Nhân viên</th><th class="r">Lương cứng</th><th class="r">Hoa hồng</th><th class="r">Thưởng</th><th class="r">Phạt</th><th class="r">BHXH (10,5%)</th><th class="r">Thực lãnh</th><th></th></tr></thead>
      <tbody>${payRows.map(({st,com,bon,pen,bhxh,net}) => `<tr>
        <td><span class="cell-who"><span class="avatar">${h(st.name.split(' ').slice(-1)[0].slice(0,2))}</span><span><b>${h(st.name)}</b><span>${h(st.role)}</span></span></span></td>
        <td class="r num">${money(st.base)}</td><td class="r num">${money(com)}</td>
        <td class="r num" style="color:var(--ok)">${bon?'+'+money(bon):'0'}</td>
        <td class="r num" style="color:var(--danger)">${pen?'−'+money(pen):'0'}</td>
        <td class="r num" style="color:var(--danger)">−${money(bhxh)}</td>
        <td class="r num" style="font-weight:700">${money(net)}</td>
        <td><button class="btn small" onclick="HR.staffForm('${st.id}')">Sửa</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="note-block" style="margin-top:12px">BHXH khấu trừ <b>10,5%</b> lương đóng bảo hiểm của người lao động; doanh nghiệp đóng thêm <b>21,5%</b> hạch toán chi phí.</div>`;

  if (tab === 'attendance') {
    const T = todayISO(), start = db.clinic.shiftStart || '08:00';
    const netPill = n => n==='clinic' ? '<span class="pill ok">Tại phòng khám</span>'
      : n==='outside' ? '<span class="pill danger">Ngoài mạng phòng khám</span>' : '<span class="pill mutedp">Chưa rõ mạng</span>';
    const today = db.staff.map(st => {
      const l = Att.logOf(st.id, T);
      return `<tr><td><b>${h(st.name)}</b><br><span class="sub-line">${h(st.role)}</span></td>
        <td class="num">${l&&l.inAt ? (l.inAt + (l.inAt>start?' <span class="pill warn">trễ</span>':'')) : '—'}</td>
        <td class="num">${l&&l.outAt ? l.outAt : '—'}</td>
        <td>${l ? netPill(l.net) : '<span class="sub-line">chưa chấm công</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn small" onclick="Att.showCard('${st.id}')">Mã QR</button>
          <button class="btn small" onclick="Att.editForm('${st.id}','${T}')">Sửa</button></td></tr>`;
    }).join('');
    const sum = db.staff.map(st => {
      const s = Att.summary(st.id, M);
      return `<tr><td><b>${h(st.name)}</b></td><td class="r num">${s.days}</td>
        <td class="r num" ${s.late?'style="color:var(--warn);font-weight:700"':''}>${s.late}</td>
        <td class="r num" ${s.outside?'style="color:var(--danger);font-weight:700"':''}>${s.outside}</td>
        <td>${s.late>=2?'<span class="pill warn">Trễ nhiều</span>':s.days?'<span class="pill ok">Bình thường</span>':'<span class="pill mutedp">Chưa có dữ liệu</span>'}</td></tr>`;
    }).join('');
    body = `
    <div class="page-head" style="margin-bottom:12px">
      <button class="btn primary" onclick="Att.scanner()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h10"/></svg>
        Mở máy chấm công</button>
      <button class="btn" onclick="Att.clinicQR()">Mã QR phòng khám</button>
      <button class="btn" onclick="Att.settingsForm()">Cài đặt</button>
      <span class="spacer"></span>
      <span class="sub-line">Giờ vào ca chuẩn ${h(start)}${db.clinic.wifiIp?' · mạng phòng khám đã đặt':' · chưa đặt mạng phòng khám'}</span>
    </div>
    <div class="card mb"><div class="card-h"><h2>Hôm nay — ${fmtD(T)}</h2><span class="hint">nhân viên quét mã QR ở quầy để ghi giờ vào / giờ ra</span></div>
      <div class="tbl-wrap"><table style="min-width:640px">
        <thead><tr><th>Nhân viên</th><th>Giờ vào</th><th>Giờ ra</th><th>Mạng khi chấm công</th><th></th></tr></thead>
        <tbody>${today}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Tổng hợp tháng ${M.slice(5)}/${M.slice(0,4)}</h2><span class="hint">tự cộng từ nhật ký quét mã</span></div>
      <div class="tbl-wrap"><table style="min-width:560px">
        <thead><tr><th>Nhân viên</th><th class="r">Số công</th><th class="r">Đi trễ</th><th class="r">Chấm ngoài phòng khám</th><th></th></tr></thead>
        <tbody>${sum}</tbody></table></div></div>`;
  }

  if (tab === 'commission') body = `
    <div class="note-block mb">Hoa hồng tính tự động từ <b>phiếu thu thực tế</b>. Bác sĩ: % theo nhóm dịch vụ (Implant 20%, Phục hình sứ 15%, Chỉnh nha 12%, còn lại 10%) · Phụ tá: 2% doanh thu ca tham gia · Lễ tân: 1% doanh thu khách mới.</div>
    <div class="card"><div class="card-h"><h2>Hoa hồng tháng ${M.slice(5)}/${M.slice(0,4)}</h2></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Nhân viên</th><th>Mô hình</th><th class="r">Doanh thu thực hiện</th><th class="r">Hoa hồng</th></tr></thead>
      <tbody>${db.staff.map(st => {
        const rev = st.model.type==='svcGroup' ? HR.revenueOf(st, M) : db.receipts.filter(r=>monthOf(r.date)===M).reduce((s,r)=>s+r.amount,0);
        const model = st.model.type==='svcGroup'?'% theo nhóm dịch vụ':st.model.type==='perCase'?st.model.rate+'% ca tham gia':st.model.rate+'% doanh thu khách mới';
        return `<tr><td><b>${h(st.name)}</b><br><span class="sub-line">${h(st.role)}</span></td><td>${model}</td>
        <td class="r num">${money(rev)}</td><td class="r num" style="font-weight:700">${money(HR.commissionOf(st, M))}</td></tr>`;}).join('')}</tbody></table></div></div>`;

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
    ${[['payroll','Bảng lương'],['attendance','Chấm công'],['commission','Hoa hồng'],['kpi','KPI · Thưởng · Phạt']].map(([k,l])=>`<button class="subtab ${tab===k?'active':''}" onclick="HR.tab('${k}')">${l}</button>`).join('')}
  </div>${body}`;
};

/* ---------- Lab ---------- */
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
  App.render();
  /* Có kết nối sẵn thì lặng lẽ đồng bộ khi mở app */
  if (Cloud.configured() && Cloud.loggedIn()) setTimeout(() => { Sync.run(true).then(() => Att.sync()); }, 800);
});
