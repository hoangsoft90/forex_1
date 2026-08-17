## 1. Module P2-M1 — AdMob rewarded → Pro 24h

- [x] 1.1 Cài `react-native-google-mobile-ads` (expo prebuild config plugin) + env vars `EXPO_PUBLIC_ADMOB_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID`
- [x] 1.2 Thêm bảng `pro_unlocks` vào schema.sql (user_id, granted_at, granted_until, method) + RLS
- [x] 1.3 Viết `src/lib/admob.ts` (load + show rewarded ad, callback reward) — handle gracefully khi thiếu config
- [x] 1.4 Viết `src/lib/tier.ts` — `isPro(profile)` check `subscription_expires_at > now()`
- [x] 1.5 Màn hình "Mở Pro" (Settings/Score): xem ad → upsert profile tier=pro + expires=+24h + insert pro_unlocks
- [x] 1.6 Unit test: logic isPro, upsert Pro 24h (không có test native ad — mock)

## 2. Module P2-M2 — TradingView Widget chart

- [x] 2.1 Cài `react-native-webview`
- [x] 2.2 Viết `src/components/tradingview-chart.tsx` (WebView nhúng TradingView advanced widget, prop symbol)
- [x] 2.3 Tích hợp vào màn hình tạo plan `(main)/new-plan` (đồng bộ symbol đang chọn)
- [x] 2.4 Tích hợp vào `(main)/trade-detail` (chart của symbol lệnh đó)

## 3. Module P2-M3 — Portfolio Risk / Correlation

- [x] 3.1 Viết `src/lib/portfolio-risk.ts`: tổng risk dồn (sum risk % lệnh mở), cảnh báo vượt ngưỡng (max_risk_per_trade × 3 hoặc max_daily_loss), correlation coefficient giữa cặp symbol
- [x] 3.2 Unit test portfolio-risk (tổng risk, ngưỡng, correlation — ít nhất 10 case)
- [x] 3.3 Màn hình `(main)/portfolio-risk` (danh sách lệnh mở + tổng risk + cảnh báo + correlation ma trận)

## 4. Module P2-M4 — Adaptive Rules theo ATR

- [x] 4.1 Viết `src/lib/atr.ts`: tính ATR từ OHLC, đề xuất adjusted_value (GIẢM), so sánh với base_value — validate adjusted <= base
- [x] 4.2 Unit test atr.ts (ít nhất 10 case — ATR cao/trung bình/thấp, không cho tăng)
- [x] 4.3 UI gắn adaptive condition cho rule (trong constitution-settings): chọn condition_type=atr_threshold, nhập condition_value + adjusted_value
- [x] 4.4 Form plan: nếu có adaptive condition active + ATR vượt ngưỡng → hiển thị risk đề xuất giảm + `applied_adaptive_condition_id`
- [x] 4.5 Màn hình Portfolio Risk hiển thị adaptive nếu có

## 5. Tổng hợp Phase 2

- [x] 5.1 Chạy toàn bộ test/lint/typecheck (Phase 1 + 2)
- [x] 5.2 Báo cáo tổng Phase 2 (AC từng module + giả định + điều cần user làm: tạo AdMob account, dev build)
