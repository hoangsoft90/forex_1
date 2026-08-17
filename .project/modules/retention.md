# Retention Layer — 9 Module (0–8)

> Spec OpenSpec: `openspec/changes/retention-layer/specs/` (đã archive → `openspec/specs/`). Nguồn gốc: `retention_layer_addendum.md`. Trạng thái: **tất cả code xong + review + 226 test** (147 → 224 đợt này, +2 fix review).

## M0 — Fix & Verify MT4/MT5 Parser (P0, gate cứng) 🟡
- **Files**: Edge Function `supabase/functions/parse-mt4/index.ts`.
- Hardening: xử lý locale decimal separator, format ngày giờ, số cột, separator khác nhau; dòng lỗi KHÔNG silent-skip → trả `errorLines[]` kèm số dòng; `raw_import_payload` lưu đầy đủ.
- **⚠️ Gate cứng cho M3**: `INSTANT_AUDIT_ENABLED` mặc định **false** (seed bảng `feature_flags`). Chỉ bật true sau khi ≥95% parse đúng trên dữ liệu THẬT (≥3 nguồn: Exness/ICMarkets/XM) + xác nhận thủ công. **Chưa có dữ liệu thật → chưa verify, gate vẫn đóng.**

## M1 — Fast Plan (P0) ✅
- **Files**: `lib/fast-plan.ts`, `(main)/new-plan.tsx` (2 mode: full + fast).
- **5 trường BẮT BUỘC hiển thị ngay**: Symbol, Direction, Entry, SL, Risk% (prefill = `max_risk_per_trade` rule, sửa được). **SL chặn cứng** (hard-block, không cảnh báo mềm — bảo vệ Risk Engine). TP là optional thật sự (lot vẫn tính đúng, R:R chỉ hiện khi có TP). Trường tùy chọn gấp gọn dưới "Chi tiết thêm".

## M2 — Today Dashboard (P0) ✅
- **Files**: `(main)/index.tsx` (route mặc định = Dashboard, Journal thành screen riêng trong nav grid), `lib/danger-zone.ts` (dùng chung M6).
- Nội dung Free đầy đủ: Discipline Score + delta (snapshot trước), Danger Zone 1 dòng (ẩn nếu <30 lệnh/pattern <5 lần), Rules active hôm nay, nút ⚡ Quick Plan → Fast Plan, card lệnh đang mở (PnL tạm tính — chưa có nguồn giá thật, ghi rõ Phase 3), user mới 0 lệnh → hướng dẫn 3 bước (không trống).
- Load: 5 query trong `Promise.all`.

## M3 — Onboarding Instant Audit (P0, có gate) ✅ (fallback active)
- **Files**: `lib/instant-audit.ts` (`isInstantAuditEnabled()` đọc bảng `feature_flags`, fallback false khi lỗi), `(onboarding)/weakness-summary.tsx` (fallback 3.3), `(onboarding)/instant-audit.tsx` (path khi flag=true), wire trong `(onboarding)/quiz.tsx`.
- **Fallback 3.3 đang active**: màn "Dự đoán điểm yếu của bạn" từ `weakness_profile` quiz — không code path nào gọi parser.
- Path flag=true (code sẵn, chưa kích hoạt): paste lịch sử → edge `parse-mt4` → **Behavior Engine hiện có** (`detectViolations`, không viết logic mới) → câu "Trong N lệnh gần đây, bạn đã revenge trade Z lần (mất khoảng $W)...". Có nút "Bỏ qua"; parse có dòng lỗi → hiện rõ số dòng + cảnh báo dữ liệu thiếu.

## M4 — Cost of Indiscipline (P1) ✅
- **Files**: `lib/cost-of-indiscipline.ts`, `components/cost-of-indiscipline-card.tsx` (dùng chung Dashboard + Weekly Audit).
- **Công thức spec**: `hypothetical_pnl` = Σ(PnL lệnh followed=true giữ nguyên) + Σ(PnL giả định tại planned_tp cho lệnh lệch plan có đủ entry/sl/tp) − `actual_pnl`. Lệnh lệch plan thiếu planned_tp → **bỏ qua** (skippedIncomplete), không suy đoán.
- Ngưỡng: ≥30 lệnh tổng VÀ ≥3 lệnh lệch plan. **Disclaimer cố định đúng nguyên văn spec, hiển thị ngay dưới con số ở MỌI nơi** (snapshot test UI).
- 🔴 Fix review: symbol ngoài `SYMBOL_PIP_CONFIG` (GBPUSD/EURJPY/USDCAD) từng CRASH Dashboard → guard `isSupportedSymbol` trả 0.
- ⚠️ Giả định cần user duyệt: "PnL giả định = đạt planned_tp" (chi phí cơ hội) — spec không ghi rõ kết cục giả định.

## M5 — Setup / Strategy Analytics (P1) ✅
- **Files**: `lib/setup-analytics.ts`, `(main)/setup-analytics.tsx` (route + nút 🧪 trong nav grid).
- Nhóm theo `setup_tag`: breakout/rejection/trend_continuation; **null + 'other' → "Chưa phân loại"** (không bị loại). Chỉ số: count, winrate %, Avg R:R (actual entry/sl/tp — thiếu TP → null, không kéo TB), Total PnL.
- Ngưỡng ≥30 lệnh đóng: dưới ngưỡng → progressText "Cần thêm N lệnh nữa (X/30)" (không ẩn hoàn toàn). `bestSetupInsight` (Pro) chỉ so sánh nhóm ≥5 lệnh.

## M6 — Personal Danger Zone (P1) ✅
- **Files**: `lib/danger-zone.ts` (2 pattern), `(main)/danger-zone.tsx` (màn chi tiết + biểu đồ top 8 giờ).
- Pattern 1: giờ trong ngày có vi phạm nhiều nhất. Pattern 2: "lệnh thứ N trong ngày" (đánh số theo `entry_time`, mỗi ngày từ 1). Ngưỡng: ≥30 lệnh đóng VÀ pattern ≥5 lần (`MIN_CLOSED_TRADES=30`, `MIN_PATTERN_OCCURRENCE=5`). Loại `is_negative=false` (adaptive_decision) không tính.
- Dashboard 1 dòng (Free) tap được → màn chi tiết. 🟡 Fix review: biểu đồ chỉ render khi ≥30 lệnh.

## M7 — Discipline Streak (P1) ✅
- **Files**: `lib/discipline-streak.ts`, card trên Today Dashboard.
- **Streak theo LỆNH** (không phải streak mở app kiểu Duolingo): đếm từ lệnh gần nhất lùi theo `entry_time` (sort tăng dần) — lệnh `followed_plan=true` VÀ không có `rule_violations`. Reset 0 ngay khi vi phạm/lệch plan. Chỉ xét lệnh đã đóng; `followed` undefined → không tính.

## M8 — Push Notification (P1) ✅
- **Files**: `lib/notification-content.ts` (tone Auditor cân bằng — banned words test), `lib/notification-manager.ts` (markDashboardSeen + permission đúng ngữ cảnh sau lần đầu thấy Dashboard, không hỏi lại), `(main)/settings.tsx` (2 Switch riêng + giờ HH:MM validate → upsert + reschedule local notifications), `configureNotificationHandler()` wire trong `(main)/_layout` (hiển thị khi app foreground), plugin `expo-notifications` trong app.json.
- 2 loại duy nhất: sáng (score hôm qua + rules hôm nay), cuối ngày (**CHỈ khi có lệnh đóng trong ngày** — ok:false nếu không).
- **Schema mới (mục 13)**: bảng `notification_preferences` (user_id PK, morning/evening enable+time, push_token) + `feature_flags` (flag_name PK, is_enabled) + seed `INSTANT_AUDIT_ENABLED=false` → **17 bảng tổng**.
- ⚠️ **CHƯA chạy SQL mục 13 trên SQL Editor** — bắt buộc trước khi dùng notification.

## Kiểm chứng đợt
- 147 → **224 test** (đợt) → **226** (sau review) · TSC 0 · lint 0 · bundle Android + web OK · OpenSpec archive `2026-08-17-retention-layer` (22 specs / 91 requirements).
- Review tìm 3 bug: 🔴 crash symbol lạ cost-of-indiscipline, 🟡 biểu đồ danger-zone <30 lệnh, 🟡 `configureNotificationHandler` không được gọi.
- **Còn treo**: SQL mục 13 chưa chạy · deploy lại edge `parse-mt4` · chờ export MT4 thật để mở gate M3.
