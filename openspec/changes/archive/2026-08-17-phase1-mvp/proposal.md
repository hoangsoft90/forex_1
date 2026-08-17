## Why

Trader trung cấp (đặc biệt tại VN, giao dịch MT4/MT5 trên mobile) không có công cụ nào đo được khoảng cách giữa **kế hoạch họ đặt ra** và **hành vi thực tế** — các app journal hiện tại chỉ ghi PnL, không phát hiện vi phạm luật cá nhân hay tính điểm kỷ luật. Trading Discipline OS giải quyết nỗi đau "cháy tài khoản vì thiếu kỷ luật" bằng một vòng lặp hành vi hoàn chỉnh: Onboarding → Rules → Plan → Interruption → Execution Capture → Plan vs Reality → Discipline Score → Weekly Audit.

Phase 1 cần build đủ MỘT vòng lặp hoàn chỉnh (theo mvp_scope.md), không phải tính năng rời rạc — để user thấy "aha moment" (ví dụ "61% lệnh thua liên quan đến việc thay đổi plan giữa chừng") và giữ chân họ trước khi mở rộng Phase 2/3.

## What Changes

- **Module 0 — Setup hạ tầng:** Scaffold Expo (React Native) app + Supabase client, migration schema đầy đủ từ `data_model.md` (kèm bảng bổ sung `analytics_events`), env config, script verify kết nối.
- **Module 1 — Onboarding:** Auth email+password (Supabase built-in), nhập `account_balance_baseline`, quiz 5-7 câu → `weakness_profile` jsonb, giải thích bắt buộc Discipline vs Edge Score. Ghi analytics `onboarding_started/completed`.
- **Module 2 — Personal Trading Constitution:** 2 rule bắt buộc template (`max_risk_per_trade` 1%, `max_daily_loss` 3%) + rule tùy chọn; giới hạn Free = 3 rules; sửa rule trong Settings.
- **Module 3 — Trade Plan:** Form tạo plan (map đúng `trade_plans`), Risk Engine tính lot size + R:R + số tiền risk tự động, cảnh báo vượt `max_risk_per_trade` ngay tại form, route "tạo lệnh không có Plan" có xác nhận riêng.
- **Module 4 — Decision Interruption:** Trigger rule-based (`over_risk`, `max_daily_loss`, `revenge_pattern`), 2 tầng evidence (cohort_benchmark khi <15 lệnh, personal khi ≥15), UI hiển thị con số cụ thể + 2 lựa chọn, ghi `decision_interruptions`.
- **Module 5 — Execution Capture:** Mobile Widget nhập nhanh (<20s) + Copy-Paste MT4/MT5 parser (Edge Function, format giả định chưa verify dữ liệu thật, lưu `raw_import_payload`), auto-link plan khớp Symbol+Direction, auto-trigger delta khi trade đóng.
- **Module 6 — Plan vs Reality:** Edge Function tính delta (entry/sl/risk deviation), `followed_plan` với ngưỡng hardcode (entry <5 pip, risk <0.2%, không SL adjustment), Journal hiển thị badge "Theo plan"/"Lệch plan", insight dashboard.
- **Module 7 — Behavior Engine:** Rule-based violation detection (`overconfidence_size`, `revenge_trading`, `hope_trading`, `martingale_negative`; `news_gambling` để placeholder), ghi `rule_violations` không duplicate.
- **Module 8 — Discipline Score + Edge Score:** Công thức Phase 1 (`rule_adherence_rate - violation_penalty`, clamp 0-100), snapshot 1 lần/tuần, tier gating Free (chỉ số hiện tại) vs Pro (trend 4/12 tuần + `bad_trades_prevented_count`).
- **Module 9 — Weekly Performance Audit:** Rule-based text generation bằng template (không LLM), tiếng Việt tự nhiên, xử lý count=0.

## Capabilities

### New Capabilities

- `onboarding`: Đăng ký/đăng nhập email+password, thu thập balance baseline + weakness profile, giải thích Discipline vs Edge không skip được.
- `trading-constitution`: CRUD personal rules (2 rule bắt buộc + tùy chọn), giới hạn theo tier, lịch sử sửa qua `updated_at`.
- `trade-planning`: Tạo/quản lý trade plan, Risk Engine (lot size, R:R, risk amount), cảnh báo vượt risk rule, route out-of-plan có xác nhận.
- `decision-interruption`: Trigger rule-based + evidence 2 tầng (cohort/personal), ghi log `decision_interruptions`.
- `execution-capture`: Mobile Widget nhập nhanh + Copy-Paste MT4/MT5 parser (Edge Function), auto-link plan, `raw_import_payload`, auto-trigger delta.
- `plan-vs-reality`: Tính delta + `followed_plan` tự động, Journal + insight dashboard.
- `behavior-engine`: Rule-based violation detection, ghi `rule_violations` không duplicate.
- `discipline-score`: Công thức điểm kỷ luật + edge score, snapshot tuần, tier gating, "Tiến bộ tuần này".
- `weekly-audit`: Text generation từ template + số liệu thật, không dùng LLM.

### Modified Capabilities

- Không có — đây là dự án mới, chưa có spec nào tồn tại (`openspec/specs/` trống).

## Impact

- **Code mới:** `apps/mobile/` (Expo SDK 57, TypeScript, expo-router) — toàn bộ UI + supabase client.
- **Backend:** Supabase project mới (user tự tạo), migration `supabase/schema.sql` chạy từ `data_model.md` + bảng `analytics_events`; Edge Functions cho modules 5-7 (Deno/TypeScript) — deploy sau khi có keys.
- **Schema:** Không tự sửa cấu trúc bảng trong `data_model.md`; chỉ THÊM bảng `analytics_events` (đã được user chốt).
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server/edge function). `.env` không commit.
- **Không dùng:** CLI Supabase local, PostHog/dịch vụ analytics ngoài, LLM/AI model, MT4 auto-sync, Economic Calendar, Accountability Circle UI (giữ schema).
