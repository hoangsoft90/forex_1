## Purpose
Discipline Score (0-100) đo mức độ tuân thủ kế hoạch CỦA MÌNH — tách biệt hoàn toàn với Edge Score (hiệu quả chiến lược). Hiển thị 2 trục điểm song song kèm giải thích; tier gating Free vs Pro.

## ADDED Requirements

### Requirement: Công thức Discipline Score Phase 1
`rule_adherence_rate = (số lệnh followed_plan=true) / (tổng số lệnh có plan) × 100`; `violation_penalty = min(violations_count × 5, 40)`; `score = clamp(rule_adherence_rate - violation_penalty, 0, 100)`.

#### Scenario: Tính điểm cơ bản
- **WHEN** tuần có 10 lệnh có plan, 8 lệnh followed_plan=true, 2 violations
- **THEN** rule_adherence_rate = 80, violation_penalty = min(2×5, 40) = 10, score = 70

#### Scenario: Penalty bị chặn tối đa 40
- **WHEN** violations_count = 15
- **THEN** violation_penalty = min(15×5, 40) = 40, không vượt 40

#### Scenario: Score clamp 0-100
- **WHEN** rule_adherence_rate - violation_penalty ra ngoài khoảng [0, 100]
- **THEN** score bị clamp về trong [0, 100]

### Requirement: Edge Score tính từ trade_executions
Winrate, avg R:R, total PnL — tính trực tiếp từ `trade_executions`, không liên quan Discipline.

#### Scenario: Tính Edge Score
- **WHEN** tuần kết thúc và có executions đã đóng
- **THEN** edge_score_snapshots được tính (winrate, avg_risk_reward, total_pnl) độc lập với discipline

### Requirement: Snapshot đúng 1 lần/tuần
Snapshot được tạo đúng 1 lần/tuần cho mỗi user; mở app nhiều lần trong tuần không tính trùng.

#### Scenario: Mở app nhiều lần trong tuần
- **WHEN** user mở app nhiều lần trong cùng tuần
- **THEN** chỉ có 1 `discipline_score_snapshots` (và 1 `edge_score_snapshots`) cho khoảng tuần đó

### Requirement: Tier gating Free vs Pro
Free: chỉ hiện điểm hiện tại (tuần này), KHÔNG hiện chart trend. Pro: hiện trend 4/12 tuần + `bad_trades_prevented_count` (đếm từ `decision_interruptions` có `user_decision` = 'cancelled' hoặc 'reduced_risk').

#### Scenario: Free user không thấy trend
- **WHEN** user có `subscription_tier = 'free'` mở màn hình Score
- **THEN** chỉ hiện đúng 1 con số điểm hiện tại, không hiện biểu đồ xu hướng

#### Scenario: Pro user thấy trend + bad trades prevented
- **WHEN** user có `subscription_tier = 'pro'` mở màn hình Score
- **THEN** hiện biểu đồ trend (4/12 tuần) và `bad_trades_prevented_count`

### Requirement: Hiển thị 2 trục điểm + giải thích + Tiến bộ tuần này
2 số riêng biệt cạnh nhau kèm dòng giải thích ngắn ("Điểm kỷ luật cao không đảm bảo lời"). Khối "Tiến bộ tuần này" so sánh với chính user tuần trước, tách riêng khỏi phần số liệu khách quan.

#### Scenario: Hiển thị song song
- **WHEN** user mở màn hình Score
- **THEN** thấy 2 số riêng biệt (Discipline + Edge) cạnh nhau + giải thích ngắn + khối "Tiến bộ tuần này" so với tuần trước của chính họ
