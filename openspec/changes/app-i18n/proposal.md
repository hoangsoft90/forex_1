# Proposal: app-i18n — Đa ngôn ngữ cho Trading Discipline OS

## Why

App hiện **hardcode tiếng Việt** ở toàn bộ 28 màn hình + business lib + edge functions — user ngoài VN không dùng được, và không thể chuyển ngôn ngữ theo thiết bị. Forex là thị trường toàn cầu (user sàn Exness/ICMarkets/XM nói EN/zh/ja/ko/es); đa ngôn ngữ là bước mở rộng user tự nhiên sau khi MVP + Retention hoàn tất.

## What Changes

- **Thêm hệ thống i18n** cho app: i18next + react-i18next + expo-localization, **đợt này hỗ trợ 2 ngôn ngữ**: `vi` (mặc định) + `en`. Kiến trúc sẵn sàng mở rộng — `zh`/`ja`/`ko`/`es` chỉ cần thêm file json + dòng danh sách sau này.
- **Tự động theo thiết bị**: detect locale hệ thống (expo-localization) khi mở app; nếu không khớp 2 ngôn ngữ hỗ trợ → fallback `vi`.
- **Đổi thủ công trong Settings**: màn "Ngôn ngữ" (tên native: Tiếng Việt / English); lựa chọn được lưu (AsyncStorage) và override auto-detect.
- **Migrate toàn bộ UI strings** (28 màn hình: onboarding, auth, main...) sang translation keys.
- **Localize nội dung sinh động từ dữ liệu**: weekly-audit template, notification-content (M8), weakness-quiz, danger-zone, cost-of-indiscipline, setup-analytics, discipline-streak, instant-audit, MT4 parser messages, message của risk-engine/violations/interruption.
- **Edge function `parse-mt4` nhận tham số `lang`** → trả message localize; redeploy. (`weekly-audit` edge hiện không được client gọi — UI tự sinh qua lib — **không** đụng, ghi chú trong design.)
- **Không BREAKING**: tiếng Việt giữ làm default/fallback, hành vi nghiệp vụ không đổi, test hiện tại (assert tiếng Việt) vẫn pass.

## Capabilities

### New Capabilities

| Capability | Nội dung |
|---|---|
| `i18n` | Hệ thống đa ngôn ngữ cốt lõi: danh sách ngôn ngữ, auto-detect, đổi trong Settings, persistence, fallback, áp dụng cho mọi màn hình (không lẫn ngôn ngữ) |
| `i18n-content` | Nội dung sinh động từ dữ liệu + edge function localize: template weekly-audit/notification/insight/quiz/parser message theo ngôn ngữ hiện tại, parse-mt4 nhận `lang` |

### Modified Capabilities

Không — các spec hiện có (weekly-audit, push-notification, cost-of-indiscipline...) mô tả chức năng/template + số liệu thật, không quy định ngôn ngữ; việc localize là tham số hóa ngôn ngữ, không đổi requirement.

## Impact

- **Dependencies mới**: `i18next`, `react-i18next`, `expo-localization` (native module → verify `expo export --platform android` + `--platform web`; expo-localization có web support sẵn, kiểm tra split `.native` nếu cần).
- **Files**: ~28 màn hình `src/app/**`, ~15 lib `src/lib/*.ts`, `jest.setup.js` (init i18n cho test), `app.json` (plugin nếu cần), edge `supabase/functions/parse-mt4/index.ts` (+ redeploy), file dịch mới `src/i18n/locales/{vi,en}.json` (`zh/ja/ko/es` để đợt sau).
- **Tests**: 226 test hiện tại assert chuỗi tiếng Việt → giữ pass bằng cách init i18n mặc định `vi` trong jest.setup; thêm test mới: detect/switch/persist/fallback, không-key-thiếu giữa vi↔en, nội dung động ra đúng ngôn ngữ.
- **ADR**: quyết định kiến trúc (chọn i18next + cách pure lib dùng i18next headless) → lưu ADR theo Task Completion Hook.
- **Rủi ro bảo mật**: không đổi auth/RLS/schema — không thêm field DB (preference ngôn ngữ lưu local, không vào DB).
