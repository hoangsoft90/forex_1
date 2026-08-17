# portfolio-risk Specification

## Purpose
Phân tích rủi ro tổng danh mục: tổng risk dồn của các vị thế mở (execution chưa đóng), cảnh báo khi vượt ngưỡng, và ma trận tương quan (correlation) giữa các symbol đang mở. Đây là tính năng Pro trong plan v2 mục 12 — user Free có thể xem bản tóm tắt ngắn, chi tiết đầy đủ cho Pro.

## Requirements

### Requirement: Tổng risk dồn vị thế mở
Tính tổng `actual_risk_percent` (hoặc ước lượng từ `lot_size`) của các execution chưa có `exit_time`. Cảnh báo khi tổng vượt ngưỡng: > `max_risk_per_trade × 3` hoặc > `max_daily_loss` (cái nào nhỏ hơn) — mức đỏ.

#### Scenario: 2 lệnh mở mỗi lệnh 1%
- **WHEN** user mở 2 execution risk 1% + 1% chưa đóng, rule max_risk_per_trade=1%, max_daily_loss=3%
- **THEN** tổng risk = 2% — hiển thị mức cảnh báo vàng (chưa chạm ngưỡng), chi tiết từng lệnh

#### Scenario: 4 lệnh mở vượt ngưỡng
- **WHEN** 4 lệnh mở 1% + 1% + 1% + 1% (tổng 4%), ngưỡng = min(1%×3, 3%) = 3%
- **THEN** cảnh báo đỏ "Tổng risk 4% vượt ngưỡng 3% — rủi ro dồn"

### Requirement: Correlation giữa các symbol đang mở
Ma trận tương quan Pearson giữa các symbol có vị thế mở. Phase 2 dùng hệ số ước lượng theo cặp chuẩn (EURUSD↔XAUUSD, EURUSD↔USDJPY, XAUUSD↔USDJPY) khi chưa đủ dữ liệu giá lịch sử — hiển thị rõ "ước lượng tham chiếu".

#### Scenario: Ma trận 2 symbol
- **WHEN** user mở lệnh EURUSD + XAUUSD
- **THEN** hiện correlation EURUSD↔XAUUSD (số trong [-1, 1]) kèm chú thích "ước lượng tham chiếu, chưa phải từ dữ liệu thật"

#### Scenario: Chỉ 1 symbol — không có ma trận
- **WHEN** chỉ có 1 vị thế mở
- **THEN** không hiện ma trận, chỉ hiện thông tin rủi ro lệnh đơn

### Requirement: Tier gating
Free: xem bản tóm tắt (tổng risk + 1 cảnh báo). Pro: toàn bộ ma trận correlation + chi tiết.

#### Scenario: Free user xem tóm tắt
- **WHEN** user tier='free' mở màn hình Portfolio Risk
- **THEN** hiện tổng risk + cảnh báo, KHÔNG hiện ma trận correlation chi tiết

#### Scenario: Pro user xem đầy đủ
- **WHEN** user đang Pro (24h hoặc trả phí sau này) mở màn hình
- **THEN** hiện ma trận correlation + chi tiết từng lệnh
