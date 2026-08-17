# context.md — Tổng quan Trading Discipline OS

> File TĨNH (ít đổi). Chi tiết đầy đủ ở `.project/` (Knowledge Item) — file này chỉ là bản tóm tắt ngắn để session mới nắm nhanh. Chi tiết động/thay đổi liên tục → `working.md` + `.project/state.md`.

## Project là gì

**Trading Discipline OS** — app kỷ luật giao dịch forex. Tách bạch **Discipline Score** (tuân thủ kế hoạch) vs **Edge Score** (chiến lược có lời hay không); user tự đặt luật ("hiến pháp"), app kiểm tra/nhắc; adaptive chỉ giảm risk, không bao giờ tự nới lỏng.

## Tech stack

- **Mobile**: Expo SDK 57, React Native + TypeScript, expo-router (file-based), `apps/mobile/`.
- **Backend**: Supabase (Postgres + Auth + Edge Functions Deno) — project `ycmuuczwnogybyklzpsa`, keys trong `.env` (không commit).
- **Ads**: AdMob (`react-native-google-mobile-ads` v16.4) — banner bottom + rewarded → Pro 24h; `TEST_ADS=true` mặc định.
- **CI**: GitHub Actions `.github/workflows/build-apk.yml` — debug APK khi push `main`.
- **Test**: Jest + jest-expo, 147 test (13 suite) — tập trung công thức lib.

## Cấu trúc thư mục chính

```
apps/mobile/src/app/   → routes: (auth) (onboarding) (main) + _layout (protected route) + +not-found
apps/mobile/src/lib/   → business logic thuần (test được) + supabase client + __tests__/
apps/mobile/src/components/ → ad-banner, tradingview-chart (mỗi cái .native + web stub)
supabase/schema.sql    → 15 bảng Phase 1 + RLS + trigger adaptive (nguồn chính thức)
supabase/migrations-phase2.sql → ⚠️ CHƯA chạy trên SQL Editor (bảng pro_unlocks)
supabase/functions/    → 4 edge functions đã deploy (parse-mt4, compute-deltas, detect-violations, weekly-audit)
openspec/changes/      → phase1-mvp (9 specs) + phase2-mvp (4 specs)
.project/              → Knowledge Item (entry: README.md)
```

## Quyết định kiến trúc quan trọng nhất (chi tiết: `.project/state.md` → decision log)

1. Auth email/password, không confirm email; analytics = bảng `analytics_events` trong Supabase (không PostHog).
2. Onboarding dùng `router.replace` (flow tuyến tính bắt buộc); navigation an toàn qua `safeBack`.
3. Adaptive Rules khóa cứng **chỉ GIẢM** risk (DB trigger `direction='decrease'`) — verified thật.
4. Pro 24h qua AdMob rewarded, cộng dồn hạn; cooldown 5 phút chống spam.
5. Không dùng LLM cho score/audit Phase 1 — rule-based từ số liệu thật.
6. Business logic trong `src/lib/` thuần (không import react-native) → unit test bắt buộc mọi công thức.
7. targetSdk 36 (Google Play yêu cầu từ 31/8/2026); `usesCleartextTraffic=true` cho HTTP release.

## Trạng thái hiện tại (2026-08-17)

- Phase 1 (9 module) ✅ + Phase 2 (4 module) ✅ — code xong, TSC 0 / lint 0 / 147 test, bundle Android + web OK.
- Edge functions đã deploy; schema Phase 1 đã chạy; **migration Phase 2 chưa chạy**.
- Đã push commit `1cd965c` lên `github.com/hoangsoft90/forex_1` (branch main); **còn diff lớn chưa commit** (fix review, targetSdk 36, cooldown ads, .project/, memory files).
- Todo + bug còn lại: xem `.project/state.md`.
