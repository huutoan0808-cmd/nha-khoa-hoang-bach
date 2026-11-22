/* ================= CẤU HÌNH CHI NHÁNH GÒ QUAO =================
   Đây là bản dành cho cơ sở Gò Quao. Lúc triển khai thì CHÉP ĐÈ tệp này thành
   `config.js` ở nơi đặt bản Gò Quao. Mọi tệp khác giữ nguyên, giống hệt bản Rạch Giá.

   CÒN THIẾU: hai dòng `u` và `k` bên dưới đang để trống. Phải điền Project URL và
   khoá anon public của project Supabase RIÊNG của Gò Quao thì app mới đăng nhập và
   đồng bộ được. Khoá lấy ở Supabase → Settings → API Keys, mục "Publishable key"
   (giao diện mới gọi tên vậy, chính là khoá "anon public" trước đây).
   Tuyệt đối không dán khoá service_role vào đây.

   HAI CHI NHÁNH PHẢI Ở HAI TÊN MÁY CHỦ KHÁC NHAU (ví dụ Gò Quao đặt ở Cloudflare
   Pages, Rạch Giá ở GitHub Pages). Cùng tên máy chủ mà khác thư mục là hai bản dùng
   chung một kho dữ liệu trên máy và ghi đè hồ sơ của nhau. */
const CLINIC_CFG = {
  /* --- Kho dữ liệu trên Supabase: PHẢI ĐIỀN --- */
  u: "https://bnduegwyajdgnduhnhwx.supabase.co",
  k: "",

  /* --- Chi nhánh nào --- */
  /* Khác "RG" là phần mềm tự bỏ qua mấy bước nâng cấp chỉ dành cho Thời Đại —
     quan trọng nhất là bước tự đổi tên cơ sở về "Thời Đại". */
  id: "GQ",

  /* --- Thông tin cơ sở, dùng cho giấy tờ in ra --- */
  name: "Nha Khoa Hoàng Bách - Gò Quao",
  legal: "Công ty TNHH Nha Khoa Hoàng Bách – Gò Quao",
  authority: "Sở Y tế An Giang",
  addr: "Số 33 đường 3/2, Xã Gò Quao, An Giang",
  phone: "0776 262 242",
  phone2: "",
  taxCode: "",                 /* CHƯA CÓ — điền mã số thuế của pháp nhân Gò Quao */
  maCSKCB: "",                 /* CHƯA CÓ — mã cơ sở khám chữa bệnh cho liên thông bệnh án */
  maLienThong: "91AQM",        /* mã liên thông đơn thuốc quốc gia của Gò Quao (đã được duyệt) */
  tinh: "An Giang",
  noiKy: "Gò Quao",

  /* --- Đánh số --- */
  maKH: "GQ",                  /* mã khách Gò Quao: GQ-0001, không đụng mã KH- của Rạch Giá */
  hdPrefix: "",                /* CHƯA CÓ — ký hiệu hoá đơn điện tử của pháp nhân Gò Quao */

  /* --- Giờ làm việc mặc định --- */
  /* Giấy phép hoạt động Gò Quao ghi 07:00–21:00. Giờ này chỉ là giá trị khởi tạo,
     sửa lại được trong Cài đặt → Thông tin phòng khám. */
  gio: {caSangVao: "07:00", caSangRa: "12:00", caChieuVao: "13:00", caChieuRa: "21:00"},

  /* --- Cơ sở này không có phòng chẩn đoán hình ảnh --- */
  /* Đặt false thì nút CĐHA trên thanh đầu tự ẩn. Gò Quao vẫn gửi mẫu qua cơ sở
     CĐHA bên Thời Đại như hiện nay. */
  coCDHA: false,

  /* --- Quy chế lương thưởng đang áp dụng ở Gò Quao --- */
  qcLuong: "05/2026/QĐ-HB-GQ, sửa đổi theo QĐ 10/2026/QĐ-HB-GQ",
};

/* Đọc một mục cấu hình, thiếu thì trả về giá trị dự phòng. */
function CFG(k, duPhong) {
  const v = (typeof CLINIC_CFG === 'object' && CLINIC_CFG) ? CLINIC_CFG[k] : undefined;
  return (v === undefined || v === null || v === '') ? duPhong : v;
}
