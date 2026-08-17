# CAN_LAM.md — Việc cần USER làm (đợt Retention Layer + tồn đọng)

> Cập nhật: 2026-08-17. Code đợt Retention (0-8) đã xong + review xong (226/226 test).
> Phần còn lại dưới đây là việc **chỉ user làm được** hoặc cần user cung cấp.

---

## 🔴 ƯU TIÊN 1 — Bắt buộc trước khi dùng tính năng mới

### 1. Chạy SQL mục 13 trên Supabase thật
2 bảng mới chưa có trên DB thật → notification sẽ lỗi khi lưu cài đặt.
```sql
-- Lấy từ supabase/schema.sql (mục 13): notification_preferences + feature_flags + seed INSTANT_AUDIT_ENABLED=false
-- Chạy qua Supabase Dashboard → SQL Editor, hoặc psql
```

### 2. Deploy lại Edge Function parse-mt4
Parser đã harden ở Module 0 (locale số, deal-based, skip balance) nhưng **chưa deploy**:
```bash
cd supabase && supabase functions deploy parse-mt4
```

### 3. 🔑 REVOKE GitHub token cũ (bảo mật — KHẨN CẤP)
Token `ghp_m31j33...` đã dán nhiều lần trong chat → **vô hiệu hóa ngay**:
GitHub → Settings → Developer settings → Personal access tokens → Revoke.
Lần sau dùng token mới hoặc set env `GH_TOKEN`.

---

## 🟠 ƯU TIÊN 2 — Để "xong thật sự" (cần dữ liệu của bạn)

### 4. Cung cấp export MT4/MT5 THẬT → mở gate Module 3
- Format: MT4/MT5 → Account History → chọn toàn bộ → Copy (hoặc export .csv/.html)
- **Ít nhất 3-4 mẫu** từ Exness/ICMarkets/XM + ít nhất 1 sàn FTMO-style (thử cả MT4 + MT5)
- Dán vào `.draft/` (gitignored) hoặc chat → tôi verify ≥95% → mới bật `INSTANT_AUDIT_ENABLED=true` (sửa seed trong DB)
- ⚠️ Trước khi có data thật: app giữ fallback 3.3 (Dự đoán điểm yếu) — đúng spec, không hạ ngưỡng

### 5. Test AC bằng data thật (cần 5 user)
| AC | Cách đo |
|---|---|
| Onboarding ≤ 3 phút | `analytics_events`: onboarding_started → completed |
| Fast Plan ≤ 15 giây | `fast_plan_opened` → `fast_plan_saved` |
| Widget ≤ 20 giây | `execution_widget_opened` → `execution_saved` |
| Dashboard load ≤ 2 giây | cảm nhận/đo tay trên thiết bị test |

---

## 🟡 ƯU TIÊN 3 — Khi muốn release

### 6. Commit + push (hoặc nói tôi làm)
~30 files đang treo (Retention 0-8 + jest.setup + schema mục 13). Nói **"commit hết"** → tôi tạo commit; **"push"** → GH Actions build APK kiểm tra native (expo-notifications mới).

### 7. Tải APK test
Build xong nói **"tải APK về"** → tôi lấy artifact `trading-discipline-os-debug-apk`, bạn cài máy test:
- Notification hiện đúng khi foreground + theo giờ cấu hình
- Ads banner + rewarded (đang ở chế độ TEST — an toàn)

### 8. AdMob thật (khi sẵn sàng ra mắt)
`apps/mobile/src/lib/ads-config.ts`:
- `TEST_ADS = false` + đặt `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID` / `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID`
- Đăng ký device thật của bạn là **test device** trong AdMob dashboard trước (tránh khóa tài khoản)
- AdMob chặn ad unit chưa được approve → chỉ dùng ID thật sau khi app submit lên store

### 9. Android SDK local
Đã cài `~/Android/Sdk` (platform-36, build-tools 36.0.0). Disk còn ~780MB (hơi chật) — dọn nếu build local chậm. Build CI trên GitHub Actions không ảnh hưởng.

---

## ⚪ Việc tùy chọn (bạn từng chọn "chưa làm" — nói nếu muốn)

### 10. 4 bug nhỏ Phase 1 còn treo (từ review trước)
- `index.tsx` text "Module 2 sẽ build ở bước tiếp theo" — lỗi thời (gây hiểu nhầm)
- `auth-context.tsx` — signOut không clear tier/subscriptionExpiresAt → thấy tier cũ vài giây khi đăng nhập tài khoản khác
- `execution-widget` — không set `trade_plans.status='executed'` khi link plan → plan bị suggest lại
- `navigation.ts` — `navigateWithFallback` dead code

### 11. Xác nhận giả định "PnL giả định = đạt planned_tp" (Module 4)
Hiện đang giả định lệnh lệch plan nếu theo đúng plan sẽ **đạt TP**. Nếu muốn cách khác (chạm SL / không tính) → nói tôi sửa 1 hàm.

### 12. Test device registration ads thật (yêu cầu cũ)
Bạn từng yêu cầu "test-device registration rồi push+build trên gh-action thấy ads thật" — hiện `TEST_DEVICE_IDS` trong ads-config.ts đang trống, cần device ID từ log adb khi chạy app.

---

## ✅ ĐÃ XONG (không cần làm gì)
- Toàn bộ đợt Retention 0-8: Fast Plan, Today Dashboard, Instant Audit (fallback), Cost of Indiscipline, Setup Analytics, Danger Zone, Discipline Streak, Push Notification
- Review toàn bộ + fix 3 bug (crash symbol lạ, biểu đồ <30 lệnh, notification handler)
- 226/226 test · TSC 0 · lint 0 · bundle Android + web OK
- targetSdk 36 (Google Play yêu cầu từ 31/8/2026) · Android SDK local
