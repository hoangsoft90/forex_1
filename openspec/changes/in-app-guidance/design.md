# Design: in-app-guidance

## Context

App RN (Expo 57) đã có i18n vi/en, AsyncStorage (jest mock in-memory), pattern pure-lib + test, pattern platform split `.native`/web stub, ngưỡng 30 lệnh. Hiện không có bất kỳ hệ thống guidance nào. User yêu cầu: FeatureBadge, Tooltip & Spotlight auto-position, DisabledStateHelper, tour nhiều bước Skip/Done, storage hasSeen/stepCompleted, trigger chỉ-1-lần, clean code kèm types/interface + comment.

## Goals / Non-Goals

**Goals**: Bộ guidance dùng được thật (tích hợp Dashboard + Settings), không thêm dependency ngoài, position math thuần test được, trigger show-once qua AsyncStorage, i18n vi/en.

**Non-Goals**:
- KHÔNG thêm thư viện tour ngoài (react-native-copilot/onboarding) — tự build đủ đơn giản.
- KHÔNG dùng SVG để vẽ spotlight cutout (không có react-native-svg trong deps) — dùng 4 band absolute view (top/bottom/left/right) làm mờ + hở chữ nhật target.
- KHÔNG lưu trạng thái guidance vào DB — chỉ AsyncStorage local.
- KHÔNG tạo tour cho mọi màn hình — chỉ 2 màn hình tích hợp mẫu (Dashboard, Settings); hệ thống sẵn sàng tái dùng.
- KHÔNG animation phức tạp (reanimated) — fade đơn giản bằng Animated core hoặc không animation.

## Decisions

1. **Tự build, không thêm dependency**
   - FeatureBadge/Tooltip/Spotlight/DisabledStateHelper đều từ React Native core: `View` absolute positioning + `measureInWindow` (native) / `getBoundingClientRect` (web, qua RN-web node).
   - Lý do: tránh dep ngoài nặng; position math là logic thuần → để vào `src/lib/guidance-position.ts` test được bằng Jest (truyền rect giả, assert kết quả).

2. **Tách position math thành pure lib test được**
   - `guidance-position.ts`: `computeTooltipPosition({targetRect, tooltipSize, screen, placement, margin})` → `{x, y, placement}` sau khi flip/clamp; `buildSpotlightBands(targetRect, screen, dimColor)` → 4 band để làm mờ.
   - Không import react-native trong file này — nhận Rect thuần → dễ unit test mọi case flip/clamp.

3. **Storage layer tách riêng** — `guidance-storage.ts`
   - Key convention: `guidance.tour.<tourId>.seen` · `guidance.tour.<tourId>.step.<stepId>.completed` · `guidance.feature.<featureKey>.dismissed`.
   - API async: `hasSeenTour/setSeenTour`, `hasStepCompleted/setStepCompleted`, `hasFeatureDismissed/setFeatureDismissed`. Fail-open (lỗi AsyncStorage → coi như chưa xem, không chặn luồng).

4. **State management: GuidanceProvider (context) + useGuidance()**
   - `GuidanceProvider` mount ở root `_layout.tsx` (trong I18nGate). Giữ: tour hiện tại (tourId, steps, currentStepIndex), tập ref element target (`Map<targetKey, RefObject>`), trạng thái overlay hiện/ẩn.
   - `useGuidance()` trả: `registerTarget(key)`, `startTour(tourId, steps, opts)`, `next/skip/done`, `dismissFeature(key)`, `disabledHelper(ref, reasonKey, unlockKey)`.
   - Màn hình đăng ký element: `const quickPlanRef = registerTarget('quickPlan')` → `<TouchableOpacity ref={quickPlanRef}>`. Khi tour active, provider đo rect qua ref → set spotlight/tooltip.

5. **Trigger show-once**
   - `startTour` check `hasSeenTour(tourId)` + điều kiện user mới (màn hình tự truyền `isNewUser` — Dashboard dùng `latestScore == null && openExecs.length === 0`, cùng điều kiện card guide cũ). Nếu đã xem/skip → không hiện. Sau khi user bấm Done/Skip → `setSeenTour`.
   - FeatureBadge: hiện nếu `!hasFeatureDismissed(key)`; dismiss khi user bấm badge (hoặc gọi `dismissFeature`).

6. **DisabledStateHelper — cơ chế bắt tap khi disabled**
   - Wrap nút trong `View` (có ref để đo). Khi `disabled=true`: overlay một `Pressable` trong suốt phủ lên nút (nút gốc vẫn giữ visual disabled) — bắt tap → hiện tooltip/modal lý do + unlock. Khi `disabled=false`: không render overlay, nút hoạt động bình thường.
   - Tooltip hiện trong chính wrapper (absolute, position tính từ rect đo được) — không cần portal vì placement clamp trong màn hình.

7. **i18n keys** — thêm section `guidance` vào vi.json/en.json:
   - `guidance.badgeNew` ("Mới"/"New"), `guidance.skip/done/next`, `guidance.stepOf` ("Bước {{current}}/{{total}}"), `guidance.dashboardTour.step1/step2.*` (title/body cho Quick Plan + Journal), `guidance.saveDisabled.reason/unlock` (Settings).

8. **Test**
   - `guidance-position.test.ts`: placement đủ chỗ / flip khi thiếu chỗ / clamp mép màn hình / căn giữa theo target.
   - `guidance-storage.test.ts`: seen/stepCompleted/dismissed round-trip (AsyncStorage mock), fail-open khi lỗi.
   - `guidance-trigger.test.ts` (nếu tách): show-once logic (đã xem → không hiện; user mới → hiện; user cũ → không hiện).
   - Component test: FeatureBadge ẩn sau dismiss; DisabledStateHelper hiện tooltip khi tap disabled (react-test-renderer + act theo pattern có sẵn).

## Risks / Trade-offs

- [Measure chênh lệch khi ScrollView cuộn → rect sai] → Đo lại rect mỗi khi step kích hoạt + `useWindowDimensions` deps; chấp nhận giới hạn (tour dashboard trỏ element đầu màn hình, ít cuộn).
- [Web: measureInWindow không có sẵn trên node RN-web] → guard `typeof node.measureInWindow === 'function'` else dùng `getBoundingClientRect`.
- [Tooltip tràn khi tooltip lớn hơn màn hình (hiếm)] → clamp tối thiểu `margin`, chấp nhận tooltip phủ 1 phần.
- [Test component với Animated/Portal phức tạp] → giữ overlay đơn giản (View absolute, không portal, không animation bắt buộc).

## Migration Plan

1. Pure libs + test: `guidance-position.ts`, `guidance-storage.ts`, `guidance-triggers.ts` (nếu cần tách) → test pass.
2. Components: `guidance-context.tsx` (provider + hook), `feature-badge.tsx`, `tooltip.tsx`, `spotlight-overlay.tsx`, `disabled-state-helper.tsx`.
3. i18n keys vi/en.
4. Tích hợp: root `_layout.tsx` mount provider; `(main)/index.tsx` tour 2 bước; `(main)/settings.tsx` FeatureBadge + DisabledStateHelper.
5. Full verify: tsc 0 · lint 0 · jest (242 + test mới) · `expo export --platform android` + `--platform web` (đụng native measure — verify cả 2).
6. Cập nhật docs + decision log state.md (ADR: tự build không dep, position math pure, trigger show-once).
