# adaptive-rules Specification

## Purpose
Rule tự động điều chỉnh **GIẢM** risk khi bối cảnh thị trường thay đổi (ATR cao). Nguyên tắc bắt buộc từ plan1_final_v2.md mục 3: **chỉ được GIẢM tự động, không bao giờ tăng** — mọi điều chỉnh tăng phải qua Decision Interruption. Khung dữ liệu `rule_adaptive_conditions` đã có trong schema Phase 1 (condition_type='atr_threshold', direction='decrease' khóa cứng).

## Requirements

### Requirement: Gắn adaptive condition cho rule (UI)
Trong màn hình quản lý rule (`constitution-settings`), user có thể gắn điều kiện ATR cho rule: chọn `condition_type='atr_threshold'`, nhập `condition_value` (ngưỡng ATR, VD 1.5 = ATR gấp 1.5x trung bình) + `adjusted_value` (giá trị rule sau điều chỉnh — PHẢI ≤ base_value).

#### Scenario: Tạo adaptive condition hợp lệ
- **WHEN** user gắn adaptive cho rule max_risk_per_trade (base 1%) với adjusted_value 0.5%, ATR ngưỡng 1.5
- **THEN** lưu `rule_adaptive_conditions` (direction='decrease', adjusted_value=0.5 ≤ 1)

#### Scenario: Từ chối tăng adjusted_value
- **WHEN** user nhập adjusted_value > base_value (VD base 1% → adjusted 1.5%)
- **THEN** API/UI từ chối với thông báo "Adaptive chỉ được giảm risk — muốn tăng phải qua Decision Interruption"

### Requirement: Tính ATR và đề xuất risk giảm
`src/lib/atr.ts` nhận OHLC (đơn giản, Phase 2 dùng dữ liệu ước lượng theo cặp) → tính ATR + so với ngưỡng condition → trả `suggested_risk_percent` = adjusted_value nếu ATR vượt ngưỡng, ngược lại trả base_value.

#### Scenario: ATR vượt ngưỡng → đề xuất giảm
- **WHEN** ATR hiện tại = 1.8x trung bình (ngưỡng 1.5), rule base 1%, adjusted 0.5%
- **THEN** suggested_risk_percent = 0.5%

#### Scenario: ATR dưới ngưỡng → giữ base
- **WHEN** ATR = 1.2x (ngưỡng 1.5)
- **THEN** suggested_risk_percent = 1% (base, không điều chỉnh)

#### Scenario: Không bao giờ đề xuất tăng
- **WHEN** mọi input hợp lệ
- **THEN** suggested_risk_percent luôn ≤ base_value (test bắt buộc)

### Requirement: Form plan nhận adaptive risk
Form tạo plan: nếu rule có adaptive condition active và ATR vượt ngưỡng → hiển thị rõ "Risk đề xuất đã giảm theo ATR: 0.5% (thay vì 1%)", Risk Engine dùng giá trị giảm, plan lưu `applied_adaptive_condition_id`.

#### Scenario: Plan dùng adaptive risk
- **WHEN** ATR vượt ngưỡng và user lưu plan
- **THEN** `trade_plans.applied_adaptive_condition_id` = id condition, Risk Engine tính lot theo 0.5%

#### Scenario: User sửa risk lên cao hơn đề xuất
- **WHEN** user sửa Risk% lên > suggested (VD 1.2% khi đề xuất 0.5%)
- **THEN** hiển thị cảnh báo "Vượt đề xuất adaptive (0.5%)" + bắt buộc ghi lý do (ghi vào plan.thesis hoặc interruption) — không âm thầm cho qua
