# weekly-audit Specification

## Purpose
Weekly Performance Audit tạo báo cáo tổng kết tuần bằng template + số liệu thật (rule-based), KHÔNG dùng LLM — tránh chi phí API và rủi ro AI bịa insight sai.

## Requirements

### Requirement: Tạo báo cáo từ template
Template có sẵn, điền số thật vào chỗ trống: "Tuần này bạn thực hiện {N} lệnh, {X}% theo đúng plan. Vi phạm phổ biến nhất: {top_violation_type} ({count} lần). App đã giúp bạn tránh {bad_trades_prevented} lệnh vi phạm rule của chính mình."

#### Scenario: Sinh báo cáo với dữ liệu đầy đủ
- **WHEN** user có lệnh + violations + bad_trades_prevented trong tuần
- **THEN** text sinh ra đúng ngữ pháp tiếng Việt tự nhiên với số liệu thật

#### Scenario: count = 0 không tạo câu cụt/lặp
- **WHEN** một trong các số liệu bằng 0 (VD không có violation, hoặc bad_trades_prevented = 0)
- **THEN** template xử lý đúng trường hợp 0, không sinh câu sai ngữ pháp hoặc lặp vô nghĩa (VD không nói "vi phạm phổ biến nhất: (0 lần)")

### Requirement: Không dùng AI model
Bước này chỉ template + số liệu thật, không gọi LLM/AI.

#### Scenario: Kiểm tra không gọi LLM
- **WHEN** review code Weekly Audit
- **THEN** không có lời gọi AI model nào; chỉ nối chuỗi template với số liệu từ database
