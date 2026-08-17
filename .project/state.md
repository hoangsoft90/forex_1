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

## Todo còn lại (theo thứ tự ưu tiên)

### Ngay (blocker / bảo mật)
- [ ] **Commit + push** các thay đổi chưa commit (fix review, targetSdk 36, cooldown ads, .project/) — repo đang có diff lớn chưa commit sau `1cd965c`.
- [ ] **Chạy `supabase/migrations-phase2.sql` trên SQL Editor** (tạo bảng `pro_unlocks`) — chưa chạy thì insert audit fail (quyền Pro vẫn hoạt động, code đã graceful).
- [ ] **User revoke GH token cũ** đã dán trong chat (`ghp_m31j33...`) — skill mới đọc token mới từ env/chat.

### Phase 1 chưa khép (đã báo cáo, chờ user)
- [ ] **MT4 parser verify với dữ liệu thật** — parser dựa format GIẢ ĐỊNH (comment + báo cáo đã đánh dấu rõ), cần export thật từ MT4 desktop/mobile.
- [ ] **Đo acceptance criteria thời gian thực** (onboarding ≤3 phút, widget ≤20 giây) qua bảng `analytics_events`.
- [ ] **Legal disclaimer + tuân thủ Nghị định 13** (quyền riêng tư dữ liệu VN) trước khi ra mắt.
- [ ] Thanh toán thật Momo/VNPay (khi có merchant account) — bảng `subscriptions` đã sẵn schema.

### Phase 2 còn treo
- [ ] **Tạo AdMob account** khi sẵn sàng: App ID + Banner/Rewarded Unit ID thật vào `.env` + `app.json`, đổi `TEST_ADS=false`.
- [ ] **Test ads thật trên máy**: build APK (GH Actions) → xem log lấy device ID → đưa vào `TEST_DEVICE_IDS`.
- [ ] **Cần dev build** (expo prebuild + build APK) để chạy AdMob/WebView — không chạy được trong Expo Go.
- [ ] Nguồn giá thật cho ATR + correlation (Phase 3 — hiện là ước lượng tham chiếu, đã ghi rõ trong UI).

### Bug nhỏ chưa fix (từ code review 2026-08-17, user chọn fix 4 chính trước)
- [ ] `index.tsx` text cũ: "Module 2 sẽ được build ở bước tiếp theo" — gây hiểu nhầm.
- [ ] `auth-context.tsx`: sau signOut không clear `tier`/`subscriptionExpiresAt` → tier cũ hiện vài giây khi login tài khoản khác.
- [ ] `execution-widget`: không set `trade_plans.status='executed'` khi link plan → plan bị suggest lại nhiều lần.
- [ ] `navigation.ts`: `navigateWithFallback` dead code (chỉ push, không ai dùng).

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

## Deploy / Môi trường

- **Supabase project**: `ycmuuczwnogybyklzpsa` — schema Phase 1 đã chạy, **migrations-phase2 CHƯA**.
- **Edge functions**: 4 functions đã deploy, `verify_jwt=true`.
- **Git**: main trên GitHub; git config local placeholder → commit dùng env vars.
- **Android SDK local**: `~/Android/Sdk` (platform-36, build-tools 36.0.0) — targetSdk 36 cho Google Play.
