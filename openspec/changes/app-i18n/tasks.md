# Tasks: app-i18n

## 1. Hạ tầng i18n

- [x] 1.1 Cài deps: `i18next`, `react-i18next`, `expo-localization` (trong `apps/mobile`)
- [x] 1.2 Tạo `src/i18n/index.ts`: init i18next (2 locales vi/en, `fallbackLng:'vi'`, `SUPPORTED_LANGS`), `resolveInitialLanguage()` (preference AsyncStorage → expo-localization detect → fallback vi), `changeAppLanguage()` (changeLanguage + persist)
- [x] 1.3 Tạo `src/i18n/locales/vi.json` + `en.json` (bản đầu: key hạ tầng `common.*`, `settings.*`)
- [x] 1.4 Wire root `_layout.tsx`: await resolveInitialLanguage trước khi render + `I18nextProvider`
- [x] 1.5 `jest.setup.js`: init i18next `lng:'vi'` cho test
- [x] 1.6 Test i18n base: resolve (preference thắng / fallback vi), changeAppLanguage persist, so khớp key vi↔en
- [x] 1.7 Verify: tsc 0 · lint 0 · jest pass

## 2. Migrate màn hình auth + onboarding

- [x] 2.1 Migrate `(auth)/login.tsx` sang keys
- [x] 2.2 Migrate `(onboarding)/balance.tsx`, `quiz.tsx`, `weakness-summary.tsx`, `instant-audit.tsx`, `explain.tsx`, `constitution.tsx`, `_layout.tsx`
- [x] 2.3 Bổ sung keys vào vi.json/en.json + test so khớp key chạy lại

## 3. Migrate màn hình main (kèm Settings chọn ngôn ngữ)

- [x] 3.1 Thêm section "Ngôn ngữ" vào `(main)/settings.tsx` (2 option tên native, tap → changeAppLanguage, đánh dấu ngôn ngữ hiện tại)
- [x] 3.2 Migrate `(main)/index.tsx` (Today Dashboard), `journal.tsx`, `trade-detail.tsx`
- [x] 3.3 Migrate `new-plan.tsx`, `confirm-no-plan.tsx`, `execution-widget.tsx`, `paste-mt4.tsx`
- [x] 3.4 Migrate `scores.tsx`, `weekly-audit.tsx`, `setup-analytics.tsx`, `danger-zone.tsx`, `portfolio-risk.tsx`, `pro.tsx`, `constitution-settings.tsx`, `discipline-explainer.tsx`
- [x] 3.5 Migrate `+not-found.tsx`, `_layout.tsx` (main), component `cost-of-indiscipline-card.tsx`, `tradingview-chart.native.tsx` (ad-banner không có text)
- [x] 3.6 Verify từng bước: tsc 0 · lint 0 · jest pass (235 test)

## 4. Migrate nội dung động (lib)

- [x] 4.1 `weekly-audit.ts` — template theo ngôn ngữ
- [x] 4.2 `notification-content.ts` + `notification-manager.ts` — morning/evening theo ngôn ngữ
- [x] 4.3 `weakness-quiz.ts` (localizeQuestion), `instant-audit.ts` (WEAKNESS_LABELS keys + formatInstantAudit)
- [x] 4.4 `danger-zone.ts` (summary/nthOrderSummary), `cost-of-indiscipline.ts` (disclaimer + hiddenReason), `setup-analytics.ts` (labels + progress + bestSetupInsight)
- [x] 4.5 `interruption.ts` (COHORT_BENCHMARKS + personal evidence), `mt4-parser.ts` (error reasons), `fast-plan.ts`, `atr.ts`, `trading-rules.ts`, `admob` (native+web), `pro-unlock.ts`, `tier.ts` — message theo ngôn ngữ
- [x] 4.6 Cập nhật test cũ nếu cần (giữ assert vi — jest lng vi) + test so khớp key vi↔en chạy lại

## 5. Edge function parse-mt4

- [x] 5.1 `supabase/functions/parse-mt4/index.ts`: nhận `lang` trong body (mặc định vi), dictionary message vi/en cho success + `errorLines[].reason`; logic parse không đổi
- [x] 5.2 Client `paste-mt4.tsx` (đã có sẵn) + `instant-audit.tsx` (thêm) truyền `lang` hiện tại khi invoke
- [x] 5.3 Deploy lại `parse-mt4` từ root + smoke test (vi: "Import 3 lệnh thành công..." · en: "Imported 3 trades...") — đã dọn test data

## 6. Hoàn thiện bản dịch vi/en

- [x] 6.1 Rà soát toàn bộ chuỗi dịch vi/en (UI + nội dung động): quét toàn repo không còn chuỗi tiếng Việt hardcode (chỉ còn comment/console.warn dev-only)
- [x] 6.2 Test so khớp key vi↔en (không thiếu/không thừa) + **thêm `i18n-content-en.test.ts`** (7 test: weekly audit, notification, disclaimer, interruption benchmark, instant audit, formatHoursLeft — không lẫn tiếng Việt)

## 7. Verify & đóng gói

- [x] 7.1 Full verify: tsc 0 · lint 0 · jest (242 test) · `expo export --platform android` + `--platform web` (expo-localization native mới) — đều pass
- [x] 7.2 Cập nhật docs: working.md + .project/state.md (tiến độ + decision log i18n) — ADR ghi trong decision log state.md
- [x] 7.3 Review theo AGENTS.md: OCR CLI không cài → fallback review mặc định (graceful degradation). Manual review: 414 key dùng trong code đều resolve cả vi+en (script verify; false positive = `.select(` trong supabase query) · plural key `_one/_other` chuẩn (parity test normalize) · edge parseMt4History(text, lang) internal-only + smoke test vi/en · KHÔNG đụng công thức nghiệp vụ / auth / validation logic (chỉ localize message) → không thuộc vùng rủi ro Ponytail, không cần dừng xác nhận. Không phát hiện vấn đề cần fix
