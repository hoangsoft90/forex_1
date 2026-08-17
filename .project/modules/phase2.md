# Phase 2 — 4 Module (AdMob/Pro, Chart, Portfolio Risk, Adaptive)

> Spec OpenSpec: `openspec/changes/phase2-mvp/specs/`. Trạng thái: **tất cả code xong + verified** (129 → 147 test với cooldown).

## P2-M1 — AdMob → Pro 24h ✅
- **Files**: `lib/ads-config.ts` (config duy nhất: `TEST_ADS`, test/prod IDs, `TEST_DEVICE_IDS`), `lib/admob.native.ts` + web stub, `lib/tier.ts`, `lib/pro-unlock.ts`, `lib/ad-cooldown.ts`, `components/ad-banner.native.tsx` + web stub, `(main)/pro`, bảng `pro_unlocks` (migrations-phase2.sql).
- Luồng: xem rewarded ad (cooldown 5 phút) → upsert `user_profiles.tier='pro'` +24h (cộng dồn hạn) → insert `pro_unlocks` audit.
- **Verified thật**: upsert Pro +24h lên DB OK; `pro_unlocks` chưa chạy migration → insert fail nhưng quyền Pro vẫn hoạt động (graceful).
- Bottom banner mọi màn hình `(main)`, padding safe-area inset (không bị 3 nút Android che).
- ⚠️ Cần: AdMob account thật (App ID + unit IDs), đổi `TEST_ADS=false` khi ra mắt, dev build (không chạy Expo Go).

## P2-M2 — TradingView Chart ✅
- **Files**: `components/tradingview-chart.native.tsx` (WebView embed widget v3, `tvSymbol()` map FX:/OANDA:) + web stub (iframe).
- Tích hợp: `new-plan` (chart symbol đang chọn) + `trade-detail` (chart của lệnh). Fail → placeholder, không crash.
- ⚠️ Cần network; WebView là native module → dev build.

## P2-M3 — Portfolio Risk / Correlation ✅
- **Files**: `lib/portfolio-risk.ts`, `(main)/portfolio-risk`.
- Tổng risk dồn vị thế mở; ngưỡng `min(maxRiskPerTrade×3, maxDailyLoss)`; level ok/warn/danger; ma trận correlation **Pro-gated**.
- ⚠️ Correlation = hệ số ƯỚC LƯỢNG theo quy ước thị trường (EURUSD↔USDJPY +0.35, EURUSD↔XAUUSD −0.2...) — chưa tính từ dữ liệu thật, UI ghi rõ.
- 🔴 Đã fix vòng lặp vô hạn (2026-08-17): bỏ `symbols` khỏi useCallback deps.

## P2-M4 — Adaptive Rules theo ATR ✅
- **Files**: `lib/atr.ts` (trueRange/averageTrueRange/suggestAdaptiveRisk), UI cấu hình trong `constitution-settings` (rule max_risk_per_trade), tích hợp `new-plan` (banner adaptive + chặn nhập risk > đề xuất + lưu `applied_adaptive_condition_id`).
- **Nguyên tắc khóa cứng**: chỉ GIẢM risk — `suggest = min(adjusted, base)`; trigger DB chặn insert `direction='increase'` (**đã verify thật**: insert adjusted 2 > base 1 bị từ chối).
- ⚠️ ATR hiện tại = giá trị ƯỚC LƯỢNG theo symbol (XAUUSD 24/15, USDJPY 0.9/0.8, EURUSD 0.0018/0.0012) — UI ghi rõ "ước lượng tham chiếu"; Phase 3 cần nguồn giá thật.

## Kiểm chứng Phase 2
- 50 test mới (tier 13 + portfolio 20 + atr 17) + 18 cooldown (nâng tổng 147) · TSC/lint sạch · bundle Android + web OK · test thật Supabase: upsert Pro, trigger chặn tăng adaptive, plan lưu `applied_adaptive_condition_id`.
