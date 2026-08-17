## Purpose
Trade Plan là object trung tâm — user tạo kế hoạch TRƯỚC khi vào lệnh, Risk Engine tính lot size / R:R / số tiền risk tự động, và cảnh báo ngay khi vượt giới hạn risk cá nhân.

## ADDED Requirements

### Requirement: Form tạo Trade Plan đầy đủ
Form nhập liệu map đúng bảng `trade_plans`: Symbol, Direction, Thesis, Setup tag (breakout/rejection/trend_continuation/other), Entry, SL, TP, Risk %, Invalidation condition, Confidence level (1-5).

#### Scenario: Tạo plan thành công
- **WHEN** user điền đầy đủ các trường bắt buộc và submit
- **THEN** plan được lưu vào `trade_plans` với `status = 'planned'`

#### Scenario: Setup tag không hợp lệ
- **WHEN** user chọn setup tag ngoài danh sách cho phép
- **THEN** form từ chối giá trị đó

### Requirement: Risk Engine tính toán tự động
Khi nhập Entry/SL/Risk%: tính lot size đề xuất theo công thức chuẩn forex, Risk/Reward ratio (nếu có TP), và số tiền risk cụ thể.

#### Scenario: Tính lot size EURUSD
- **WHEN** user nhập Balance $10,000, Risk 1%, Entry 1.1000, SL 1.0950 (50 pips, pip value $10/lot)
- **THEN** lot size đề xuất = (10000 × 1%) / (50 × 10) = 0.2 lot

#### Scenario: Tính lot size XAUUSD
- **WHEN** user nhập Balance $10,000, Risk 1%, Entry 2400, SL 2390 (giá trị pip theo quy ước XAUUSD)
- **THEN** lot size đề xuất được tính theo pip value của XAUUSD, đúng công thức (Balance × Risk%) / (khoảng cách pip × pip value)

#### Scenario: Tính lot size USDJPY
- **WHEN** user nhập Balance $10,000, Risk 1%, Entry 150.00, SL 150.50 (pip value USDJPY khác EURUSD)
- **THEN** lot size đề xuất được tính đúng theo pip value của USDJPY

#### Scenario: Tính R:R và số tiền risk
- **WHEN** user có đủ Entry/SL/TP và Risk%
- **THEN** UI hiển thị R:R ratio và số tiền risk cụ thể (VD "$100")

### Requirement: Cảnh báo vượt max_risk_per_trade ngay tại form
Nếu Risk% nhập lớn hơn `max_risk_per_trade` đã đặt → cảnh báo hiển thị ngay tại form (không phải sau khi submit).

#### Scenario: Risk% vượt giới hạn
- **WHEN** user nhập Risk% > `max_risk_per_trade.base_value`
- **THEN** form hiển thị cảnh báo tức thì trước khi user submit

### Requirement: Route "Tạo lệnh không có Plan"
Cho phép tạo trade không có plan nhưng phải qua màn hình xác nhận phụ; execution đó có `trade_plan_id = null`.

#### Scenario: Tạo lệnh ngoài kế hoạch
- **WHEN** user chọn "Tạo lệnh không có Plan"
- **THEN** hiển thị màn hình xác nhận phụ (cảnh báo) trước khi cho phép tạo, và execution được ghi với `trade_plan_id = null`
