# Design: app-i18n

## Context

Xem proposal.md (Why/What). App hardcode tiếng Việt ở ~28 màn hình `src/app/**`, ~15 lib `src/lib/*.ts` sinh nội dung động, 1 edge function đang được client gọi (`parse-mt4`), 226 test assert chuỗi tiếng Việt. Không có schema/DB change trong change này.

## Goals / Non-Goals

**Goals**: Hệ thống i18n 2 ngôn ngữ đợt này (vi/en) — kiến trúc mở rộng được (thêm ngôn ngữ = thêm file json + 1 dòng danh sách); migrate toàn bộ UI + nội dung động + edge `parse-mt4`; test tự động bắt key thiếu; giữ 226 test cũ pass.

**Non-Goals**:
- KHÔNG dịch comment, tên biến, chuỗi log debug.
- KHÔNG thêm ngôn ngữ khác ngoài 6 (kiến trúc sẵn sàng, chỉ thêm file json).
- KHÔNG đụng edge `weekly-audit` (client không gọi — UI tự sinh qua `weekly-audit.ts`); `detect-violations`/`compute-deltas` không có message UI.
- KHÔNG lưu preference ngôn ngữ vào DB (giữ local AsyncStorage — không đổi schema/RLS).
- KHÔNG localize riêng bản web ngoài i18n chung.

## Decisions

1. **Thư viện: `i18next` + `react-i18next` + `expo-localization`**
   - `react-i18next` cho components (`useTranslation` hook — tự re-render khi `changeLanguage`), `i18next` headless cho pure lib (`i18next.t` — không cần React).
   - `expo-localization` lấy locale thiết bị (có web support sẵn; nếu gặp issue web → tách `.native.ts` + web stub theo pattern project).
   - Loại bỏ custom context: scope quá lớn (1281 dòng string), i18next cho sẵn interpolation/plural/fallback/namespaces — ponytail chọn thư viện có sẵn đúng việc.

2. **Pure lib dùng `i18next.t` trực tiếp — KHÔNG đổi signature hàm**
   - Các hàm (`weekly-audit.ts`, `notification-content.ts`, `danger-zone.ts`, `cost-of-indiscipline.ts`, `setup-analytics.ts`, `discipline-streak.ts`, `weakness-quiz.ts`, `instant-audit.ts`, `risk-engine.ts`, `violations.ts`, `interruption.ts`) gọi `i18next.t(key)`.
   - Lý do: giữ nguyên API (caller + 226 test không vỡ). Jest: init i18next `lng: 'vi'` trong `jest.setup.js` → test cũ assert tiếng Việt vẫn pass.
   - Phương án thay thế (tiêm `t()` làm param) bị loại: đổi signature mọi hàm + mọi caller + mọi test — thay đổi lan rộng không cần thiết.

3. **Detect + persist + khởi tạo**
   - `src/i18n/index.ts`: init i18next (resources 2 lang: vi/en, `fallbackLng: 'vi'`, `returnNull: false`), danh sách `SUPPORTED_LANGS = ['vi','en']` — thêm ngôn ngữ sau chỉ cần thêm vào đây + file json; hàm `resolveInitialLanguage()` — đọc preference AsyncStorage (`app_lang`) → nếu có dùng; nếu chưa → `expo-localization.getLocales()[0].languageCode` so khớp `SUPPORTED_LANGS` → nếu không khớp `'vi'`.
   - Root layout (`_layout.tsx`) await resolve trước khi render (splash giữ nguyên); `changeLanguage(lang)` + lưu AsyncStorage khi user đổi trong Settings.
   - Khóa key dạng `<nhóm>.<tên>` (vd `dashboard.title`, `weeklyAudit.intro`) — 1 namespace duy nhất.

4. **Settings — màn chọn ngôn ngữ**
   - Thêm section "Ngôn ngữ" trong `(main)/settings.tsx`: render danh sách từ `SUPPORTED_LANGS` với tên native (đợt này: Tiếng Việt / English), đánh dấu ngôn ngữ đang dùng, tap → `changeLanguage` + persist (áp dụng ngay, không restart). Thêm ngôn ngữ sau = thêm vào `SUPPORTED_LANGS` + file json — Settings tự hiện thêm, không sửa UI.

5. **Edge `parse-mt4` nhận `lang`**
   - Body invoke thêm `lang?` (`'vi' | 'en'`, mặc định `'vi'`); message thành công + `errorLines[].reason` lấy từ dictionary message nhỏ trong edge function theo lang; logic parse KHÔNG đổi. Redeploy từ root. Thêm ngôn ngữ sau = thêm dòng vào dictionary edge.
   - `weekly-audit` edge bỏ qua (unused). Client invoke parse-mt4 truyền `lang` hiện tại.

6. **Test**
   - `jest.setup.js`: init i18next `lng:'vi'` (trước khi test chạy — pattern đã có sẵn cho AsyncStorage).
   - Test mới: resolve language (preference thắng / fallback vi), switch + persist, **so khớp key 6 ngôn ngữ** (không thiếu/không thừa), banned words notification cho từng ngôn ngữ, disclaimer không rút gọn (snapshot đa ngôn ngữ), nội dung động `en` đúng template.
   - Không viết test cho từng màn hình migrate (khối lượng string) — bắt bằng tsc/lint + so-khớp-key + snapshot chính.

## Risks / Trade-offs

- [Khối lượng dịch 2 ngôn ngữ vẫn lớn (~1.281 dòng string)] → Dịch cẩn thận bản đầu; test không-thiếu-key chặn lỗi cấu trúc; thuật ngữ thống nhất trong docs (lot/risk/plan/score). Các ngôn ngữ zh/ja/ko/es bị gác lại đợt này — chất lượng MT cần refine native khi làm.
- [i18next chưa init khi pure lib gọi trong test] → Init trong jest.setup trước; `fallbackLng:'vi'` đảm bảo key luôn có bản.
- [Đổi ngôn ngữ re-render toàn app] → Chấp nhận (app vừa, không có state global ngoài AuthProvider); `useTranslation` xử lý sẵn.
- [expo-localization native trên web] → Verify `expo export --platform web`; nếu fail → web stub theo pattern `*.native.ts`/`*.ts`.
- [Snapshot test UI assert tiếng Việt] → Jest giữ `lng:'vi'`; nếu cần test snapshot EN → init riêng trong test đó.

## Migration Plan

1. Cài deps (`i18next`, `react-i18next`, `expo-localization`) → `src/i18n/` + locales vi/en + jest.setup + root layout init + test i18n base → verify TSC/jest.
2. Migrate theo nhóm, chạy test từng bước: (a) auth + onboarding, (b) main screens (Settings có picker ngôn ngữ), (c) lib nội dung động, (d) edge parse-mt4 + redeploy.
3. Full verify: tsc 0 · lint 0 · jest (226 cũ + test mới) · `expo export --platform android` + `--platform web` (native package mới).
4. Cập nhật docs (.project, working.md) + ADR (chọn i18next + pure-lib-headless + không đổi signature; scope vi/en đợt này, mở rộng sau).

## Open Questions

Không — các quyết định ảnh hưởng scope đã hỏi user trước khi viết artifacts (6 ngôn ngữ, scope full, auto-detect + Settings, i18next).
