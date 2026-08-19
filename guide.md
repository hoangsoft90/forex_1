# Trading Discipline OS — Hướng dẫn sử dụng chi tiết

> App kỷ luật giao dịch forex cho trader cá nhân. Hỗ trợ **tiếng Việt** và **tiếng Anh** (tự nhận ngôn ngữ thiết bị, đổi được trong Settings).
>
> Bản cập nhật: 2026-08-18 — bao phủ toàn bộ tính năng hiện có (Onboarding, Hiến pháp, Plan + Risk Engine, Widget, Journal, Scores, Weekly Audit, Retention M0–M8, i18n, In-app Guidance).

---

## Mục lục

1. [Bắt đầu nhanh (5 phút)](#1-bắt-đầu-nhanh)
2. [Màn hình chính — Today Dashboard](#2-màn-hình-chính--today-dashboard)
3. [Trước khi vào lệnh — tạo Plan](#3-trước-khi-vào-lệnh--tạo-plan)
4. [Ghi nhận lệnh — Widget & Paste MT4/5](#4-ghi-nhận-lệnh--widget--paste-mt45)
5. [Journal & Chi tiết lệnh](#5-journal--chi-tiết-lệnh)
6. [Hiến pháp giao dịch (luật của bạn)](#6-hiến-pháp-giao-dịch-luật-của-bạn)
7. [Điểm số: Discipline vs Edge](#7-điểm-số-discipline-vs-edge)
8. [Weekly Audit (tổng kết tuần)](#8-weekly-audit-tổng-kết-tuần)
9. [Cost of Indiscipline (giá của sự vô kỷ luật)](#9-cost-of-indiscipline-giá-của-sự-vô-kỷ-luật)
10. [Setup Analytics (phân tích setup)](#10-setup-analytics-phân-tích-setup)
11. [Personal Danger Zone (vùng nguy hiểm)](#11-personal-danger-zone-vùng-nguy-hiểm)
12. [Discipline Streak (chuỗi kỷ luật)](#12-discipline-streak-chuỗi-kỷ-luật)
13. [Portfolio Risk & Ma trận tương quan](#13-portfolio-risk--ma-trận-tương-quan)
14. [Pro & Quảng cáo](#14-pro--quảng-cáo)
15. [Cài đặt: Ngôn ngữ, Notification, Hiến pháp](#15-cài-đặt)
16. [Hướng dẫn trong app (In-app Guidance)](#16-hướng-dẫn-trong-app-in-app-guidance)
17. [Câu hỏi thường gặp & lưu ý](#17-câu-hỏi-thường-gặp--lưu-ý)

---

## 1. Bắt đầu nhanh

### 1.1 Tạo tài khoản
1. Mở app → bấm **Đăng ký** (hoặc **Sign up** nếu app đang tiếng Anh).
2. Nhập **email** + **mật khẩu** → **Đăng ký**.
3. Bạn vào thẳng app luôn (không cần xác nhận email).

> 💡 Lần đầu bạn sẽ được dẫn qua **Onboarding** — mất khoảng 3 phút:
> 1. **Nhập số dư tài khoản** (VD 10.000 USD) — app dùng đây làm gốc tính % rủi ro cho mọi thứ.
> 2. **Quiz điểm yếu (7 câu)** — trả lời theo thói quen thật, không có đáp án đúng/sai.
> 3. Xem **dự đoán điểm yếu** của bạn (từ câu trả lời).
> 4. Đọc giải thích **Discipline vs Edge** — bấm "Đã hiểu".
> 5. Tạo **2 luật bắt buộc**: `Max risk mỗi lệnh` (VD 1%) + `Max lỗ mỗi ngày` (VD 3%).

### 1.2 Sau onboarding
Bạn vào **Today Dashboard** — màn hình chính. Nếu bạn là user mới (chưa có lệnh nào), app sẽ **hiện tour hướng dẫn tự động** trỏ vào nút ⚡ Quick Plan rồi đến Journal — bấm **Tiếp** để xem, hoặc **Bỏ qua** nếu muốn tự khám phá. (Tour chỉ hiện 1 lần duy nhất.)

---

## 2. Màn hình chính — Today Dashboard

Đây là màn hình đầu tiên mỗi lần mở app. Từ trên xuống:

| Phần | Ý nghĩa |
|---|---|
| **⚡ Quick Plan** | Nút nổi bật → vào **Fast Plan** (tạo kế hoạch nhanh). |
| **Discipline Score** | Điểm kỷ luật hiện tại + mũi tên ▲/▼ so với tuần trước. Chưa có lệnh → "No score yet". |
| **⚠️ Danger Zone** (1 dòng) | Hiện khi đủ dữ liệu (≥30 lệnh đóng): "bạn hay vi phạm lúc X:00". Bấm vào để xem chi tiết. |
| **🔥 Discipline Streak** | Số lệnh gần nhất liên tiếp **theo đúng plan và không vi phạm** — đứt ngay khi có 1 lệnh lệch plan. |
| **Today's rules** | Các luật đang áp dụng hôm nay (từ Hiến pháp của bạn). |
| **Cost of Indiscipline** | Giá của sự vô kỷ luật (xem mục 9) — chỉ khi đủ dữ liệu. |
| **Open trades** | Lệnh đang mở + nút mở Widget để đóng lệnh. |
| **Guide (user mới)** | Hướng dẫn 3 bước khi chưa có lệnh nào + nút "Enter first trade". |
| **Nav grid** | Journal · Paste MT4/5 · Scores · Weekly Audit · Setup Analytics · Danger Zone · Portfolio Risk · Pro · Settings. |

> 📱 **Tour hướng dẫn**: lần đầu (user mới), app spotlight từng nút quan trọng kèm giải thích — bấm ngoài vùng highlight hoặc nút **Tiếp** để sang bước kế, **Xong** ở bước cuối.

---

## 3. Trước khi vào lệnh — tạo Plan

Nguyên tắc vàng: **lên kế hoạch TRƯỚC khi vào lệnh** — app luôn nhắc điều này.

### 3.1 Fast Plan (nhanh, 5 trường bắt buộc)
Từ Dashboard bấm **⚡ Quick Plan** để vào Fast Plan:

| Trường | Ghi chú |
|---|---|
| **Symbol** | VD: EURUSD, XAUUSD, USDJPY... |
| **Direction** | Buy / Sell |
| **Entry** | Giá vào lệnh dự kiến |
| **SL** | **BẮT BUỘC** — app không cho lưu khi thiếu SL (bảo vệ tính rủi ro chính xác) |
| **Risk %** | Mặc định lấy từ luật `Max risk mỗi lệnh` của bạn (sửa được) |

App **tự tính ngay**: số pip Entry→SL, **lot size đề xuất**, **số tiền rủi ro ($)**, và **R:R** (khi có TP).

Các trường tùy chọn (bấm "▼ Chi tiết thêm"): TP, Thesis (lý do lệnh), Setup tag (Breakout/Rejection/Trend Continuation), Invalidation (điều kiện hủy), Confidence 1–5, Chart TradingView.

### 3.2 Cảnh báo & chặn
- **Risk % vượt luật** → chặn lưu, yêu cầu giảm xuống.
- **Adaptive ATR đang bật** (luật của bạn có gắn adaptive) → app đề xuất risk **thấp hơn** khi thị trường biến động mạnh; nhập cao hơn đề xuất sẽ bị chặn. (App **không bao giờ** tự nâng risk của bạn.)

### 3.3 Nút "Trade without a Plan"
Nếu bạn muốn vào lệnh **không có plan** → app hiện màn hình cảnh báo: bạn sẽ **không được tính là "theo plan"**, không có gì để so sánh, và không rút ra được bài học. Xác nhận "Tôi hiểu" → vào Widget nhập lệnh thật.

---

## 4. Ghi nhận lệnh — Widget & Paste MT4/5

### 4.1 Widget nhập nhanh (Execution Widget)
Từ Dashboard card "Open trades" → "Open Widget", hoặc nav → Quick trade entry.

Nhập: Symbol, Direction, Lot, Entry, SL, TP, và **giá đóng** (khi lệnh đã đóng). App tự **gợi ý link Plan** khớp symbol + hướng — bấm 1 chạm để gắn. Mục tiêu: < 20 giây/lệnh.

Khi có giá đóng → bấm **Save** → app tự tính **delta** (lệch Entry/SL/Risk bao nhiêu) và đánh dấu **Theo plan / Lệch plan**.

### 4.2 Paste MT4/MT5 (import hàng loạt)
1. Mở MT4/MT5 → tab **Account History** → chọn tất cả → **Copy**.
2. Trong app: nav → **Paste MT4/5** → dán vào ô → **Parse & Import**.
3. App báo: "Kết quả: X lệnh". Nếu có dòng lỗi → hiện rõ **số dòng + lý do** (VD sai định dạng giờ) — bạn tự sửa trong Journal sau.

> Hỗ trợ: dấu phẩy/chấm thập phân theo locale, nhiều định dạng ngày giờ, lệnh in/out 2 dòng (tự gộp thành 1 lệnh đóng), bỏ qua dòng Balance/Deposit/Withdrawal.

---

## 5. Journal & Chi tiết lệnh

- **Journal**: danh sách lệnh. Mỗi lệnh có badge **✓ Theo plan** / **✗ Lệch plan**, PnL, lot, giờ vào/đóng.
- **Insight thống kê** (khi ≥10 lệnh có plan): "% lệnh theo plan có lời **vs** % lệch plan có lời" — bằng chứng số rằng giữ kỷ luật có giá trị.
- **Chi tiết lệnh** (bấm vào 1 lệnh): so sánh **Planned vs Actual** (Entry/SL/TP từng cột), **Deviation (Delta)** theo pip/%, reminder thiếu trường, và **chart TradingView** của lệnh.

---

## 6. Hiến pháp giao dịch (luật của bạn)

Settings → **Trading constitution** (hoặc màn hình này trong onboarding).

- **5 luật mẫu**: Max risk mỗi lệnh (%) · Max lỗ mỗi ngày (%) · Cấm revenge (phút) · Cấm lệnh trước tin lớn (phút) · Max vị thế mở song song (số).
- Bạn có thể: **thêm luật tùy chỉnh**, **sửa giá trị**, **xóa** (trừ 2 luật bắt buộc tối thiểu).
- **Free**: tối đa 3 luật. **Pro**: không giới hạn.
- **Adaptive by ATR** (trên luật Max risk): bật → nhập ngưỡng ATR (bội số) + % risk điều chỉnh. Khi ATR vượt ngưỡng, app **tự đề xuất giảm risk** (VD 1% → 0.5%) — và **chặn** nếu bạn cố nhập cao hơn đề xuất.

> Màn hình **Discipline vs Edge** (Settings) giải thích chi tiết 2 khái niệm này.

---

## 7. Điểm số: Discipline vs Edge

Nav → **Scores**.

| Chỉ số | Nghĩa |
|---|---|
| **Discipline Score** | Bạn **theo đúng kế hoạch** đến mức nào (adherence% trừ phạt vi phạm). Không đo lời/lỗ. |
| **Edge Score** | Chiến lược của bạn **có hiệu quả** không (winrate, R:R trung bình, PnL tuần). |
| **Progress this week** | +/− điểm so với tuần trước. |

- **Free**: thấy chỉ số hiện tại + tiến bộ tuần.
- **Pro**: thêm trend 4/12 tuần + "số vi phạm đã ngăn chặn".

> ⚠️ Điểm kỷ luật cao **không đảm bảo có lời** — nó đảm bảo bạn biết chính xác thua lỗ do **hành vi** hay **chiến lược**.

---

## 8. Weekly Audit (tổng kết tuần)

Nav → **Weekly Audit**. Báo cáo tự động (không phải AI): số lệnh trong tuần, % theo plan, **vi phạm phổ biến nhất**, số lệnh app đã **ngăn chặn** (Decision Interruption), và **kết quả PnL tuần** kèm định hướng (giữ kỷ luật hay xem lại chiến lược).

---

## 9. Cost of Indiscipline (giá của sự vô kỷ luật)

Hiển thị ở **Dashboard** và **Weekly Audit** khi đủ dữ liệu (≥30 lệnh đóng **và** ≥3 lệnh lệch plan):

> "X lệnh lệch plan trong Y lệnh kỳ này (giả định plan đạt TP: +$A so với thực tế $B)"

**Con số mang tính giả định** (nếu lệnh theo đúng plan mà đạt TP thì bạn lời bao nhiêu) — app luôn hiển thị disclaimer kèm theo, đừng coi là lời hứa lợi nhuận.

---

## 10. Setup Analytics (phân tích setup)

Nav → **Setup Analytics**. Nhóm các lệnh đóng theo **setup tag** (Breakout / Rejection / Trend Continuation / Chưa phân loại): số lệnh, **winrate**, **Avg R:R**, **tổng PnL** từng nhóm.

- Cần **≥30 lệnh đóng** để phân tích tin cậy — dưới ngưỡng app hiện "Cần thêm N lệnh (X/30)".
- **Free**: bảng tổng quan. **Pro**: gợi ý câu (setup nào thực sự có edge, so sánh tốt/thấp nhất).

---

## 11. Personal Danger Zone (vùng nguy hiểm)

Nav → **Danger Zone** (hoặc bấm dòng cảnh báo trên Dashboard). Phát hiện từ dữ liệu thật của bạn (ngưỡng ≥30 lệnh đóng + pattern lặp ≥5 lần):

1. **Giờ trong ngày**: bạn vi phạm nhiều nhất lúc mấy giờ (kèm biểu đồ top 8 giờ).
2. **Lệnh thứ N trong ngày**: vi phạm hay xảy ra ở lệnh thứ mấy của ngày.

→ Đây là thông tin để bạn **né** những thời điểm/hoàn cảnh yếu của mình (VD: không giao dịch 21:00–23:00).

---

## 12. Discipline Streak (chuỗi kỷ luật)

Trên Dashboard: 🔥 **Streak** = số lệnh gần nhất liên tiếp **theo đúng plan + không vi phạm** (tính theo thứ tự thời gian vào lệnh). Chỉ cần **1 lệnh lệch plan hoặc vi phạm** → streak về 0. Đây là chỉ báo "đà kỷ luật", không phải streak mở app.

---

## 13. Portfolio Risk & Ma trận tương quan

Nav → **Portfolio Risk**:
- **Tổng risk dồn** của các vị thế đang mở: xanh (OK) / vàng (cảnh báo) / đỏ (vượt ngưỡng). Ngưỡng = min(Max risk × 3, Max lỗ ngày).
- **Ma trận tương quan (Pro)**: EURUSD ↔ USDJPY ↔ XAUUSD — hệ số ước lượng thị trường, giúp tránh gom rủi ro cùng hướng (VD mua EURUSD + mua USDJPY đều là "mua USD" → rủi ro cộng dồn).

> ⚠️ Hệ số tương quan là **tham chiếu ước lượng** (chưa tính từ dữ liệu giá thật — Phase 3).

---

## 14. Pro & Quảng cáo

Nav → **👑 Pro** (hoặc bấm nút Pro trên Dashboard):

- **Free**: 3 luật, không trend score, không correlation, không insight Pro.
- **Pro 24h**: xem **1 video quảng cáo ngắn** → mở Pro **24 giờ** (cộng dồn thời hạn nếu đang Pro).
- **Cooldown 5 phút**: sau mỗi ad phải chờ 5 phút mới xem ad tiếp (chống spam).
- Banner ads nhỏ ở cuối màn hình (bản thử nghiệm TEST_ADS — không phải ad thật).

---

## 15. Cài đặt

Settings (nav → Settings) gồm:

| Mục | Nội dung |
|---|---|
| **Pro** | Trạng thái Pro + nút mở Pro |
| **Trading constitution** | Quản lý luật (xem mục 6) |
| **Discipline vs Edge** | Giải thích 2 điểm số |
| **🌐 Ngôn ngữ** | Tiếng Việt / English — bấm để đổi ngay, app nhớ lựa chọn. **(Badge "Mới" đánh dấu tính năng này — bấm vào badge để tắt vĩnh viễn)** |
| **Notifications** | Bật/tắt **Morning brief** (mặc định 08:00) và **Evening review** (mặc định 21:00), chỉnh giờ HH:MM, bấm Save. Evening chỉ gửi khi có lệnh đóng trong ngày. |
| **Sign out** | Đăng xuất |

> 🔔 **Permission notification**: app chỉ hỏi xin phép **sau lần đầu bạn mở Dashboard** (không hỏi lúc khởi động). Từ chối vẫn dùng bình thường; nếu muốn bật lại → vào Settings hệ thống.

---

## 16. Hướng dẫn trong app (In-app Guidance)

App có hệ thống hướng dẫn ngay trong giao diện:

- **Tour nhiều bước** (Spotlight): user mới thấy tour trên Dashboard — màn hình tối lại, **element được highlight sáng**, popup giải thích kèm nút **Bỏ qua / Tiếp / Xong** và số bước (VD "Bước 1/2").
- **FeatureBadge "Mới"**: chấm/label New cạnh tính năng vừa thêm — bấm vào để đóng, sẽ **không hiện lại**.
- **Tooltip nút bị khóa**: bấm vào nút đang bị vô hiệu (VD nút Save lúc đang lưu) → popup giải thích **lý do** + **khi nào dùng được**.

Mọi hướng dẫn chỉ hiện **1 lần**, không spam.

---

## 17. Câu hỏi thường gặp & lưu ý

### Dữ liệu & công thức
- **"Theo plan" nghĩa là gì?** Entry lệch < 5 pip, risk lệch < 0.2%, và không dời SL. (Ngưỡng Phase 1 — sẽ tinh chỉnh theo dữ liệu của bạn.)
- **Vì sao score chưa có?** Cần lệnh **đã đóng** để tính. Vào lệnh + đóng lệnh qua Widget (hoặc paste MT4) là score sẽ xuất hiện.
- **Vì sao Cost/Danger Zone/Setup Analytics chưa hiện?** Các phân tích thống kê cần **tối thiểu 30 lệnh đóng** để tin cậy — app không đoán từ ít dữ liệu. (Cost thêm điều kiện ≥3 lệnh lệch plan.)
- **ATR/correlation có thật không?** Hiện là **giá trị ước lượng tham chiếu** (chưa có nguồn giá thị trường thật — Phase 3). UI luôn ghi rõ.
- **Import MT4 có chính xác 100% không?** App báo rõ số dòng lỗi + lý do; kết quả dựa trên dữ liệu bạn dán. Đã harden nhiều định dạng nhưng chưa verify trên mọi broker.

### Kỷ luật
- **App có ép luật không?** Không — luật do BẠN đặt. App chỉ nhắc, chặn lúc bạn sắp vi phạm chính luật của mình, và ghi nhận để bạn học.
- **Adaptive có tự tăng risk không?** **Không bao giờ** — chỉ giảm, và bị khóa cứng ở cả code lẫn database.
- **Bị chặn giữa chừng (Decision Interruption)?** App thấy dấu hiệu vi phạm (vượt risk / chạm max lỗ ngày / revenge) → hiện bằng chứng (của bạn hoặc cộng đồng) → bạn chọn **"Tiếp tục"** (chấp nhận) hoặc **"Quay lại chỉnh Plan"**. Quyết định cuối luôn là của bạn.

### Kỹ thuật
- **App yêu cầu mạng?** Cần kết nối để đồng bộ Supabase (đăng nhập, lưu lệnh, score). Chart TradingView cần mạng.
- **Ads không hiện?** Bản đang chạy chế độ **TEST_ADS** (ad thử nghiệm của Google) — khi ra mắt thật sẽ bật ad thật.
- **Notification không gửi?** Kiểm tra: đã bật trong Settings + cấp quyền thông báo cho app + Evening chỉ gửi khi có lệnh đóng trong ngày.

---

*Có thắc mắc gì thêm — hỏi developer trực tiếp hoặc xem `features.md` (tổng quan tính năng cho AI/nhà phát triển).*
