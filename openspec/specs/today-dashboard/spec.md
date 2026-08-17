# today-dashboard Specification

## Purpose
Thay màn hình mặc định khi mở app (hiện đang là Journal) thành Today Dashboard — màn hình daily habit loop: Discipline Score + delta, Danger Zone 1 dòng, rules active, Quick Plan, lệnh đang mở. Toàn bộ nội dung tier Free (không gate).

## Requirements

### Requirement: Route mặc định là Today Dashboard
Route mặc định `(main)/index` hiển thị Today Dashboard; Journal chuyển thành screen riêng trong nav grid (không phải màn hình chính).

#### Scenario: Mở app thấy Dashboard
- **WHEN** user mở app và đã đăng nhập
- **THEN** màn hình đầu tiên là Today Dashboard, không phải Journal

### Requirement: Discipline Score + delta
Hiển thị Discipline Score hiện tại (snapshot mới nhất từ `discipline_score_snapshots`) + delta so với snapshot trước đó.

#### Scenario: Có 2 snapshot trở lên
- **WHEN** có snapshot gần nhất score=82 và snapshot trước score=75
- **THEN** hiển thị "82" + "▲ +7 so với tuần trước" (màu xanh khi tăng, đỏ khi giảm)

#### Scenario: Chưa có snapshot
- **WHEN** user mới chưa có snapshot nào
- **THEN** hiển thị trạng thái trống có ý nghĩa (không crash, không số vô nghĩa)

### Requirement: Danger Zone rút gọn 1 dòng
Hiển thị 1 dòng cảnh báo nếu có pattern đủ ngưỡng (theo Module 6: ≥30 lệnh + pattern ≥5 lần); ẩn hoàn toàn nếu chưa đủ — không hiện khối trống.

#### Scenario: Chưa đủ 30 lệnh
- **WHEN** user có <30 lệnh đã đóng
- **THEN** không hiển thị khối Danger Zone nào trên Dashboard (không có block rỗng)

#### Scenario: Đủ ngưỡng có pattern
- **WHEN** 35 lệnh đóng, pattern vi phạm lúc 14:00 xuất hiện 6 lần
- **THEN** hiển thị "⚠️ Vi phạm thường xuyên nhất lúc 14:00 — 6 lần (trong 35 lệnh)" — số liệu thật, không câu mẫu tĩnh

### Requirement: Rules active hôm nay
Danh sách ngắn từ `trading_rules` (is_active) với label tiếng Việt + giá trị + đơn vị.

#### Scenario: Có rules active
- **WHEN** user có 2 rules active (max_risk_per_trade=1%, max_daily_loss=50$)
- **THEN** hiển thị 2 dòng "Rủi ro tối đa 1 lệnh: 1%" + "Lỗ tối đa mỗi ngày: 50$"

### Requirement: Nút Quick Plan nổi bật
Nút xanh nổi bật MUST dẫn thẳng vào Fast Plan (Module 1) — hiện ở đầu màn hình.

#### Scenario: Tap Quick Plan
- **WHEN** user tap nút Quick Plan trên Dashboard
- **THEN** điều hướng tới form Fast Plan (không qua màn trung gian)

### Requirement: Card lệnh đang mở
Nếu có lệnh trong `trade_executions` chưa có `exit_time` → card riêng MUST hiển thị symbol/direction/lot/entry. PnL tạm tính cần giá hiện tại — chưa có nguồn giá thật (Phase 3) nên hiển thị ghi chú "PnL tạm tính cần giá hiện tại — chưa có nguồn giá thật", không tự chế giá.

#### Scenario: Có lệnh đang mở
- **WHEN** user có lệnh XAUUSD đang mở (chưa exit_time)
- **THEN** hiển thị card với symbol/direction/lot/entry + ghi chú PnL tạm tính chờ nguồn giá thật

#### Scenario: Không có lệnh mở
- **WHEN** không có lệnh nào đang mở
- **THEN** không hiển thị card lệnh đang mở (không khối rỗng)

### Requirement: User mới (0 lệnh) không trống trơn
User mới MUST thấy thông điệp hướng dẫn (3 bước) + nút "Nhập lệnh đầu tiên" + tip khai báo số dư — không hiện lỗi hay khối rỗng.

#### Scenario: User mới chưa có lệnh nào
- **WHEN** user vừa đăng ký, 0 lệnh, 0 snapshot
- **THEN** Dashboard hiển thị hướng dẫn 3 bước + nút "Nhập lệnh đầu tiên" + tip khai báo số dư (không lỗi, không khối rỗng)

### Requirement: Load ≤ 2 giây
Các query dashboard MUST chạy song song (Promise.all) — mục tiêu từ mở app đến hiển thị đầy đủ ≤2 giây thiết bị test trung bình (đo thực tế ở device test, không phải metric tĩnh).

#### Scenario: Đủ dữ liệu vẫn load nhanh
- **WHEN** user có đủ lệnh/snapshot/rules (5 query)
- **THEN** tất cả query chạy trong Promise.all song song (không chạy tuần tự)
