# Nhánh `go-quao` — bản chạy cho chi nhánh Gò Quao

Nhánh này khác nhánh `main` mấy tệp sau, **tất cả đều phải giữ bản của Gò Quao**
mỗi lần gộp từ `main`:

| Tệp | Khác chỗ nào |
|---|---|
| `config.js` | kho Supabase, tên, địa chỉ, điện thoại, mã khách GQ- |
| `manifest.webmanifest` | tên app trên biểu tượng, màu chủ đề cam |
| `index.html` | thẻ `theme-color` màu cam |
| `icon-192.png`, `icon-512.png`, `icon-maskable.png` | biểu tượng nền **cam đất** (Thời Đại nền xanh teal) |
| `sw.js` | tên vùng nhớ đệm riêng (`nkhb-app-gq-…`) |

- `main`     → `config.js` là cấu hình **Rạch Giá (Thời Đại)**, chạy ở GitHub Pages.
- `go-quao`  → `config.js` chép từ `config.go-quao.js`, chạy ở Cloudflare Pages.

## Mỗi lần nâng cấp phần mềm

Sửa code ở `main` như bình thường, rồi mang sang đây:

```
git checkout go-quao
git merge main
git checkout --ours config.js manifest.webmanifest index.html \n     icon-192.png icon-512.png icon-maskable.png sw.js   # GIỮ bản Gò Quao
git add config.js manifest.webmanifest index.html icon-*.png sw.js
git commit
git push origin go-quao
```

Bước `--ours` là quan trọng nhất:

- Quên với `config.js` → bản Gò Quao trỏ vào **kho dữ liệu Rạch Giá**, hai cơ sở
  ghi đè hồ sơ của nhau.
- Quên với `manifest.webmanifest` → biểu tượng cài trên điện thoại nhân viên
  Gò Quao mang tên **"NK Hoàng Bách - Thời Đại"**. Tên trên biểu tượng lấy từ
  tệp này, không phải từ `config.js`, nên phải sửa riêng.
- Quên với mấy tệp `icon-*.png` → biểu tượng Gò Quao trở lại **nền xanh teal**,
  nhìn y hệt bản Thời Đại. Nhân viên làm cả hai cơ sở sẽ mở nhầm app rồi nhập
  hồ sơ vào sai phòng khám.

**Lưu ý khi đổi biểu tượng:** máy nào đã cài app rồi thì phải **gỡ ra cài lại**
mới thấy biểu tượng mới — Android giữ ảnh biểu tượng từ lúc cài.

## Vì sao phải khác tên máy chủ

Trình duyệt tách kho dữ liệu trên máy theo **tên máy chủ**, không theo thư mục.
Đặt hai bản vào hai thư mục của cùng một tên miền — kể cả hai repo khác nhau
trên `*.github.io` — là chúng dùng chung `localStorage`/IndexedDB và đè hồ sơ
của nhau. Nên Gò Quao phải nằm ở Cloudflare Pages (`*.pages.dev`), khác hẳn
tên máy chủ với GitHub Pages của Rạch Giá.
