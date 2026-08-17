## Purpose
Decision Interruption chặn/cảnh báo đúng lúc nguy hiểm dựa trên bằng chứng (evidence), không phải popup Yes/No đơn thuần — hiển thị con số cụ thể và ghi log mọi lần can thiệp.

## ADDED Requirements

### Requirement: Trigger rule-based
Phase 1 chỉ dùng trigger rule-based đơn giản: `over_risk` (Risk% plan mới > max_risk_per_trade), `max_daily_loss` (tổng lỗ hôm nay ≥ max_daily_loss), `revenge_pattern` (lệnh trước lỗ + mở lệnh mới <10 phút + ngược chiều).

#### Scenario: Trigger over_risk
- **WHEN** user tạo Trade Plan mới với Risk% > `max_risk_per_trade`
- **THEN** interruption được kích hoạt trước khi user xác nhận tạo lệnh

#### Scenario: Trigger max_daily_loss
- **WHEN** tổng lỗ hôm nay (từ `trade_executions` có `exit_time` hôm nay) ≥ `max_daily_loss`
- **THEN** interruption được kích hoạt

#### Scenario: Trigger revenge_pattern
- **WHEN** lệnh đóng gần nhất có `pnl_amount < 0`, thời gian từ `exit_time` lệnh trước đến lúc tạo Plan mới < 10 phút, và direction ngược lệnh trước
- **THEN** interruption được kích hoạt

### Requirement: Evidence 2 tầng (cohort vs personal)
Nếu user có < 15 `trade_executions` đã đóng → dùng `evidence_mode = 'cohort_benchmark'` với câu benchmark tĩnh hardcode. Nếu ≥ 15 lệnh → `evidence_mode = 'personal'`, query dữ liệu thật của user.

#### Scenario: User mới (<15 lệnh) dùng cohort benchmark
- **WHEN** user có 5 lệnh lịch sử và trigger revenge_pattern
- **THEN** evidence hiển thị câu benchmark tĩnh (VD "73% trader tăng lot sau lệnh thua đều thua tiếp lệnh đó") với `evidence_mode = 'cohort_benchmark'`

#### Scenario: User đủ dữ liệu (≥15 lệnh) dùng personal evidence
- **WHEN** user có 20 lệnh lịch sử, trong đó có 1 lần revenge trade trước đây lỗ thêm $420, và trigger lại revenge_pattern
- **THEN** evidence_text phải hiển thị đúng con số $420 lấy từ dữ liệu thật của user (`evidence_mode = 'personal'`), không phải số cứng

### Requirement: UI interruption hiển thị trước khi xác nhận lệnh
Interruption hiển thị ĐÚNG trước khi user có thể bấm nút xác nhận tạo lệnh, không phải sau.

#### Scenario: Thứ tự hiển thị
- **WHEN** trigger điều kiện kích hoạt
- **THEN** interruption xuất hiện trước khi nút xác nhận tạo lệnh có hiệu lực, hiển thị con số cụ thể + 2 lựa chọn "Tiếp tục" / "Quay lại chỉnh Plan"

### Requirement: Ghi log decision_interruptions
Mọi lần hiển thị đều ghi vào `decision_interruptions` (trigger_type, evidence_mode, evidence_text, user_decision).

#### Scenario: Ghi log khi hiển thị và phản hồi
- **WHEN** interruption được hiển thị và user chọn "Tiếp tục" / "Quay lại chỉnh Plan"
- **THEN** 1 dòng được ghi vào `decision_interruptions` với `shown_at`, `responded_at`, `user_decision` tương ứng
