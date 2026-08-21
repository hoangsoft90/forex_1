# Overview — Trading Discipline OS

## Mục đích sản phẩm

App kỷ luật giao dịch **forex** dành cho trader cá nhân. Triết lý cốt lõi (từ `plan1_final_v2.md`):
- **Discipline ≠ chiến lược**: app tách bạch "tuân thủ kế hoạch" (Discipline Score) với "chiến lược có lời hay không" (Edge Score) để trader xác định đúng nguyên nhân thua lỗ.
- **App là "hiến pháp" của user**: luật do chính user đặt (Personal Trading Constitution), app chỉ nhắc/kiểm tra, không áp đặt.
- **Adaptive Rules chỉ GIẢM risk, không bao giờ tự nới lỏng** — tăng risk phải qua Decision Interruption (được khóa cứng bằng DB trigger).
- **Không dùng LLM cho chấm điểm/audit** ở Phase 1 — mọi score/audit đều rule-based, tính từ số liệu thật.

## Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Mobile | **Expo SDK 57** (React Native, TypeScript, expo-router v57) | Thư mục `apps/mobile/`, SDK mới nhất (edge-to-edge bắt buộc từ Android 16) |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions) | Project ID `ycmuuczwnogybyklzpsa` (biến môi trường trong `.env`, không commit) |
| Edge Functions | **Deno + supabase-js v2** (`https://esm.sh/@supabase/supabase-js@2`) | 4 functions trong `supabase/functions/` |
| Ads | **AdMob** (`react-native-google-mobile-ads` v16.4) | Banner bottom + Rewarded → Pro 24h; flag `ENABLE_ADS` + `TEST_ADS` trong `ads-config.ts` |
| CI | **GitHub Actions** | Debug APK (`build-apk.yml`) + Release AAB (`build-release-aab.yml`) khi push lên `main` |
| State | Không dùng thư viện state global — `auth-context.tsx` (React Context) là nguồn session/tier/onboarding | Không Redux/Zustand |
| Test | **Jest + jest-expo** | **319 test** (~25 suite), tập trung công thức lib + snapshot UI + risk-engine 37 symbols |
| OpenSpec | 3 change đã archive: `phase1-mvp`, `phase2-mvp`, `retention-layer` | Workflow chuẩn của project (propose → apply → archive) — 22 specs / 91 requirements |

## Cấu trúc thư mục

```
forex_1/
├── apps/mobile/                  # Toàn bộ app Expo
│   ├── app.json                  # Config native: AdMob App ID, build-properties (targetSdk 36, cleartext HTTP), navigationBar
│   ├── src/app/                  # Routes expo-router (file-based)
│   │   ├── (auth)/               # login
│   │   ├── (onboarding)/         # balance → quiz → weakness-summary/instant-audit → explain → constitution (flow bắt buộc, dùng replace)
│   │   ├── (main)/               # index (Today Dashboard), new-plan (full+fast), execution-widget, journal, trade-detail, scores, weekly-audit, portfolio-risk, setup-analytics, danger-zone, pro, settings, ...
│   │   ├── _layout.tsx           # Root: AuthProvider + useProtectedRoute (redirect theo session/onboarding)
│   │   └── +not-found.tsx        # 404 có lối thoát
│   ├── src/components/           # ad-banner, tradingview-chart (mỗi cái có .native + web stub)
│   ├── src/lib/                  # Toàn bộ business logic thuần (test được) + supabase client
│   ├── src/lib/__tests__/        # ~25 suite, 319 test
│   └── src/constants/theme.ts
├── supabase/
│   ├── schema.sql                # 17 bảng + RLS + trigger adaptive decrease + indexes (mục 13: notification_preferences + feature_flags)
│   ├── migrations-phase2.sql     # ⚠️ CHƯA CHẠY trên SQL Editor (bảng pro_unlocks)
│   ├── config.toml               # project_id + verify_jwt cho functions
├── firebase.json                 # Firebase Hosting (app-ads.txt + guide.html)
├── .firebaserc                   # Firebase project: trading-discipline-os
│   └── functions/                # parse-mt4 (v4 lang vi/en), compute-deltas, detect-violations, weekly-audit, unlock-pro
├── openspec/
│   ├── changes/archive/          # phase1-mvp, phase2-mvp, retention-layer (đã archive)
│   └── specs/                    # 22 specs đã sync (retention-layer + 41 requirements)
├── .github/workflows/
│   ├── build-apk.yml             # Debug APK (assembleDebug)
│   ├── build-release-aab.yml     # Release AAB (signed, keystore trong GitHub Secrets)
│   └── deploy-gh-pages.yml       # GitHub Pages (privacy policy + guide)
├── .project/                     # Knowledge Item (file này)
├── data_model.md                 # Schema tham chiếu (17 bảng — không tự đổi cấu trúc)
├── mvp_scope.md                  # Phạm vi Phase 1 + acceptance criteria
├── plan1_final_v2.md             # Lý do thiết kế ("tại sao")
├── retention_layer_addendum.md   # Spec đợt Retention Layer (9 module 0–8)
├── features.md                   # Inventory tính năng (cập nhật sau từng module)
├── can_lam.md                    # ⚠️ 12 việc user cần làm (SQL mục 13, revoke token, MT4 thật...)
└── working.md                    # Nhật ký làm việc (đổi thường xuyên)
```

## Env vars (`.env` — KHÔNG commit, đã trong .gitignore)

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase client (mobile)
- `SUPABASE_SERVICE_ROLE_KEY` — dùng cho script/verify (KHÔNG đưa vào app)
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` — dùng khi `TEST_ADS=false`
- `EXPO_PUBLIC_ADMOB_APP_ID` — compile-time (app.json plugin)
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry error tracking (optional)
- `SENTRY_AUTH_TOKEN` — CI only, upload source maps

## Kho lưu trữ

- GitHub: `github.com/hoangsoft90/forex_1` (branch `main`), commit đầu `1cd965c`.
- Git config cục bộ là placeholder → commit cần env vars `GIT_AUTHOR_NAME/EMAIL` (xem skill `expo-build-debug-apk-gh`).
- Firebase Hosting: `trading-discipline-os.web.app` (app-ads.txt + guide.html)
- GitHub Pages: `hoangsoft90.github.io/forex_1/privacy-policy.html`
