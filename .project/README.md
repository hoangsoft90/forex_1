# .project/ — Knowledge Item của Trading Discipline OS

> Entry point cho bất kỳ AI agent nào bắt đầu làm việc trên repo này.
> Đọc README này trước, rồi mở các file theo nhu cầu.

## Đọc theo thứ tự

| File | Khi nào cần |
|---|---|
| [overview.md](overview.md) | Bắt đầu session — mục đích, stack, cấu trúc thư mục |
| [architecture.md](architecture.md) | Sửa schema/API/luồng dữ liệu, thêm edge function, hiểu data model |
| [patterns.md](patterns.md) | Viết code mới — quy ước navigation, tier gating, test, platform split |
| [state.md](state.md) | Nắm tiến độ, todo, bug còn lại, quyết định đã chốt |
| [ai-rules.md](ai-rules.md) | Quy tắc bắt buộc khi AI code trên project (đọc TRƯỚC khi code) |
| [modules/](modules/) | Chi tiết từng module: Phase 1 (9) · Phase 2 (4) · Retention Layer (9) |

## TL;DR (60 giây)

- **App**: Trading Discipline OS — app kỷ luật giao dịch forex (Expo/React Native + Supabase).
- **Giai đoạn**: Phase 1 (9 module, MVP core) ✅ · Phase 2 (4 module: AdMob→Pro, TradingView chart, Portfolio Risk, Adaptive Rules ATR) ✅ · **Retention Layer (9 module 0–8: parser fix, Fast Plan, Today Dashboard, Instant Audit, Cost of Indiscipline, Setup Analytics, Danger Zone, Discipline Streak, Push Notification)** ✅ code xong + review.
- **Trạng thái code**: TSC 0 · lint 0 · **226/226 test** · bundle Android + web OK · workflow GH Actions build debug APK hoạt động.
- **⚠️ Việc đang treo (xem [can_lam.md](../../can_lam.md) ở root — 12 việc phân ưu tiên)**: chạy SQL mục 13 (`notification_preferences` + `feature_flags`) trên SQL Editor · deploy lại edge `parse-mt4` · **user revoke GH token cũ đã lộ trong chat** · cung cấp export MT4 thật để mở gate `INSTANT_AUDIT_ENABLED` (M3 vẫn chạy fallback quiz) · commit + push toàn bộ diff đang treo.
