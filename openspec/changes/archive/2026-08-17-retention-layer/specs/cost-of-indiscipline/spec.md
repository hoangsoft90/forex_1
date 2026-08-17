# cost-of-indiscipline Specification

## Purpose
Tính "chi phí của sự mất kỷ luật": chênh lệch giữa PnL giả định nếu mọi lệnh theo đúng plan và PnL thực tế. Hiển thị kèm disclaimer cố định. Ngưỡng: ≥30 lệnh tổng VÀ ≥3 lệnh lệch plan. Gating: Free thấy con số tổng 1 dòng; breakdown chi tiết từng lệnh + lịch sử theo tháng là Pro.

## ADDED Requirements

### Requirement: Công thức đúng spec
Lib MUST tính theo công thức spec: `hypothetical_pnl` = tổng PnL của lệnh `followed_plan=true` giữ nguyên PnL thật + tổng PnL giả định tại `planned_tp` cho lệnh `followed_plan=false` có đủ `planned_entry`/`planned_sl`/`planned_tp`; `actual_pnl` = tổng `pnl_amount` thật trong kỳ; `cost_of_indiscipline = hypothetical_pnl − actual_pnl`.

#### Scenario: Test case spec (35 lệnh, 5 lệch plan có đủ TP)
- **WHEN** kỳ có 35 lệnh, 5 lệch plan có đủ planned_tp
- **THEN** cost tính đúng theo công thức (verify từng con số hypothetical/actual), không tự sáng tạo công thức khác

#### Scenario: Lệnh lệch plan thiếu planned_tp
- **WHEN** lệnh `followed_plan=false` nhưng thiếu `planned_tp`
- **THEN** lệnh bị loại khỏi `hypothetical_pnl`, không bị gán giá trị suy đoán (đếm vào skippedIncomplete)

### Requirement: Ngưỡng hiển thị
Chỉ hiển thị con số khi số lệnh `followed_plan=false` trong kỳ ≥3 VÀ tổng lệnh trong kỳ ≥30. Dưới ngưỡng → thông báo "Cần thêm dữ liệu để tính chỉ số này (hiện có X/30 lệnh)" / "X/3 lệnh lệch plan" — không hiện số.

#### Scenario: Chưa đủ 30 lệnh
- **WHEN** kỳ có 12 lệnh
- **THEN** không hiển thị con số, hiện "Cần thêm dữ liệu... (12/30 lệnh)"

#### Scenario: Đủ 30 lệnh nhưng <3 lệnh lệch plan
- **WHEN** kỳ có 30 lệnh nhưng chỉ 1 lệnh lệch plan
- **THEN** không hiển thị con số (tránh kết luận từ 1 lệnh lệch ngẫu nhiên)

### Requirement: Disclaimer cố định
Disclaimer hiển thị ngay dưới con số (không phải footnote), ở MỌI nơi có con số (Dashboard, Weekly Audit, chi tiết Pro):
> *"Đây là ước tính giả định dựa trên chênh lệch giữa kế hoạch và thực tế — không phải bảo đảm lợi nhuận. Kế hoạch ban đầu vẫn có thể sai."*

#### Scenario: Disclaimer đúng nguyên văn
- **WHEN** con số cost hiển thị (đủ ngưỡng)
- **THEN** disclaimer xuất hiện ngay dưới con số, đúng nguyên văn spec (snapshot test UI assert không rút gọn)

### Requirement: An toàn với symbol ngoài 3 cặp hỗ trợ
`hypotheticalPnlAtTp` với symbol không nằm trong `SYMBOL_PIP_CONFIG` (vd GBPUSD, EURJPY, USDCAD) → trả 0, không crash, không suy đoán.

#### Scenario: Symbol lạ không crash
- **WHEN** user import MT4 có lệnh GBPUSD lệch plan có đủ planned_tp
- **THEN** không crash — lệnh đó không đóng góp vào hypothetical (trả 0)

### Requirement: Gating Free/Pro
Free MUST thấy con số tổng 1 dòng + disclaimer. Pro MUST thấy thêm dòng chi tiết ("Bỏ qua N lệnh thiếu dữ liệu"); breakdown từng lệnh + lịch sử theo tháng là Pro (màn chi tiết Pro riêng).

#### Scenario: Free chỉ thấy con số tổng
- **WHEN** user tier Free mở Dashboard có con số cost đủ ngưỡng
- **THEN** thấy con số tổng + disclaimer, không thấy breakdown từng lệnh

#### Scenario: Pro thấy chi tiết
- **WHEN** user tier Pro xem card cost
- **THEN** thấy thêm dòng "Bỏ qua N lệnh thiếu dữ liệu" (chi tiết từng lệnh nằm ở màn Pro riêng)
