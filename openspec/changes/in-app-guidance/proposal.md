# Proposal: in-app-guidance — Hướng dẫn trong app & User Onboarding

## Why

App hiện hướng dẫn user mới bằng **text tĩnh** (card "How to start?" trên Dashboard) — dễ bỏ qua, không trỏ đúng vào element, không giải thích được vì sao nút bị disabled (vd nút Save khi đang loading), và không đánh dấu được tính năng mới (vd "Ngôn ngữ" vừa thêm ở app-i18n). User mới dễ lạc: không biết Quick Plan ở đâu, Journal để làm gì.

## What Changes

Thêm bộ **In-app Guidance & User Onboarding** gồm:

1. **FeatureBadge** — dot/label "New" gắn lên icon/button để đánh dấu tính năng mới; tự ẩn vĩnh viễn khi user đã xem (lưu AsyncStorage, không spam lại mỗi lần mở app).
2. **Tooltip & Spotlight** — highlight element target (làm mờ phần còn lại, spotlight hở đúng vị trí element), hiện popup hướng dẫn đính kèm. Vị trí tooltip **tự tính toán** dựa trên vị trí element target (measure qua ref), responsive theo kích thước màn hình, tự flip khi không đủ chỗ.
3. **DisabledStateHelper** — wrap nút disabled: khi user tap vào nút disabled → hiện tooltip/modal ngắn giải thích lý do bị khóa + điều kiện unlock (vd "Đang lưu... chờ giây lát").
4. **Tour từng bước** (GuidanceProvider + useGuidance): chuỗi step nối tiếp (Step 1 → Step 2 → Finish) có nút Skip / Done, lưu `stepCompleted` từng bước + `hasSeenTour` — **chỉ hiện 1 lần cho user mới**, không spam khi lặp lại action.

**Tích hợp thật (không chỉ thư viện chết):**
- Dashboard (`(main)/index.tsx`): tour 2 bước cho user mới — trỏ Quick Plan + Journal.
- Settings (`(main)/settings.tsx`): FeatureBadge "New" trên mục Ngôn ngữ; DisabledStateHelper quanh nút Save notifications.

## Capabilities

### New Capabilities

| Capability | Nội dung |
|---|---|
| `in-app-guidance` | FeatureBadge, Tooltip & Spotlight (auto-position), DisabledStateHelper, tour nhiều bước Skip/Done, lưu trạng thái đã-xem qua AsyncStorage, trigger chỉ-1-lần, i18n vi/en |

### Modified Capabilities

Không — tính năng mới độc lập, không sửa spec hiện có.

## Impact

- **Dependencies mới**: KHÔNG có (React Native core + AsyncStorage + i18n đã có sẵn) — tránh thư viện ngoài (vd react-native-copilot/react-native-onboarding) vì tự build đủ đơn giản với `measureInWindow` + Absolute positioning.
- **Files**: `src/lib/guidance-*.ts` (pure, test được) + `src/components/guidance/` (provider + 4 component) + migrate 2 màn hình (`index.tsx`, `settings.tsx`) + root `_layout.tsx` (mount provider) + i18n keys vi/en.
- **Tests**: unit test cho position math (flip/clamp khi thiếu chỗ), storage (hasSeen/stepCompleted), trigger (chỉ-1-lần, skip/done), component test (FeatureBadge ẩn sau khi xem, DisabledStateHelper hiện tooltip khi tap nút disabled).
- **ADR**: quyết định kiến trúc (tự build không thêm dep, position math thuần test được, trigger show-once qua AsyncStorage) → lưu decision log `.project/state.md`.
- **Rủi ro bảo mật**: không đổi auth/RLS/schema; không thêm field DB (trạng thái guidance lưu local AsyncStorage).
