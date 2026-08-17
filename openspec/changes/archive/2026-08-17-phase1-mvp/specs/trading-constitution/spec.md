## Purpose
Personal Trading Constitution cho phép user định nghĩa luật giao dịch CỦA MÌNH (app không tự áp đặt), với 2 rule bắt buộc có template sẵn và rule tùy chọn bổ sung.

## ADDED Requirements

### Requirement: Tạo 2 rule bắt buộc từ template
User phải tạo tối thiểu `max_risk_per_trade` (gợi ý 1%) và `max_daily_loss` (gợi ý 3%) — chỉ cần điền số vào template có sẵn.

#### Scenario: User chưa có 2 rule bắt buộc
- **WHEN** user cố chuyển sang màn hình Trade Plan mà chưa có cả `max_risk_per_trade` và `max_daily_loss`
- **THEN** user bị chặn, phải tạo đủ 2 rule bắt buộc trước

#### Scenario: Tạo rule bắt buộc từ template
- **WHEN** user điền số vào template `max_risk_per_trade` và `max_daily_loss`
- **THEN** rule được lưu vào bảng `trading_rules` với `rule_type` tương ứng và `is_active = true`

### Requirement: Rule tùy chọn
User có thể thêm rule tùy chọn: `no_revenge_trade`, `no_trade_before_news`, `max_open_positions`.

#### Scenario: Thêm rule tùy chọn
- **WHEN** user chọn thêm một rule tùy chọn và điền giá trị
- **THEN** rule được lưu vào `trading_rules` và hiển thị trong danh sách rule

### Requirement: Giới hạn số rule theo tier
Free = tối đa 3 rules; Pro = không giới hạn.

#### Scenario: Free tier vượt 3 rules
- **WHEN** user ở tier `free` và cố tạo rule thứ 4
- **THEN** UI chặn tạo và hiển thị thông báo giới hạn tier Free (tối đa 3 rules)

### Requirement: Sửa rule và lưu lịch sử thay đổi
User sửa rule bất kỳ lúc nào trong Settings; lịch sử thay đổi theo dõi qua `updated_at` (không cần bảng version riêng).

#### Scenario: Sửa giá trị rule
- **WHEN** user sửa `base_value` của một rule trong Settings
- **THEN** giá trị mới được lưu và `updated_at` của rule đó được cập nhật

### Requirement: Hiển thị luật là của user
UI phải thể hiện rõ ràng: đây là luật user tự đặt, app không tự đặt hộ.

#### Scenario: Màn hình hiển thị luật
- **WHEN** user xem danh sách rule
- **THEN** UI có nội dung/wording thể hiện đây là luật CỦA USER (ví dụ "Luật của bạn", không gợi ý "app khuyến nghị" như quy tắc bắt buộc)
