# plan-vs-reality Specification

## Purpose
Plan vs Reality tính delta giữa kế hoạch và thực tế ngay khi trade đóng, hiển thị trong Journal với badge "Theo plan"/"Lệch plan" và insight dashboard.

## Requirements

### Requirement: Tính delta tự động
Edge Function tính delta khi `trade_executions.exit_time` được set: `entry_deviation_pips` = |actual_entry - planned_entry|, `sl_deviation_pips` = |actual_sl - planned_sl| (lấy SL cuối cùng từ `trade_sl_adjustments` nếu có), `risk_deviation_percent` = actual_risk_percent - planned_risk_percent.

#### Scenario: Tính delta không cần user bấm
- **WHEN** trade đóng (exit_time có giá trị) và có `trade_plan_id`
- **THEN** delta được tính tự động và lưu vào `plan_vs_reality_deltas`

#### Scenario: SL lấy từ lần điều chỉnh cuối
- **WHEN** execution có `trade_sl_adjustments`
- **THEN** `sl_deviation_pips` dùng SL cuối cùng trong danh sách adjustment, không dùng SL ban đầu

### Requirement: followed_plan theo ngưỡng hardcode Phase 1
`followed_plan = true` nếu: entry lệch < 5 pip, risk lệch < 0.2%, và không có SL adjustment nào.

#### Scenario: Test case risk lệch
- **WHEN** Plan risk 1%, Actual risk 2.5%
- **THEN** `risk_deviation_percent = 1.5` và `followed_plan = false`

#### Scenario: Test case entry lệch nhỏ, có SL adjustment
- **WHEN** entry lệch 3 pip (trong ngưỡng) nhưng execution có ít nhất 1 SL adjustment
- **THEN** `followed_plan = false` vì có SL adjustment

### Requirement: Journal hiển thị badge
Danh sách trade, mỗi item hiển thị badge "Theo plan" / "Lệch plan" dùng `followed_plan`; tap vào xem chi tiết Planned vs Actual side-by-side.

#### Scenario: Hiển thị badge
- **WHEN** user mở Journal
- **THEN** mỗi execution có plan hiển thị badge tương ứng `followed_plan` và có màn hình chi tiết Planned vs Actual

### Requirement: Insight dashboard
Hiển thị câu insight dạng "X% lệnh theo đúng plan có kết quả tốt hơn Y% lệnh lệch plan" tính từ dữ liệu thật; ẩn nếu < 10 lệnh (không đủ ý nghĩa thống kê).

#### Scenario: Đủ dữ liệu hiển thị insight
- **WHEN** user có ≥ 10 lệnh đã đóng
- **THEN** dashboard hiển thị insight với % tính từ dữ liệu thật của user

#### Scenario: Chưa đủ dữ liệu
- **WHEN** user có < 10 lệnh đã đóng
- **THEN** insight bị ẩn (không hiển thị số liệu thiếu ý nghĩa thống kê)
