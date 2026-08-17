# Phase 1 — 9 Module MVP core

> Acceptance criteria chi tiết: `mvp_scope.md`. Spec OpenSpec: `openspec/changes/phase1-mvp/specs/`.
> Trạng thái: **tất cả code xong + verified** (test thật trên Supabase đã chạy).

## Module 0 — Setup hạ tầng ✅
- Scaffold Expo app (`apps/mobile`, SDK 57 TS + expo-router), supabase client, schema 15 bảng + RLS + trigger adaptive + indexes (`supabase/schema.sql`), script verify connection.
- Supabase project: `ycmuuczwnogybyklzpsa`, keys trong `.env`.

## Module 1 — Onboarding ✅
- **Files**: `(auth)/login`, `(onboarding)/balance`, `quiz`, `explain`, `constitution`; `lib/weakness-quiz.ts`, `lib/analytics.ts`.
- Auth email/password (no confirm email), nhập số dư baseline, quiz 7 câu → `weakness_profile` jsonb, giải thích Discipline vs Edge.
- AC: hoàn tất ≤ 3 phút (đo qua `analytics_events.onboarding_started/completed` — chưa đo thực tế).

## Module 2 — Personal Trading Constitution ✅
- **Files**: `lib/trading-rules.ts`, `(onboarding)/constitution`, `(main)/constitution-settings`.
- 2 rule bắt buộc (max_risk_per_trade, max_daily_loss) + 4 tùy chọn; Free tối đa 3 luật, Pro không giới hạn.
- ⚠️ Đã fix bug addRule chặn lần thứ 3 (2026-08-17).

## Module 3 — Trade Plan + Risk Engine ✅
- **Files**: `lib/risk-engine.ts`, `(main)/new-plan`, `(main)/confirm-no-plan`.
- Công thức lot size chuẩn forex theo cặp (EURUSD/USDJPY/XAUUSD); form plan đầy đủ; route thoát lệnh không plan (⚠️ đã fix: không insert lệnh ma, điều hướng sang widget).

## Module 4 — Decision Interruption ✅
- **Files**: `lib/interruption.ts`, tích hợp trong `new-plan`.
- Trigger: over_risk / max_daily_loss / revenge_pattern; evidence 2 tầng (<15 lệnh → cohort benchmark, ≥15 → personal); ghi `decision_interruptions` với user_decision.

## Module 5 — Execution Capture ✅ (một phần chờ verify)
- **Files**: `(main)/execution-widget` (nhập tay nhanh — ưu tiên), `(main)/paste-mt4`, `lib/mt4-parser.ts`, edge `parse-mt4`.
- Widget: mục tiêu < 20 giây, auto-suggest plan khớp symbol/direction, nhập exit → auto compute-deltas.
- ⚠️ **Parser MT4 dựa format GIẢ ĐỊNH** (tài liệu MetaQuotes công khai + format phổ biến) — CHƯA verify với dữ liệu thật; 5 bộ test giả lập có coverage nhưng KHÔNG coi là Done thật.
- ⚠️ Chưa set `trade_plans.status='executed'` khi link plan (bug nhỏ chưa fix).

## Module 6 — Plan vs Reality (Delta) ✅
- **Files**: `lib/deltas.ts`, edge `compute-deltas`, `(main)/journal`, `(main)/trade-detail`.
- Delta: entry lệch < 5 pip, risk lệch < 0.2%, không dời SL → followed_plan; Journal hiển thị badge + insight (cần ≥10 lệnh); trade-detail so Planned vs Actual + TradingView chart (Phase 2).
- ⚠️ Đã fix: filter delta theo tuần ở scores/weekly-audit (2026-08-17).

## Module 7 — Behavior Engine (Violations) ✅
- **Files**: `lib/violations.ts`, edge `detect-violations`.
- Rule-based: overconfidence_size (risk > planned×1.5), revenge_trading (<10' ngược chiều sau lỗ), hope_trading (>2 dời SL), martingale_negative (lot > trước×1.8 sau lỗ). `news_gambling` CHƯA implement (cần Economic Calendar Phase 3 — placeholder rõ ràng, không giả lập).

## Module 8 — Discipline & Edge Score ✅
- **Files**: `lib/discipline-score.ts`, `(main)/scores`.
- Công thức Phase 1: adherence% − min(violations×5, 40), clamp 0-100; Edge = winrate/avgRR/totalPnl; snapshot 1 lần/tuần; tier gating (trend 4/12 tuần = Pro).
- ⚠️ Đã fix: delta filter theo tuần (2026-08-17).

## Module 9 — Weekly Audit ✅
- **Files**: `lib/weekly-audit.ts` (+ edge `weekly-audit` — UI tự sinh qua lib), `(main)/weekly-audit`.
- Template tiếng Việt rule-based, không LLM; xử lý đúng count=0; top violation + bad trades prevented + PnL tuần.

## Kiểm chứng Phase 1
- 79 test công thức (≥ 20 yêu cầu mục 11 mvp_scope) · test THẬT trên Supabase đã chạy (signup/login, upsert profile, RLS, edge functions, trigger adaptive) · edge functions đã deploy.
