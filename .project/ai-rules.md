# AI Rules — Quy tắc bắt buộc khi làm việc trên project này

> Đây là layer quy tắc RIÊNG của project, bổ sung cho AGENTS.md (đọc cả hai).
> Nếu mâu thuẫn: chỉ dẫn user tường minh > AGENTS.md > file này.

## Trước khi code

1. **Đọc 3 tài liệu gốc** (khi làm việc liên quan phạm vi): `plan1_final_v2.md` ("tại sao"), `data_model.md` (schema — KHÔNG tự đổi cấu trúc bảng), `mvp_scope.md` (phạm vi + acceptance criteria).
2. **Công thức nghiệp vụ**: implement ĐÚNG công thức ghi trong mvp_scope, KHÔNG tự sáng tạo dù nghĩ "tốt hơn". Công thức có vấn đề → báo user trước, không tự sửa.
3. **KHÔNG thêm tính năng ngoài phạm vi** mvp_scope mục 0 (phần "KHÔNG bao gồm").
4. **Module mới/change mới** → tạo OpenSpec change (`openspec/changes/<tên>/)` trước khi code: proposal + design + specs + tasks. Tên change/spec KHÔNG bắt đầu bằng số.
5. Logic thuộc vùng rủi ro (tính tiền/risk, phân quyền, ngưỡng giới hạn, trigger DB) → cân nhắc lưu ADR + test bắt buộc.

## Trong khi code

6. **Business logic → `src/lib/*.ts` thuần** (không import react-native), màn hình chỉ gọi. Kèm unit test trong `src/lib/__tests__/`.
7. **Navigation**: mọi nút back dùng `safeBack(router, fallback)`; onboarding KHÔNG dùng safeBack (replace trực tiếp). Không để màn hình nào treo spinner vĩnh viễn khi thiếu dữ liệu (deep-link).
8. **Fetch dữ liệu**: cảnh giác vòng lặp vô hạn (state trong deps useCallback) — xem `patterns.md`. Lọc theo tuần/ngày phải kèm `trade_execution_id`/thời gian thật, không filter user_id trần.
9. **Platform split**: dùng package native-only → tách `.native.ts(x)` + web stub, giữ API 2 bên giống nhau, verify `expo export --platform web`.
10. **Ads**: chỉ sửa cấu hình ở `src/lib/ads-config.ts`. Giữ `TEST_ADS=true` trừ khi user yêu cầu ra mắt thật. Rewarded phải qua cooldown (`ad-cooldown.ts`).
11. **Edge function**: deploy từ root repo (`supabase functions deploy <tên>`), không từ `supabase/`. Giữ `verify_jwt=true`.
12. **Không commit secrets**: `.env`, key, token — đều đã trong .gitignore; verify bằng `git status`/dry-run trước commit.

## Trước khi báo "xong"

13. **Verify bắt buộc** (trong `apps/mobile`): `npx tsc --noEmit` = 0 lỗi · `npm run lint` = 0 · `npx jest` pass (226 test hiện tại, thêm test cho công thức mới).
14. Đụng native/package mới → chạy `npx expo export --platform android` + `--platform web`.
15. **Code review** theo AGENTS.md (OCR → Ponytail → Impact → Dead code → Pattern → Scope → Lessons) trước khi commit; task lớn phải chạy Task Completion Hook (ADR/memory/working.md).
16. Build APK để tìm lỗi native thật: theo skill `expo-build-debug-apk-gh` (push lên main → GH Actions → tải artifact), KHÔNG chỉ dựa vào `expo export`. Debug APK đã nhúng JS bundle (plugin `embed-js-in-debug` — `debuggableVariants = []` cho RN 0.86); nếu app cài vào máy không mở được (logcat "Unable to load script") → dùng skill `expo-apk-standalone`. Identity app hiện tại: package `com.trademind.trading`, tên "Trading Discipline OS" — KHÔNG dùng lại `com.hoangsoft90.mobile`.
17. Thay đổi schema/API → cập nhật ADR + nhắc user chạy migration trên SQL Editor.

## Cấm kỵ riêng project

- ❌ Không đổi schema (`data_model.md` / `schema.sql`) mà không hỏi user — bảng/field là ràng buộc cứng.
- ❌ Không đổi công thức risk/score/violation.
- ❌ Không xóa/nới lỏng ràng buộc "adaptive chỉ GIẢM" (trigger + logic atr.ts).
- ❌ Không thêm dịch vụ ngoài (analytics, SMS, payment) khi chưa được user yêu cầu — Phase 1 giữ 100% free.
- ❌ Không tự ý thay đổi targetSdk/build-tools xuống dưới 36 (Google Play yêu cầu từ 31/8/2026).
- ❌ Không commit `.env`/token (đã 1 lần dán token trong chat → đã nhắc user revoke).
