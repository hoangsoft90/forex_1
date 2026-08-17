# personal-danger-zone Specification

## Purpose
Quét `rule_violations` + `trade_executions.entry_time` để tìm pattern lặp lại: giờ trong ngày có tỷ lệ vi phạm cao nhất, và "vi phạm thường xảy ra ở lệnh thứ N+ trong ngày". Ngưỡng: ≥30 lệnh đã đóng VÀ pattern ≥5 lần. Hiển thị: 1 dòng ở Today Dashboard (Free); chi tiết đầy đủ (nhiều pattern + biểu đồ theo giờ) ở màn riêng.

## ADDED Requirements

### Requirement: Pattern theo giờ trong ngày
Tìm giờ (theo `entry_time` của lệnh bị vi phạm) có số lần vi phạm nhiều nhất. Chỉ kết luận khi tổng lệnh đóng ≥30 VÀ pattern xuất hiện ≥5 lần. Loại vi phạm `is_negative=false` (adaptive_decision) không tính.

#### Scenario: 25 lệnh → ẩn
- **WHEN** user có 25 lệnh đã đóng
- **THEN** không hiển thị bất kỳ kết luận Danger Zone nào (test bắt buộc)

#### Scenario: 35 lệnh pattern 6 lần → hiện
- **WHEN** 35 lệnh đóng, giờ 14:00 có 6 vi phạm
- **THEN** hiển thị "⚠️ Vi phạm thường xuyên nhất lúc 14:00 — 6 lần (trong 35 lệnh)" — số liệu thật, không câu mẫu tĩnh

#### Scenario: Pattern <5 lần → không kết luận
- **WHEN** 30 lệnh đóng nhưng giờ có nhiều nhất chỉ 3 lần vi phạm
- **THEN** không hiển thị kết luận (hiện "chưa đủ để kết luận")

### Requirement: Pattern "lệnh thứ N trong ngày"
Đánh số thứ tự lệnh trong ngày theo `entry_time` (mỗi ngày đếm lại từ 1) → tìm lệnh thứ N có vi phạm nhiều nhất. Cùng ngưỡng ≥30 lệnh + ≥5 lần.

#### Scenario: Vi phạm ở lệnh thứ 3 trong ngày
- **WHEN** trong 6 ngày khác nhau, lệnh thứ 3 của mỗi ngày bị vi phạm (6 lần)
- **THEN** hiển thị "Vi phạm thường xuyên nhất ở lệnh thứ 3 trong ngày (6 lần)"

### Requirement: Màn chi tiết (Pro)
Màn riêng MUST hiển thị: dưới ngưỡng → thông báo tiến độ (không kết luận); đủ ngưỡng → cả 2 card pattern + biểu đồ phân bố vi phạm theo giờ (top 8 giờ, dữ liệu thật). Dashboard 1 dòng tap được → mở màn chi tiết.

#### Scenario: Dưới ngưỡng ở màn chi tiết
- **WHEN** user mở màn chi tiết và chưa đủ 30 lệnh đóng
- **THEN** hiển thị "Cần ít nhất 30 lệnh đã đóng..." (không kết luận, không biểu đồ)

#### Scenario: Đủ ngưỡng có pattern
- **WHEN** 36 lệnh đóng, có pattern giờ 6 lần + pattern lệnh thứ 3 trong ngày 5 lần
- **THEN** hiển thị cả 2 card pattern + biểu đồ phân bố theo giờ (dữ liệu thật)
