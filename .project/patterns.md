# Patterns — Quy ước code

## Navigation (bắt buộc)

- **`router.back()` thuần → CẤM.** Luôn dùng `safeBack(router, fallback)` từ `src/lib/navigation.ts` — back nếu có stack, ngược lại `replace(fallback)` (deep-link không kẹt).
- **Onboarding → CẤM dùng `safeBack`** (dùng `replace` nên canGoBack về login → loop). Dùng `router.replace('/(onboarding)/bước-trước')`.
- Deep-link vào màn hình cần dữ liệu (vd `trade-detail?id=`) phải xử lý thiếu param → không treo spinner vĩnh viễn.

## Data fetching (màn hình)

Pattern chuẩn (đã áp dụng khắp nơi):
```tsx
const load = useCallback(async () => { ... setLoading(true); ...; setLoading(false); }, [user]);
useEffect(() => { load(); }, [load]);
```
⚠️ **Bẫy vòng lặp vô hạn**: KHÔNG đưa state do chính `load` set vào deps của useCallback nếu set bằng tham chiếu mới mỗi lần (`setSymbols([...])`). Đã từng xảy ra crash ở portfolio-risk (fix 2026-08-17).

⚠️ **Bẫy spinner vĩnh viễn**: nếu `!user` return sớm phải `setLoading(false)` trước — hoặc dựa vào protected route (đủ vì `(main)` luôn có user).

## Fetch bảng con theo ngữ cảnh thời gian

- Query bảng precomputed (vd `plan_vs_reality_deltas`) chỉ filter `user_id` sẽ gộp TOÀN LỊCH SỬ → sai khi cần số liệu tuần.
- Đúng cách: fetch executions tuần (có `id`), rồi filter delta theo `trade_execution_id ∈ set(lệnh tuần)`.

## Tier gating (Free/Pro)

- Nguồn tier: `auth-context` → `getProStatus(tier, expiresAt)` (`src/lib/tier.ts`) — Pro chỉ tin khi `expires_at > now`.
- `isPro()` trả boolean cho gating; `formatHoursLeft()` cho text UI.
- Màn hình Pro-gated (vd correlation matrix, trend chart) hiện gate card + nút "Mở Pro →" thay vì ẩn lặng.

## Ads (AdMob)

- **Cấu hình duy nhất ở `src/lib/ads-config.ts`**: `TEST_ADS` (mặc định `true` → test ad units của Google, không bị giới hạn tài khoản), `TEST_DEVICE_IDS`, `getAdUnitId(kind)`.
- Banner bottom: `src/components/ad-banner.native.tsx` — `useSafeAreaInsets().bottom` cho padding (không bị 3 nút Android che).
- Rewarded: `showRewardedAd()` (admob.native.ts) → `unlockProViaAd()` (pro-unlock.ts).
- **Cooldown**: sau mỗi rewarded phải chờ `AD_REWARD_COOLDOWN_MS` (5 phút, `ad-cooldown.ts`) — check trước khi hiện ad, ghi sau khi rewarded, fail-open nếu lưu lỗi.
- `initAdMob()` gọi 1 lần trong `(main)/_layout` useEffect.

## Platform split

- Component/lib dùng native-only package (google-mobile-ads, webview) → tách `*.native.ts(x)` + web stub `*.ts(x)`. Giữ API 2 bên giống nhau.

## Business logic (lib/)

- **Mọi công thức nghiệp vụ nằm ở `src/lib/*.ts` thuần (không import react-native) → test được bằng Jest.**
- KHÔNG nhúng công thức vào màn hình (trừ derived state đơn giản).
- KHÔNG tự sáng tạo công thức — giữ đúng mvp_scope/data_model; nếu công thức sai → báo user trước, không tự sửa.
- Logic thuộc vùng rủi ro (tính tiền/risk, phân quyền, ngưỡng giới hạn) → có unit test bắt buộc + cân nhắc ADR.

## Error handling

- **Analytics** (`trackEvent`): không bao giờ throw/chặn luồng — try/catch + `console.warn`.
- **Edge function invoke** (compute-deltas): `.catch(() => {})` — không chặn luồng chính nếu chưa deploy.
- **AsyncStorage** (cooldown): fail-open — lỗi lưu không chặn quyền Pro.
- Insert audit phụ (pro_unlocks): fail chỉ warn, không rollback quyền chính.

## Feature flags (đọc từ DB, không hardcode)

- Flag điều khiển tính năng theo môi trường/bật-tắt không cần release → lưu bảng `feature_flags`, đọc qua hàm async (`isInstantAuditEnabled()` trong `instant-audit.ts`).
- **Fail-closed**: DB lỗi → fallback false (tính năng gate TẮT), không bao giờ tự bật.
- Đúng pattern từ data_model mục 13: seed mặc định trong schema.sql.

## Ngưỡng thống nhất 30 lệnh

- Mọi tính năng pattern thống kê dùng `MIN_CLOSED_TRADES = 30` (cost: 30 tổng + 3 lệch; setup: 30; danger-zone: 30 + pattern ≥5 lần).
- Dưới ngưỡng → KHÔNG hiện con số/kết luận; hiện "Cần thêm dữ liệu"/progressText (setup-analytics hiện tiến độ X/30, không ẩn hoàn toàn).
- Không hạ ngưỡng để demo — test assert hằng số (cost 12/30, danger-zone 25 lệnh ẩn...).

## Guard symbol không hỗ trợ

- Symbol từ dữ liệu ngoài (import MT4) có thể ngoài `SYMBOL_PIP_CONFIG` (GBPUSD, EURJPY, USDCAD...) → **LUÔN check `isSupportedSymbol` trước khi gọi `pipValuePerLot`/`pipStep`** — cast `as SymbolKey` rồi đọc cfg undefined = TypeError CRASH cả màn hình (đã từng xảy ra ở cost-of-indiscipline, fix 2026-08-17).
- Hàm trả 0/null an toàn cho symbol lạ, không suy đoán, kèm test không-crash.

## Test

- Jest + jest-expo, mock AsyncStorage in-memory (không dùng `require()` → lint `no-require-imports`).
- **`jest.setup.js`**: mock AsyncStorage TOÀN CỤC — nhiều lib giờ import `supabase.ts` (kéo theo AsyncStorage) → null trong jest; setup mock trước khi test chạy (đã đăng ký trong package.json `setupFiles`).
- Suite theo file lib: `src/lib/__tests__/<tên>.test.ts`.
- **UI snapshot test** (disclaimer, gating): `react-test-renderer` + `act()` (React 19 bắt buộc); text node bị tách khoảng trắng giữa `$` và số → normalize whitespace 2 phía khi assert; không bỏ hết space (phá tiếng Việt).
- Yêu cầu tối thiểu: **mọi công thức** (lot size, delta, violations, discipline score, interruption, ATR, portfolio risk, cooldown, MT4 parser, cost-of-indiscipline, setup-analytics, danger-zone, discipline-streak, notification-content, instant-audit) có test — hiện 226 test / ~20 suite.
- Test màn hình (fetch logic): chưa có — các bug fetch (vòng lặp, filter tuần) nằm ở lớp này, review code phải soi kỹ.

## Lint/Typecheck

- `npx tsc --noEmit` + `npm run lint` (trong `apps/mobile`) — phải 0 lỗi trước khi báo xong.
- `npx jest` — full suite.
- Bundle check khi đụng native: `npx expo export --platform android` + `--platform web` (web export bắt lỗi native-only import).
