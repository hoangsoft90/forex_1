## Why

Phase 1 đã build xong một vòng lặp hành vi hoàn chỉnh (Onboarding → Rules → Plan → Interruption → Execution → Delta → Score → Weekly Audit) và đã deploy lên Supabase project thật. Phase 2 tiếp tục 4 hướng đã được user chốt (chọn từ danh sách "để lại Phase 2" của mvp_scope.md mục 0):

1. **Monetization thay cho gói Pro trả phí**: chưa có hạ tầng thanh toán (Momo/VNPay cần merchant account, App Store/Play Store IAP phức tạp) → dùng **AdMob rewarded ads** để user xem quảng cáo và nhận **mở Pro có thời hạn 24h** — mô hình quen thuộc với user VN, giữ 100% free ở giai đoạn này.
2. **Market data + chart**: nhúng **TradingView Widget** (như mvp_scope mục 0 gợi ý — "dùng TradingView Widget nhúng nếu cần hiển thị giá, không tự vẽ") để user thấy giá/chart ngay trong màn hình tạo plan.
3. **Portfolio Risk / Correlation**: phân tích rủi ro tổng danh mục + tương quan giữa các vị thế mở.
4. **Adaptive Rules theo ATR**: rule tự động **GIẢM** risk khi ATR cao (khung dữ liệu `rule_adaptive_conditions` đã có trong schema Phase 1, chỉ làm logic + UI).

**Ràng buộc bắt buộc từ plan1_final_v2.md mục 3:** Adaptive Rules chỉ được phép tự động điều chỉnh **GIẢM** risk — mọi điều chỉnh tăng so với baseline phải đi qua Decision Interruption + ghi lý do vào Journal. App không bao giờ tự động nới lỏng luật.

## What Changes

- **P2-M1 — AdMob rewarded → Pro 24h:** cài `react-native-google-mobile-ads` (Expo không còn hỗ trợ AdMob out-of-box; `expo-ads-admob` deprecated), màn hình "Xem quảng cáo mở Pro 24h", ghi nhận reward → cập nhật `user_profiles.subscription_tier='pro'` + `subscription_expires_at = now()+24h`, thêm bảng `pro_unlocks` để audit (ai xem ad lúc nào). Yêu cầu: tài khoản AdMob + App ID + Ad Unit ID (user tự tạo, đưa qua env).
- **P2-M2 — TradingView Widget chart:** nhúng TradingView advanced chart widget (WebView) trong màn hình tạo plan + xem chi tiết trade, đồng bộ symbol đang chọn (EURUSD/XAUUSD/USDJPY).
- **P2-M3 — Portfolio Risk / Correlation:** tính tổng risk dồn (sum risk % lệnh mở), cảnh báo khi vượt ngưỡng, tương quan giữa các symbol mở (EURUSD↔XAUUSD↔USDJPY correlation coefficient), hiển thị màn hình Portfolio Risk.
- **P2-M4 — Adaptive Rules theo ATR:** UI gắn điều kiện ATR cho rule (`rule_adaptive_conditions`), tính ATR từ dữ liệu giá (TradingView/API đơn giản hoặc dữ liệu tay), khi ATR > ngưỡng → tự động đề xuất `adjusted_value` (GIẢM, khóa `direction='decrease'` ở DB + API layer), plan mới nhận `applied_adaptive_condition_id`, hiển thị rõ "risk đã giảm theo ATR" trong form plan.

## Capabilities

### New Capabilities

- `admob-pro-unlock`: Xem rewarded ad → nhận Pro 24h, audit qua bảng `pro_unlocks`, hiển thị trạng thái Pro còn hạn trong Settings.
- `market-chart`: TradingView Widget nhúng (WebView), đồng bộ symbol, dùng trong tạo plan + chi tiết trade.
- `portfolio-risk`: Tổng risk dồn + correlation giữa vị thế mở, cảnh báo vượt ngưỡng.
- `adaptive-rules`: Gắn điều kiện ATR cho rule, tự động giảm risk khi ATR cao, ghi `applied_adaptive_condition_id` vào plan.

### Modified Capabilities

- `trading-constitution` (Phase 1): màn hình rule thêm phần cấu hình Adaptive condition.
- `trade-planning` (Phase 1): form plan thêm TradingView chart + hiển thị adaptive risk nếu có.
- `discipline-score` (Phase 1): `bad_trades_prevented_count` và trend chart 4/12 tuần trước đây là Pro-only — giờ Pro được mở qua AdMob 24h thay vì trả phí.

## Impact

- **Code mới:** `apps/mobile/src/lib/admob.ts` (rewarded ads wrapper), `src/lib/portfolio-risk.ts` (tính correlation/tổng risk), `src/lib/atr.ts` (tính ATR + adaptive đề xuất), 3-4 màn hình mới.
- **Dependency mới:** `react-native-google-mobile-ads` (native module — cần dev build, KHÔNG chạy Expo Go), `react-native-webview` (TradingView embed).
- **Schema:** thêm bảng `pro_unlocks` (không sửa bảng có sẵn); `rule_adaptive_conditions` đã có từ Phase 1.
- **Env vars:** `EXPO_PUBLIC_ADMOB_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID`, `EXPO_PUBLIC_TRADINGVIEW_*` (nếu cần).
- **Deploy:** không thêm Edge Function mới (logic tính toán nằm client-side như Phase 1; ATR lấy dữ liệu từ TradingView embed hoặc API đơn giản).
- **Không làm:** thanh toán thật (Momo/VNPay), auto-sync MT4 (MetaAPI), AI Coach LLM, Economic Calendar, Accountability Circle UI.
