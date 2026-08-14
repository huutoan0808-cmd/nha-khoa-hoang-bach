# Kết nối phần mềm với cơ sở dữ liệu chung (Supabase)

Làm một lần duy nhất, khoảng 5–10 phút. Gói miễn phí đủ dùng cho phòng khám vài chục nhân viên,
không cần nhập thẻ ngân hàng.

---

## Bước 1 — Tạo dự án

1. Vào **https://supabase.com** → bấm **Start your project** → đăng nhập bằng tài khoản Google của bạn.
2. Bấm **New project**, điền:
   - **Name**: `nha-khoa-hoang-bach`
   - **Database Password**: bấm **Generate a password** rồi **lưu lại chỗ nào đó an toàn**
     (mật khẩu này để quản trị cơ sở dữ liệu, không dùng để đăng nhập phần mềm)
   - **Region**: chọn **Southeast Asia (Singapore)** — gần Việt Nam nhất, chạy nhanh nhất
3. Bấm **Create new project**, chờ khoảng 2 phút cho hệ thống dựng xong.

---

## Bước 2 — Tạo các bảng dữ liệu

1. Ở thanh bên trái chọn **SQL Editor** → **New query**.
2. Dán **toàn bộ** đoạn dưới đây vào rồi bấm **Run** (góc dưới bên phải).

```sql
-- ============ BẢNG NHÂN VIÊN ============
create table if not exists staff (
  id          text primary key,
  name        text not null,
  role        text,
  active      boolean default true,
  updated_at  timestamptz default now()
);

-- ============ NHẬT KÝ CHẤM CÔNG ============
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  staff_id    text not null references staff(id) on delete cascade,
  date        date not null,
  in_at       text,
  out_at      text,
  net         text,                      -- clinic | outside | unknown
  ip          text,
  via_qr      boolean default true,
  note        text,
  updated_at  timestamptz default now(),
  unique (staff_id, date)
);

-- ============ CÀI ĐẶT CHUNG ============
create table if not exists settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now()
);

-- ============ BẢO MẬT ============
-- Bật khoá: chưa đăng nhập thì không đọc/ghi được gì
alter table staff      enable row level security;
alter table attendance enable row level security;
alter table settings   enable row level security;

drop policy if exists p_staff on staff;
drop policy if exists p_att   on attendance;
drop policy if exists p_set   on settings;

create policy p_staff on staff      for all to authenticated using (true) with check (true);
create policy p_att   on attendance for all to authenticated using (true) with check (true);
create policy p_set   on settings   for all to authenticated using (true) with check (true);
```

Chạy xong phải thấy dòng **Success. No rows returned** — vậy là đúng.

---

## Bước 3 — Tạo tài khoản đăng nhập cho nhân viên

1. Thanh bên trái chọn **Authentication** → **Users** → **Add user** → **Create new user**.
2. Tạo cho từng người, ví dụ:

   | Email | Mật khẩu | Dùng cho |
   |---|---|---|
   | `quanly@hoangbach.vn` | (bạn tự đặt) | Bạn — xem được mọi thứ |
   | `bsduc@hoangbach.vn` | (tự đặt) | BS. Trần Minh Đức |
   | `bshang@hoangbach.vn` | (tự đặt) | BS. Lê Thu Hằng |
   | `letan@hoangbach.vn` | (tự đặt) | Lễ tân |

   > Email không cần có thật, chỉ dùng để đăng nhập. Nhớ **bật `Auto Confirm User`**
   > để không phải xác nhận qua email.

---

## Bước 4 — Lấy khoá kết nối đưa vào phần mềm

1. Thanh bên trái chọn **Project Settings** (bánh răng) → **API**.
2. Chép hai giá trị sau:
   - **Project URL** — dạng `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** (mục *Project API keys*) — chuỗi dài bắt đầu bằng `eyJ...`

3. Mở phần mềm → **Nhân sự → Chấm công → Cài đặt → Kết nối đám mây**, dán hai giá trị vào, bấm **Lưu & kiểm tra**.

---

## Về an toàn dữ liệu

- Khoá **anon public** được thiết kế để lộ ra ngoài, nó **không tự mở được dữ liệu**.
  Muốn đọc bất cứ thứ gì đều phải đăng nhập, do đã bật Row Level Security ở Bước 2.
- Ai không có tài khoản thì mở link phần mềm cũng chỉ thấy màn hình đăng nhập.
- Đừng bao giờ chép khoá **service_role** vào phần mềm — khoá đó bỏ qua mọi lớp bảo vệ.
  Chỉ dùng khoá **anon public**.

---

## Khi cần đổi về máy chủ riêng sau này

Cấu trúc bảng ở trên là PostgreSQL tiêu chuẩn. Lúc thuê VPS chỉ cần xuất dữ liệu ra
rồi nạp vào máy chủ mới, phần mềm đổi lại địa chỉ kết nối là chạy tiếp — không phải viết lại.
