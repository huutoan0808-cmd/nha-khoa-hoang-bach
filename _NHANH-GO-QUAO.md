# Nhánh `go-quao` — bản chạy cho chi nhánh Gò Quao

Nhánh này **chỉ khác nhánh `main` đúng một tệp**: `config.js`.

- `main`     → `config.js` là cấu hình **Rạch Giá (Thời Đại)**, chạy ở GitHub Pages.
- `go-quao`  → `config.js` chép từ `config.go-quao.js`, chạy ở Cloudflare Pages.

## Mỗi lần nâng cấp phần mềm

Sửa code ở `main` như bình thường, rồi mang sang đây:

```
git checkout go-quao
git merge main
git checkout --ours config.js    # GIỮ config của Gò Quao, đừng lấy của Rạch Giá
git add config.js
git commit
git push origin go-quao
```

Bước `--ours` là quan trọng nhất: quên nó là bản Gò Quao trỏ vào kho dữ liệu
Rạch Giá, hai cơ sở ghi đè hồ sơ của nhau.

## Vì sao phải khác tên máy chủ

Trình duyệt tách kho dữ liệu trên máy theo **tên máy chủ**, không theo thư mục.
Đặt hai bản vào hai thư mục của cùng một tên miền — kể cả hai repo khác nhau
trên `*.github.io` — là chúng dùng chung `localStorage`/IndexedDB và đè hồ sơ
của nhau. Nên Gò Quao phải nằm ở Cloudflare Pages (`*.pages.dev`), khác hẳn
tên máy chủ với GitHub Pages của Rạch Giá.
