# fast-plan Specification

## Purpose
Form tạo Trade Plan rút gọn (Fast Plan) — tối thiểu 5 trường bắt buộc (Symbol, Direction, Entry, SL, Risk%), SL là quy tắc chặn cứng bảo vệ Risk Engine, mục tiêu lưu plan hợp lệ ≤15 giây.

## Requirements

### Requirement: Form Fast Plan 5 trường bắt buộc
Form rút gọn hiển thị ngay 5 trường: Symbol, Direction, Entry, SL, Risk%. Risk% có giá trị mặc định = `max_risk_per_trade` rule của user (cho phép sửa).

#### Scenario: Tạo Fast Plan hợp lệ
- **WHEN** user điền đủ 5 trường bắt buộc và submit
- **THEN** plan lưu vào `trade_plans` với `status = 'planned'`, lot size / R:R / tiền risk tính tự động như công thức Phase 1

#### Scenario: Risk% prefill từ rule
- **WHEN** user mở form Fast Plan và có rule `max_risk_per_trade` active = 1%
- **THEN** trường Risk% hiển thị sẵn 1% (sửa được)

### Requirement: SL chặn cứng
Không cho lưu Plan nếu thiếu SL — validate hard-block (không cảnh báo mềm). Đây là quy tắc bảo vệ Risk Engine, không thương lượng.

#### Scenario: Thiếu SL → chặn lưu
- **WHEN** user submit Fast Plan không có SL
- **THEN** lưu bị chặn cứng, hiển thị lỗi yêu cầu nhập SL — plan không được tạo

### Requirement: TP là optional thật sự
Plan vẫn lưu được và Risk Engine vẫn tính đúng Lot size khi TP trống; R:R chỉ hiển thị khi có TP.

#### Scenario: Không có TP vẫn lưu + tính lot
- **WHEN** user tạo Fast Plan không nhập TP
- **THEN** plan lưu thành công, lot size tính đúng, phần R:R không hiển thị (không crash, không số vô nghĩa)

### Requirement: Trường tùy chọn gấp gọn
TP, Thesis, Setup tag, Invalidation condition, Confidence level MUST nằm dưới "Chi tiết thêm", điền được sau khi đóng lệnh. Khi user không điền lúc tạo plan → nhắc nhẹ (không chặn) điền bổ sung ở màn chi tiết lệnh.

#### Scenario: Không điền trường tùy chọn
- **WHEN** user tạo Fast Plan chỉ điền 5 trường bắt buộc, bỏ trống Thesis/Setup/Confidence
- **THEN** plan vẫn lưu; ở màn chi tiết lệnh sau khi đóng có nhắc nhẹ điền bổ sung (không bắt buộc)
