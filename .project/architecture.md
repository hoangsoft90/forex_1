# Architecture

## Kiến trúc tổng thể

```
┌────────────────────────────┐
│  Expo app (apps/mobile)    │
│  expo-router file-based    │
│  - (auth) (onboarding) (main)
└────────────┬───────────────┘
             │ supabase-js (anon key, RLS bảo vệ)
             ▼
┌────────────────────────────┐      ┌──────────────────────────┐
│  Supabase Postgres         │◄────►│  Edge Functions (Deno)    │
│  17 bảng + RLS             │ JWT  │  parse-mt4 (hardened M0)   │
│  + trigger adaptive GIẢM   │      │  compute-deltas           │
│  + notification_preferences│      │  detect-violations        │
│  + feature_flags (M8)      │      │  weekly-audit             │
└────────────────────────────┘      │  weekly-audit             │
                                    └──────────────────────────┘
```

- **Client gọi Supabase trực tiếp** (RLS enforce quyền theo `auth.uid()`) cho hầu hết thao tác.
- **Edge Functions** chỉ dùng cho: parse MT4 text, tính delta khi đóng lệnh, detect violations, sinh weekly audit — logic nặng/phức tạp không nên chạy client.
- **Không có server riêng**, không có state global ngoài `AuthProvider`.

## Auth & Điều hướng (`src/app/_layout.tsx`)

`useProtectedRoute()` là bộ não điều hướng (ở root layout):
1. `loading` (đang check session) → splash spinner.
2. Chưa login → `router.replace('/(auth)/login')`.
3. Login nhưng chưa đủ onboarding (`hasBalance` / `hasWeaknessProfile` / `hasRequiredRules`) → replace vào bước tương ứng.
4. Đủ hết → vào `(main)`.

**Onboarding dùng `router.replace`** (flow tuyến tính bắt buộc) → KHÔNG dùng `safeBack` ở đó (canGoBack sẽ về login → loop); dùng `router.replace('/(onboarding)/bước-trước')` trực tiếp.

**Auth state** (`src/lib/auth-context.tsx`): session + user + onboarding state + tier + subscriptionExpiresAt. `refreshProfile()` đọc `user_profiles` + đếm rule bắt buộc.

## Data model (15 bảng Phase 1 + 2 bảng đợt Retention = 17)

Nguồn chính thức: `supabase/schema.sql` (không tự đổi — đối chiếu `data_model.md`).

| Bảng | Vai trò | Ghi chú |
|---|---|---|
| `user_profiles` | balance baseline, weakness_profile (jsonb), subscription_tier/expires_at | Pro 24h ghi vào đây |
| `trading_rules` | Personal Constitution (rule + base_value + unit) | 2 rule bắt buộc: max_risk_per_trade, max_daily_loss; Free tối đa 3 |
| `rule_adaptive_conditions` | Adaptive theo ATR (condition_value, adjusted_value, direction) | **Trigger DB khóa `direction='decrease'`** — chỉ giảm risk |
| `trade_plans` | Plan trước khi vào lệnh (entry/SL/TP/risk%) | status: planned/executed/cancelled/expired |
| `trade_executions` | Lệnh thực tế (entry, SL, TP, pnl, source) | `trade_plan_id` null = out-of-plan; source enum: manual/copy_paste_mt4/mobile_widget/ea_csv/auto_sync |
| `trade_sl_adjustments` | Lịch sử dời SL | Dùng tính hope_trading + delta SL |
| `plan_vs_reality_deltas` | Delta planned vs actual (precomputed) | unique theo trade_execution_id; có user_id để filter |
| `rule_violations` | Vi phạm behavior engine | unique (execution, violation_type) |
| `decision_interruptions` | Interruption hiển thị + user_decision | user_decision: proceeded/cancelled/reduced_risk |
| `discipline_score_snapshots` | Snapshot điểm tuần (1 lần/tuần) | period_start/end |
| `edge_score_snapshots` | Snapshot edge | — |
| `accountability_circles` + `_members` | Vòng trách nhiệm (chưa có UI) | — |
| `subscriptions` | Thanh toán thật (chưa dùng — payment_provider không có 'admob') | — |
| `analytics_events` | Đo acceptance criteria (onboarding ≤3', widget ≤20s) | bổ sung theo yêu cầu user |
| `pro_unlocks` (Phase 2) | Audit mỗi lần mở Pro qua ad | ⚠️ migration chưa chạy trên SQL Editor |
| `notification_preferences` (M8) | user_id PK, morning/evening enable + time, push_token | ⚠️ SQL mục 13 chưa chạy — cần trước khi dùng notification |
| `feature_flags` (M8) | flag_name PK, is_enabled; seed `INSTANT_AUDIT_ENABLED=false` | Gate cứng Instant Audit M3 — đọc từ đây, không hardcode |

**RLS**: mọi bảng đều `enable row level security`, policy `user_id = auth.uid()` (insert/update với check). Edge functions dùng **service role key** (vượt RLS).

## Công thức nghiệp vụ (KHÔNG tự sáng tạo — đúng mvp_scope)

- **Lot size** (`risk-engine.ts`): `(Balance × Risk%) / (khoảng cách pip × pip value/lot)` — pip value theo cặp (EURUSD $10, USDJPY 1000/giá, XAUUSD $10).
- **Discipline Score** (`discipline-score.ts`): `adherence% − min(violations×5, 40)`, clamp 0–100.
- **Edge Score**: winrate + avg R:R + total PnL.
- **Delta followed_plan** (`deltas.ts`): entry < 5 pip, risk < 0.2%, không dời SL.
- **Violations** (`violations.ts`): overconfidence_size (risk > planned×1.5), revenge_trading (lỗ + <10' + ngược chiều), hope_trading (>2 lần dời SL), martingale_negative (lot > trước×1.8 + lệnh trước lỗ); news_gambling **chưa implement** (cần Economic Calendar Phase 3).
- **Interruption** (`interruption.ts`): 2 tầng evidence — <15 lệnh dùng cohort benchmark tĩnh, ≥15 lệnh dùng dữ liệu cá nhân.
- **Adaptive ATR** (`atr.ts`): `suggest = min(adjusted_value, base_value)` — không bao giờ tăng.
- **Portfolio Risk** (`portfolio-risk.ts`): tổng risk vị thế mở, ngưỡng `min(maxRiskPerTrade×3, maxDailyLoss)`; correlation = hệ số ƯỚC LƯỢNG (ghi rõ trong UI).
- **ATR hiện tại**: giá trị ƯỚC LƯỢNG theo symbol (XAUUSD 24/15, USDJPY 0.9/0.8, EURUSD 0.0018/0.0012) — chưa phải dữ liệu thật (Phase 3 cần nguồn giá).
- **Cost of Indiscipline** (`cost-of-indiscipline.ts`, M4): `hypothetical_pnl` (lệnh followed=true giữ PnL thật + lệnh lệch plan có đủ plan → PnL giả định tại planned_tp) − `actual_pnl`; ngưỡng ≥30 lệnh + ≥3 lệch plan; lệnh lệch plan thiếu planned_tp → BỎ (không suy đoán); symbol ngoài config → 0 (guard `isSupportedSymbol`, không crash).
- **Setup Analytics** (`setup-analytics.ts`, M5): winrate/avg R:R/PnL theo `setup_tag`; null+'other' → "Chưa phân loại"; ngưỡng 30 lệnh.
- **Danger Zone** (`danger-zone.ts`, M2+M6): pattern giờ + "lệnh thứ N trong ngày" (theo entry_time); ngưỡng 30 lệnh + pattern ≥5 lần (`MIN_CLOSED_TRADES`/`MIN_PATTERN_OCCURRENCE`); loại `is_negative=false` không tính.
- **Discipline Streak** (`discipline-streak.ts`, M7): lệnh liên tiếp gần nhất followed=true + không vi phạm, sort theo entry_time; reset 0 khi vi phạm/lệch plan.
- **Instant Audit** (`instant-audit.ts`, M3): `isInstantAuditEnabled()` đọc `feature_flags` (fallback false); flag=true → parse-mt4 → `detectViolations` (Behavior Engine cũ, không logic mới).
- **Notification content** (`notification-content.ts`, M8): 2 loại (sáng/evening), tone Auditor cân bằng — banned words test; evening ok:false nếu không có lệnh đóng.

## Edge Functions (đã deploy, JWT required qua config.toml `verify_jwt=true`)

| Function | Input | Output | Khi nào gọi |
|---|---|---|---|
| `parse-mt4` | `{ text }` (paste Account History) | `{ imported, errorLines[], message }` | paste-mt4 screen |
| `compute-deltas` | `{ executionId }` | delta + upsert `plan_vs_reality_deltas` | sau khi widget lưu lệnh có exit_time + plan (fire-and-forget) |
| `detect-violations` | `{ executionId }` | detected types + insert `rule_violations` (không duplicate) | (chưa gọi từ client — có thể gọi sau khi đóng lệnh) |
| `weekly-audit` | — (đọc DB theo JWT) | template tiếng Việt rule-based | (chưa gọi từ client — UI tự sinh qua `weekly-audit.ts` thay thế) |

> Lưu ý deploy: chạy từ **root repo** (`supabase functions deploy <tên>`) — chạy từ trong `supabase/` sẽ nhân đôi path thành `supabase/supabase/functions/...`.

## Platform split (Metro tự chọn theo extension)

- `*.native.ts(x)` → Android/iOS · `*.ts(x)` → web (stub).
- `admob.native.ts` + `admob.ts` (web stub: trả lỗi "chưa cấu hình").
- `ad-banner.native.tsx` (BannerAd thật) + `ad-banner.tsx` (web: null).
- `tradingview-chart.native.tsx` (WebView) + `tradingview-chart.tsx` (web: iframe).
