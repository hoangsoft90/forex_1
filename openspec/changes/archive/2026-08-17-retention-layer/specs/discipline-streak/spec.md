# discipline-streak Specification

## Purpose
Đếm số lệnh liên tiếp gần nhất có `followed_plan = true` VÀ không có `rule_violations` gắn với lệnh đó. Reset về 0 ngay khi gặp lệnh vi phạm hoặc lệch plan. **KHÔNG phải streak mở app hàng ngày** (kiểu Duolingo) — là streak tuân thủ kỷ luật theo lệnh. Hiển thị ở Today Dashboard (Free, không gate).

## ADDED Requirements

### Requirement: Định nghĩa streak
Streak = số lệnh liên tiếp (từ lệnh gần nhất lùi dần theo `entry_time`) có `followed_plan = true` VÀ không có `rule_violations` nào gắn với lệnh đó. Reset 0 khi gặp lệnh vi phạm hoặc lệch plan.

#### Scenario: Test case 8 lệnh → streak 8
- **WHEN** 8 lệnh liên tiếp `followed_plan=true` + không vi phạm
- **THEN** streak = 8

#### Scenario: Lệnh 9 vi phạm → reset 0
- **WHEN** 8 lệnh tuân thủ, sau đó lệnh thứ 9 vi phạm (có rule_violation hoặc followed=false)
- **THEN** streak reset về 0 ngay (từ lệnh 9 trở đi, không đếm tiếp)

### Requirement: Tính theo entry_time, không theo thứ tự nhập liệu
Streak sort theo `entry_time` tăng dần rồi đếm từ lệnh gần nhất lùi — không phụ thuộc thứ tự insert.

#### Scenario: Truyền ngược thứ tự nhập
- **WHEN** dữ liệu truyền vào không theo thứ tự thời gian (lệnh mới insert trước lệnh cũ)
- **THEN** streak vẫn tính đúng theo `entry_time`

### Requirement: Chỉ xét lệnh đã đóng
Lệnh đang mở (chưa có `exit_time`) MUST NOT tính vào streak. Lệnh không có delta (`followed` undefined) MUST NOT tính là theo plan (reset nếu ở cuối chuỗi).

#### Scenario: Có lệnh đang mở
- **WHEN** chuỗi có 5 lệnh đóng tuân thủ + 1 lệnh đang mở chưa có exit_time
- **THEN** streak = 5 (lệnh mở không tính)

#### Scenario: Lệnh không có delta ở cuối
- **WHEN** lệnh gần nhất chưa có delta (followed undefined)
- **THEN** streak = 0 (không tự cho điểm)

### Requirement: Hiển thị Today Dashboard
Card 🔥 Discipline Streak MUST hiển thị ở Today Dashboard (Free, không gate): "8 lệnh liên tiếp theo plan, không vi phạm — giữ vững!" hoặc "Chưa có chuỗi tuân thủ — đóng lệnh đúng plan để bắt đầu streak."

#### Scenario: Có streak
- **WHEN** streak = 8
- **THEN** hiển thị "8 lệnh liên tiếp theo plan, không vi phạm — giữ vững!"

#### Scenario: Chưa có streak
- **WHEN** streak = 0
- **THEN** hiển thị "Chưa có chuỗi tuân thủ — đóng lệnh đúng plan để bắt đầu streak."
