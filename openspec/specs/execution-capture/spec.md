# execution-capture Specification

## Purpose
Execution Capture thu thập dữ liệu giao dịch thực tế nhanh nhất có thể qua 2 kênh: Mobile Widget nhập tay (không phụ thuộc dữ liệu mẫu) và Copy-Paste từ MT4/MT5 Account History (parser ở Edge Function).

## Requirements

### Requirement: Mobile Widget nhập nhanh (<20 giây)
Form tối giản: Symbol, Direction, Lot, Entry, SL, TP (optional), liên kết `trade_plan_id` nếu có plan khớp Symbol+Direction gần nhất (auto-suggest link).

#### Scenario: Lưu execution từ widget
- **WHEN** user mở màn hình widget, nhập đủ Symbol/Direction/Lot/Entry và bấm lưu
- **THEN** execution được lưu vào `trade_executions` với `source = 'mobile_widget'` và thời gian từ mở màn hình đến lưu thành công ≤ 20 giây (đo bằng analytics `execution_widget_opened`/`execution_saved`)

#### Scenario: Auto-suggest link plan
- **WHEN** có plan gần nhất khớp Symbol + Direction chưa được link
- **THEN** UI đề xuất link plan đó; user xác nhận thì execution ghi `trade_plan_id` tương ứng

### Requirement: Copy-Paste MT4/MT5 parser
Textarea cho user paste nguyên khối text từ MT4 Account History. Edge Function parse theo format chuẩn MT4 (ticket, symbol, type, lots, open time, open price, S/L, T/P, close time, close price, profit).

#### Scenario: Parse thành công
- **WHEN** user paste text hợp lệ theo format MT4
- **THEN** parser tạo các `trade_executions` tương ứng và lưu `raw_import_payload` (dữ liệu gốc) để debug/audit

#### Scenario: Dòng không nhận diện được
- **WHEN** parser gặp dòng không đúng format
- **THEN** hiển thị rõ dòng lỗi cho user sửa tay, không silent-fail

### Requirement: Đánh dấu format giả định chưa verify
Parser dựa trên format giả định từ tài liệu công khai MetaQuotes/community — phải đánh dấu rõ trong code và báo cáo: "chưa verify với dữ liệu thật từ MT4".

#### Scenario: Kiểm tra nguồn format
- **WHEN** review code parser
- **THEN** có comment trong code nêu rõ format là giả định, cần test với export thật từ MT4 trước khi coi module là Done

### Requirement: Auto-trigger tính delta khi trade đóng
Khi `exit_time` được set (trade đóng), tự động trigger tính `plan_vs_reality_deltas` nếu execution có `trade_plan_id`.

#### Scenario: Trade đóng có plan
- **WHEN** execution có `trade_plan_id` và `exit_time` được set
- **THEN** `plan_vs_reality_deltas` được tính tự động không cần user bấm nút
