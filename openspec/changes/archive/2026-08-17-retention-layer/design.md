# Design — Retention Layer (M0-M8)

## Kiến trúc tổng thể

Tất cả module tính runtime trên dữ liệu đã có (không cache bảng mới trừ notification) — đúng spec: "Không cần bảng mới cho Today Dashboard, Cost of Indiscipline, Setup Analytics, Danger Zone, Streak — tránh phình schema".

```
Supabase (bảng có sẵn + 2 bảng mới)
  ├─ trade_executions / trade_plans / plan_vs_reality_deltas / rule_violations / discipline_score_snapshots
  ├─ notification_preferences (MỚI) — cấu hình từng loại + giờ + push_token
  └─ feature_flags (MỚI) — seed INSTANT_AUDIT_ENABLED=false (gate cứng M3)

App (expo-router)
  ├─ lib thuần (testable, không phụ thuộc UI):
  │   mt4-parser (M0) · fast-plan (M1) · instant-audit (M3) · cost-of-indiscipline (M4)
  │   setup-analytics (M5) · danger-zone (M6) · discipline-streak (M7) · notification-content (M8) · notification-manager (M8)
  ├─ screens: (main)/index = Today Dashboard · new-plan = Fast Plan · setup-analytics · danger-zone
  │            (onboarding)/weakness-summary (fallback 3.3) · (onboarding)/instant-audit (khi flag bật)
  └─ components: cost-of-indiscipline-card (dùng chung Dashboard + Weekly Audit)
```

## Quyết định quan trọng

### 1. Ngưỡng thống nhất 30 lệnh — 1 nơi định nghĩa mỗi module
- M4: `MIN_TRADES_FOR_COST = 30`, `MIN_DEVIATED_FOR_COST = 3`
- M5: `MIN_TRADES_FOR_SETUP_STATS = 30`
- M6: `MIN_CLOSED_TRADES = 30`, `MIN_PATTERN_OCCURRENCE = 5`
Mỗi lib export hằng số riêng (không dùng chung 1 hằng để tránh thay đổi lan), test assert giá trị cố định.

### 2. Gate cứng M3 qua DB, không hardcode
`INSTANT_AUDIT_ENABLED` đọc từ bảng `feature_flags` (seed false). Lib `instant-audit.ts` export `INSTANT_AUDIT_ENABLED_FALLBACK = false` + async `isInstantAuditEnabled()` — fallback false khi lỗi. Quiz điều hướng theo flag; màn instant-audit có guard kép (kiểm tra lại khi mount). Chỉ bật khi Module 0 đạt ≥95% parse thật + user xác nhận thủ công.

### 3. Cost of Indiscipline — giả định "lệnh theo plan đạt TP"
Spec ghi "PnL giả định dựa trên planned_entry/planned_sl/planned_tp" nhưng không nói kết cục. Implement: giả định lệnh theo đúng plan đạt `planned_tp` (chi phí cơ hội của vô kỷ luật). ⚠️ Đã báo user — cần xác nhận; đổi 1 hàm `hypotheticalPnlAtTp` là xong.
- Lệnh lệch plan thiếu planned_tp (hoặc entry/sl) → BỎ QUA khỏi hypothetical (`skippedIncomplete`), không gán giá trị suy đoán (AC M4).
- Symbol ngoài 3 cặp hỗ trợ (GBPUSD import MT4) → `isSupportedSymbol` guard trả 0 (tránh crash `pipValuePerLot`).

### 4. Tone Auditor cân bằng (plan1_final_v2 mục 8)
Notification content + danger zone summary + weekly audit dùng tông trung tính-khích lệ. Test `notification-content` có banned words list ('vi phạm rồi', 'lại thua', 'sao bạn'...). M3 audit câu: "Trong N lệnh gần đây, bạn đã revenge Z lần (mất khoảng $W)" — số liệu, không phán xét.

### 5. Streak theo LỆNH (M7) — không phải streak mở app
`computeDisciplineStreak`: sort theo `entry_time` tăng dần → duyệt từ lệnh gần nhất lùi dần, đếm khi `followed_plan === true && !violated`, dừng khi gặp lệch plan/vi phạm. Lệnh không có delta → không tính (reset nếu ở cuối).

### 6. Opt-in notification đúng ngữ cảnh (M8)
`markDashboardSeen()` gọi ở `(main)/index` → `requestNotificationPermissionIfEligible()` chỉ hỏi khi (1) đã thấy dashboard ≥1 lần VÀ (2) chưa từng hỏi (AsyncStorage flag). Không hỏi lúc mở app lần đầu (onboarding xong mới thấy dashboard).

### 7. Local notification (M8) — không server push
expo-notifications local scheduling theo giờ cấu hình (DAILY trigger). Evening review: schedule chỉ khi tại thời điểm lưu settings có lệnh đóng hôm nay. Remote push (cả khi app đóng) cần edge function + push token — ngoài Phase này (cột `push_token` đã có sẵn).

## Schema bổ sung (data_model.md mục 13 — không sửa bảng cũ)

```sql
create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_brief_enabled boolean default true,
  morning_brief_time time default '08:00',
  evening_review_enabled boolean default true,
  evening_review_time time default '21:00',
  push_token text,
  updated_at timestamptz default now()
);
create table feature_flags (
  flag_name text primary key,
  is_enabled boolean not null default false,
  updated_at timestamptz default now()
);
-- Seed: ('INSTANT_AUDIT_ENABLED', false)
```
RLS: notification_preferences select/insert/update own; feature_flags select all (đọc-only).

## Luồng dữ liệu chính

**Today Dashboard (M2):** 8 query song song (snapshots, rules, open, closed, violations, closedFull, deltas, plans) → tính dangerZone (M6), costResult (M4), streak (M7) → render. User mới (0 lệnh) thấy hướng dẫn + Quick Plan — không trống.

**Fast Plan (M1):** mount → loadConfig (balance + max_risk rule + adaptive) + prefill Risk% → validate 5 trường chặn cứng → Risk Engine real-time → interruption check (Phase 1) → insert trade_plans → `fast_plan_saved` → safeBack.

**Instant Audit (M3, khi bật):** paste → edge `parse-mt4` (import + errorLines) → query executions vừa import → `computeInstantAudit` (reuse `detectViolations` — không logic mới) → câu audit. Dòng lỗi → hiện rõ + cảnh báo.

## Test strategy

- Mỗi lib thuần có test riêng theo AC (không phụ thuộc UI/DB):
  - M1 `fast-plan`: 6 case validate chặn SL + 3 case missingOptionalDetails
  - M3 `instant-audit`: gate fallback false + listWeaknesses + audit (revenge/martingale/sort theo entry_time)
  - M4 `cost-of-indiscipline`: 35 lệnh/5 lệch plan verify công thức + disclaimer nguyên văn + ngưỡng + symbol lạ không crash + `hypotheticalPnlAtTp` buy/sell
  - M5 `setup-analytics`: 3 setup_tag + null/'other' gom + ngưỡng + insight Pro
  - M6 `danger-zone`: 25 lệnh ẩn / 36 lệnh pattern 6 lần hiện (cả 2 pattern) + summary số liệu thật
  - M7 `discipline-streak`: 8 lệnh → 8; lệnh 9 vi phạm/lệch → 0; theo entry_time không theo thứ tự nhập
  - M8 `notification-content`: 5 bộ dữ liệu + banned words + evening không lệnh → ok:false
- UI snapshot (M4): `cost-of-indiscipline-card` — disclaimer hiện khi có con số, ẩn khi chưa đủ ngưỡng (react-test-renderer, assert text thuần để tránh nhạy cảm style)
- jest.setup.js: mock AsyncStorage toàn cục (nhiều lib import supabase → AsyncStorage)
- Nguyên tắc: không giảm test cũ (147 Phase 1 → 226 sau đợt)
