# Tasks: in-app-guidance

## 1. Pure libs + test

- [x] 1.1 `src/lib/guidance-position.ts`: `computeTooltipPosition` (flip/clamp/center) + `buildSpotlightBands` — không import react-native
- [x] 1.2 `src/lib/guidance-storage.ts`: AsyncStorage keys `guidance.tour.<id>.seen`, `.step.<id>.completed`, `guidance.feature.<key>.dismissed` — fail-open
- [x] 1.3 `src/lib/guidance-triggers.ts`: `shouldStartTour({seen, isNewUser})`, `shouldShowBadge({dismissed})`
- [x] 1.4 Test: `guidance-position.test.ts` (flip/clamp/center), `guidance-storage.test.ts` (round-trip + fail-open), `guidance-triggers.test.ts` (show-once)

## 2. Components

- [x] 2.1 `src/components/guidance-context.tsx`: GuidanceProvider (root layout) + `useGuidance()` (registerTarget, startTour, next/skip/done, dismissFeature, showDisabledHelper)
- [x] 2.2 `src/components/feature-badge.tsx`: dot/label "New", dismiss → ẩn vĩnh viễn
- [x] 2.3 `src/components/tooltip.tsx`: popup position theo rect + placement, tự flip/clamp (đo size qua onLayout)
- [x] 2.4 `src/components/spotlight-overlay.tsx`: 4 band làm mờ + spotlight rect target + tooltip đính kèm + Skip/Next/Done + bước x/y
- [x] 2.5 `src/components/disabled-state-helper.tsx`: bắt tap khi disabled → tooltip lý do + unlock (qua provider overlay)

## 3. i18n keys

- [x] 3.1 Thêm section `guidance` vào vi.json + en.json (badgeNew, skip/done/next, stepOf, close/gotIt, dashboardTour step1/2, saveDisabled reason/unlock)

## 4. Tích hợp

- [x] 4.1 Root `_layout.tsx`: mount `GuidanceProvider` (trong I18nGate, trên RootNavigator)
- [x] 4.2 `(main)/index.tsx`: tour 2 bước user mới (Quick Plan + Journal) — registerTarget + startTour, chỉ khi `latestScore == null && openExecs.length === 0`
- [x] 4.3 `(main)/settings.tsx`: FeatureBadge "New" mục Ngôn ngữ + DisabledStateHelper nút Save notifications (khi saving/loading)

## 5. Verify & đóng gói

- [x] 5.1 Full verify: tsc 0 · lint 0 · jest (**269 test** — 242 cũ + 27 mới: 20 lib + 7 component) · `expo export --platform android` + `--platform web` pass
- [x] 5.2 Cập nhật working.md + .project/state.md (decision log: tự build không dep, position math pure, trigger show-once)
- [x] 5.3 Review theo AGENTS.md (OCR không cài → fallback review mặc định): Ponytail OK (không over-engineering) · Impact OK (chỉ đụng 3 màn hình + i18n, không schema/API) · Dead code OK · Pattern OK (lib thuần + test, fail-open AsyncStorage, i18n keys, react-test-renderer + act) · Scope OK (đúng spec) · Lessons OK — không thuộc vùng rủi ro Ponytail, không cần dừng xác nhận
