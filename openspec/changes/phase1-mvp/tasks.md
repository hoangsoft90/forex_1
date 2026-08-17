## 1. Module 0 — Setup hạ tầng

- [x] 1.1 Scaffold Expo app (SDK 57, TypeScript, expo-router) tại `apps/mobile/`, cài `@supabase/supabase-js` + storage adapter
- [x] 1.2 Viết `src/lib/supabase.ts` (client, đọc `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`) + `.env.example`
- [x] 1.3 Viết `supabase/schema.sql` đầy đủ từ data_model.md + bảng `analytics_events` + RLS + indexes
- [x] 1.4 Viết script verify kết nối Supabase (`scripts/verify-connection.mjs`)
- [x] 1.5 Báo cáo Module 0 cho user, chờ xác nhận trước khi code module tiếp theo

## 2. Module 1 — Onboarding

- [x] 2.1 Màn hình auth email+password (Supabase Auth) + tạo `user_profiles` sau đăng ký
- [x] 2.2 Màn hình nhập `account_balance_baseline` + ghi `onboarding_started`
- [x] 2.3 Quiz 5-7 câu single-select → lưu `weakness_profile` jsonb
- [x] 2.4 Màn hình giải thích Discipline vs Edge Score (bắt buộc "Đã hiểu") + ghi `onboarding_completed`
- [x] 2.5 Test luồng onboarding (AC: ≤3 phút, weakness_profile đúng format, không skip giải thích)

## 3. Module 2 — Personal Trading Constitution

- [x] 3.1 Màn hình tạo 2 rule bắt buộc template (`max_risk_per_trade`, `max_daily_loss`)
- [x] 3.2 Màn hình thêm rule tùy chọn + giới hạn Free = 3 rules
- [x] 3.3 Chặn đi tiếp Trade Plan nếu thiếu 2 rule bắt buộc; Settings sửa rule (lưu `updated_at`)
- [x] 3.4 Test AC module 2

## 4. Module 3 — Trade Plan

- [x] 4.1 Form tạo Trade Plan map đúng `trade_plans` (symbol, direction, thesis, setup_tag, entry, sl, tp, risk%, invalidation, confidence)
- [x] 4.2 Risk Engine: `src/lib/risk-engine.ts` tính lot size (chuẩn forex, pip value EURUSD/XAUUSD/USDJPY), R:R, số tiền risk
- [x] 4.3 Cảnh báo Risk% > `max_risk_per_trade` ngay tại form
- [x] 4.4 Route "Tạo lệnh không có Plan" qua màn hình xác nhận phụ
- [x] 4.5 Unit test Risk Engine (≥3 cặp tiền) + test AC module 3

## 5. Module 4 — Decision Interruption

- [x] 5.1 Trigger rule-based: over_risk, max_daily_loss, revenge_pattern (check trước khi xác nhận lệnh)
- [x] 5.2 Evidence 2 tầng: cohort_benchmark (<15 lệnh, hardcode) vs personal (≥15 lệnh, query thật)
- [x] 5.3 UI interruption (con số cụ thể + "Tiếp tục"/"Quay lại chỉnh Plan") + ghi `decision_interruptions`
- [x] 5.4 Test 2 test case mvp_scope (20 lệnh → $420 thật; 5 lệnh → cohort)
- [x] 5.5 Unit test logic trigger/evidence

## 6. Module 5 — Execution Capture

- [x] 6.1 Mobile Widget nhập nhanh (<20s): symbol, direction, lot, entry, sl, tp + auto-suggest link plan
- [x] 6.2 Ghi analytics `execution_widget_opened`/`execution_saved`
- [x] 6.3 Edge Function `parse-mt4`: parser copy-paste MT4 (format giả định, comment rõ chưa verify) + lưu `raw_import_payload` + báo dòng lỗi
- [x] 6.4 Tạo 3-5 bộ test data giả lập format MT4 (desktop + mobile) + test parser
- [x] 6.5 Auto-trigger tính delta khi trade đóng (exit_time set)
- [x] 6.6 Test AC module 5

## 7. Module 6 — Plan vs Reality

- [x] 7.1 Edge Function `compute-deltas`: entry_deviation_pips, sl_deviation_pips (SL cuối từ adjustments), risk_deviation_percent
- [x] 7.2 `followed_plan` với ngưỡng hardcode Phase 1 (entry <5 pip, risk <0.2%, không SL adjustment)
- [x] 7.3 Journal hiển thị badge "Theo plan"/"Lệch plan" + màn hình chi tiết Planned vs Actual
- [x] 7.4 Insight dashboard "X% theo plan tốt hơn Y% lệch plan" (ẩn nếu <10 lệnh)
- [x] 7.5 Unit test delta (test case risk 1%→2.5%) + test AC module 6

## 8. Module 7 — Behavior Engine

- [x] 8.1 Edge Function `detect-violations`: overconfidence_size, revenge_trading, hope_trading, martingale_negative (đúng mapping mục 7 plan v2)
- [x] 8.2 `news_gambling` placeholder rõ "chưa implement — cần Economic Calendar Phase 3"
- [x] 8.3 Ghi `rule_violations` không duplicate
- [x] 8.4 Unit test ≥1 test/violation_type + test AC module 7

## 9. Module 8 — Discipline Score + Edge Score

- [x] 9.1 `src/lib/discipline-score.ts`: công thức Phase 1 (adherence - penalty, clamp 0-100)
- [x] 9.2 Edge Score: winrate, avg R:R, total PnL từ `trade_executions`
- [x] 9.3 Snapshot 1 lần/tuần (không tính trùng) vào `discipline_score_snapshots`/`edge_score_snapshots`
- [x] 9.4 Tier gating: Free chỉ số hiện tại (ẩn trend); Pro trend 4/12 tuần + `bad_trades_prevented_count`
- [x] 9.5 Hiển thị 2 trục điểm + giải thích + "Tiến bộ tuần này"
- [x] 9.6 Unit test công thức score + test AC module 8

## 10. Module 9 — Weekly Performance Audit

- [x] 10.1 Edge Function `weekly-audit`: template + số liệu thật (không LLM), xử lý count=0
- [x] 10.2 Kiểm tra ngữ pháp tiếng Việt với ≥5 bộ dữ liệu mẫu
- [x] 10.3 Test AC module 9 + tổng hợp ≥20 test case tự động (mục 11 mvp_scope)
