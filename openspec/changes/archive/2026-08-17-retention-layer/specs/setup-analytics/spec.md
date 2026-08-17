# setup-analytics Specification

## Purpose
Nhóm `trade_executions` (qua `trade_plans.setup_tag`) theo Breakout/Rejection/Trend Continuation/Other → tính Winrate, Avg R:R, Total PnL từng nhóm. Ngưỡng thống nhất ≥30 lệnh đã đóng — dưới ngưỡng hiện tiến độ, không ẩn hoàn toàn. Gating: Free bảng tổng quan; Pro thêm gợi ý dạng câu + biểu đồ xu hướng.

## ADDED Requirements

### Requirement: Nhóm theo setup_tag
Nhóm `breakout` / `rejection` / `trend_continuation` với nhãn tiếng Việt; `setup_tag = null` hoặc `'other'` gom vào nhóm "Chưa phân loại" — không bị loại khỏi thống kê.

#### Scenario: null + other gom chung
- **WHEN** có 3 lệnh setup_tag=null và 2 lệnh ='other'
- **THEN** 5 lệnh này nằm chung nhóm "Chưa phân loại", không bị loại khỏi tổng

### Requirement: Chỉ số từng nhóm
Mỗi nhóm: count, winrate %, Avg R:R (tính từ `actual_entry/sl/tp` thực tế — lệnh thiếu TP → null, không kéo trung bình), Total PnL.

#### Scenario: Tính winrate và PnL đúng
- **WHEN** nhóm breakout có 10 lệnh (6 thắng 20$ mỗi lệnh, 4 thua 10$ mỗi lệnh)
- **THEN** winrate = 60%, total PnL = 80$, Avg R:R tính từ R thực tế từng lệnh

### Requirement: Ngưỡng ≥30 lệnh đóng
Dưới 30 lệnh → hiển thị "Cần thêm N lệnh nữa (hiện có X/30) để phân tích đáng tin cậy" — KHÔNG hiển thị bảng thống kê. Từ 30 lệnh trở lên → bảng tính đúng.

#### Scenario: 12 lệnh → tiến độ
- **WHEN** user có 12 lệnh đã đóng
- **THEN** hiển thị "Cần thêm 18 lệnh nữa (hiện có 12/30) để phân tích đáng tin cậy" (không bảng)

#### Scenario: 30 lệnh 3 nhóm → bảng đúng
- **WHEN** 30 lệnh đóng phân bố 3 setup_tag khác nhau
- **THEN** bảng hiển thị đúng winrate/R:R/PnL từng nhóm (test ≥3 setup_tag)

### Requirement: Gợi ý dạng câu (Pro)
Pro MUST thấy `bestSetupInsight`: "Setup X đang có edge tốt nhất (+$Y PnL, winrate Z%) — trong khi W thấp nhất" — chỉ so sánh nhóm ≥5 lệnh (không kết luận từ 1-2 lệnh). Biểu đồ xu hướng theo thời gian là Pro (để sau — cần lịch sử nhiều tuần + chart lib).

#### Scenario: Pro thấy gợi ý
- **WHEN** user tier Pro xem Setup Analytics với nhóm Breakout 10 lệnh (+80$, 60%) và Rejection 7 lệnh (−10$)
- **THEN** hiển thị "Setup Breakout đang có edge tốt nhất (+$80 PnL, winrate 60%) — trong khi Rejection thấp nhất"

#### Scenario: Nhóm <5 lệnh không kết luận
- **WHEN** nhóm có edge cao nhất chỉ có 2 lệnh
- **THEN** không tạo gợi ý so sánh từ nhóm đó (tránh kết luận từ 1-2 lệnh)
