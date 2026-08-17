# market-chart Specification

## Purpose
Nhúng TradingView Widget (advanced chart) qua WebView để user thấy chart/giá ngay trong app — đúng gợi ý mvp_scope mục 0 ("dùng TradingView Widget nhúng nếu cần hiển thị giá, không tự vẽ").

## Requirements

### Requirement: TradingView chart widget trong tạo plan
Màn hình tạo plan `(main)/new-plan` hiển thị chart của symbol đang chọn (EURUSD/XAUUSD/USDJPY); đổi symbol → chart tải lại theo symbol mới.

#### Scenario: Đổi symbol → chart đổi theo
- **WHEN** user đổi symbol trong form plan từ EURUSD sang XAUUSD
- **THEN** WebView nạp lại TradingView widget với symbol XAUUSD

#### Scenario: Thiếu network/WebView không tải
- **WHEN** WebView không load được (offline/blocked)
- **THEN** hiện placeholder "Không tải được chart" — không crash, form vẫn dùng được

### Requirement: Chart trong màn hình chi tiết trade
Màn hình `(main)/trade-detail` hiển thị chart symbol của lệnh đó.

#### Scenario: Xem chi tiết lệnh có chart
- **WHEN** user mở chi tiết 1 execution symbol XAUUSD
- **THEN** chart XAUUSD hiển thị phía trên thông tin Planned vs Actual
