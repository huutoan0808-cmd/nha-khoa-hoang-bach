/* =====================================================================
   DỰNG CƠ SỞ DỮ LIỆU SUPABASE CHO CHI NHÁNH GÒ QUAO
   Phần mềm: Quản lý phòng khám Nha khoa Hoàng Bách (HTML/JS thuần)
   =====================================================================

   TỆP NÀY LÀM GÌ
   Tạo đúng và đủ các bảng mà phần mềm cần để đồng bộ giữa các máy:
   nhân viên, chấm công, cài đặt, kho dữ liệu vận hành, kho hồ sơ bệnh án
   riêng, nhật ký lưu vết, và bảng nhận yêu cầu đặt hẹn online của khách.
   Kèm luôn phần khoá quyền (chỉ người đã đăng nhập mới xem/ghi được).

   DÁN VÀO ĐÂU
   1. Mở https://supabase.com/dashboard, chọn project MỚI của Gò Quao.
   2. Menu bên trái → SQL Editor → New query.
   3. Dán TOÀN BỘ tệp này vào → bấm Run (hoặc Ctrl + Enter).
   4. Kéo xuống cuối kết quả xem phần KIỂM TRA để biết đã đủ hay chưa.

   CHẠY BAO NHIÊU LẦN CŨNG KHÔNG HỎNG
   Mọi lệnh đều dùng "if not exists" / "create or replace", và policy thì
   xoá rồi tạo lại. Chạy lần hai, lần ba không làm mất dữ liệu đã có,
   không báo lỗi. Cứ chạy lại khi không chắc.

   LƯU Ý: tệp này KHÔNG tạo tài khoản đăng nhập cho nhân viên và KHÔNG
   bật đăng nhập bằng email — hai việc đó phải làm bằng tay trên giao
   diện Supabase (xem ghi chú ở cuối tệp).
   ===================================================================== */


/* ---------------------------------------------------------------------
   PHẦN 1 — TẠO CÁC BẢNG
   --------------------------------------------------------------------- */

/* Danh sách nhân viên dùng chung giữa các máy (mã, tên, chức danh, còn làm hay không). */
create table if not exists staff (
  id text primary key, name text not null, role text,
  active boolean default true, updated_at timestamptz default now());

/* Chấm công từng người từng ngày: giờ vào, giờ ra, máy chấm qua mã QR hay không, ghi chú.
   Ràng buộc unique (staff_id, date) là BẮT BUỘC: phần mềm gửi chấm công bằng
   on_conflict=staff_id,date — không có ràng buộc này thì mỗi lần chấm lại sinh thêm
   một dòng mới thay vì sửa dòng cũ.
   Cột id để kiểu uuid tự sinh vì phần mềm không bao giờ tự đặt id cho dòng chấm công,
   chỉ đọc lại id mà máy chủ cấp. */
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null references staff(id) on delete cascade,
  date date not null, in_at text, out_at text, net text, ip text,
  via_qr boolean default true, note text, updated_at timestamptz default now(),
  unique (staff_id, date));

/* Cài đặt chung của phòng khám (thông tin phòng khám, bộ đếm số phiếu…), mỗi dòng một khoá.
   Giá trị lưu dạng text vì phần mềm tự nén thành chuỗi JSON rồi mới gửi lên. */
create table if not exists settings (
  key text primary key, value text, updated_at timestamptz default now());

/* Kho dữ liệu VẬN HÀNH: bảng giá, quy trình, kho vật tư, chấm bảng lương, thưởng phạt,
   công việc, báo cáo, kết quả chẩn đoán hình ảnh, và file scan minh chứng (tbl = 'tepMC').
   Mỗi dòng là một bản ghi của phần mềm: id = "<tên mục>:<mã bản ghi>", tbl = tên mục,
   data = toàn bộ nội dung bản ghi.
   data để kiểu jsonb (chứ không tách thành cột) vì mỗi mục có cấu trúc khác nhau và
   phần mềm còn lọc theo trường bên trong, ví dụ data->>group. */
create table if not exists records (
  id text primary key, tbl text not null, data jsonb not null,
  deleted boolean default false, updated_at timestamptz default now());

/* Kho HỒ SƠ BỆNH ÁN, để riêng khỏi kho vận hành theo mục III.1.1.k hướng dẫn của Bộ Y tế:
   khách hàng, đợt điều trị, hạng mục điều trị, đơn thuốc, phiếu lab, lịch hẹn, phiếu thu.
   Cấu trúc giống records để phần mềm dùng chung một đoạn mã cho cả hai kho. */
create table if not exists emr (
  id text primary key, tbl text, data jsonb,
  deleted boolean default false, updated_at timestamptz);

/* Nhật ký lưu vết: ai, lúc nào, làm gì, trên bản ghi nào, đổi những trường gì.
   Theo mục III.1.1.đ hướng dẫn của Bộ Y tế. Cột ban_sao giữ nguyên nội dung bản ghi
   vừa bị xoá nên nhật ký kiêm luôn thùng rác (khôi phục lại được).
   truong và ban_sao để kiểu jsonb vì nội dung thay đổi theo từng bản ghi. */
create table if not exists audit (
  id text primary key,
  at timestamptz not null,
  email text, ten text, vai text,
  act text not null, tbl text, rec_id text,
  nhan text, truong jsonb, ban_sao jsonb, may text
);

/* Yêu cầu đặt hẹn do khách tự gửi từ trang đặt hẹn online (khách không cần đăng nhập).
   Lễ tân vào phần mềm bấm Nhận lịch hoặc Từ chối, phần mềm sẽ sửa cột trangthai.
   gio để kiểu text (ví dụ "08:30") vì phần mềm gửi lên đúng dạng chuỗi giờ:phút. */
create table if not exists datlich (
  id uuid primary key default gen_random_uuid(),
  ten text not null, sdt text not null,
  ngay date not null, gio text not null,
  dichvu text, ghichu text,
  trangthai text default 'Cho xac nhan',
  created_at timestamptz default now());


/* ---------------------------------------------------------------------
   PHẦN 2 — CHỈ MỤC (để các câu phần mềm hay gọi chạy nhanh, khỏi quét cả bảng)
   --------------------------------------------------------------------- */

/* Phần mềm lọc liên tục theo tbl: tbl=neq.tepMC khi đồng bộ,
   tbl=eq.customers / tbl=eq.treatments / tbl=in.(cdha,cdhaDM) ở trang chẩn đoán hình ảnh. */
create index if not exists records_tbl_idx on records(tbl);
create index if not exists emr_tbl_idx     on emr(tbl);

/* Đọc dữ liệu về phải chia trang 1000 dòng theo order=id.asc.
   Khoá chính id đã tự có chỉ mục nên không cần tạo thêm cho việc phân trang. */

/* Chấm công đọc theo date=gte.<ngày>&order=date.desc. */
create index if not exists attendance_date_idx on attendance(date desc);

/* Nhật ký đọc theo at=gte.<mốc>&order=at.desc&limit=2000. */
create index if not exists audit_at_idx on audit(at desc);

/* Trang duyệt yêu cầu đặt hẹn đọc theo order=created_at.desc. */
create index if not exists datlich_created_idx on datlich(created_at desc);


/* ---------------------------------------------------------------------
   PHẦN 3 — HÀM TRA GIỜ ĐÃ KÍN CHO TRANG ĐẶT HẸN ONLINE
   Khách chưa đăng nhập nên không được đọc bảng nào cả. Hàm này là lối ra
   duy nhất, và nó CHỈ trả về giờ với thời lượng — không trả tên, không
   trả số điện thoại của bất kỳ bệnh nhân nào.
   --------------------------------------------------------------------- */
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
grant execute on function gio_ban(date) to anon, authenticated;

/* Ghi chú: lịch hẹn của phòng khám đã chuyển sang kho hồ sơ bệnh án (bảng emr),
   nên hàm trên chỉ còn thấy phần lịch hẹn còn sót trong records. Giữ y nguyên
   như phần mềm đang dùng ở chi nhánh Thời Đại để hai nơi hoạt động giống nhau;
   sửa khác đi là lệch với mã nguồn. */


/* ---------------------------------------------------------------------
   PHẦN 4 — KHOÁ QUYỀN TRUY CẬP (Row Level Security)
   Bật RLS là mặc định KHÓA HẾT, rồi mở lại từng cửa bằng policy.
   Nguyên tắc: chỉ người ĐÃ ĐĂNG NHẬP (authenticated) mới đọc/ghi được.
   Khách vãng lai (anon) chỉ được gửi yêu cầu đặt hẹn, không đọc được gì.
   --------------------------------------------------------------------- */

alter table staff      enable row level security;
alter table attendance enable row level security;
alter table settings   enable row level security;
alter table records    enable row level security;
alter table emr        enable row level security;
alter table audit      enable row level security;
alter table datlich    enable row level security;

/* Xoá policy cũ trước khi tạo lại, để chạy tệp này nhiều lần không báo "đã tồn tại" */
drop policy if exists p_staff        on staff;
drop policy if exists p_att          on attendance;
drop policy if exists p_set          on settings;
drop policy if exists p_rec          on records;
drop policy if exists p_emr_doc      on emr;
drop policy if exists p_emr_them     on emr;
drop policy if exists p_emr_sua      on emr;
drop policy if exists p_audit_doc    on audit;
drop policy if exists p_audit_them   on audit;
drop policy if exists p_datlich_them on datlich;
drop policy if exists p_datlich_ql   on datlich;

/* Bốn bảng vận hành: người đã đăng nhập được toàn quyền (xem, thêm, sửa, xoá).
   Cần quyền xoá thật vì phần mềm có xoá dòng: gỡ file scan minh chứng và dọn
   bản ghi bệnh án cũ còn sót trong kho chung. */
create policy p_staff on staff      for all to authenticated using (true) with check (true);
create policy p_att   on attendance for all to authenticated using (true) with check (true);
create policy p_set   on settings   for all to authenticated using (true) with check (true);
create policy p_rec   on records    for all to authenticated using (true) with check (true);

/* Kho hồ sơ bệnh án: cho xem, thêm, sửa — KHÔNG cho xoá hẳn.
   Phần mềm không bao giờ xoá dòng bệnh án; muốn bỏ thì nó đánh dấu deleted = true,
   nội dung vẫn còn để truy lại được. */
create policy p_emr_doc  on emr for select to authenticated using (true);
create policy p_emr_them on emr for insert to authenticated with check (true);
create policy p_emr_sua  on emr for update to authenticated using (true);

/* NHẬT KÝ LƯU VẾT: chỉ cho XEM và THÊM.
   Cố tình KHÔNG tạo policy sửa và xoá — không ai sửa hay xoá được dòng nhật ký,
   kể cả quản lý, kể cả chủ phòng khám. Đó mới là truy vết. */
create policy p_audit_doc  on audit for select to authenticated using (true);
create policy p_audit_them on audit for insert to authenticated with check (true);

/* Đặt hẹn online: khách chưa đăng nhập CHỈ được gửi yêu cầu vào, không đọc lại được
   yêu cầu của người khác. Nhân viên đã đăng nhập thì toàn quyền để duyệt. */
create policy p_datlich_them on datlich for insert to anon          with check (true);
create policy p_datlich_ql   on datlich for all    to authenticated using (true) with check (true);


/* =====================================================================
   PHẦN 5 — KIỂM TRA: chạy xong nhìn mấy bảng kết quả dưới đây
   ===================================================================== */

/* 5.1 — Đủ 7 bảng chưa? Cột "tinh_trang" phải ghi ĐỦ ở cả 7 dòng. */
select
  can.ten_bang,
  case when t.tablename is null then '✗ CHƯA CÓ — chạy lại tệp này'
       when t.rowsecurity    then '✓ ĐỦ (đã khoá quyền)'
       else                       '✗ CÓ BẢNG NHƯNG CHƯA KHOÁ QUYỀN' end as tinh_trang
from (values ('staff'),('attendance'),('settings'),('records'),
             ('emr'),('audit'),('datlich')) as can(ten_bang)
left join pg_tables t on t.schemaname = 'public' and t.tablename = can.ten_bang
order by can.ten_bang;

/* 5.2 — Danh sách quyền đã mở. Đọc cột "lenh": SELECT = xem, INSERT = thêm,
   UPDATE = sửa, DELETE = xoá, ALL = toàn quyền.
   Bảng audit phải CHỈ có SELECT và INSERT (không được có UPDATE hay DELETE).
   Bảng emr phải có SELECT, INSERT, UPDATE (không có DELETE). */
select tablename as ten_bang, policyname as ten_quyen,
       cmd as lenh, roles as cho_ai
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

/* 5.3 — Các chỉ mục đã tạo (để truy vấn chạy nhanh). */
select tablename as ten_bang, indexname as ten_chi_muc
from pg_indexes
where schemaname = 'public'
  and tablename in ('staff','attendance','settings','records','emr','audit','datlich')
order by tablename, indexname;

/* 5.4 — Ràng buộc unique bắt buộc phải có, nếu không thì phần mềm gửi dữ liệu lên
   sẽ sinh dòng trùng thay vì cập nhật dòng cũ. */
select
  can.mo_ta,
  case when exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = can.bang and indexname like can.mau
  ) then '✓ có' else '✗ THIẾU' end as tinh_trang
from (values
  ('records: khoá chính id (cần cho on_conflict=id)',      'records',    'records_pkey'),
  ('emr: khoá chính id (cần cho on_conflict=id)',          'emr',        'emr_pkey'),
  ('audit: khoá chính id (cần cho on_conflict=id)',        'audit',      'audit_pkey'),
  ('staff: khoá chính id (cần cho on_conflict=id)',        'staff',      'staff_pkey'),
  ('settings: khoá chính key (cần cho on_conflict=key)',   'settings',   'settings_pkey'),
  ('attendance: unique staff_id + date (cần cho upsert)',  'attendance', 'attendance_staff_id_date_key')
) as can(mo_ta, bang, mau);

/* 5.5 — Hàm tra giờ kín cho trang đặt hẹn online. */
select case when exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'gio_ban'
  ) then '✓ Hàm gio_ban đã có' else '✗ THIẾU hàm gio_ban — chạy lại tệp này' end as tinh_trang;


/* =====================================================================
   PHẦN 6 — NHỮNG VIỆC SQL KHÔNG LÀM THAY ĐƯỢC
   Làm bằng tay trên giao diện Supabase của project Gò Quao:

   1. Bật đăng nhập bằng email:
      Authentication → Sign In / Providers → Email: bật "Enable Email provider",
      TẮT "Confirm email" (phòng khám không có hộp thư để bấm xác nhận).
   2. Tắt tự đăng ký:
      Authentication → Sign In / Providers → TẮT "Allow new users to sign up",
      để người ngoài không tự tạo tài khoản vào được dữ liệu bệnh nhân.
      (Tạo tài khoản nhân viên thì quản lý tạo tay ở bước 3.)
   3. Tạo tài khoản nhân viên đầu tiên (tài khoản quản lý):
      Authentication → Users → Add user → Create new user, nhập email + mật khẩu,
      bật "Auto Confirm User". Rồi mở phần mềm đăng nhập bằng tài khoản đó.
   4. Lấy hai thông tin để dán vào phần mềm:
      Project Settings → API → copy "Project URL" và khoá "anon public".
      Dán vào phần mềm ở Cài đặt → Kết nối đám mây. KHÔNG dùng khoá service_role.
   5. Chọn vùng máy chủ khi tạo project: Southeast Asia (Singapore) cho nhanh.
   6. Project gói free TỰ TẠM DỪNG khi không ai dùng một thời gian — lúc đó app
      không đăng nhập được. Vào dashboard bấm Resume là chạy lại.
   7. Nhân viên trong bảng staff: phần mềm tự đẩy lên khi đồng bộ, không cần nhập tay.
      Lưu ý bảng attendance tham chiếu staff(id), nên phải đồng bộ một lần cho có
      nhân viên trước khi chấm công.
   ===================================================================== */
