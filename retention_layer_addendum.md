# Addendum Spec — Retention Layer (P0/P1 mới)

> Bổ sung cho `mvp_scope.md` đã có (Phase 1 core engine đã code xong, 147 test pass). Tài liệu này định nghĩa đợt tính năng mới nhằm giải quyết churn ngày đầu, tổng hợp từ `plan3.md` + 4 bản review + phản biện cuối cùng.
> Đọc cùng: `features.md` (inventory hiện có), `data_model.md` (schema hiện có — KHÔNG đổi cấu trúc bảng cũ trừ khi ghi rõ ở mục "Schema bổ sung"), `plan1_final_v2.md` (triết lý gốc).
>
> **Nguyên tắc bắt buộc xuyên suốt tài liệu này:**
> 1. Không phá vỡ Risk Engine hiện có — mọi Plan (kể cả Fast Plan) vẫn phải có SL.
> 2. Mọi tính năng dựa trên pattern thống kê phải áp dụng ngưỡng tối thiểu **30 lệnh đã đóng**, không có ngoại lệ.
> 3. Instant Audit (dùng parser thật) chỉ bật sau khi Parser đạt ngưỡng tin cậy — có gate rõ ràng ở Module 0.
> 4. Free tier phải giữ đủ để tạo daily habit loop — không gate các tính năng tạo lý do mở app hàng ngày.

---

## Thứ tự bắt buộc (không được đảo, có gate cứng)

```
Module 0: Fix & Verify MT4/MT5 Parser  ──(gate)──► Module 3: Onboarding Instant Audit
Module 1: Fast Plan (5 trường)
Module 2: Today Dashboard
Module 4: Cost of Indiscipline
Module 5: Setup Analytics
Module 6: Personal Danger Zone
Module 7: Discipline Streak
Module 8: Push Notification
```

Module 0 phải đạt Definition of Done trước khi Module 3 được bật cho user thật (có thể code Module 3 song song nhưng feature-flag OFF cho đến khi Module 0 xong).

---

## Module 0: Fix & Verify MT4/MT5 Parser (P0 — gate cứng)

**Vấn đề:** parser hiện tại dựa trên format giả định, chưa test với dữ liệu thật (`features.md` mục 4.2).

**Việc cần làm:**
1. Thu thập tối thiểu 3-4 mẫu export/copy Account History thật từ: Exness, ICMarkets, XM, và ít nhất 1 sàn hỗ trợ FTMO-style report (MT4 và MT5 có thể khác format, test cả 2 nếu có mẫu).
2. Viết lại/tinh chỉnh parser trong Edge Function `parse-mt4` để xử lý đúng các biến thể format đã thu thập (khác nhau về separator, số cột, format ngày giờ, decimal separator theo locale).
3. Với mỗi dòng không parse được, KHÔNG silent-skip — trả về danh sách lỗi kèm số dòng để user tự sửa tay hoặc báo lại.

**Acceptance criteria:**
- [ ] Tỷ lệ parse đúng ≥ 95% trên tập test thật (không phải test giả lập) từ ít nhất 3 nguồn khác nhau.
- [ ] Có bộ test tự động lưu các mẫu thật (đã ẩn danh số tài khoản/tên) làm fixture, chạy trong CI.
- [ ] `raw_import_payload` vẫn được lưu đầy đủ để debug khi có báo lỗi từ user thật sau này.
- [ ] Cờ feature `INSTANT_AUDIT_ENABLED` mặc định **false**; chỉ set `true` sau khi acceptance criteria trên đạt và được xác nhận thủ công.

**Nếu không đạt ngưỡng 95% trong thời gian dự kiến:** không chặn toàn bộ release — chuyển Module 3 (Instant Audit) sang dùng fallback ở mục 3.3 dưới đây, và tiếp tục các module khác không phụ thuộc parser.

---

## Module 1: Fast Plan (P0)

**Sửa lại đề xuất gốc:** KHÔNG bỏ SL. Form rút gọn còn tối thiểu 5 trường bắt buộc, không phải 3.

**Trường bắt buộc (hiển thị ngay):** Symbol, Direction, Entry, SL, Risk% (Risk% có giá trị mặc định = `max_risk_per_trade` từ rule của user, cho phép sửa).

**Trường ẩn/tùy chọn (gấp gọn dưới "Chi tiết thêm", điền được sau khi đóng lệnh):** TP, Thesis, Setup tag, Invalidation condition, Confidence level.

**Lot size, Risk:Reward, tiền risk:** tính tự động real-time như cũ (module 3 `mvp_scope.md`), không đổi công thức.

**Acceptance criteria:**
- [ ] Từ lúc mở form đến lúc lưu Plan hợp lệ (đủ 5 trường bắt buộc) ≤ 15 giây (đo bằng analytics_events, test với 5 user thật).
- [ ] Không cho lưu Plan nếu thiếu SL — validate chặn cứng, không phải cảnh báo mềm (đây là quy tắc bảo vệ Risk Engine, không thương lượng).
- [ ] Trường TP là optional thật sự — Plan vẫn lưu được và Risk Engine vẫn tính đúng Lot size khi TP trống (R:R chỉ hiện khi có TP).
- [ ] Nếu user không điền Thesis/Setup/Confidence lúc tạo Plan, có nhắc nhẹ (không chặn) điền bổ sung khi vào màn hình chi tiết lệnh sau khi đóng — không bắt buộc.

---

## Module 2: Today Dashboard (P0)

**Mục tiêu:** thay màn hình mặc định khi mở app (hiện đang là Journal) thành Today Dashboard. Journal chuyển thành tab riêng, không phải màn hình chính.

**Nội dung màn hình (tier Free — bắt buộc đầy đủ, không gate):**
1. Discipline Score hiện tại + delta so với hôm qua/tuần trước (dùng dữ liệu đã có ở `discipline_score_snapshots`).
2. Personal Danger Zone rút gọn — 1 dòng cảnh báo nếu có pattern đủ ngưỡng (xem Module 6), ẩn nếu chưa đủ 30 lệnh, không hiện khối trống.
3. Rules đang active hôm nay (danh sách ngắn từ `trading_rules`).
4. Nút "Quick Plan" nổi bật dẫn thẳng vào Fast Plan (Module 1).
5. Nếu có lệnh đang mở (`trade_executions` chưa có `exit_time`) → card riêng hiển thị PnL tạm tính.

**Không đưa vào Today Dashboard ở Phase này:** lịch tin tức đỏ (phụ thuộc Economic Calendar, chưa có nguồn dữ liệu — đúng như `features.md` mục 4.3 đã ghi nhận, không tự chế dữ liệu tin giả).

**Acceptance criteria:**
- [ ] Route mặc định khi mở app (`(main)/index`) là Today Dashboard, không phải Journal.
- [ ] Toàn bộ nội dung mục 1-4 hiển thị được ở tier Free, không có phần nào bị khóa Pro.
- [ ] Thời gian load màn hình (từ mở app đến hiển thị đầy đủ) ≤ 2 giây trên thiết bị test trung bình.
- [ ] User mới (0 lệnh) vẫn thấy màn hình có ý nghĩa (không trống trơn) — hiện thông điệp hướng dẫn + nút Quick Plan nổi bật, không hiện lỗi hay khối rỗng.

---

## Module 3: Onboarding Instant Audit (P0 — có gate)

**3.1. Điều kiện bật:** chỉ hiển thị bước này trong luồng Onboarding nếu `INSTANT_AUDIT_ENABLED = true` (xem Module 0).

**3.2. Luồng khi bật:** sau bước Quiz điểm yếu, thêm bước tùy chọn "Dán lịch sử giao dịch gần đây để xem điểm yếu thực tế" (không bắt buộc — có nút "Bỏ qua"). Dùng lại Edge Function `parse-mt4` đã fix ở Module 0. Sau khi parse, chạy ngay Behavior Engine hiện có (không viết logic mới) trên tập lệnh vừa import, hiển thị kết quả dạng: *"Trong N lệnh gần đây, bạn đã dời SL X lần (mất khoảng $Y), revenge trade Z lần (mất khoảng $W)."*

**3.3. Fallback khi `INSTANT_AUDIT_ENABLED = false`:** dùng ngay `weakness_profile` (jsonb) đã thu thập từ Quiz để hiển thị màn hình "Dự đoán điểm yếu của bạn" — liệt kê lại các điểm user tự nhận trong quiz dưới dạng tóm tắt cá nhân hóa, không cần dữ liệu lệnh thật. Đây không phải bản rút gọn tạm bợ — giữ nguyên vĩnh viễn cho đến khi Module 0 đạt ngưỡng, không có deadline ép.

**Acceptance criteria:**
- [ ] Khi `INSTANT_AUDIT_ENABLED = true`: nếu user bỏ qua bước paste lịch sử, luồng Onboarding vẫn tiếp tục bình thường, không chặn.
- [ ] Khi `INSTANT_AUDIT_ENABLED = true` và parse có dòng lỗi: hiển thị rõ số dòng lỗi, KHÔNG hiển thị kết quả audit dựa trên dữ liệu parse thiếu mà không cảnh báo.
- [ ] Khi `INSTANT_AUDIT_ENABLED = false`: màn hình fallback (3.3) hiển thị đúng, không có code path nào gọi parser.
- [ ] Toàn bộ luồng Onboarding (kể cả có Instant Audit) vẫn đạt AC cũ: ≤ 3 phút hoàn tất (đo bằng `analytics_events`).

---

## Module 4: Cost of Indiscipline (P1)

**Công thức (tính theo kỳ — tuần hoặc tháng do user chọn):**
```
hypothetical_pnl = tổng PnL NẾU mọi lệnh có followed_plan = true đều giữ nguyên PnL thật,
                    và mọi lệnh followed_plan = false được thay bằng PnL giả định
                    dựa trên planned_entry/planned_sl/planned_tp của chính lệnh đó
                    (nếu có đủ 3 giá trị; bỏ qua lệnh không đủ dữ liệu, không suy diễn)
actual_pnl = tổng pnl_amount thật trong kỳ
cost_of_indiscipline = hypothetical_pnl - actual_pnl
```

**Chỉ hiển thị khi:** số lệnh có `followed_plan = false` trong kỳ ≥ 3 (tránh kết luận từ 1 lệnh lệch ngẫu nhiên) VÀ tổng số lệnh trong kỳ ≥ 30 lệnh (áp đúng ngưỡng thống nhất, xem đầu file).

**Bắt buộc kèm disclaimer cố định, hiển thị ngay dưới con số, không phải footnote:**
> *"Đây là ước tính giả định dựa trên chênh lệch giữa kế hoạch và thực tế — không phải bảo đảm lợi nhuận. Kế hoạch ban đầu vẫn có thể sai."*

**Gating:** hiển thị tóm tắt 1 dòng ở Free (chỉ con số tổng); chi tiết breakdown từng lệnh + lịch sử theo tháng là Pro.

**Acceptance criteria:**
- [ ] Disclaimer xuất hiện ở MỌI nơi con số `cost_of_indiscipline` được hiển thị (Dashboard, Weekly Audit, chi tiết Pro) — kiểm tra bằng snapshot test UI.
- [ ] Không hiển thị số này nếu chưa đủ ngưỡng (≥3 lệnh lệch plan, ≥30 lệnh tổng) — thay bằng thông báo "Cần thêm dữ liệu để tính chỉ số này".
- [ ] Có test case cụ thể với bộ dữ liệu mẫu: 35 lệnh, 5 lệch plan có đủ planned_tp → verify công thức tính đúng.
- [ ] Lệnh lệch plan nhưng thiếu `planned_tp` bị loại khỏi phép tính `hypothetical_pnl`, không bị gán giá trị suy đoán.

---

## Module 5: Setup / Strategy Analytics (P1)

**Nội dung:** nhóm `trade_executions` (qua `trade_plans.setup_tag`) theo Breakout/Rejection/Trend Continuation/Other → tính Winrate, Avg R:R, Total PnL cho từng nhóm.

**Ngưỡng hiển thị:** áp đúng ngưỡng thống nhất — chỉ hiện khi tổng số lệnh đã đóng ≥ 30. Dưới ngưỡng, hiện "Cần thêm N lệnh nữa (hiện có X/30) để phân tích đáng tin cậy" — không ẩn hoàn toàn, để user thấy roadmap tiến độ.

**Gating:** Free thấy bảng tổng quan (winrate/R:R theo setup); Pro thấy thêm gợi ý dạng câu (VD: "Setup Breakout đang có edge tốt hơn Rejection") và biểu đồ xu hướng theo thời gian.

**Acceptance criteria:**
- [ ] Dưới 30 lệnh: hiển thị đúng thông báo tiến độ, không hiển thị bảng thống kê.
- [ ] Từ 30 lệnh trở lên: bảng tính đúng, có test với dữ liệu mẫu ≥ 3 setup_tag khác nhau.
- [ ] `setup_tag = null` hoặc `'other'` được gom vào 1 nhóm riêng "Chưa phân loại", không bị loại khỏi thống kê tổng.

---

## Module 6: Personal Danger Zone (P1)

**Nội dung:** quét `rule_violations` + `trade_executions.entry_time` để tìm pattern lặp lại theo khung giờ hoặc điều kiện cụ thể, ví dụ: giờ trong ngày có tỷ lệ vi phạm cao nhất, hoặc "vi phạm thường xảy ra ở lệnh thứ N+ trong ngày".

**Ngưỡng:** áp đúng ngưỡng thống nhất ≥ 30 lệnh đã đóng, VÀ pattern cụ thể phải xuất hiện ≥ 5 lần để được coi là đáng tin (tránh kết luận từ 2-3 lần trùng hợp).

**Hiển thị:** 1 dòng tóm tắt ở Today Dashboard (Free); chi tiết đầy đủ (nhiều pattern, biểu đồ theo giờ) ở màn riêng (Pro).

**Acceptance criteria:**
- [ ] Không hiển thị bất kỳ kết luận Danger Zone nào nếu chưa đủ 30 lệnh HOẶC pattern chưa đủ 5 lần lặp — kiểm tra bằng test với dữ liệu 25 lệnh (phải ẩn) và 35 lệnh có pattern lặp 6 lần (phải hiện).
- [ ] Câu hiển thị lấy đúng số liệu thật (giờ, số lần), không dùng câu mẫu tĩnh.

---

## Module 7: Discipline Streak (P1)

**Định nghĩa:** đếm số lệnh liên tiếp gần nhất có `followed_plan = true` VÀ không có `rule_violations` nào gắn với lệnh đó. Reset về 0 ngay khi có 1 lệnh vi phạm hoặc lệch plan.

**Rõ ràng: đây KHÔNG phải streak mở app hàng ngày** (kiểu Duolingo) — đây là streak tuân thủ kỷ luật theo lệnh, đúng tinh thần Discipline Score.

**Acceptance criteria:**
- [ ] Streak tính đúng theo thứ tự `entry_time`, không theo thứ tự nhập liệu vào hệ thống.
- [ ] Test case: 8 lệnh liên tiếp followed_plan=true+không vi phạm → streak=8; lệnh thứ 9 vi phạm → streak reset về 0 ngay sau đó.
- [ ] Hiển thị ở Today Dashboard (Free), không gate.

---

## Module 8: Push Notification (P1)

**2 loại thông báo duy nhất ở Phase này (không thêm loại khác để tránh spam):**
1. Buổi sáng (giờ user tự cấu hình, mặc định 8:00 theo `timezone` user): tóm tắt ngắn Discipline Score hôm qua + rules hôm nay.
2. Cuối ngày (mặc định 21:00): nếu có lệnh đóng trong ngày, nhắc review nhanh; nếu không có lệnh nào, không gửi (tránh notification rỗng gây khó chịu).

**Yêu cầu về tone (bắt buộc, liên kết với nguyên tắc "Auditor cân bằng" ở `plan1_final_v2.md` mục 8):** nội dung thông báo không dùng ngôn ngữ phán xét/hù dọa (VD tránh: "Bạn lại vi phạm rồi!"), thay bằng tông trung tính-khích lệ (VD: "Discipline Score hôm nay: 82. Xem chi tiết?").

**Opt-in rõ ràng:** hỏi permission đúng ngữ cảnh (sau khi user đã thấy giá trị Today Dashboard ít nhất 1 lần, không hỏi ngay lúc mở app lần đầu).

**Acceptance criteria:**
- [ ] Không gửi thông báo cuối ngày nếu user không có lệnh nào đóng trong ngày đó.
- [ ] User tắt được từng loại thông báo riêng biệt trong Settings.
- [ ] Nội dung mẫu được review thủ công (ít nhất 5 bộ dữ liệu khác nhau) để đảm bảo không rơi vào tông phán xét.
- [ ] Permission request hiển thị đúng thời điểm (sau lần đầu thấy Today Dashboard), không phải ngay khi mở app.

---

## Schema bổ sung cần thiết (thêm vào `data_model.md`, không sửa bảng cũ)

```sql
-- Cấu hình notification riêng từng user
create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_brief_enabled boolean default true,
  morning_brief_time time default '08:00',
  evening_review_enabled boolean default true,
  evening_review_time time default '21:00',
  push_token text,
  updated_at timestamptz default now()
);

-- Feature flags đơn giản (thay vì hardcode trong code, dễ bật/tắt Instant Audit)
create table feature_flags (
  flag_name text primary key,
  is_enabled boolean not null default false,
  updated_at timestamptz default now()
);
-- Seed: insert into feature_flags (flag_name, is_enabled) values ('INSTANT_AUDIT_ENABLED', false);
```

**Không cần bảng mới cho:** Today Dashboard (compute on-the-fly từ bảng có sẵn), Cost of Indiscipline (tính runtime, không cache ở bản đầu), Setup Analytics, Danger Zone, Streak — tất cả là query/tính toán trên dữ liệu đã có, tránh phình schema không cần thiết.

---

## Định nghĩa "Xong đợt Retention Layer" (Definition of Done)

1. Module 0 đạt ngưỡng 95% parse đúng TRƯỚC khi Module 3 chuyển sang chế độ full (không fallback).
2. Module 1, 2 (P0) hoàn thành đầy đủ acceptance criteria, đã thay đổi route mặc định app.
3. Module 4-8 (P1) đều tuân thủ đúng ngưỡng 30 lệnh thống nhất — có test tự động xác nhận từng module ẩn/hiện đúng theo ngưỡng.
4. Không có tính năng nào trong Free tier bị âm thầm chuyển thành Pro-only so với bảng gating đã liệt kê ở từng module.
5. Toàn bộ disclaimer bắt buộc (Cost of Indiscipline) xuất hiện đúng vị trí, kiểm tra bằng snapshot test.
6. Cập nhật `features.md` sau khi hoàn thành từng module (giữ file luôn phản ánh đúng trạng thái thật, đúng quy ước đã có).