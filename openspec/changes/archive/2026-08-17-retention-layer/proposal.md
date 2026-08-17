## Why

Phase 1 + Phase 2 đã build xong vòng lặp hành vi hoàn chỉnh (Onboarding → Rules → Plan → Interruption → Execution → Delta → Score → Weekly Audit) + monetization (AdMob) + chart + portfolio risk + adaptive rules. Đợt này bổ sung **Retention Layer** (theo `retention_layer_addendum.md`): 9 module (0-8) tập trung giữ chân user dùng app hàng ngày — dashboard hữu ích, fast plan, analytics cá nhân hóa, notification đúng lúc. Tất cả tuân thủ triết lý "Auditor cân bằng" (plan1_final_v2 mục 8-9): tông trung tính-khích lệ, không phán xét; tách Discipline (tuân thủ) vs Edge (chiến lược).

**Ràng buộc bất biến (không thương lượng):**
1. Fast Plan PHẢI giữ SL bắt buộc (5 trường: Symbol, Direction, Entry, SL, Risk%) — bảo vệ công thức lot size Phase 1.
2. Mọi pattern thống kê (Setup Analytics, Danger Zone, Cost of Indiscipline) PHẢI áp ngưỡng ≥30 lệnh đóng — không hạ để "demo đẹp".
3. Cost of Indiscipline PHẢI hiển thị disclaimer cố định đúng nguyên văn ở MỌI nơi có con số.
4. Free tier giữ đúng bảng gating từng module — không âm thầm chuyển Pro-only.
5. Module 3 (Instant Audit) là GATE CỨNG: chỉ bật khi Module 0 đạt ≥95% parse dữ liệu MT4 THẬT + xác nhận thủ công; nếu không → fallback 3.3 (weakness_profile quiz) vĩnh viễn.

## What Changes

- **M0 — Fix & Verify MT4/MT5 Parser:** hardening parser (lib + edge function sync 1:1): locale-aware số (comma decimal EU `1.100,50` / period), đa format ngày giờ (YYYY.MM.DD HH:MM / DD.MM.YYYY HH:MM / ISO), deal-based in/out (2 dòng = 1 lệnh đóng, close từ out-deal), skip balance/deposit/withdrawal có đếm rõ, thêm alias cột (Position ID, Volume, Ticket). `raw_import_payload` giữ nguyên. **CHƯA verify với data thật (gate cứng M3 giữ false).**
- **M1 — Fast Plan:** form rút gọn 5 trường bắt buộc hiển thị ngay (Symbol, Direction, Entry, SL, Risk% — Risk% prefill từ `max_risk_per_trade`, sửa được). SL chặn cứng (không cảnh báo mềm). TP/Thesis/Setup/Invalidation/Confidence gấp dưới "Chi tiết thêm". TP optional thật sự (R:R chỉ hiện khi có TP). Nhắc nhẹ (không chặn) điền bổ sung ở màn chi tiết lệnh. Analytics `fast_plan_opened/saved`.
- **M2 — Today Dashboard:** route mặc định = dashboard (thay Journal): Discipline Score + delta vs tuần trước, Danger Zone 1 dòng (ẩn <30 lệnh), Rules active, lệnh đang mở, Quick Plan nổi bật, hướng dẫn user mới. Free đầy đủ, không gate.
- **M3 — Onboarding Instant Audit (gate cứng):** `INSTANT_AUDIT_ENABLED` đọc từ bảng `feature_flags` (seed false). Khi bật: bước dán lịch sử tùy chọn sau quiz → parse-mt4 → Behavior Engine hiện có → "Trong N lệnh, revenge Z lần (mất ~$W)". Có Bỏ qua; dòng lỗi → hiện rõ + cảnh báo data thiếu. Fallback 3.3 (mặc định): màn "Dự đoán điểm yếu của bạn" từ weakness_profile quiz, không gọi parser.
- **M4 — Cost of Indiscipline:** công thức spec: hypothetical (lệnh theo plan giữ PnL thật; lệnh lệch plan thay bằng PnL tại planned_tp nếu đủ entry/sl/tp, thiếu → bỏ qua) − actual. Ngưỡng ≥30 lệnh + ≥3 lệch plan. Disclaimer cố định đúng nguyên văn ở MỌI nơi có con số (Dashboard + Weekly Audit + snapshot test UI). Free 1 dòng + disclaimer.
- **M5 — Setup/Strategy Analytics:** nhóm lệnh theo setup_tag (Breakout/Rejection/Trend Continuation; null + 'other' → "Chưa phân loại") → Winrate, Avg R:R, Total PnL. Ngưỡng ≥30 lệnh (dưới → "Cần thêm N lệnh nữa (X/30)"). Free bảng, Pro gợi ý câu (`bestSetupInsight`, nhóm ≥5 lệnh).
- **M6 — Personal Danger Zone:** 2 pattern: giờ trong ngày + lệnh thứ N trong ngày. Ngưỡng ≥30 lệnh + pattern ≥5 lần. Dashboard 1 dòng (Free); màn chi tiết: nhiều pattern + biểu đồ phân bố vi phạm theo giờ.
- **M7 — Discipline Streak:** streak THEO LỆNH (không phải streak mở app): lệnh liên tiếp gần nhất followed_plan=true + không vi phạm; reset 0 khi vi phạm/lệch plan; tính theo `entry_time` (không theo thứ tự nhập). Hiển thị Dashboard (Free).
- **M8 — Push Notification:** 2 loại duy nhất: morning brief (mặc định 08:00, score hôm qua + rules hôm nay) + evening review (mặc định 21:00, CHỈ khi có lệnh đóng trong ngày). Tone Auditor cân bằng (trung tính-khích lệ, không phán xét — test banned words). Opt-in đúng ngữ cảnh (sau lần đầu thấy Dashboard). Settings bật/tắt TỪNG loại + giờ HH:MM. Bảng mới `notification_preferences` + `feature_flags`.

## Capabilities

### New Capabilities

- `fast-plan`: Form 5 trường bắt buộc, SL chặn cứng, TP optional, Risk% prefill từ rule, analytics đo ≤15s.
- `today-dashboard`: Route mặc định, score + delta, danger zone 1 dòng, rules active, lệnh mở, Quick Plan, hướng dẫn user mới.
- `onboarding-instant-audit`: Gate cứng qua feature_flags; fallback weakness_summary; audit từ Behavior Engine khi bật.
- `cost-of-indiscipline`: hypothetical − actual theo spec; ngưỡng 30/3; disclaimer cố định bắt buộc.
- `setup-analytics`: Bảng winrate/R:R/PnL theo setup; ngưỡng 30; gợi ý Pro.
- `danger-zone`: 2 pattern (giờ + lệnh thứ N); ngưỡng 30/5; biểu đồ theo giờ.
- `discipline-streak`: Streak theo lệnh theo entry_time, reset khi vi phạm/lệch plan.
- `push-notification`: 2 loại, tone cân bằng, opt-in đúng ngữ cảnh, settings tắt từng loại.

### Modified Capabilities

- `execution-capture` (Phase 1): parser MT4 harden (locale, deal-based, skip balance) — lib + edge function sync.
- `trade-planning` (Phase 1): form plan thành Fast Plan 5 trường + chi tiết gấp gọn.
- `discipline-score` (Phase 1): dashboard dùng snapshots để hiển thị score + delta tuần.
- `weekly-audit` (Phase 1): thêm Cost of Indiscipline card (theo tuần, ngưỡng 30/3).
