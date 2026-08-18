# State — Tiến độ, Todo & Quyết định

> Cập nhật liên tục. Chi tiết nhật ký từng ngày ở `working.md` (root).

## Tiến độ tổng

| Giai đoạn | Trạng thái | Ghi chú |
|---|---|---|
| Phase 1 — 9 module MVP core | ✅ Code xong + verified | 79 test; schema đã chạy trên SQL Editor; edge functions đã deploy |
| Phase 2 — 4 module (AdMob/Pro, Chart, Portfolio Risk, Adaptive) | ✅ Code xong | 50 test mới; tổng 147 |
| GitHub Actions debug APK | ✅ Workflow + đã build | run đầu `#32009848642` |
| Navigation review + fix | ✅ 6/6 yêu cầu | safeBack, +not-found, trade-detail edge case |
| Code review toàn diện | ✅ Đã review + fix 4 bug chính | 4 bug nhỏ còn lại (dưới) |
| targetSdk 36 + Android SDK + cooldown ads | ✅ Xong | — |
| **Retention Layer (9 module 0–8)** | ✅ Code xong + review | 147 → 224 test, review thêm +2 = 226 |
| OpenSpec sync đợt Retention | ✅ Archived `2026-08-17-retention-layer` | 22 specs / 91 requirements |
| `can_lam.md` (việc user cần làm) | ✅ Đã tạo | 12 việc phân ưu tiên |
| **Đa ngôn ngữ (app-i18n)** | 🔄 Đang triển khai — UI + nội dung động + edge xong, còn verify/docs/review | vi + en (i18next); 242 test |

## Todo còn lại (theo thứ tự ưu tiên)

> 📋 **Chi tiết đầy đủ + lệnh cụ thể: `can_lam.md` (root) — 12 việc.**

### Ngay (blocker / bảo mật)
- [x] **Chạy SQL mục 13 trên SQL Editor** (bảng `notification_preferences` + `feature_flags` + seed `INSTANT_AUDIT_ENABLED=false`) — ✅ **ĐÃ CHẠY** (verify 2026-08-18: 2 bảng + RLS + policies + seed đầy đủ).
- [x] **Deploy lại edge function `parse-mt4`** — ✅ **ĐÃ REDEPLOY** (2026-08-18, VERSION 2, smoke test 3 lệnh parse sạch).
- [ ] **User revoke GH token cũ** đã dán trong chat (`ghp_m31j33...`) — khẩn cấp bảo mật; skill mới đọc token mới từ env/chat.
- [ ] **Commit + push** toàn bộ diff đang treo (Retention M0–8 + jest.setup + schema mục 13 + openspec + can_lam.md + .project/) — sau đó GH Actions tự build APK kiểm tra native (expo-notifications mới).
- [x] **Chạy `supabase/migrations-phase2.sql` trên SQL Editor** (bảng `pro_unlocks`) — ✅ **ĐÃ CHẠY** (verify 2026-08-18: bảng + check constraint `method='admob_rewarded'` + FK cascade + RLS 4 policies + index đầy đủ).

### Chờ user cung cấp / xác nhận
- [ ] **Cung cấp export MT4/MT5 THẬT** (3–4 mẫu, ≥2 sàn, MT4+MT5) → verify M0 ≥95% → mở gate `INSTANT_AUDIT_ENABLED` (hiện M3 chạy fallback quiz đúng spec, không có deadline ép).
- [ ] **Xác nhận giả định M4**: "PnL giả định cho lệnh lệch plan = đạt planned_tp" — spec không ghi rõ kết cục giả định.
- [ ] **Đo acceptance criteria thời gian thực** (onboarding ≤3 phút, Fast Plan ≤15s, widget ≤20s, Dashboard ≤2s) qua bảng `analytics_events`.
- [ ] **Legal disclaimer + tuân thủ Nghị định 13** (quyền riêng tư dữ liệu VN) trước khi ra mắt.
- [ ] Thanh toán thật Momo/VNPay (khi có merchant account) — bảng `subscriptions` đã sẵn schema.

### Phase 2 còn treo
- [ ] **Tạo AdMob account** khi sẵn sàng: App ID + Banner/Rewarded Unit ID thật vào `.env` + `app.json`, đổi `TEST_ADS=false`.
- [ ] **Test ads thật trên máy**: build APK (GH Actions) → xem log lấy device ID → đưa vào `TEST_DEVICE_IDS`.
- [ ] Nguồn giá thật cho ATR + correlation (Phase 3 — hiện là ước lượng tham chiếu, đã ghi rõ trong UI).

### Bug nhỏ chưa fix (từ code review 2026-08-17)
- [x] `index.tsx` text cũ — ✅ **không còn tồn tại** (index.tsx đã rewrite thành Today Dashboard ở Retention, text đã biến mất; verify grep toàn repo 2026-08-18).
- [x] `auth-context.tsx`: sau signOut không clear `tier`/`subscriptionExpiresAt` — ✅ fix 2026-08-18 (clear trong nhánh session null của onAuthStateChange).
- [x] `execution-widget`: không set `trade_plans.status='executed'` khi link plan → plan bị suggest lại nhiều lần — ✅ fix 2026-08-18 (update status sau insert execution, fail chỉ warn).
- [x] `navigation.ts`: `navigateWithFallback` dead code — ✅ xóa 2026-08-18 (verify 0 caller trước khi xóa).

## Bug đã fix (log)

| Ngày | Bug | Fix |
|---|---|---|
| 2026-08-17 | 🔴 `portfolio-risk` vòng lặp vô hạn (crash/hang) | Bỏ `symbols` khỏi useCallback deps, dùng biến local |
| 2026-08-17 | `addRule` chặn lần thứ 3 → Free không thêm được luật tùy chọn | `canAddRule(activeCount)` thay vì `+1` |
| 2026-08-17 | Delta không filter theo tuần → score/% sai | Filter theo `trade_execution_id` của tuần |
| 2026-08-17 | `confirm-no-plan` insert lệnh ma (lot 0/entry 0) | Chuyển sang `execution-widget` sau xác nhận |
| 2026-08-17 | `trade-detail` deep-link thiếu id treo vĩnh viễn | Redirect về Journal + nút quay lại |
| 2026-08-17 | Onboarding không có lối quay lại | Nút "‹ Quay lại" (replace bước trước) |
| 2026-08-17 | `router.back()` không fallback ở 6 màn hình | `safeBack(router, fallback)` |
| 2026-08-17 | Không có +not-found | Thêm 404 có lối thoát |
| 2026-08-17 | AdMob API v16.4 (MobileAds(), BannerAdSize) | Sửa theo export thực tế của package |
| 2026-08-17 | Edge function deploy lỗi path `supabase/supabase/...` | Deploy từ root + config.toml |
| 2026-08-17 | 🔴 `cost-of-indiscipline` CRASH khi import MT4 symbol ngoài 3 cặp (GBPUSD/EURJPY/USDCAD) | Guard `isSupportedSymbol` → trả 0 (không crash, không suy đoán) + 2 test |
| 2026-08-17 | Danger-zone màn chi tiết hiện biểu đồ cả khi <30 lệnh | Chỉ render biểu đồ khi `totalClosed >= 30` |
| 2026-08-17 | `configureNotificationHandler` không được gọi → notification không hiển thị khi app foreground | Wire vào `(main)/_layout` useEffect |
| 2026-08-18 | `auth-context` sau signOut không clear tier/expiry → tier cũ hiện vài giây khi login tài khoản khác | Clear `tier` + `subscriptionExpiresAt` trong nhánh session null của onAuthStateChange |
| 2026-08-18 | `execution-widget` link plan không set `trade_plans.status='executed'` → plan bị suggest lại nhiều lần | Update status='executed' sau insert execution (fail chỉ warn, không chặn luồng) |
| 2026-08-18 | `navigation.ts` `navigateWithFallback` dead code | Xóa function (verify 0 caller) |

## Quyết định quan trọng (decision log)

| Quyết định | Lý do / Ghi chú |
|---|---|
| Auth = Email + Password (Phase 1), KHÔNG confirm email (`mailer_autoconfirm=true`) | User chưa có SMS provider; không muốn chi phí; SĐT để Phase 2 |
| Analytics = bảng `analytics_events` trong Supabase (KHÔNG PostHog) | Free 100%, đơn giản; PostHog nối sau nếu cần dashboard |
| Pro 24h qua AdMob rewarded — **cộng dồn** hạn hiện tại | Giả định user duyệt: đang Pro thì +24h từ hạn hiện tại, không ghi đè |
| `TEST_ADS=true` mặc định | Tránh AdMob giới hạn tài khoản khi chưa có ad unit thật |
| Cooldown rewarded = 5 phút (`AD_REWARD_COOLDOWN_MS`) | Giả định của agent — spec không ghi con số, dễ đổi 1 chỗ |
| ATR/correlation = giá trị ƯỚC LƯỢNG tham chiếu | Chưa có nguồn giá thật; UI ghi rõ "ước lượng" |
| Portfolio Risk ngưỡng = `min(maxRiskPerTrade×3, maxDailyLoss)` | Spec không ghi công thức — lấy quy ước an toàn (giả định cần duyệt) |
| Adaptive UI chỉ hỗ trợ rule `max_risk_per_trade` | Schema đã hỗ trợ mọi rule, logic atr.ts generic |
| Adaptive chỉ GIẢM risk — khóa cứng DB trigger | Bắt buộc từ plan v2 mục 3; đã verify thật (insert tăng bị từ chối) |
| Onboarding dùng `replace` (flow tuyến tính bắt buộc) | Hardware back thoát app ở bước balance — chấp nhận, nút UI luôn có |
| Không dùng LLM cho score/audit Phase 1 | Rule-based, minh bạch, không tốn chi phí |
| Free tối đa 3 luật / Pro không giới hạn | mvp_scope mục 12 |
| `INSTANT_AUDIT_ENABLED` đọc từ bảng `feature_flags` (KHÔNG hardcode), fallback false khi DB lỗi | Đúng ghi chú data_model mục 13 — dễ bật/tắt không cần release; an toàn: không bao giờ tự bật |
| Instant Audit M3 gate cứng: ≥95% parse thật mới bật; dưới ngưỡng → fallback quiz VĨNH VIỄN | Nguyên tắc bất biến user chốt — không hạ ngưỡng, không có deadline ép |
| Fast Plan GIỮ SL bắt buộc (5 trường, không rút xuống 3) | Không đổi đề xuất gốc từng có — phá vỡ công thức lot size Phase 1 |
| Ngưỡng thống nhất ≥30 lệnh đóng (cost 30/3, setup 30, danger-zone 30+5 lần) — KHÔNG hạ để demo | Nguyên tắc bất biến; test assert hằng số |
| Cost of Indiscipline disclaimer hiển thị ngay dưới con số (không footnote), đúng nguyên văn | Nguyên tắc bất biến — snapshot test không cho rút gọn |
| M4 giả định: "PnL giả định lệnh lệch plan = đạt planned_tp" | ⚠️ CHƯA user duyệt — spec không ghi kết cục giả định; sửa 1 hàm nếu user chọn khác |
| Notification = LOCAL (expo-notifications), chưa server push | Đủ Phase này; cột `push_token` đã sẵn nếu sau này làm remote push qua Edge Function |
| Notification permission hỏi SAU lần đầu thấy Dashboard (markDashboardSeen) | Đúng ngữ cảnh, không hỏi ngay mở app lần đầu, không hỏi lại lần 2 |
| Evening notification chỉ khi có lệnh đóng trong ngày | Tránh notification rỗng gây khó chịu (AC bắt buộc) |
| Danger Zone pattern "lệnh thứ N" đếm theo `entry_time` (UTC, chưa theo timezone user) | Phase 8 sẽ thêm timezone cho notification — báo user nếu cần chuyển múi giờ |
| i18n = **i18next + react-i18next + expo-localization** (đợt này vi + en; kiến trúc mở rộng zh/ja/ko/es bằng thêm file json + 1 dòng SUPPORTED_LANGS) | User chốt: full scope (UI + nội dung động + edge parse-mt4) + auto-detect + Settings picker |
| Pure lib dùng `i18next.t` trực tiếp — **KHÔNG đổi signature hàm** | Giữ 226 test cũ pass (jest init lng:'vi'); thêm test so khớp key vi↔en + nội dung động en |
| Preference ngôn ngữ lưu **AsyncStorage local** (không đổi schema DB) | Tránh đụng ràng buộc schema cứng; detect = preference → thiết bị → fallback vi |
| Edge `parse-mt4` nhận `lang` trong body (mặc định vi) — dictionary message vi/en | Logic parse KHÔNG đổi — chỉ message hiển thị; đã redeploy + smoke test cả 2 ngôn ngữ |
| i18n chỉ dịch **message hiển thị**, không dịch log dev (console.warn) / comment | Tránh phình file dịch với text không user thấy |

## Deploy / Môi trường

- **Supabase project**: `ycmuuczwnogybyklzpsa` — **18/18 bảng đã chạy đầy đủ** (verify 2026-08-18 qua Management API): mục 13 (notification_preferences + feature_flags) ✓ · migrations-phase2 (pro_unlocks) ✓ · trigger adaptive `trg_adaptive_condition_decrease` ✓ · 7 index ✓ · RLS + policy MỌI bảng ✓.
- **Edge functions**: 4 functions đã deploy, **`parse-mt4` = VERSION 2** (hardening M0, redeploy 2026-08-18 + smoke test OK); `verify_jwt=true`.
- **Git**: main trên GitHub (commit `1cd965c`, `41c3261`); toàn bộ diff đợt Retention đang treo chưa commit.
- **Android SDK local**: `~/Android/Sdk` (platform-36, build-tools 36.0.0) — targetSdk 36 cho Google Play.
