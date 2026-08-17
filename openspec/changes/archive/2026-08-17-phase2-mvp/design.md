## Context

Xem proposal.md — Why. Phase 1 đã hoàn thành (9/9 module, 79 test, deploy Edge Functions). Phase 2 thêm 4 khả năng đã được user chốt: AdMob rewarded → Pro 24h, TradingView chart, Portfolio Risk/Correlation, Adaptive Rules ATR. Stack giữ nguyên: Expo SDK 57 (React Native, TypeScript, expo-router) + Supabase.

## Goals / Non-Goals

**Goals:**
- Mở khóa cơ chế monetization bằng AdMob rewarded ads (Pro 24h) — không cần hạ tầng thanh toán.
- Cho user thấy chart/giá trong luồng tạo plan (TradingView Widget nhúng — đúng gợi ý mvp_scope mục 0).
- Tính portfolio risk dồn + correlation giữa vị thế mở.
- Adaptive Rules: rule tự động GIẢM risk khi ATR cao, đúng nguyên tắc "chỉ giảm, không tăng" (plan v2 mục 3).

**Non-Goals:**
- KHÔNG tự động nới lỏng rule (tăng risk) — phải đi qua Decision Interruption.
- KHÔNG dùng LLM/AI model cho insight.
- KHÔNG tích hợp thanh toán thật (Momo/VNPay/IAP) — thay bằng AdMob.
- KHÔNG làm auto-sync MT4, Economic Calendar, Accountability Circle UI.

## Architecture Decisions

1. **AdMob:** dùng `react-native-google-mobile-ads` (invertase) — package chuẩn 2026, `expo-ads-admob` deprecated. Cần `expo prebuild` + dev build (không chạy Expo Go). Reward xác nhận qua callback `onRewarded` → gọi Supabase upsert `subscription_tier='pro'` + `subscription_expires_at=now()+24h` + insert `pro_unlocks`.
2. **Pro 24h:** không tạo bảng `subscriptions` (bảng đó dành cho thanh toán thật, có payment_provider check constraint); thêm bảng `pro_unlocks` (user_id, granted_at, granted_until, method='admob_rewarded') để audit + helper `isPro(user)` check `subscription_expires_at > now()`.
3. **Chart:** TradingView Widget nhúng qua WebView (react-native-webview). Symbol đồng bộ với form. Không tự vẽ chart.
4. **ATR:** tính ATR từ dữ liệu giá cơ bản (helper nhận OHLC đơn giản; Phase 2 dùng dữ liệu tay/giá hiện tại + ATR ước lượng theo cặp, không kéo realtime API — tránh chi phí và phụ thuộc nguồn ngoài). Đánh dấu rõ là "ATR ước lượng" trong UI.
5. **Correlation:** tính Pearson correlation giữa các cặp symbol từ dữ liệu giá hiện có (hoặc hệ số chuẩn giữa các cặp khi không đủ dữ liệu — đánh dấu là ước lượng tham chiếu).
6. **Tier gating:** `isPro()` dùng chung cho mọi nơi (score trend, portfolio risk, adaptive) — helper `src/lib/tier.ts`.

## Risks

- AdMob cần tài khoản + App ID + Ad Unit ID thật — chưa có thì app chạy nhưng không hiện ads (code phải handle gracefully).
- AdMob hạn chế quảng cáo ngành tài chính — fill rate có thể thấp.
- `react-native-google-mobile-ads` cần dev build — Expo Go không chạy được.
- Correlation/ATR dùng dữ liệu ước lượng — phải ghi rõ trong UI để không gây hiểu lầm (đúng tinh thần "không bịa insight").
