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
| [modules/](modules/) | Chi tiết từng module Phase 1 (9) + Phase 2 (4) + acceptance criteria |

## TL;DR (60 giây)

- **App**: Trading Discipline OS — app kỷ luật giao dịch forex (Expo/React Native + Supabase).
- **Giai đoạn**: Phase 1 (9 module, MVP core) ✅ code xong + verified · Phase 2 (4 module: AdMob→Pro, TradingView chart, Portfolio Risk, Adaptive Rules ATR) ✅ code xong.
- **Trạng thái code**: TSC 0 · lint 0 · 147/147 test · bundle Android + web OK · workflow GH Actions build debug APK hoạt động.
- **⚠️ Việc đang treo**: chưa commit các fix review gần nhất · `migrations-phase2.sql` chưa chạy trên SQL Editor · MT4 parser chưa verify với dữ liệu thật · 4 bug nhỏ chưa fix (xem [state.md](state.md) → "Bug còn lại").
