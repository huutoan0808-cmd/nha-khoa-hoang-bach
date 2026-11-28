/* Đồng bộ dữ liệu giữa các máy qua Supabase.
   Nguyên tắc: mỗi bản ghi mang dấu thời gian sửa (_up); hai máy cùng sửa thì bản sửa sau thắng.
   Mất mạng vẫn dùng bình thường, có mạng lại thì đẩy lên. */
'use strict';

const SYNC_TABLES = ['services','staff','customers','treatments','receipts','rx','inventory','appointments','labs','bonuses','invLog','episodes','quyTrinh','giaLab','ghiNhan','danhGia','bangLuong','congViec','baoCao','thongBao'];

/* Công văn hướng dẫn kỹ thuật của Bộ Y tế, mục III.1.1.k: "Dữ liệu hồ sơ bệnh án
   điện tử của người bệnh được lưu trữ độc lập không phụ thuộc vào các hệ thống khác
   tại cơ sở khám bệnh, chữa bệnh."

   Trước đây mọi thứ nằm chung một bảng records — bệnh án lẫn với kho vật tư, chấm
   công, thưởng phạt. Nay tách làm hai kho: bảng emr chỉ chứa hồ sơ bệnh án, bảng
   records giữ phần vận hành. Nhờ vậy sao lưu, phân quyền và bàn giao dữ liệu bệnh
   án làm riêng được, không kéo theo phần còn lại.

   BẢNG TRÊN SUPABASE — chạy một lần trong SQL Editor:

     create table if not exists emr (
       id text primary key, tbl text, data jsonb,
       deleted boolean default false, updated_at timestamptz
     );
     alter table emr enable row level security;
     create policy "doc"  on emr for select to authenticated using (true);
     create policy "them" on emr for insert to authenticated with check (true);
     create policy "sua"  on emr for update to authenticated using (true);

   Chưa chạy thì phần mềm vẫn chạy bình thường, tự quay về dùng bảng records như cũ
   và báo một lần — không để phòng khám đứng hình vì chưa kịp tạo bảng. */
const EMR_TABLES = ['customers','episodes','treatments','rx','labs','appointments','receipts'];
const khoCua = t => (EMR_TABLES.includes(t) ? 'emr' : 'records');

const Sync = {
  shadow: {},        /* tbl -> {id: nội dung đã lưu lần trước} */
  tombs: [],         /* bản ghi đã xóa, chờ báo cho các máy khác */
  busy: false,
  lastAt: 0,
  emrSan: null,      /* null = chưa biết, true = có bảng emr, false = chưa tạo */
  daBaoEmr: false,

  /* ---------- Đánh dấu bản ghi vừa đổi ---------- */
  snapshot(){
    this.shadow = {};
    SYNC_TABLES.forEach(t => {
      const m = this.shadow[t] = {};
      (db[t] || []).forEach(r => { if (r && r.id) m[r.id] = this.plain(r); });
    });
    /* Ghi thêm danh sách ID xuống db để SỐNG QUA LẦN ĐÓNG APP. Chỉ lưu id chứ không
       lưu cả nội dung: nội dung thì nặng ngang cả kho dữ liệu, mà muốn biết bản ghi
       nào bị xóa thì chỉ cần id là đủ. */
    /* Ghi vân tay từng bản ghi xuống db để SỐNG QUA LẦN ĐÓNG APP: vừa biết bản ghi
       nào bị xóa, vừa biết bản ghi nào thật sự đổi nội dung. Nếu chỉ lưu id thì mở
       app lên stamp() sẽ coi MỌI bản ghi là vừa đổi và đóng dấu thời gian mới cho
       tất cả — máy đó sẽ đè lên dấu xóa của máy khác. */
    db.syncIds = db.syncIds || {};
    SYNC_TABLES.forEach(t => {
      const m = {};
      (db[t] || []).forEach(r => { if (r && r.id) m[r.id] = this.bam(this.plain(r)); });
      db.syncIds[t] = m;
    });
  },
  plain(r){ const o = {}; Object.keys(r).forEach(k => { if (k !== '_up') o[k] = r[k]; }); return JSON.stringify(o); },
  /* Vân tay ngắn của một bản ghi. Chỉ dùng để biết "có đổi hay không", không phải để
     bảo mật, nên một hàm băm rẻ tiền là đủ. */
  bam(s){
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36) + ':' + s.length.toString(36);
  },
  /* Lấy mốc so sánh ngay khi mở app, SAU KHI migrate() chuẩn hóa xong. Không đụng
     tới _up và không đụng tới db.syncIds (cái đó giữ danh sách của lần đồng bộ cuối,
     dùng để biết bản ghi nào đã bị xóa). */
  moBaiDau(){
    SYNC_TABLES.forEach(t => {
      const m = this.shadow[t] = {};
      (db[t] || []).forEach(r => { if (r && r.id) m[r.id] = this.plain(r); });
    });
    this.daMoc = true;
  },
  stamp(){
    const now = Date.now();
    if (!this.daMoc) this.moBaiDau();
    /* Dấu xóa cũng phải sống qua lần đóng app: đẩy lên hỏng giữa chừng mà mất dấu thì
       bản ghi đã xóa sẽ sống lại ở lần kéo về sau. */
    const cu = (db.tombs || []).filter(x => x && x.tbl && x.id);
    const da = {};
    cu.forEach(x => { da[x.tbl + ':' + x.id] = 1; });
    this.tombs = cu.concat(this.tombs.filter(x => !da[x.tbl + ':' + x.id]));
    this.tombs.forEach(x => { da[x.tbl + ':' + x.id] = 1; });

    SYNC_TABLES.forEach(t => {
      const arr = db[t] || [], m = this.shadow[t] || (this.shadow[t] = {});
      /* Bản chụp cũ ghi xuống db. Bản v141 lưu dạng mảng id — đọc được cả hai dạng,
         nhưng dạng mảng thì không có vân tay nên coi như chưa biết nội dung. */
      const cuRaw = (db.syncIds || {})[t];
      const coCu = !!cuRaw;
      const daBiet = {};
      if (cuRaw) (Array.isArray(cuRaw) ? cuRaw : Object.keys(cuRaw)).forEach(id => { daBiet[id] = 1; });
      const alive = {};
      arr.forEach(r => {
        if (!r || !r.id) return;
        alive[r.id] = 1;
        const j = this.plain(r);
        /* Mốc so sánh đã được lấy lúc mở app (moBaiDau), nên tới đây mọi khác biệt
           đều là người dùng thật sự vừa sửa. Bản ghi chưa có trong mốc là bản ghi mới. */
        if (m[r.id] !== j) { r._up = now; m[r.id] = j; }
      });
      Object.keys(m).forEach(id => {
        if (!alive[id]) { delete m[id]; if (!da[t + ':' + id]) { this.tombs.push({tbl:t, id, at:now}); da[t + ':' + id] = 1; } }
      });
      /* Bản chụp trong bộ nhớ tạm trống (vừa mở app) thì so với danh sách ID đã ghi
         xuống db lần trước. KHÔNG có danh sách đó thì tuyệt đối không sinh dấu xóa —
         máy mới cài sẽ coi như cả kho vừa bị xóa sạch. */
      if (coCu) {
        const dsId = Array.isArray(cuRaw) ? cuRaw : Object.keys(cuRaw);
        dsId.forEach(id => {
          if (!alive[id] && !da[t + ':' + id]) { this.tombs.push({tbl:t, id, at:now}); da[t + ':' + id] = 1; }
        });
      }
    });
    db.tombs = this.tombs.slice();
  },

  /* ---------- Đẩy lên / kéo về ---------- */
  /* Bảng chưa tồn tại thì PostgREST báo theo mấy kiểu khác nhau — gom lại một chỗ */
  thieuBang(e){ return /does not exist|schema cache|Could not find the table|404/i.test(e && e.message || ''); },
  kho(t){ return this.emrSan === false ? 'records' : khoCua(t); },

  async guiLo(kho, rows){
    for (let i = 0; i < rows.length; i += 200) {
      await Cloud.auth('/rest/v1/' + kho + '?on_conflict=id', {
        method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
        body: rows.slice(i, i + 200), timeout: 30000,
      });
    }
  },
  async push(){
    const theo = {records: [], emr: []};
    SYNC_TABLES.forEach(t => (db[t] || []).forEach(r => {
      if (r && r.id) theo[this.kho(t)].push({id: t + ':' + r.id, tbl: t, data: r, deleted: false,
        updated_at: new Date(r._up || Date.now()).toISOString()});
    }));
    this.tombs.forEach(x => theo[this.kho(x.tbl)].push({id: x.tbl + ':' + x.id, tbl: x.tbl,
      data: {id: x.id}, deleted: true, updated_at: new Date(x.at).toISOString()}));

    let dem = theo.records.length + theo.emr.length;
    await this.guiLo('records', theo.records);
    if (theo.emr.length) {
      try {
        await this.guiLo('emr', theo.emr);
        this.emrSan = true;
      } catch(e){
        if (!this.thieuBang(e)) throw e;
        /* Chưa tạo bảng emr — quay về bảng cũ, đừng để phòng khám mất đồng bộ */
        this.emrSan = false;
        if (!this.daBaoEmr) {
          this.daBaoEmr = true;
          App.toast('Chưa tạo bảng emr trên Supabase — tạm dùng kho chung như cũ');
        }
        await this.guiLo('records', theo.emr);
      }
    }
    this.tombs = [];
    db.tombs = [];
    return dem;
  },
  /* Supabase trả tối đa 1000 dòng một lần gọi (db-max-rows). Kho records của phòng
     khám có vài nghìn dòng — khách hàng, hạng mục điều trị, phiếu thu nằm chung một
     bảng — nên đọc một phát chỉ lấy được phần đầu, mà KHÔNG báo lỗi gì vì về mặt
     HTTP vẫn là 200. Máy nào chưa có sẵn dữ liệu thì hiện thiếu khách.
     Phải đọc từng trang cho tới khi hết. */
  TRANG: 1000,

  /* Số trang xin cùng lúc. Trước đây 24 trang của Gò Quao nối đuôi nhau, trang sau
     đợi trang trước xong — chờ mạng 24 lần. Xin cùng lúc thì chỉ chờ 4 lượt. */
  SONG_SONG: 6,

  /* Lùi mốc lại hai phút trước khi cất. Máy khác có thể đang ghi dở một bản ghi mang
     dấu thời gian sớm hơn mốc ta vừa thấy; lùi lại thì lần sau kéo trùng vài dòng,
     còn hơn bỏ sót một hồ sơ bệnh nhân. */
  LUI_MOC: 120000,

  /* Mỗi 24 giờ kéo lại đầy đủ một lần. Kéo theo mốc mà vì lý do nào đó sót một dòng
     (lệch giờ giữa hai máy, đồng bộ đứt giữa chừng) thì hôm sau nó tự về — không để
     một hồ sơ mất tăm mà không ai biết. */
  HAN_DAY_DU: 24 * 3600 * 1000,

  /* ganNhat chỉ được đặt sau một lần kéo đầy đủ TRỌN VẸN, nên chỉ cần nhìn nó.
     Đừng kiểm thêm "đã có mốc records chưa": kho records của Gò Quao rỗng (bệnh án
     nằm hết ở kho emr) nên không bao giờ có mốc, và lần nào cũng bị kéo lại đầy đủ. */
  canDayDu(){
    const m = db.syncMoc || {};
    return !m.ganNhat || (Date.now() - m.ganNhat) > this.HAN_DAY_DU;
  },

  async docTrang(bang, tu, loc){
    /* Bắt buộc có order cố định: không có ORDER BY thì thứ tự giữa hai lần gọi
       không được đảm bảo, trang sau lặp lại dòng của trang trước và bỏ sót dòng khác. */
    /* File scan minh chứng (tbl tepMC) nằm chung bảng records nhưng rất nặng — không kéo
       về mỗi lần đồng bộ, chỉ tải từng file khi bấm xem (xem minhchung.js) */
    return await Cloud.auth('/rest/v1/' + bang + '?select=*&order=updated_at.asc,id.asc'
      /* tbl dangsua = dấu "đang mở hồ sơ" (DangSua bên dưới), 20 giây ghi một lần —
         kéo về theo đồng bộ thì vô ích mà lần nào cũng có dòng mới */
      + (bang === 'records' ? '&tbl=not.in.(tepMC,dangsua)' : '') + (loc || '')
      + '&limit=' + this.TRANG + '&offset=' + tu, {timeout: 45000}) || [];
  },

  /* tuMoc rỗng = kéo đầy đủ. Có mốc = chỉ xin những dòng sửa sau mốc đó.

     Xin TRANG ĐẦU một mình trước. Lần đồng bộ định kỳ thường chẳng có gì mới, trang
     đầu về rỗng là xong luôn — một lượt gọi. Bắn sẵn sáu trang song song thì lần nào
     cũng tốn sáu lượt dù không có dòng nào, mỗi phút một lần, cả ngày. */
  async docKho(bang, tuMoc){
    const loc = tuMoc ? '&updated_at=gt.' + encodeURIComponent(tuMoc) : '';
    const dau = await this.docTrang(bang, 0, loc);
    if (dau.length < this.TRANG) return dau;
    /* Còn nhiều thì mới kéo song song cho nhanh — đây là lần đầu máy này lấy dữ liệu,
       hoặc lần kéo lại đầy đủ định kỳ. */
    const ra = dau;
    for (let tu = this.TRANG; ; tu += this.TRANG * this.SONG_SONG) {
      const lo = [];
      for (let i = 0; i < this.SONG_SONG; i++) lo.push(this.docTrang(bang, tu + i * this.TRANG, loc));
      const phan = await Promise.all(lo);
      phan.forEach(p => ra.push(...p));
      /* Một trang chưa đầy nghĩa là đã hết dữ liệu — các trang sau chắc chắn rỗng. */
      if (phan.some(p => p.length < this.TRANG)) break;
      if (ra.length > 500000) break;   /* chặn vòng lặp vô tận nếu máy chủ trả lạ */
    }
    return ra;
  },

  /* Mốc mới = dấu thời gian muộn nhất vừa thấy, lùi lại LUI_MOC. Không thấy dòng nào
     thì giữ nguyên mốc cũ, đừng đẩy mốc tới trước bằng giờ của máy này — giờ máy này
     có thể chạy nhanh hơn máy chủ, đẩy tới là bỏ sót. */
  /* Tính mốc mới nhưng CHƯA cất. Mốc chỉ được cất sau khi đã trộn xong dữ liệu —
     kéo nửa chừng rồi hỏng mà mốc đã nhích tới thì lần sau bỏ sót đúng những dòng
     vừa rớt, và không ai biết là đã mất. */
  mocMoi(rows, mocCu){
    let max = 0;
    rows.forEach(r => { const t = Date.parse(r && r.updated_at) || 0; if (t > max) max = t; });
    if (!max) return mocCu || '';
    /* Mốc = thời điểm mà ta CHẮC CHẮN đã thấy hết mọi thứ trước nó.
       Ta đã thấy hết tới max. Còn thứ đang ghi dở ở máy khác thì mang dấu thời gian
       quanh BÂY GIỜ, nên mọi thứ cũ hơn (bây giờ − 2 phút) coi như đã yên.
       Lấy số NHỎ HƠN giữa hai cái đó.

       Phải tính theo "bây giờ" chứ không phải lùi thẳng từ max. Lùi thẳng từ max thì
       một lô nhập liệu cũ — 17.000 phiếu thu Gò Quao ghi trong vòng một phút — sẽ
       nằm mãi trong cửa sổ 2 phút đó, và cứ mỗi lần đồng bộ lại kéo về đủ 17.000
       dòng, suốt ngày, dù chẳng ai sửa gì. */
    const yen = Date.now() - this.LUI_MOC;
    const moi = new Date(Math.min(max, yen)).toISOString();
    return (!mocCu || moi > mocCu) ? moi : mocCu;
  },

  async pull(epDayDu){
    const dayDu = epDayDu || this.canDayDu();
    const cu = dayDu ? {} : (db.syncMoc || {});
    const mocR = dayDu ? '' : (cu.records || ''), mocE = dayDu ? '' : (cu.emr || '');
    let rows = await this.docKho('records', mocR);
    const seR = this.mocMoi(rows, mocR);
    let seE = mocE;
    /* Đọc cả hai kho rồi trộn. Bản ghi bệnh án cũ còn sót trong records sẽ thua bản
       trong emr vì dấu thời gian cũ hơn — thứ tự trộn không ảnh hưởng kết quả. */
    if (this.emrSan !== false) {
      try {
        const e = await this.docKho('emr', mocE);
        seE = this.mocMoi(e, mocE);
        rows = rows.concat(e);
        this.emrSan = true;
      } catch(err){
        if (!this.thieuBang(err)) throw err;
        this.emrSan = false;
      }
    }
    let added = 0, updated = 0, removed = 0;
    const byTbl = {};
    rows.forEach(r => (byTbl[r.tbl] || (byTbl[r.tbl] = [])).push(r));
    SYNC_TABLES.forEach(t => {
      const remote = byTbl[t] || [];
      if (!db[t]) db[t] = [];
      const local = db[t], idx = {};
      local.forEach((r, i) => { if (r && r.id) idx[r.id] = i; });
      /* Dấu xóa đang chờ đẩy lên thì đừng kéo bản ghi đó về — không thì vừa xóa xong
         lần đồng bộ ngay sau đã thấy nó quay lại, phải đợi vòng sau mới sạch. */
      const choXoa = {};
      this.tombs.forEach(x => { if (x.tbl === t) choXoa[x.id] = 1; });
      remote.forEach(rr => {
        const rid = String(rr.id).slice(t.length + 1);
        if (choXoa[rid]) return;
        const rup = Date.parse(rr.updated_at) || 0;
        const at = idx[rid];
        if (rr.deleted) {
          if (at !== undefined && (local[at]._up || 0) <= rup) { local.splice(at, 1); removed++;
            local.forEach((r, i) => { if (r && r.id) idx[r.id] = i; }); }
          return;
        }
        const rec = Object.assign({}, rr.data, {_up: rup});
        /* Phải cập nhật idx ngay khi thêm. Trước đây idx dựng một lần trước vòng lặp,
           nên cùng một bản ghi xuất hiện hai lần trong danh sách kéo về là bị thêm
           thành hai hồ sơ trùng. Một kho thì không xảy ra, đọc hai kho là lộ ra. */
        if (at === undefined) { local.push(rec); idx[rid] = local.length - 1; added++; }
        else if ((local[at]._up || 0) < rup) { local[at] = rec; updated++; }
        else return;
        /* Bản ghi vừa kéo từ máy khác về cũng phải vào mốc, không thì lần stamp sau
           coi nó là "người dùng vừa sửa" rồi đẩy ngược lên với dấu thời gian mới. */
        const sh = this.shadow[t] || (this.shadow[t] = {});
        sh[rid] = this.plain(rec);
      });
    });
    /* Kết quả của Cơ sở CĐHA (cdha.html ghi). Chỉ đọc: không nằm trong SYNC_TABLES nên
       không bao giờ bị đẩy ngược lên đè mất kết luận KTV vừa ghi.
       Kéo theo mốc thì byTbl.cdha CHỈ có mấy dòng vừa đổi — gán thẳng là xóa sạch các
       kết quả cũ. Phải trộn theo id, chỉ kéo đầy đủ mới được thay cả danh sách. */
    const cdha = byTbl.cdha || [];
    if (dayDu) {
      const kq = cdha.filter(r => !r.deleted).map(r => r.data);
      if (JSON.stringify(kq) !== JSON.stringify(db.cdhaKQ || [])) { db.cdhaKQ = kq; updated++; }
    } else if (cdha.length) {
      const cu = (db.cdhaKQ || []).slice(), vt = {};
      cu.forEach((x, i) => { if (x && x.id) vt[x.id] = i; });
      let doi = false;
      cdha.forEach(r => {
        const id = String(r.id).slice('cdha:'.length), at = vt[id];
        if (r.deleted) { if (at !== undefined) { cu[at] = null; doi = true; } return; }
        if (at === undefined) { cu.push(r.data); vt[id] = cu.length - 1; } else { cu[at] = r.data; }
        doi = true;
      });
      if (doi) { db.cdhaKQ = cu.filter(Boolean); updated++; }
    }
    /* Giờ mới cất mốc: tới đây dữ liệu đã trộn xong xuôi. */
    db.syncMoc = db.syncMoc || {};
    /* Kho rỗng thì không có dòng nào để lấy dấu thời gian. Vừa kéo đầy đủ xong mà
       kho rỗng nghĩa là ta đã thấy hết, cứ đặt mốc ở "bây giờ lùi 2 phút" — không
       thì kho đó lần nào cũng bị xin lại từ đầu. */
    const trong = dayDu ? new Date(Date.now() - this.LUI_MOC).toISOString() : '';
    db.syncMoc.records = seR || trong || db.syncMoc.records;
    db.syncMoc.emr = seE || trong || db.syncMoc.emr;
    if (dayDu) db.syncMoc.ganNhat = Date.now();
    return {added, updated, removed};
  },

  /* ---------- Cài đặt phòng khám & bộ đếm số phiếu ----------
     Bộ đếm phải lấy giá trị LỚN NHẤT giữa các máy, không phải "bản mới thắng",
     nếu không hai máy cùng lập phiếu sẽ ra trùng số. */
  clinicSeen: null,       /* bản cài đặt lúc đồng bộ lần trước, để biết máy này có sửa gì không */

  async syncMeta(){
    const s = await Cloud.pullSettings();
    /* Cài đặt phòng khám: chỉ ghi đè khi máy này KHÔNG sửa gì kể từ lần đồng bộ trước,
       tránh đè mất thay đổi của máy khác. */
    const mine = JSON.stringify(db.clinic || {});
    const changedHere = this.clinicSeen !== null && this.clinicSeen !== mine;
    if (changedHere || !s.clinic) {
      await Cloud.pushSetting('clinic', mine);
    } else if (s.clinic && s.clinic !== mine) {
      try { db.clinic = Object.assign({}, db.clinic, JSON.parse(s.clinic)); } catch(e){}
    }
    /* Đám mây còn thông tin Gò Quao của máy chưa cập nhật thì sửa sang Thời Đại, và
       giữ "bản đã thấy" là bản cũ để lần đồng bộ sau tự đẩy bản đã sửa lên máy khác. */
    /* Chỉ chi nhánh Rạch Giá mới sửa — bản Gò Quao chạy chung mã nguồn, để nguyên là
       cứ mỗi lần đồng bộ lại bị đổi tên cơ sở về Thời Đại. */
    const truoc = JSON.stringify(db.clinic || {});
    const doi = typeof veThoiDai === 'function'
      && (typeof laRachGia !== 'function' || laRachGia()) && veThoiDai();
    this.clinicSeen = doi ? truoc : JSON.stringify(db.clinic || {});

    /* Bộ đếm mã KH / số phiếu thu: luôn lấy giá trị LỚN NHẤT giữa các máy
       để hai máy không bao giờ cấp trùng số. */
    db.seq = db.seq || {};
    if (s.seq) {
      try {
        const remote = JSON.parse(s.seq);
        Object.keys(remote).forEach(k => { db.seq[k] = Math.max(+db.seq[k] || 0, +remote[k] || 0); });
      } catch(e){}
    }
    await Cloud.pushSetting('seq', JSON.stringify(db.seq));
  },

  /* ---------- Dọn bản ghi trùng lặp ----------
     Dùng khi dữ liệu đã bị nhân đôi do lỗi đồng bộ trước đây. Giữ bản mới nhất,
     chuyển hết điều trị / phiếu thu / lịch hẹn của bản cũ sang bản được giữ. */
  /* Hai hồ sơ chỉ được coi là MỘT NGƯỜI khi trùng mã VÀ trùng tên (bỏ dấu), hoặc
     trùng mã và cùng số điện thoại. Dữ liệu nhập từ file có nhiều người khác nhau
     dùng chung một mã — gom theo mã không thôi là nhập ba bệnh nhân làm một. */
  khoaNguoi(c){
    const ten = Combo.norm((c.name || '').trim()).replace(/\s+/g, ' ');
    const sdt = String(c.phone || '').replace(/\D/g, '');
    return (c.code || '') + '|' + (ten || ('sdt' + sdt));
  },
  findDupCustomers(){
    const m = {};
    (db.customers || []).forEach(c => { if (c.code) (m[this.khoaNguoi(c)] || (m[this.khoaNguoi(c)] = [])).push(c); });
    return Object.entries(m).filter(([, arr]) => arr.length > 1);
  },
  /* Mã bị dùng cho nhiều NGƯỜI khác nhau — không gộp được, phải đánh lại mã */
  findMaDungChung(){
    const byCode = {};
    (db.customers || []).forEach(c => { if (c.code) (byCode[c.code] || (byCode[c.code] = [])).push(c); });
    return Object.entries(byCode)
      .map(([ma, arr]) => [ma, [...new Set(arr.map(c => this.khoaNguoi(c)))].length, arr])
      .filter(([, soNguoi]) => soNguoi > 1);
  },
  /* Giữ nguyên người đầu tiên, đánh lại mã cho những người còn lại dùng chung mã đó */
  danhLaiMa(){
    const co = new Set((db.customers || []).map(c => Combo.norm(c.code || '')));
    let n = 0;
    this.findMaDungChung().forEach(([, , arr]) => {
      const nhom = {};
      arr.forEach(c => { (nhom[this.khoaNguoi(c)] || (nhom[this.khoaNguoi(c)] = [])).push(c); });
      Object.values(nhom).slice(1).forEach(ds => {
        let ma;
        do { ma = Cust.tienTo() + '-' + (db.seq.cust = (db.seq.cust || 1) + 1); }
        while (co.has(Combo.norm(ma)));
        co.add(Combo.norm(ma));
        ds.forEach(c => { c.code = ma; c._up = Date.now(); });
        n++;
      });
    });
    return n;
  },
  dedupeReport(){
    const dupC = this.findDupCustomers();
    const thua = dupC.reduce((s, [, arr]) => s + arr.length - 1, 0);
    const maChung = this.findMaDungChung();
    const noC = {}; (db.receipts || []).forEach(r => { if (r.no) noC[r.no] = (noC[r.no] || 0) + 1; });
    const dupR = Object.values(noC).filter(v => v > 1).reduce((s, v) => s + v - 1, 0);
    return {maTrung: dupC.length, hoSoThua: thua, phieuThuThua: dupR,
            maDungChung: maChung.length,
            nguoiBiDungChungMa: maChung.reduce((s, [, n]) => s + n - 1, 0)};
  },
  dedupe(){
    let goneC = 0, moved = 0;
    this.findDupCustomers().forEach(([, arr]) => {
      /* giữ bản có nhiều dữ liệu điều trị nhất, hòa thì giữ bản sửa gần đây nhất */
      arr.sort((a, b) => (((b.record && b.record.dienBien) || []).length - ((a.record && a.record.dienBien) || []).length)
                      || ((b._up || 0) - (a._up || 0)));
      const keep = arr[0];
      arr.slice(1).forEach(old => {
        ['treatments','receipts','appointments','labs','rx'].forEach(t => {
          (db[t] || []).forEach(x => { if (x.customerId === old.id) { x.customerId = keep.id; moved++; } });
        });
        db.customers = db.customers.filter(c => c.id !== old.id);
        goneC++;
      });
    });
    /* phiếu thu trùng hệt nhau (cùng ngày, cùng khách, cùng số tiền, cùng nội dung) */
    const seen = {}, dropR = [];
    (db.receipts || []).forEach(r => {
      const k = [r.customerId, r.date, r.amount, r.desc].join('|');
      if (seen[k]) dropR.push(r.id); else seen[k] = 1;
    });
    db.receipts = (db.receipts || []).filter(r => !dropR.includes(r.id));
    return {hoSoDaGop: goneC, banGhiChuyenSang: moved, phieuThuDaBo: dropR.length};
  },

  /* Hai máy cùng lập phiếu lúc mất mạng có thể ra trùng số phiếu thu.
     Sau khi gộp dữ liệu, phát hiện trùng thì giữ phiếu lập trước, đánh lại số phiếu lập sau. */
  fixDupReceipts(){
    const seen = {}, fixed = [];
    (db.receipts || []).slice().sort((a,b) => (a._up||0) - (b._up||0)).forEach(r => {
      if (!r.no) return;
      if (seen[r.no]) {
        const old = r.no;
        r.no = 'PT-' + (++db.seq.receipt);
        r._up = Date.now();
        fixed.push(old + ' → ' + r.no);
      } else seen[r.no] = 1;
    });
    return fixed;
  },

  /* ---------- Dọn bản ghi bệnh án cũ còn sót trong kho chung ----------
     Chỉ chạy sau khi đã đẩy thành công lên bảng emr, và chỉ một lần. Đẩy hỏng thì
     tuyệt đối không xóa — thà để hai bản còn hơn mất. */
  async donKhoChung(){
    if (this.emrSan !== true) return 0;
    if ((db.clinic || {}).emrDaTach) return 0;
    try {
      await Cloud.auth('/rest/v1/records?tbl=in.(' + EMR_TABLES.join(',') + ')', {method: 'DELETE', timeout: 30000});
      db.clinic = db.clinic || {};
      db.clinic.emrDaTach = new Date().toISOString();
      if (typeof Vet !== 'undefined')
        Vet.ghi('xoa', 'Tách kho dữ liệu bệnh án: đã dọn bản ghi bệnh án còn sót trong kho chung');
      return 1;
    } catch(e){ return 0; }
  },

  /* ---------- Chạy đồng bộ ---------- */
  /* ---------- Tự đồng bộ ----------
     Trước đây chỉ đồng bộ lúc mở app và khi bấm nút ⟳. Lễ tân nhập xong khách mới thì
     máy bác sĩ không thấy gì cho tới khi có người bấm nút hoặc tải lại trang — cả buổi
     mỗi máy ngồi trên một bản dữ liệu khác nhau. */
  TU_DONG_MS: 60000,           /* định kỳ kéo về */
  CHO_SAU_KHI_LUU_MS: 4000,    /* gõ xong một lúc mới đẩy, khỏi đẩy theo từng phím */
  _hen: null, _timer: null,
  /* Đang gõ dở thì hoãn: run() gọi App.render() vẽ lại cả màn hình, chữ đang gõ trong
     khung ghi răng bay sạch. Hộp thoại nằm ngoài #mainArea nên không sao. */
  dangGo(){
    const a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#mainArea'));
  },
  khoiDongTuDong(){
    if (this._timer) return;
    this._timer = setInterval(() => {
      if (!document.hidden && !this.dangGo()) this.run(true);
    }, this.TU_DONG_MS);
    /* Quay lại tab sau khi làm việc khác thì kéo về ngay, đừng đợi hết chu kỳ */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.busy) this.run(true);
    });
  },
  /* Gọi sau mỗi lần lưu. Gom nhiều lần lưu liên tiếp thành một lần đẩy.
     Bỏ qua khi đang đồng bộ, vì pull/push cũng gọi save() — không thì nó tự hẹn
     lại chính mình mãi không dứt. */
  hen(){
    if (this.busy || !Cloud.configured() || !Cloud.loggedIn()) return;
    clearTimeout(this._hen);
    this._hen = setTimeout(() => { if (!this.dangGo()) this.run(true); }, this.CHO_SAU_KHI_LUU_MS);
  },

  async run(quiet){
    if (!Cloud.configured() || !Cloud.loggedIn() || this.busy) return null;
    /* Chưa mở khóa thì trong bộ nhớ đang là dữ liệu rỗng — đẩy lên là ghi đè bảng
       giá và quy trình thật trên đám mây bằng bản mặc định. */
    if (App.choMoKhoa) return null;
    this.busy = true;
    try {
      this.stamp();
      /* KÉO VỀ TRƯỚC rồi mới đẩy lên. Nếu đẩy trước, máy nào còn dữ liệu cũ sẽ ghi đè
         lên dấu xóa trên đám mây, làm sống lại bản ghi đã xóa và sinh ra trùng lặp. */
      /* Thay đổi kéo từ máy khác về KHÔNG phải do người ngồi máy này làm — máy kia đã
         ghi vết rồi. Ngưng ghi trong lúc kéo, xong chụp lại từ đầu. */
      if (typeof Vet !== 'undefined') Vet.ngung();
      let r;
      try { r = await this.pull(); }
      finally { if (typeof Vet !== 'undefined') Vet.chay(); }
      await this.push();
      await this.donKhoChung();
      if (typeof Vet !== 'undefined') { try { await Vet.day(); } catch(e){} }
      /* File scan minh chứng đính kèm lúc chưa có mạng */
      if (typeof MinhChung !== 'undefined') MinhChung.guiCho();
      await this.syncMeta();
      const dup = this.fixDupReceipts();
      if (dup.length) { await this.push(); App.toast('Đã đánh lại ' + dup.length + ' số phiếu thu bị trùng: ' + dup.slice(0,3).join(', ')); }
      this.snapshot();
      save(); this.lastAt = Date.now();
      if (!quiet) App.toast(`Đồng bộ xong ✓ (thêm ${r.added}, cập nhật ${r.updated}${r.removed?', xóa '+r.removed:''})`);
      if (!quiet || r.added || r.updated || r.removed) App.render();
      return r;
    } catch(e){
      if (!quiet) App.toast('Đồng bộ lỗi: ' + e.message);
      return null;
    } finally { this.busy = false; }
  },
  /* Mô tả cách đang kéo dữ liệu, cho màn hình Cài đặt */
  moTaMoc(){
    const m = db.syncMoc || {};
    if (!m.ganNhat) return 'Chưa tải đầy đủ lần nào — lần đồng bộ tới sẽ tải hết';
    const gio = Math.round((Date.now() - m.ganNhat) / 3600000);
    return 'Bình thường chỉ xin những bản ghi thay đổi sau lần trước, nên rất nhẹ. '
      + 'Cứ 24 giờ tự tải lại đầy đủ một lần — lần gần nhất '
      + (gio < 1 ? 'vừa xong' : gio + ' giờ trước') + '. '
      + 'Nghi máy này thiếu hồ sơ thì bấm nút bên cạnh.';
  },

  /* Mô tả kho dữ liệu bệnh án cho màn hình Cài đặt */
  moTaKho(){
    if (this.emrSan === true)
      return 'Hồ sơ bệnh án nằm ở kho riêng <b>emr</b>, tách khỏi kho vận hành' +
        (((db.clinic || {}).emrDaTach) ? ' · đã dọn bản cũ trong kho chung' : '');
    if (this.emrSan === false)
      return 'Chưa tạo bảng <b>emr</b> trên Supabase — bệnh án đang nằm chung kho với kho vật tư, chấm công';
    return 'Chưa đồng bộ lần nào nên chưa biết — bấm Đồng bộ ngay để kiểm tra';
  },
  pillKho(){
    return this.emrSan === true ? '<span class="pill ok">Đã tách kho</span>'
         : this.emrSan === false ? '<span class="pill warn">Chưa tách kho</span>'
         : '<span class="pill mutedp">Chưa rõ</span>';
  },
  sqlKho(){
    App.modal('Tạo kho dữ liệu bệnh án riêng', `
      <div class="note-block">Mục III.1.1.k của hướng dẫn Bộ Y tế đòi dữ liệu hồ sơ bệnh án
        phải <b>lưu trữ độc lập</b>, không phụ thuộc các hệ thống khác. Mở Supabase →
        <b>SQL Editor</b> → dán đoạn dưới đây → Run. Chạy một lần duy nhất.</div>
      <div class="f full"><textarea rows="12" readonly style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px">create table if not exists emr (
  id text primary key, tbl text, data jsonb,
  deleted boolean default false, updated_at timestamptz
);
alter table emr enable row level security;
create policy "doc"  on emr for select to authenticated using (true);
create policy "them" on emr for insert to authenticated with check (true);
create policy "sua"  on emr for update to authenticated using (true);</textarea></div>
      <div class="note-block">Chạy xong bấm <b>Đồng bộ ngay</b>. Phần mềm sẽ chuyển hồ sơ bệnh án
        sang kho mới, rồi mới dọn bản cũ trong kho chung — đẩy chưa xong thì không xóa gì cả.</div>
      <div class="form-actions full">
        <button class="btn" onclick="App.closeModal()">Đóng</button>
        <button class="btn primary" onclick="App.closeModal();App.syncNow()">Đồng bộ ngay</button></div>`);
  },

  status(){
    if (!Cloud.configured()) return {k:'mutedp', t:'Chưa kết nối — dữ liệu chỉ ở máy này'};
    if (!Cloud.loggedIn()) return {k:'warn', t:'Đã kết nối, chưa đăng nhập'};
    if (!this.lastAt) return {k:'info', t:'Đã đăng nhập — chưa đồng bộ lần nào'};
    const m = Math.round((Date.now() - this.lastAt) / 60000);
    return {k:'ok', t: m < 1 ? 'Vừa đồng bộ xong' : 'Đồng bộ ' + m + ' phút trước'};
  },
};

/* ---------- Báo khi có người khác đang mở cùng một hồ sơ khách ----------
   Đồng bộ giữ bản LƯU SAU CÙNG của từng hồ sơ. Hai người sửa cùng một khách trong
   vòng chưa tới một phút (lễ tân trên máy tính, bác sĩ trên điện thoại) thì phần
   của người lưu trước bị đè mất mà không ai hay. Cách chặn: mỗi máy cứ 20 giây ghi
   một dấu "máy này đang mở hồ sơ khách X" vào bảng records (tbl 'dangsua', mỗi máy
   MỘT dòng, ghi đè lên nhau), rồi đọc xem còn máy nào khác cũng đang mở khách X.
   Dấu quá 75 giây không được làm mới là coi như máy đó đã rời hồ sơ. */
const DangSua = {
  CHU_KY_MS: 20000,
  CON_SONG_MS: 75000,
  _cuoi: null, _tu: 0, _khac: [], _an: '', _dang: false,

  maMay(){
    let m = '';
    try { m = localStorage.getItem('nkhb_may') || ''; } catch(e){}
    if (!m) {
      m = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem('nkhb_may', m); } catch(e){}
    }
    return m;
  },
  loaiMay(){
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'máy tính bảng';
    return /Mobi|Android|iPhone/i.test(ua) ? 'điện thoại' : 'máy tính';
  },
  /* Hồ sơ khách đang hiện trên màn hình, '' nếu không mở hồ sơ nào */
  khachDangMo(){
    if (document.hidden || typeof App === 'undefined' || App.choMoKhoa) return '';
    if (App.cur === 'customers') return App.state.custSel || '';
    if (App.cur === 'treatment') return App.state.treatCust || '';
    return '';
  },
  sanSang(){ return Cloud.configured() && Cloud.loggedIn(); },

  async nhip(){
    if (this._dang || !this.sanSang()) return;
    const k = this.khachDangMo();
    if (!k && !this._cuoi) return;          /* không mở gì, cũng chưa báo gì — khỏi gọi mạng */
    if (k !== this._cuoi) this._tu = Date.now();
    this._dang = true;
    try {
      const me = (typeof Perm !== 'undefined' && Perm.me()) || null;
      await Cloud.auth('/rest/v1/records?on_conflict=id', {
        method: 'POST', headers: {Prefer: 'resolution=merge-duplicates'},
        body: [{id: 'dangsua:' + this.maMay(), tbl: 'dangsua', deleted: false,
          updated_at: new Date().toISOString(),
          data: {cust: k, email: Cloud.who() || '', ten: (me && me.name) || '',
                 loai: this.loaiMay(), tu: new Date(this._tu).toISOString()}}],
      });
      this._cuoi = k;
      if (!k) { this._khac = []; this.ve(); return; }
      const tuLuc = new Date(Date.now() - this.CON_SONG_MS).toISOString();
      const rows = await Cloud.auth('/rest/v1/records?select=id,data,updated_at&tbl=eq.dangsua'
        + '&updated_at=gt.' + encodeURIComponent(tuLuc)) || [];
      const toi = 'dangsua:' + this.maMay();
      /* Người dùng có thể đã chuyển sang khách khác trong lúc chờ mạng */
      if (this.khachDangMo() !== k) return;
      this._khac = rows.filter(r => r.id !== toi && r.data && r.data.cust === k);
      this.ve();
    } catch(e){ /* mất mạng thì thôi, nhịp sau thử lại; đừng làm phiền người dùng */ }
    finally { this._dang = false; }
  },

  /* Chỉ gọi mạng khi đổi hồ sơ; đứng yên thì để nhịp 20 giây lo */
  soat(){
    const k = this.khachDangMo();
    if (k !== this._cuoi) {
      /* Bấm × chỉ ẩn cho lần mở này; rời hồ sơ rồi quay lại thì phải báo lại */
      this._an = '';
      if (this._khac.length) { this._khac = []; this.ve(); }
      this.nhip();
    }
  },

  noiDung(){
    const toiEmail = (Cloud.who() || '').toLowerCase();
    const gio = s => { const d = new Date(s); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const ds = this._khac.map(r => {
      const d = r.data;
      const ai = (d.email || '').toLowerCase() === toiEmail
        ? 'Tài khoản của bạn (một máy khác)'
        : '<b>' + h(d.ten || d.email || 'Một người khác') + '</b>';
      return ai + ' đang mở trên ' + h(d.loai || 'máy khác') + (gio(d.tu) ? ' từ ' + gio(d.tu) : '');
    });
    return '⚠ Hồ sơ này đang có người khác mở: ' + ds.join('; ')
      + '. <span class="ds-phu">Hai người cùng sửa thì bản lưu sau sẽ đè mất phần của người lưu trước — hãy hỏi nhau trước khi sửa.</span>';
  },
  ve(){
    let el = document.getElementById('dangSuaBao');
    const k = this.khachDangMo();
    const khoa = k + '|' + this._khac.map(r => r.id).sort().join(',');
    const hien = k && this._khac.length && this._an !== khoa;
    if (!hien) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'dangSuaBao';
      el.setAttribute('role', 'alert');
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="ds-chu">' + this.noiDung() + '</div>'
      + '<button class="ds-dong" title="Ẩn thông báo" onclick="DangSua.an()">×</button>';
  },
  an(){
    this._an = this.khachDangMo() + '|' + this._khac.map(r => r.id).sort().join(',');
    this.ve();
  },

  khoiDong(){
    if (this._timer) return;
    this._timer = setInterval(() => this.nhip(), this.CHU_KY_MS);
    setInterval(() => this.soat(), 1500);
    document.addEventListener('visibilitychange', () => this.nhip());
  },
};
