/* ================= KHO DỮ LIỆU TRÊN MÁY =================
   Trước đây cả kho nằm trong localStorage. Chỗ đó trình duyệt chỉ cho khoảng 5 MB,
   mà riêng chi nhánh Gò Quao đã 6.002 khách và 26.540 lần điều trị — gần 6 MB khi
   chưa tính phiếu thu, lịch hẹn, vật tư và nhật ký. Nạp vào là vượt trần, mà vượt
   trần thì localStorage không báo lỗi tử tế: nó ném lỗi lúc ghi, dữ liệu vừa nhập
   nằm trong bộ nhớ tạm rồi mất sạch khi tải lại trang — đúng sự cố 18/10/2026.

   Nay chuyển sang IndexedDB: chứa được hàng trăm MB. Phần mềm đã dùng IndexedDB cho
   bản sao lưu và tệp minh chứng, nên không phải thứ mới lạ với máy nào.

   ĐỔI LẠI MỘT ĐIỀU: IndexedDB ghi bất đồng bộ. save() vẫn trả về ngay như cũ, lệnh
   ghi chạy nền ngay sau đó (cùng một kiểu hàng đợi mà mahoa.js đang dùng). Khe hở
   mất dữ liệu là vài phần nghìn giây giữa lúc bấm Lưu và lúc ghi xong — đóng tab
   đúng khoảnh khắc đó mới mất. Đổi lại, không còn trần 5 MB.

   DI TRÚ: máy đang chạy có dữ liệu trong localStorage thì lần mở đầu tiên sẽ chép
   sang IndexedDB, ĐỌC LẠI KIỂM TRA, rồi mới xoá bản cũ. Kiểm không khớp thì giữ
   nguyên localStorage và tiếp tục dùng nó — thà chậm còn hơn mất. */
'use strict';

const Kho = {
  TEN_DB: 'nkhb_kho',
  BANG: 'db',
  KHOA: 'chinh',

  _idb: null,
  _choGhi: null,
  _dangGhi: false,
  dungLS: false,        /* true = IndexedDB không dùng được, đang chạy bằng localStorage */

  co(){ try { return !!indexedDB; } catch(e){ return false; } },

  /* Mở (và tạo nếu chưa có) kho IndexedDB. Giữ lại để khỏi mở đi mở lại. */
  mo(){
    if (this._idb) return Promise.resolve(this._idb);
    return new Promise((ok, loi) => {
      if (!this.co()) { loi(new Error('Trình duyệt không có IndexedDB')); return; }
      let y;
      try { y = indexedDB.open(this.TEN_DB, 1); } catch(e){ loi(e); return; }
      y.onupgradeneeded = () => {
        const d = y.result;
        if (!d.objectStoreNames.contains(this.BANG)) d.createObjectStore(this.BANG);
      };
      y.onsuccess = () => { this._idb = y.result; ok(this._idb); };
      y.onerror = () => loi(y.error || new Error('Không mở được kho'));
      y.onblocked = () => loi(new Error('Kho đang bị tab khác giữ'));
    });
  },

  _viec(quyen, lam){
    return this.mo().then(d => new Promise((ok, loi) => {
      const t = d.transaction(this.BANG, quyen);
      const y = lam(t.objectStore(this.BANG));
      y.onsuccess = () => ok(y.result);
      y.onerror = () => loi(y.error || new Error('Lỗi kho'));
      t.onabort = () => loi(t.error || new Error('Giao dịch bị huỷ'));
    }));
  },

  docIDB(){ return this._viec('readonly', s => s.get(this.KHOA)); },
  ghiIDB(v){ return this._viec('readwrite', s => s.put(v, this.KHOA)); },
  xoaIDB(){ return this._viec('readwrite', s => s.delete(this.KHOA)); },

  docLS(){ try { return localStorage.getItem(DB_KEY) || ''; } catch(e){ return ''; } },

  /* ---------- Đọc kho lúc mở phần mềm ---------- */
  /* Trả về chuỗi JSON (hoặc gói đã mã hoá). Chưa có gì thì trả chuỗi rỗng. */
  async layChuoi(){
    if (!this.co()) { this.dungLS = true; return this.docLS(); }
    let v = '';
    try { v = (await this.docIDB()) || ''; }
    catch(e){ this.dungLS = true; return this.docLS(); }
    if (v) return v;

    /* Kho mới trống — máy này có thể đang giữ dữ liệu ở localStorage từ bản cũ */
    const cu = this.docLS();
    if (!cu) return '';
    try {
      await this.ghiIDB(cu);
      const lai = (await this.docIDB()) || '';
      if (lai !== cu) throw new Error('Đọc lại không khớp');
      /* Chỉ xoá bản cũ SAU KHI đã đọc lại đúng từng chữ */
      try { localStorage.removeItem(DB_KEY); } catch(e){}
      this.daDiTru = cu.length;
      return cu;
    } catch(e){
      /* Chép không xong thì cứ chạy bằng localStorage như trước, không mất gì */
      this.dungLS = true;
      return cu;
    }
  },

  /* ---------- Ghi ----------
     Gọi xong trả về ngay; lệnh ghi thật chạy nền. Nhiều lần gọi liên tiếp chỉ ghi
     bản cuối cùng, giống cách mahoa.js gom lệnh ghi. */
  datChuoi(chuoi){
    if (this.dungLS) return this._ghiLS(chuoi);
    this._choGhi = chuoi;
    if (this._dangGhi) return true;
    this._dangGhi = true;
    Promise.resolve().then(async () => {
      try {
        while (this._choGhi !== null) {
          const n = this._choGhi; this._choGhi = null;
          await this.ghiIDB(n);
        }
      } catch(e){
        /* IndexedDB hỏng giữa chừng (hết đĩa, chế độ ẩn danh…) — lùi về localStorage,
           và nếu localStorage cũng không chứa nổi thì báo ra chứ không nuốt lỗi. */
        this.dungLS = true;
        const n = this._choGhi !== null ? this._choGhi : chuoi;
        this._choGhi = null;
        this._ghiLS(n);
      } finally { this._dangGhi = false; }
    });
    return true;
  },

  _ghiLS(chuoi){
    try { localStorage.setItem(DB_KEY, chuoi); return true; }
    catch(e){ if (typeof Kho.khiDay === 'function') Kho.khiDay(); return false; }
  },

  /* app.js gán hàm báo "kho đầy" vào đây */
  khiDay: null,

  /* Xoá sạch kho trên máy — dùng khi bỏ bản đã mã hoá mà quên mật khẩu */
  async xoaHet(){
    try { await this.xoaIDB(); } catch(e){}
    try { localStorage.removeItem(DB_KEY); } catch(e){}
  },

  /* Mô tả cho màn Cài đặt */
  moTa(){
    return this.dungLS
      ? 'Đang lưu trong localStorage (trần ~5 MB) — trình duyệt này không dùng được IndexedDB'
      : 'Đang lưu trong IndexedDB — không còn trần 5 MB';
  },
};
