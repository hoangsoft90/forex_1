## Purpose
Onboarding thu thập thông tin cá nhân hóa (số dư baseline + hồ sơ điểm yếu) và bắt buộc user hiểu sự khác biệt giữa Discipline Score và Edge Score trước khi vào app.

## ADDED Requirements

### Requirement: Đăng ký/đăng nhập bằng email + password
User đăng ký hoặc đăng nhập bằng email + password thông qua Supabase Auth built-in.

#### Scenario: User mới đăng ký
- **WHEN** user chưa có tài khoản và nhập email + password hợp lệ
- **THEN** tài khoản được tạo và user chuyển sang bước nhập số dư tài khoản

#### Scenario: User đăng nhập lại
- **WHEN** user đã có tài khoản và nhập đúng email + password
- **THEN** user được đưa thẳng vào luồng onboarding tiếp theo (hoặc vào app nếu đã hoàn tất)

### Requirement: Nhập số dư tài khoản trading baseline
User nhập số dư tài khoản trading làm baseline để tính % risk ở các module sau.

#### Scenario: Lưu account_balance_baseline
- **WHEN** user nhập số dư tài khoản (số dương)
- **THEN** giá trị được lưu vào `user_profiles.account_balance_baseline` và user chuyển sang bước quiz

### Requirement: Quiz Weakness Profiling (5-7 câu single-select)
User trả lời 5-7 câu hỏi dạng single-select về hành vi giao dịch để xây dựng `weakness_profile`.

#### Scenario: Hoàn tất quiz
- **WHEN** user trả lời xong toàn bộ câu hỏi quiz
- **THEN** kết quả được lưu dạng jsonb đúng format vào `user_profiles.weakness_profile` (VD: `{"revenge_trading": true, "moves_sl": true}`)

#### Scenario: Chưa trả lời hết câu hỏi
- **WHEN** user cố chuyển sang bước tiếp theo khi còn câu hỏi chưa trả lời
- **THEN** user bị chặn, không thể bỏ qua quiz dở dang

### Requirement: Giải thích Discipline Score vs Edge Score không thể skip
Hiển thị giải thích ngắn về 2 trục điểm riêng biệt; user chỉ có thể tiếp tục bằng nút "Đã hiểu", không có nút "Bỏ qua".

#### Scenario: Xem giải thích lần đầu
- **WHEN** user hoàn tất quiz và đến màn hình giải thích
- **THEN** chỉ có nút "Đã hiểu" để tiếp tục, không có lựa chọn bỏ qua

#### Scenario: Xem lại trong Settings
- **WHEN** user đã hoàn tất onboarding và mở Settings
- **THEN** nội dung giải thích Discipline vs Edge có thể xem lại

### Requirement: Ghi analytics onboarding
Ghi event `onboarding_started` và `onboarding_completed` vào bảng `analytics_events` để đo thời gian hoàn tất ≤ 3 phút.

#### Scenario: Đo thời gian hoàn tất onboarding
- **WHEN** user bắt đầu luồng onboarding (event `onboarding_started`) và sau đó hoàn tất (event `onboarding_completed`)
- **THEN** chênh lệch 2 timestamp được tính từ bảng `analytics_events` bằng query SQL để xác nhận AC ≤ 3 phút
