/* ================= CẤU HÌNH CỦA MỘT CHI NHÁNH =================
   Đây là tệp DUY NHẤT khác nhau giữa hai chi nhánh. Mọi tệp còn lại giống hệt nhau
   từng chữ, nên sửa phần mềm một lần là cả hai cơ sở cùng được.

   Rạch Giá (Thời Đại) dùng chính tệp này. Gò Quao dùng bản `config.go-quao.js`:
   lúc triển khai thì chép đè nó thành `config.js`.

   Khoá `k` dưới đây là khoá "anon public": nó vốn được gửi tới mọi máy dùng app,
   không phải mật khẩu. Ai cầm khoá mà không có tài khoản thì không đọc được gì, vì
   bảng dữ liệu đã bật Row Level Security chỉ cho người đã đăng nhập.
   TUYỆT ĐỐI không đặt khoá service_role vào đây.

   HAI CHI NHÁNH PHẢI Ở HAI TÊN MÁY CHỦ KHÁC NHAU.
   Trình duyệt tách kho dữ liệu trên máy theo TÊN MÁY CHỦ, không theo thư mục. Đặt
   hai bản vào hai thư mục của cùng một tên miền là chúng dùng chung một kho trên máy
   và ghi đè hồ sơ của nhau — Supabase có tách cũng không cứu được. */
const CLINIC_CFG = {
  /* --- Kho dữ liệu trên Supabase (mỗi chi nhánh một project riêng) --- */
  u: "https://yvgkzetnumzlgvdneuhb.supabase.co",
  k: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z2t6ZXRudW16bGd2ZG5ldWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MTgwODMsImV4cCI6MjEwMjI5NDA4M30.9UeDXEbB4e5SMHaxrviulLdkRt_ZmsJ0Qp5Yaoj7LbU",

  /* --- Chi nhánh nào --- */
  /* Mã ngắn, viết HOA. Dùng để khoá các bước nâng cấp dữ liệu chỉ đúng cho một cơ sở. */
  id: "RG",

  /* --- Thông tin cơ sở, dùng cho giấy tờ in ra --- */
  name: "Nha Khoa Hoàng Bách - Thời Đại",
  legal: "Công ty TNHH Nha Khoa Hoàng Bách – Thời Đại",
  authority: "Sở Y tế An Giang",
  addr: "C22 đường Lê Hồng Phong, phường Rạch Giá, tỉnh An Giang",
  phone: "0986 262 242",
  phone2: "0707 262 242",
  taxCode: "1702345688",
  maCSKCB: "",                 /* mã cơ sở khám chữa bệnh, dùng cho liên thông bệnh án */
  maLienThong: "91AQL",        /* mã liên thông đơn thuốc quốc gia của cơ sở này */
  tinh: "An Giang",            /* tỉnh điền sẵn khi lập hồ sơ khách mới */
  noiKy: "Rạch Giá",           /* địa danh ở dòng "……, ngày … tháng …" cuối văn bản */

  /* --- Đánh số --- */
  maKH: "KH",                  /* tiền tố mã khách hàng: KH-0001 */
  hdPrefix: "1C26THB",         /* ký hiệu hoá đơn điện tử của pháp nhân này */

  /* --- Giờ làm việc mặc định khi máy chưa có dữ liệu --- */
  gio: {caSangVao: "07:00", caSangRa: "12:00", caChieuVao: "13:00", caChieuRa: "17:00"},

  /* --- Cơ sở này có phòng chẩn đoán hình ảnh không --- */
  /* Chỉ Rạch Giá có. Gò Quao đặt false thì nút CĐHA trên thanh đầu tự ẩn. */
  coCDHA: true,

  /* --- Số quyết định quy chế lương thưởng đang áp dụng --- */
  qcLuong: "08/2026/QĐ-HB-TĐ",
};

/* Đọc một mục cấu hình, thiếu thì trả về giá trị dự phòng. Dùng khắp nơi trong app
   để bản cũ chưa có mục mới vẫn chạy y như trước, không vỡ gì. */
function CFG(k, duPhong) {
  const v = (typeof CLINIC_CFG === 'object' && CLINIC_CFG) ? CLINIC_CFG[k] : undefined;
  return (v === undefined || v === null || v === '') ? duPhong : v;
}
