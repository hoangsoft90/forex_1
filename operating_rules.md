# operating_rules.md — Quy tắc riêng của Trading Discipline OS

> Chỉ chứa RULE cụ thể của project này — KHÔNG lặp lại AGENTS.md (hạ tầng chung) hay `.project/ai-rules.md` (bản chi tiết). Nếu mâu thuẫn: user tường minh > AGENTS.md > file này.

## Quy tắc nghiệp vụ (bất biến)

1. **Công thức = mvp_scope, không sáng tạo**: lot size, Discipline/Edge score, delta ngưỡng 5 pip / 0.2% / không dời SL, violation ngưỡng (1.5x, 10 phút, 2 lần SL, 1.8x lot), interruption 2 tầng (<15 lệnh cohort / ≥15 personal). Công thức thấy sai → báo user, không tự sửa.
2. **Adaptive chỉ GIẢM risk**: `suggest = min(adjusted, base)` trong `atr.ts` + trigger DB `direction='decrease'` — không xóa/nới lỏng, không có đường tăng tự động.
3. **Free tối đa 3 luật / Pro không giới hạn** (mục 12): check `canAddRule(activeCount, tier)` — đừng bao giờ truyền `activeCount + 1` (bug đã từng xảy ra, chặn lần thứ 3).
4. **Tier Pro chỉ tin khi `subscription_expires_at > now`** — `isPro()` check lúc đọc, không cần job xóa.

## Quy tắc dữ liệu

5. **Đừng filter bảng precomputed (deltas/violations) chỉ bằng `user_id` khi cần số liệu theo tuần** — phải lọc theo `trade_execution_id` của các lệnh trong kỳ (bug đã fix 2026-08-17).
6. **Đừng insert dữ liệu rác để "giữ chỗ"** — vd lệnh lot 0/entry 0 (đã fix: confirm-no-plan giờ điều hướng sang widget). Mọi execution phải là dữ liệu thật.
7. **Pro unlock qua ad**: ghi `pro_unlocks` audit (fail chỉ warn, không rollback Pro); upsert `user_profiles` với hạn CỘNG DỒN nếu đang Pro.
8. **Cooldown rewarded 5 phút** — check trước khi hiện ad (`ad-cooldown.ts`), fail-open nếu AsyncStorage lỗi.

## Quy tắc kỹ thuật riêng

9. **Navigation**: mọi nút back = `safeBack(router, fallback)`; onboarding KHÔNG dùng safeBack (dùng `replace` bước trước — canGoBack sẽ về login → loop). Màn hình nhận deep-link param (vd `trade-detail?id=`) phải xử lý thiếu/sai id → không treo spinner.
10. **Fetch màn hình**: `useCallback` deps KHÔNG được chứa state do chính nó set bằng tham chiếu mới (`setX([...])`) → vòng lặp vô hạn (đã crash portfolio-risk). `!user` return sớm phải `setLoading(false)` trước.
11. **Ads**: sửa config DUY NHẤT ở `src/lib/ads-config.ts` (`TEST_ADS`, `TEST_DEVICE_IDS`, `getAdUnitId`). Giữ `TEST_ADS=true` khi chưa có AdMob account thật. Package native-only → `.native.ts(x)` + web stub.
12. **Edge function**: deploy từ ROOT repo (`supabase functions deploy <tên>`); `verify_jwt=true` trong `config.toml`; không deploy từ `supabase/`.
13. **Verify tối thiểu trước khi báo xong** (trong `apps/mobile`): `npx tsc --noEmit` · `npm run lint` · `npx jest` — cả 3 phải sạch; đụng native/package mới thêm `npx expo export --platform android` + `--platform web`.

## Cấm kỵ

14. Không đổi schema/trigger/công thức khi chưa hỏi user.
15. Không commit `.env`/token/secrets — verify `git status` trước commit; git config placeholder → dùng `GIT_AUTHOR_NAME/EMAIL` env.
16. Không thêm dịch vụ ngoài (PostHog, SMS, payment) khi chưa được yêu cầu rõ.
17. Không hạ targetSdk < 36 (Google Play yêu cầu từ 31/8/2026).
