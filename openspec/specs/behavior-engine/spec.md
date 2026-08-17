# behavior-engine Specification

## Purpose
Behavior Engine tự động phát hiện vi phạm luật cá nhân từ dữ liệu giao dịch (rule-based, không ML) và ghi vào `rule_violations` không trùng lặp.

## Requirements

### Requirement: Phát hiện overconfidence_size
Trigger khi `actual_risk_percent > planned_risk_percent × 1.5`.

#### Scenario: Risk thực vượt 1.5 lần risk kế hoạch
- **WHEN** execution có plan, actual_risk_percent > planned_risk_percent × 1.5
- **THEN** ghi violation `overconfidence_size` vào `rule_violations`

### Requirement: Phát hiện revenge_trading
Trigger khi lệnh trước lỗ + lệnh này mở trong < 10 phút + direction ngược.

#### Scenario: Lệnh ngược chiều sau lệnh thua
- **WHEN** lệnh đóng gần nhất có pnl < 0 và execution mới mở trong < 10 phút, ngược chiều
- **THEN** ghi violation `revenge_trading`

### Requirement: Phát hiện hope_trading
Trigger khi `count(trade_sl_adjustments) > 2` cho lệnh này.

#### Scenario: Dời SL hơn 2 lần
- **WHEN** execution có > 2 dòng `trade_sl_adjustments`
- **THEN** ghi violation `hope_trading`

### Requirement: Phát hiện martingale_negative
Trigger khi lot size lệnh này > lot size lệnh trước × 1.8 VÀ lệnh trước lỗ.

#### Scenario: Tăng lot gấp đôi sau lệnh thua
- **WHEN** lot size hiện tại > lot size lệnh trước × 1.8 và lệnh trước có pnl < 0
- **THEN** ghi violation `martingale_negative`

### Requirement: news_gambling để placeholder
Không giả lập dữ liệu tin tức; để rõ trong code là chưa implement — cần nguồn Economic Calendar ở Phase 3.

#### Scenario: Review code thấy placeholder
- **WHEN** xem code Behavior Engine
- **THEN** `news_gambling` được đánh dấu rõ "chưa implement — cần nguồn Economic Calendar ở Phase 3", không có dữ liệu tin tức giả

### Requirement: Không ghi violation trùng lặp
Mỗi vi phạm phát hiện được ghi đúng 1 dòng vào `rule_violations`, không duplicate.

#### Scenario: Chạy lại detection
- **WHEN** Behavior Engine chạy lại trên cùng dữ liệu
- **THEN** không tạo violation trùng (cùng trade_execution + violation_type)
