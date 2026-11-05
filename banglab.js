/* ================= BẢNG GIÁ CỦA TỪNG LAB =================
   Mỗi lab một bảng giá riêng, chép từ bảng báo giá lab gửi sang. Chọn lab trong phiếu
   gởi hàng thì ô "Loại răng / phục hình" chỉ gợi ý đúng danh mục của lab đó, và chọn
   món nào thì tự điền đơn giá của món đó.

   n = tên món đúng như lab ghi · d = đơn vị · p = đơn giá (VNĐ) · g = nhóm
   ghi = ghi chú riêng (bảo hành, xuất xứ, giá khuyến mãi…)

   KHÔNG tự sửa tên cho giống bảng giá dịch vụ của phòng khám: đặt hàng là nói chuyện
   với lab nên phải dùng đúng tên lab gọi, không thì gọi điện đặt hàng lại phải dịch. */
'use strict';

const BANG_LAB = {

  /* ---------- LAB TÂM KHÔI — chép từ bảng giá dán tại phòng khám (ảnh chụp) ----------
     Cột "Toàn hàm" trên bảng gốc (10 với răng nhựa, 14 với răng sứ) là SỐ RĂNG của một
     hàm đủ, không phải giá — ghi vào chú thích để lúc đặt cả hàm khỏi đếm nhầm. */
  'Lab Tâm Khôi': [
    {g:'Răng tháo lắp', n:'Răng Việt Nam',        d:'răng', p:40000,  ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Nhật',            d:'răng', p:60000,  ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Tây Ban Nha',     d:'răng', p:70000,  ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Mỹ (thường)',     d:'răng', p:90000,  ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Mỹ (tốt)',        d:'răng', p:120000, ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Composite',       d:'răng', p:120000, ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Ex',              d:'răng', p:150000, ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng Vita',            d:'răng', p:200000, ghi:'toàn hàm 10 răng'},
    {g:'Răng tháo lắp', n:'Răng sứ Nhật',         d:'răng', p:250000, ghi:'toàn hàm 14 răng'},
    {g:'Răng tháo lắp', n:'Răng sứ Đức',          d:'răng', p:350000, ghi:'toàn hàm 14 răng'},
    {g:'Lưới',          n:'Lưới Việt Nam',        d:'cái',  p:100000},
    {g:'Lưới',          n:'Lưới Nhật',            d:'cái',  p:250000},
    {g:'Lưới',          n:'Lưới Đức',             d:'cái',  p:400000},
    {g:'Hàm khung',     n:'Hàm khung',            d:'cái',  p:400000},
    {g:'Hàm khung',     n:'Hàm khung titan 1',    d:'cái',  p:600000},
    {g:'Hàm khung',     n:'Hàm khung titan 2',    d:'cái',  p:800000},
    {g:'Nền & sửa hàm', n:'Nền dẻo (nửa hàm)',    d:'cái',  p:300000, ghi:'bảng gốc ghi đơn vị 0,5'},
    {g:'Nền & sửa hàm', n:'Nền dẻo (nguyên hàm)', d:'cái',  p:500000},
    {g:'Nền & sửa hàm', n:'Móc dẻo',              d:'cái',  p:150000},
    {g:'Nền & sửa hàm', n:'Vá hàm',               d:'cái',  p:100000},
    {g:'Nền & sửa hàm', n:'Đệm hàm',              d:'cái',  p:200000},
    {g:'Nền & sửa hàm', n:'Thay nền',             d:'cái',  p:300000},
    {g:'Nền & sửa hàm', n:'Ép nhựa cường lực',    d:'cái',  p:200000},
    {g:'Nền & sửa hàm', n:'Ráp răng lại',         d:'cái',  p:50000,  ghi:'chữ trên bảng mờ, cần xác nhận lại tên'},
  ],

  /* ---------- TẤN DENTAL LAB (Cần Thơ) — bảng báo giá 01/07/2026 ---------- */
  'Tấn Dental Lab': [
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Kim Loại',                 d:'răng', p:160000,  ghi:'BH 3 năm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Titan',                    d:'răng', p:250000,  ghi:'BH 5 năm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Chrome - Cobalt',          d:'răng', p:320000,  ghi:'BH 5 năm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia Aidite',          d:'răng', p:350000,  ghi:'BH 5 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia UNC',             d:'răng', p:400000,  ghi:'BH 10 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia DDBIO',           d:'răng', p:550000,  ghi:'BH 10 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia Cercon',          d:'răng', p:800000,  ghi:'BH 10 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia Ceramill ZOLID',  d:'răng', p:900000,  ghi:'BH 10 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Zirconia LAVA PLUS',       d:'răng', p:1300000, ghi:'BH 15 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Sứ Emax PRESS',               d:'răng', p:1100000, ghi:'BH 10 năm · miễn phí in mẫu hàm'},
    {g:'Phục hình sứ trên cùi răng', n:'Endocrown, Inlay, Onlay Zirconia Aidite', d:'răng', p:400000,  ghi:'BH 10 năm'},
    {g:'Phục hình sứ trên cùi răng', n:'Endocrown, Inlay, Onlay Emax', d:'răng', p:1100000, ghi:'BH 10 năm'},
    {g:'Phục hình sứ trên cùi răng', n:'Vật liệu gắn Variolink',      d:'răng', p:200000,  ghi:'không bảo hành'},
    {g:'Phục hình sứ trên cùi răng', n:'In mẫu hàm 3D',               d:'hàm',  p:100000,  ghi:'không bảo hành'},
    {g:'Trên Implant', n:'Sứ Kim Loại trên Implant',  d:'răng', p:400000,  ghi:'BH 3 năm'},
    {g:'Trên Implant', n:'Sứ Titan trên Implant',     d:'răng', p:500000,  ghi:'BH 5 năm'},
    {g:'Trên Implant', n:'Sứ Aidite trên Implant',    d:'răng', p:600000,  ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ UNC trên Implant',       d:'răng', p:700000,  ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ DDBIO trên Implant',     d:'răng', p:900000,  ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ Cercon trên Implant',    d:'răng', p:1100000, ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ Zolid trên Implant',     d:'răng', p:1300000, ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ Lava trên Implant',      d:'răng', p:1500000, ghi:'BH 15 năm'},
    {g:'Trên Implant', n:'Gia công Premil',           d:'trụ',  p:800000},
    {g:'All-on-X', n:'Thimble Kim Loại All-on-4 đúc',    d:'hàm',   p:7000000,  ghi:'không gồm vis'},
    {g:'All-on-X', n:'Thimble Kim Loại All-on-6 đúc',    d:'hàm',   p:8000000,  ghi:'không gồm vis'},
    {g:'All-on-X', n:'Thimble Kim Loại All-on-X CADCAM', d:'hàm',   p:12000000, ghi:'không gồm vis'},
    {g:'All-on-X', n:'Thanh Bar All-on-X tháo lắp',      d:'thanh', p:4000000,  ghi:'không gồm vis'},
    {g:'All-on-X', n:'Nướu Composite',                   d:'hàm',   p:3500000},
    {g:'All-on-X', n:'Đắp sứ trực tiếp trên khung hàm',  d:'răng',  p:250000,   ghi:'BH 3 năm'},
    {g:'All-on-X', n:'Cylinder (không vis)',             d:'con',   p:240000},
    {g:'All-on-X', n:'Vis Multi',                        d:'con',   p:150000},
    {g:'All-on-X', n:'Hàm tạm PMMA / tháo lắp trên Multi', d:'hàm', p:4000000,  ghi:'đã gồm Cylinder + vis'},
  ],

  /* ---------- VN PREMIUM LAB (Cần Thơ) ----------
     Bảng gốc có thêm cột KM (giá khuyến mãi) thấp hơn giá niêm yết. Ở đây lấy GIÁ NIÊM
     YẾT làm đơn giá và ghi giá KM vào chú thích — khuyến mãi có thời hạn, lấy làm giá
     chuẩn thì hết đợt là sai mà không ai để ý.
     Phần PHỤC HÌNH THÁO LẮP của bảng này CHƯA NẠP: trong tệp PDF tên món và giá nằm
     rời nhau, ghép lại không chắc đúng cặp nào với cặp nào. */
  'VN Premium Lab': [
    {g:'Sứ không kim loại', n:'Sứ Zirconia UNC',            d:'răng', p:500000,  ghi:'Hàn Quốc · BH 10 năm · KM 480.000'},
    {g:'Sứ không kim loại', n:'Sứ Zirconia Hàn',            d:'răng', p:450000,  ghi:'Hàn Quốc · BH 10 năm · KM 420.000'},
    {g:'Sứ không kim loại', n:'Sứ Zirconia AIDITE',         d:'răng', p:400000,  ghi:'Trung Quốc · BH 7 năm · KM 350.000'},
    {g:'Sứ không kim loại', n:'Sứ multilayer AIDITE AZIR',  d:'răng', p:500000,  ghi:'đa lớp, không đắp sứ · BH 7 năm · KM 400.000'},
    {g:'Sứ không kim loại', n:'Sứ Zirconia LAVA 3M',        d:'răng', p:1150000, ghi:'Mỹ · BH 15 năm · KM 1.050.000'},
    {g:'Sứ không kim loại', n:'Sứ SAGEMAX',                 d:'răng', p:1000000, ghi:'Mỹ · BH 15 năm'},
    {g:'Sứ không kim loại', n:'Sứ ZOLID',                   d:'răng', p:900000,  ghi:'Áo · BH 10 năm'},
    {g:'Sứ không kim loại', n:'Sứ CERCON HT',               d:'răng', p:900000,  ghi:'Đức · BH 10 năm · KM 800.000'},
    {g:'Sứ không kim loại', n:'Sứ DDBIO',                   d:'răng', p:600000,  ghi:'Đức · BH 10 năm · KM 550.000'},
    {g:'Sứ không kim loại', n:'Sứ multilayer DDBIO',        d:'răng', p:700000,  ghi:'Đức · đa lớp, không đắp sứ · BH 10 năm'},
    {g:'Sứ không kim loại', n:'Cùi giả Zirco',              d:'cái',  p:150000},
    {g:'Mặt dán sứ', n:'Mặt dán sứ LISI',        d:'răng', p:1200000, ghi:'BH 10 năm · KM 800.000'},
    {g:'Mặt dán sứ', n:'Mặt dán sứ EMAX',        d:'răng', p:1000000, ghi:'BH 10 năm · KM 700.000'},
    {g:'Mặt dán sứ', n:'Mặt dán sứ AIDITE EZ',   d:'răng', p:800000,  ghi:'Zirconia · BH 7 năm · KM 600.000'},
    {g:'Mặt dán sứ', n:'Endocrown Emax',         d:'răng', p:1000000, ghi:'BH 10 năm'},
    {g:'Mặt dán sứ', n:'Sứ None Prep E.max',     d:'răng', p:1200000, ghi:'BH 10 năm · KM 1.000.000'},
    {g:'Mặt dán sứ', n:'Inlay E.max',            d:'răng', p:650000,  ghi:'BH 10 năm · KM 600.000'},
    {g:'Mặt dán sứ', n:'Onlay E.max',            d:'răng', p:650000,  ghi:'BH 10 năm · KM 600.000'},
    {g:'Sứ sườn hợp kim', n:'Crom - Coban',  d:'răng', p:380000, ghi:'BH 5 năm'},
    {g:'Sứ sườn hợp kim', n:'Sứ TiTan',      d:'răng', p:250000, ghi:'BH 3 năm'},
    {g:'Sứ sườn hợp kim', n:'Sứ Niken Crom', d:'răng', p:195000, ghi:'BH 2 năm · KM 180.000'},
    {g:'Trên Implant', n:'Sứ Kim Loại (Implant)',   d:'răng', p:600000,  ghi:'BH 2 năm · KM 450.000'},
    {g:'Trên Implant', n:'Sứ TiTan (Implant)',      d:'răng', p:700000,  ghi:'BH 3 năm · KM 550.000'},
    {g:'Trên Implant', n:'Sứ Crom - Coban (Implant)', d:'răng', p:900000, ghi:'BH 5 năm · KM 650.000'},
    {g:'Trên Implant', n:'Sứ Zirconia (Implant)',   d:'răng', p:950000,  ghi:'BH 10 năm · KM 850.000'},
    {g:'Trên Implant', n:'Sứ Cercon HT (Implant)',  d:'răng', p:1190000, ghi:'BH 10 năm'},
    {g:'Trên Implant', n:'Sứ Lava (Implant)',       d:'răng', p:1290000, ghi:'BH 15 năm'},
    {g:'Customized', n:'Customize Abutment Titan', d:'cái', p:700000, ghi:'Hàn Quốc · chưa gồm Premill'},
    {g:'Customized', n:'Customize Abutment Zirco', d:'cái', p:700000},
    {g:'All-on-4', n:'Hybride all on 4 (Cad/cam Titanium)', d:'hàm',   p:9000000},
    {g:'All-on-4', n:'Hybride all on 4 (Titan đúc tay)',    d:'hàm',   p:7000000},
    {g:'All-on-4', n:'Thanh bar all on 4 (Cad/cam Titanium)', d:'thanh', p:5500000},
    {g:'All-on-4', n:'Thanh bar bán hàm (Cad/cam Titanium)',  d:'thanh', p:3500000},
    {g:'All-on-4', n:'Khung thimble (Cad/cam Titanium)',      d:'hàm',   p:7900000},
    {g:'Khác', n:'Răng tạm PMMA', d:'răng', p:100000, ghi:'hỗ trợ'},
    {g:'Khác', n:'Vật liệu gắn',  d:'răng', p:200000, ghi:'Variolink Esthetic DC'},
    {g:'Khác', n:'In mẫu hàm',    d:'hàm',  p:300000, ghi:'hỗ trợ'},
    {g:'Khác', n:'Hàm tạm in',    d:'hàm',  p:3000000},
  ],

  /* ---------- OZEAN LAB (TP.HCM) ----------
     Lấy theo Sheet 1 "BẢNG BÁO GIÁ". Tệp còn Sheet 2 là bảng riêng cho răng sứ không
     kim loại, giá LỆCH với Sheet 1 ở vài dòng (Zirconia 600.000 ở Sheet 1 nhưng
     700.000 ở Sheet 2, Lava 1.360.000 / Ddbio 700.000 so với 800.000…). Chưa rõ bảng
     nào mới hơn nên theo Sheet 1, cần hỏi lab để chốt. */
  'Ozean Lab': [
    {g:'Răng toàn sứ', n:'Zirconia / Full Zirconia', d:'răng', p:600000,  ghi:'Hàn Quốc · BH 10 năm'},
    {g:'Răng toàn sứ', n:'DDbio',            d:'răng', p:700000,  ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Ceramill Zolid',   d:'răng', p:1000000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Cercon',           d:'răng', p:1000000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Ht Smile',         d:'răng', p:1000000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Lava Plus',        d:'răng', p:1360000, ghi:'Mỹ · BH 15 năm'},
    {g:'Răng toàn sứ', n:'Lava Esthetic',    d:'răng', p:1860000, ghi:'Mỹ · BH 15 năm'},
    {g:'Răng toàn sứ', n:'E.max Press',      d:'răng', p:1100000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Multi E.max Press', d:'răng', p:1500000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Celtra Press',     d:'răng', p:1500000, ghi:'Đức · BH 15 năm'},
    {g:'Răng toàn sứ', n:'Lisi Press',       d:'răng', p:1200000, ghi:'Đức · BH 5 năm'},
    {g:'Răng toàn sứ', n:'Nacera',           d:'răng', p:1300000, ghi:'Đức · BH 10 năm'},
    {g:'Răng toàn sứ', n:'Orodent',          d:'răng', p:1600000, ghi:'Ý · BH 19 năm'},
    {g:'Sứ hợp kim', n:'Kim Loại',      d:'răng', p:180000, ghi:'Mỹ · BH 3 năm'},
    {g:'Sứ hợp kim', n:'Full Kim Loại', d:'răng', p:140000, ghi:'Mỹ · BH 3 năm'},
    {g:'Sứ hợp kim', n:'Titan',         d:'răng', p:300000, ghi:'Đức · BH 5 năm'},
    {g:'Sứ hợp kim', n:'Full Titan',    d:'răng', p:250000, ghi:'Đức · BH 5 năm'},
    {g:'Sứ hợp kim', n:'Cr-Co',         d:'răng', p:350000, ghi:'Mỹ · BH 7 năm'},
    {g:'Sứ hợp kim', n:'Full Cr-Co',    d:'răng', p:300000, ghi:'Mỹ · BH 7 năm'},
    {g:'Mặt dán', n:'Emax Press',               d:'răng', p:1000000, ghi:'Đức · BH 10 năm'},
    {g:'Mặt dán', n:'Lisi Press',               d:'răng', p:1200000, ghi:'Nhật · BH 10 năm'},
    {g:'Mặt dán', n:'Celtra Press',             d:'răng', p:1400000, ghi:'Đức · BH 10 năm'},
    {g:'Mặt dán', n:'Non-Prep (không mài)',     d:'răng', p:1200000, ghi:'Đức · BH 10 năm · đắp sứ thủy tinh trực tiếp'},
    {g:'Khác', n:'Inlay, Onlay sứ ép',        d:'răng', p:600000, ghi:'Đức · BH 7 năm'},
    {g:'Khác', n:'Cùi giả Zirconia / Sứ ép',  d:'răng', p:400000, ghi:'Đức · BH 7 năm'},
    {g:'Khác', n:'Cùi giả Titan',             d:'răng', p:150000, ghi:'Đức'},
    {g:'Khác', n:'Vật liệu dán Veneer',       d:'răng', p:150000, ghi:'Variolink Esthetic'},
    {g:'Khác', n:'Răng Tạm CAD/CAM PMMA',     d:'răng', p:100000, ghi:'Đức'},
    {g:'Khác', n:'Máng Tẩy',                  d:'hàm',  p:150000, ghi:'Việt Nam'},
    {g:'Khác', n:'Máng duy trì & chống nghiến', d:'hàm', p:300000, ghi:'Việt Nam'},
    {g:'Khác', n:'Đính Đá Vào Răng',          d:'răng', p:800000, ghi:'đá do nha khoa cung cấp'},
    {g:'Khác', n:'In 3D mẫu bán hàm',         d:'hàm',  p:250000, ghi:'miễn phí khi dùng làm hình'},
    {g:'Khác', n:'In mẫu nguyên hàm',         d:'hàm',  p:500000, ghi:'miễn phí khi dùng làm hình'},
    {g:'Khác', n:'In mẫu toàn phần',          d:'2 hàm', p:800000, ghi:'miễn phí khi dùng làm hình'},
    {g:'Trên Implant', n:'Kim Loại (Implant)',  d:'răng', p:500000,  ghi:'Mỹ · BH 3 năm'},
    {g:'Trên Implant', n:'Titan (Implant)',     d:'răng', p:600000,  ghi:'Đức · BH 5 năm'},
    {g:'Trên Implant', n:'Zirconia (Implant)',  d:'răng', p:1200000, ghi:'Hàn Quốc · BH 10 năm'},
    {g:'Trên Implant', n:'Cercon (Implant)',    d:'răng', p:1400000, ghi:'Đức · BH 10 năm'},
    {g:'Trên Implant', n:'Lava (Implant)',      d:'răng', p:1800000, ghi:'Mỹ · BH 15 năm'},
    {g:'Customized Abutment', n:'Customized Abutment Titan',    d:'cái', p:1200000, ghi:'Hàn Quốc · BH 7 năm · Premill bên thứ 3'},
    {g:'Customized Abutment', n:'Customized Abutment Zirconia', d:'cái', p:2200000, ghi:'Đức · BH 7 năm · đã gồm Tibase'},
    {g:'Customized Abutment', n:'Customized Abutment Hybrid',   d:'cái', p:2600000, ghi:'Đức · BH 7 năm · đã gồm Tibase'},
    {g:'Customized Abutment', n:'Gia công CAD/CAM Premill',     d:'cái', p:600000},
    {g:'Khung & T-Bar', n:'Khung & T-Bar đúc bằng tay', d:'hàm', p:6000000,  ghi:'Đức · BH 10 năm'},
    {g:'Khung & T-Bar', n:'Khung & T-Bar CAD/CAM',      d:'hàm', p:15000000, ghi:'Đức · BH 10 năm'},
    {g:'Khung & T-Bar', n:'Khung & T-Bar in 3D',        d:'hàm', p:10000000, ghi:'Đức · BH 10 năm'},
    {g:'Khung & T-Bar', n:'Khung PEEK CAD/CAM',         d:'hàm', p:18000000, ghi:'Đức · BH 7 năm · PEEK BioHpp'},
    {g:'Tháo lắp', n:'Răng Việt Nam (1–3 răng)',      d:'răng', p:45000},
    {g:'Tháo lắp', n:'Răng Việt Nam (từ 3 răng)',     d:'răng', p:30000},
    {g:'Tháo lắp', n:'Răng Nhật NewAge (1–3 răng)',   d:'răng', p:70000},
    {g:'Tháo lắp', n:'Răng Nhật NewAge (từ 3 răng)',  d:'răng', p:50000},
    {g:'Tháo lắp', n:'Răng Composite Nhật (1–3 răng)', d:'răng', p:140000},
    {g:'Tháo lắp', n:'Răng Composite Nhật (từ 3 răng)', d:'răng', p:110000},
    {g:'Tháo lắp', n:'Răng sứ Vita Đức (1–3 răng)',   d:'răng', p:320000},
    {g:'Tháo lắp', n:'Răng sứ Vita Đức (từ 3 răng)',  d:'răng', p:280000},
    {g:'Tháo lắp', n:'Tháo lắp nhựa cứng — nền hàm lớn', d:'cái', p:200000},
    {g:'Tháo lắp', n:'Tháo lắp nhựa cứng — nền hàm nhỏ', d:'cái', p:100000},
    {g:'Tháo lắp', n:'Nhựa dẻo — nền hàm một bên',    d:'cái', p:300000},
    {g:'Tháo lắp', n:'Nhựa dẻo — nền hàm hai bên',    d:'cái', p:600000},
    {g:'Tháo lắp', n:'Móc dẻo',                        d:'cái', p:150000},
    {g:'Tháo lắp', n:'Lưới VN',                        d:'cái', p:100000},
    {g:'Tháo lắp', n:'Lưới Đức Vàng',                  d:'cái', p:350000},
    {g:'Tháo lắp', n:'Lưới Đức Trắng',                 d:'cái', p:200000},
    {g:'Tháo lắp trên Implant', n:'Răng Composite (Implant)', d:'hàm', p:2500000, ghi:'Nhật'},
    {g:'Tháo lắp trên Implant', n:'Răng sứ Vita (Implant)',   d:'hàm', p:4500000, ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Hàm khung kim loại',    d:'hàm', p:350000,  ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Hàm khung Vita',        d:'hàm', p:450000,  ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Hàm khung Titan',       d:'hàm', p:800000,  ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Hàm khung liên kết',    d:'hàm', p:600000,  ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Hàm khung liên sứ trên khung', d:'hàm', p:700000, ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Mắc cài đơn',           d:'cái', p:400000,  ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Mắc cài đôi',           d:'cái', p:1000000, ghi:'Đức'},
    {g:'Hàm khung & Attachment', n:'Mắc cài bi Titan Rhein83', d:'cái', p:1500000, ghi:'Ý · đã gồm Ron + Housing'},
    {g:'Hàm khung & Attachment', n:'Mắc cài bi tầng Titan Rhein83', d:'cái', p:2000000, ghi:'Ý · đã gồm Ron + Housing'},
    {g:'Khác', n:'Đắp Sứ trực tiếp / Khung & Customized', d:'răng', p:800000,  ghi:'Đức · BH 5 năm'},
    {g:'Khác', n:'Nướu Composite trên khung',             d:'hàm',  p:4000000, ghi:'Đức · BH 3 năm · nướu Viso Lign'},
    {g:'Khác', n:'Răng Tạm PMMA CAD/CAM (răng)',          d:'răng', p:250000,  ghi:'Hàn Quốc'},
    {g:'Khác', n:'Răng Tạm PMMA CAD/CAM (hàm)',           d:'hàm',  p:3000000, ghi:'chưa gồm Cylinder & ốc kết nối'},
    {g:'Khác', n:'Răng tạm tháo lắp',                     d:'hàm',  p:3000000, ghi:'Việt Nam · chưa gồm Cylinder & ốc kết nối'},
    {g:'Khác', n:'OT Attachment Rhein83',                 d:'cái',  p:2400000, ghi:'Ý'},
  ],
};

const BangLab = {
  /* Tên lab có bảng giá. Phiếu gởi hàng vẫn cho gõ tự do tên lab khác. */
  ten(){ return Object.keys(BANG_LAB); },
  /* Bảng giá của một lab, ưu tiên bản quản lý đã sửa trong Cài đặt */
  cua(lab){
    const tay = (db.giaLabRieng || {})[lab];
    return (tay && tay.length) ? tay : (BANG_LAB[lab] || []);
  },
  co(lab){ return this.cua(lab).length > 0; },
  /* Gợi ý cho ô "Loại răng / phục hình": chọn lab nào thì chỉ hiện danh mục lab đó.
     Chưa chọn lab thì gom tất cả lại, kèm tên lab cho khỏi lẫn. */
  goiY(lab){
    if (lab && this.co(lab)) return this.cua(lab).map(x => ({t: x.n + ' — ' + money(x.p) + '/' + x.d, s: x.n}));
    return this.ten().flatMap(l => this.cua(l).map(x => ({t: x.n + ' — ' + money(x.p) + '/' + x.d + ' · ' + l, s: x.n})));
  },
  /* Tìm một món trong bảng của lab. So tên đã bỏ dấu để gõ thiếu dấu vẫn ra. */
  mon(lab, ten){
    const k = Combo.norm(String(ten || '').trim());
    if (!k) return null;
    return this.cua(lab).find(x => Combo.norm(x.n) === k) || null;
  },
};
