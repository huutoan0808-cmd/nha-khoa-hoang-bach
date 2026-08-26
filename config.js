/* Cấu hình kết nối phòng khám, nhúng sẵn để mở link gốc trên máy mới là ra ngay ô đăng nhập.
   Khóa dưới đây là "anon public" của Supabase — loại khóa được thiết kế để công khai;
   dữ liệu vẫn được bảo vệ bằng Row Level Security và bắt buộc đăng nhập.
   TUYỆT ĐỐI không đặt khóa service_role vào đây. */
const CLINIC_CFG = {
  u: '',   /* Project URL, ví dụ https://xxxxxxxx.supabase.co */
  k: '',   /* anon public key, bắt đầu bằng eyJ... */
};
