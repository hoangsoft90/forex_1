# MVP Scope Spec — Trading Discipline OS (Phase 1)

> Tài liệu này định nghĩa CHÍNH XÁC những gì phải build trong Phase 1 (0–3 tháng), kèm acceptance criteria. Đọc cùng `data_model.md` (schema) và `plan1_final_v2.md` (bối cảnh/triết lý sản phẩm).
> Stack: React Native (Expo) + Supabase (Postgres + Auth + Storage) + Supabase Edge Functions.

---

## 0. Nguyên tắc phạm vi

**Phase 1 PHẢI có đủ MỘT vòng lặp hoàn chỉnh, không phải tính năng rời rạc:**
Onboarding → Personal Rules cơ bản → Trade Plan → Risk Engine → Decision Interruption → Execution Capture → Plan vs Reality → Discipline Score cơ bản → Weekly Audit đơn giản.

**Phase 1 KHÔNG bao gồm** (để lại Phase 2/3, không code ở giai đoạn này):
- Market data real-time / chart nội bộ (dùng TradingView Widget nhúng nếu cần hiển thị giá, không tự vẽ)
- Auto-sync MT4/MT5 qua MetaAPI/Investor Password
- AI Coach/Auditor dùng LLM để sinh insight tự do (Phase 1 dùng rule-based, không cần gọi AI model)
- Economic Calendar
- Portfolio Risk / Correlation
- Adaptive Rules nâng cao theo ATR (chỉ làm phần khung dữ liệu ở schema, chưa cần logic tính ATR thật)
- Accountability Circle (giữ schema, chưa cần UI)

---

## 1. Module: Onboarding — Weakness Profiling

**Mục tiêu:** thu thập `weakness_profile` và `account_balance_baseline` để cá nhân hóa các module sau.

**Màn hình:**
1. Đăng ký/đăng nhập (Supabase Auth — email hoặc số điện thoại, ưu tiên số điện thoại cho user VN)
2. Nhập số dư tài khoản trading (baseline để tính % risk)
3. Bộ câu hỏi trắc nghiệm 5-7 câu dạng single-select, ví dụ:
   - "Bạn có hay tăng lot sau khi thua lệnh không?"
   - "Bạn có hay dời Stop Loss khi giá đi ngược không?"
   - "Bạn có hay vào lệnh ngay sau tin tức lớn không?"
4. Giải thích ngắn gọn: Discipline Score vs Edge Score là 2 thứ khác nhau (theo mục 9, plan v2) — hiển thị 1 lần, có thể xem lại trong Settings.

**Acceptance criteria:**
- [ ] User hoàn tất onboarding trong ≤ 3 phút (đo bằng analytics event).
- [ ] `user_profiles.weakness_profile` được lưu dạng jsonb đúng format.
- [ ] Không được skip bước giải thích Discipline vs Edge Score (chỉ được "Đã hiểu", không có nút "Bỏ qua").

---

## 2. Module: Personal Trading Constitution (cơ bản)

**Mục tiêu:** user tạo tối thiểu 2 rule bắt buộc, có thể thêm rule tùy chọn.

**Rule bắt buộc phải có sẵn template, user chỉ cần điền số:**
- `max_risk_per_trade` (mặc định gợi ý 1%)
- `max_daily_loss` (mặc định gợi ý 3%)

**Rule tùy chọn (chọn thêm):** `no_revenge_trade`, `no_trade_before_news`, `max_open_positions`.

**Giới hạn theo tier:** Free = tối đa 3 rules. Pro = không giới hạn (theo mục 12 plan v2).

**Acceptance criteria:**
- [ ] User không thể tiếp tục sang màn hình Trade Plan nếu chưa có ít nhất `max_risk_per_trade` và `max_daily_loss`.
- [ ] Sửa rule bất kỳ lúc nào trong Settings, có lưu lịch sử thay đổi (dùng `updated_at`, không cần bảng version riêng ở Phase 1).
- [ ] UI hiển thị rõ ràng: đây là luật CỦA USER, app không tự đặt hộ (đúng tinh thần Constitution, không phải app áp đặt).

---

## 3. Module: Trade Plan (object trung tâm)

**Mục tiêu:** user tạo kế hoạch TRƯỚC khi vào lệnh — đây là bước không được phép bỏ qua trong luồng chính (nhưng vẫn cho phép tạo trade "ngoài kế hoạch" như một lựa chọn riêng biệt, có cảnh báo).

**Form nhập liệu (map đúng bảng `trade_plans`):**
Symbol, Direction, Thesis (text), Setup tag (dropdown: breakout/rejection/trend_continuation/other), Entry, SL, TP, Risk % (auto-suggest theo rule `max_risk_per_trade`, user có thể sửa), Invalidation condition, Confidence level (1-5 sao).

**Risk Engine tính tự động ngay khi nhập Entry/SL/Risk%:**
- Lot size đề xuất = (Balance × Risk%) / (khoảng cách Entry-SL tính theo pip × giá trị pip)
- Risk/Reward ratio nếu có TP
- Số tiền risk cụ thể (VD "$100")

**Acceptance criteria:**
- [ ] Lot size tính đúng công thức chuẩn forex (test với ít nhất 3 cặp: EURUSD, XAUUSD, USDJPY — pip value khác nhau).
- [ ] Nếu Risk% nhập > `max_risk_per_trade` đã đặt → hiển thị cảnh báo ngay tại form (không phải sau khi submit).
- [ ] Plan được lưu với `status = 'planned'`.
- [ ] Route thoát: cho phép "Tạo lệnh không có Plan" nhưng phải qua 1 màn hình xác nhận phụ, ghi log riêng (trade_execution với `trade_plan_id = null`).

---

## 4. Module: Decision Interruption

**Mục tiêu:** chặn/cảnh báo đúng lúc nguy hiểm, dùng evidence — theo đúng thiết kế 2 tầng ở mục 5, `plan1_final_v2.md`.

**Trigger điều kiện (Phase 1 chỉ cần rule-based đơn giản, KHÔNG cần ML):**
| Trigger | Điều kiện kiểm tra |
|---|---|
| `over_risk` | Risk% của Trade Plan mới > `max_risk_per_trade` |
| `max_daily_loss` | Tổng lỗ hôm nay (từ `trade_executions` có `exit_time` hôm nay) ≥ `max_daily_loss` |
| `revenge_pattern` | Lệnh trước đó (gần nhất) có `pnl_amount < 0` VÀ thời gian giữa `exit_time` lệnh trước và lúc tạo Plan mới < 10 phút VÀ direction ngược với lệnh trước |

**Evidence mode (2 tầng, bắt buộc implement):**
- Nếu user có < 15 `trade_executions` đã đóng lệnh → dùng `evidence_mode = 'cohort_benchmark'`, hiển thị câu benchmark tĩnh có sẵn trong app (không cần tính toán, hardcode nội dung, VD: "73% trader tăng lot sau lệnh thua đều thua tiếp lệnh đó.")
- Nếu user có ≥ 15 lệnh → dùng `evidence_mode = 'personal'`, query dữ liệu thật của chính user (VD: tính trung bình số tiền thua thêm sau revenge trade trước đây của chính họ).

**UI:** không dùng popup Yes/No đơn thuần. Bắt buộc hiển thị con số cụ thể + 2 lựa chọn rõ ràng: "Tiếp tục" / "Quay lại chỉnh Plan".

**Acceptance criteria:**
- [ ] Interruption hiển thị ĐÚNG trước khi user có thể bấm nút xác nhận tạo lệnh, không phải sau.
- [ ] Mọi lần hiển thị đều ghi vào `decision_interruptions` (evidence_text, user_decision).
- [ ] Test case: user có 20 lệnh lịch sử, trong đó có 1 lần revenge trade trước đây lỗ thêm $420 → khi trigger lại revenge_pattern, câu evidence phải hiển thị đúng con số $420 lấy từ dữ liệu thật, không phải số cứng.
- [ ] Test case: user mới có 5 lệnh → phải dùng cohort_benchmark, không được cố tính personal evidence từ dữ liệu quá ít.

---

## 5. Module: Execution Capture

**Phase 1 chỉ cần 2 phương án (ưu tiên ngang nhau theo mục 4, plan v2):**

### 5.1. Manual / Mobile Widget nhập nhanh
Form tối giản trên mobile, nhập được trong < 20 giây: Symbol, Direction, Lot, Entry, SL, TP (optional), liên kết với `trade_plan_id` nếu có plan trước đó khớp Symbol+Direction gần nhất (auto-suggest link).

### 5.2. Copy-Paste từ MT4/MT5 Account History
Textarea cho user paste nguyên khối text copy từ MT4. Backend (Edge Function) parse theo định dạng chuẩn MT4 export (ticket, symbol, type, lots, open time, open price, S/L, T/P, close time, close price, profit).

**Acceptance criteria:**
- [ ] Mobile Widget: từ lúc mở màn hình đến lúc lưu thành công ≤ 20 giây (đo bằng analytics, test với 5 user thật).
- [ ] Copy-Paste parser: xử lý đúng ít nhất 2 format phổ biến của MT4 export (MT4 desktop và MT4 mobile có format hơi khác nhau — cần verify với dữ liệu mẫu thật, không đoán).
- [ ] Parser lưu `raw_import_payload` để debug khi parse sai.
- [ ] Nếu parser không nhận diện được dòng nào, hiển thị rõ dòng lỗi cho user sửa tay, không silent-fail.
- [ ] Khi trade đóng (`exit_time` có giá trị), tự động trigger tính `plan_vs_reality_deltas` nếu có `trade_plan_id`.

---

## 6. Module: Plan vs Reality

**Mục tiêu:** tính delta ngay khi trade đóng, hiển thị trong Journal.

**Logic tính (Edge Function, trigger khi `trade_executions.exit_time` được set):**
- `entry_deviation_pips` = |actual_entry - planned_entry|
- `sl_deviation_pips` = |actual_sl - planned_sl| (tại thời điểm đóng lệnh, lấy SL cuối cùng từ `trade_sl_adjustments` nếu có)
- `risk_deviation_percent` = actual_risk_percent - planned_risk_percent
- `followed_plan` = true nếu tất cả deviation trong ngưỡng cấu hình được (Phase 1 hardcode: entry lệch <5 pip, risk lệch <0.2%, không có SL adjustment nào)

**Màn hình Journal:** danh sách trade, mỗi item hiển thị badge "Theo plan" / "Lệch plan" (dùng `followed_plan`), tap vào xem chi tiết Planned vs Actual side-by-side.

**Acceptance criteria:**
- [ ] Delta được tính tự động, không cần user bấm nút.
- [ ] Test case cụ thể: Plan risk 1%, Actual risk 2.5% → `risk_deviation_percent = 1.5`, `followed_plan = false`.
- [ ] Dashboard tổng: hiển thị đúng câu insight dạng "X% lệnh theo đúng plan có kết quả tốt hơn Y% lệnh lệch plan" (tính từ dữ liệu thật của user, ẩn nếu <10 lệnh vì không đủ ý nghĩa thống kê).

---

## 7. Module: Behavior Engine (rule-based, Phase 1 không cần ML)

**Chạy dạng Edge Function, trigger sau khi trade đóng + delta tính xong.**

Áp đúng bảng mapping ở mục 7, `plan1_final_v2.md` — mỗi điều kiện là 1 rule SQL/logic đơn giản, KHÔNG cần AI:

| violation_type | Điều kiện check (pseudocode) |
|---|---|
| `overconfidence_size` | `actual_risk_percent > planned_risk_percent * 1.5` |
| `revenge_trading` | lệnh trước lỗ + lệnh này mở trong <10' + direction ngược |
| `hope_trading` | `count(trade_sl_adjustments) > 2` cho lệnh này |
| `news_gambling` | *(Phase 1: bỏ qua nếu chưa có nguồn tin tức — để placeholder, không fake dữ liệu)* |
| `martingale_negative` | lot size lệnh này > lot size lệnh trước × 1.8 VÀ lệnh trước lỗ |

**Acceptance criteria:**
- [ ] Mỗi violation phát hiện được ghi đúng 1 dòng vào `rule_violations`, không duplicate.
- [ ] `news_gambling` để rõ trong code là "chưa implement — cần nguồn Economic Calendar ở Phase 3", không được giả lập dữ liệu tin tức giả.
- [ ] Có test case cho từng violation_type với dữ liệu mẫu cụ thể (ít nhất 1 test/loại).

---

## 8. Module: Discipline Score (cơ bản) + Edge Score

**Tính theo tuần (Edge Function chạy cron hoặc tính on-demand khi mở app).**

**Discipline Score (0-100), công thức Phase 1 (đơn giản, có thể tinh chỉnh sau):**
```
rule_adherence_rate = (số lệnh followed_plan=true) / (tổng số lệnh có plan) × 100
violation_penalty = min(violations_count × 5, 40)   -- trừ tối đa 40 điểm
score = clamp(rule_adherence_rate - violation_penalty, 0, 100)
```

**Edge Score:** winrate, avg R:R, total PnL — tính trực tiếp từ `trade_executions`, không liên quan Discipline.

**Hiển thị:** 2 số riêng biệt, cạnh nhau, kèm dòng giải thích ngắn (đã viết ở Onboarding, lặp lại ngắn gọn ở đây): "Điểm kỷ luật cao không đảm bảo lời."

**Tier gating (Free vs Pro — theo mục 12 plan v2):**
- Free: chỉ hiện điểm số hiện tại (tuần này), KHÔNG hiện biểu đồ xu hướng.
- Pro: hiện `discipline_score_snapshots` dạng biểu đồ 4 tuần / 12 tuần + `bad_trades_prevented_count` (đếm từ `decision_interruptions` có `user_decision = 'cancelled'` hoặc `'reduced_risk'`).

**Acceptance criteria:**
- [ ] Free user thấy đúng 1 con số, không thấy chart trend (kiểm tra UI ẩn đúng theo `subscription_tier`).
- [ ] Snapshot được tạo đúng 1 lần/tuần, không tính trùng nếu mở app nhiều lần trong tuần.
- [ ] "Tiến bộ tuần này" (theo mục 8 plan v2) hiển thị so sánh với tuần trước, tách riêng khỏi khối Auditor "khách quan lạnh lùng".

---

## 9. Module: Weekly Performance Audit (đơn giản)

**Màn hình tổng kết cuối tuần, rule-based text generation (KHÔNG cần gọi LLM ở Phase 1):**

Template có sẵn, điền số vào chỗ trống, ví dụ:
> "Tuần này bạn thực hiện {N} lệnh, {X}% theo đúng plan. Vi phạm phổ biến nhất: {top_violation_type} ({count} lần). App đã giúp bạn tránh {bad_trades_prevented} lệnh vi phạm rule của chính mình."

**Acceptance criteria:**
- [ ] Text sinh ra đúng ngữ pháp tiếng Việt tự nhiên (kiểm tra thủ công với ít nhất 5 bộ dữ liệu mẫu khác nhau, tránh câu cụt/lặp khi count=0).
- [ ] Không dùng AI model ở bước này — chỉ template + số liệu thật, để tránh chi phí API và rủi ro AI "bịa" insight sai.

---

## 10. Ngoài phạm vi code nhưng cần chuẩn bị song song

- [ ] Legal disclaimer (không phải tư vấn tài chính) — cần luật sư/tư vấn pháp lý soạn, gắn vào Onboarding + Terms.
- [ ] Chính sách bảo vệ dữ liệu cá nhân (theo Nghị định 13/2023) cho phần lưu `raw_import_payload` (có thể chứa thông tin tài khoản trading).
- [ ] Tích hợp thanh toán Momo/VNPay — cần đăng ký merchant account trước, không phải việc code thuần.

---

## 11. Định nghĩa "Xong Phase 1" (Definition of Done)

Phase 1 được coi là hoàn thành khi:
1. Toàn bộ 9 module (mục 1-9) đạt acceptance criteria tương ứng.
2. Một user mới có thể đi trọn vòng lặp: Onboarding → tạo Rule → tạo Plan → nhận Interruption đúng lúc → nhập Execution → thấy Delta → thấy Violation (nếu có) → thấy Discipline Score → thấy Weekly Audit — KHÔNG bị crash, KHÔNG có bước nào phải hỏi dev "làm gì tiếp".
3. Có ít nhất 20 test case tự động (unit/integration) cho các công thức tính toán (Lot size, Delta, Violation detection, Discipline Score) — đây là phần logic nghiệp vụ quan trọng nhất, không được để agent code tự suy diễn công thức khi không có test.