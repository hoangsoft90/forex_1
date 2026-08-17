# push-notification Specification

## Purpose
2 loại thông báo duy nhất (không thêm loại khác để tránh spam): (1) buổi sáng — tóm tắt Discipline Score hôm qua + rules hôm nay; (2) cuối ngày — chỉ khi có lệnh đóng trong ngày. Tone trung tính-khích lệ (không phán xét/hù dọa — nguyên tắc "Auditor cân bằng" plan1_final_v2 mục 8). Opt-in đúng ngữ cảnh: hỏi permission sau lần đầu thấy Today Dashboard.

## Requirements

### Requirement: Bảng cấu hình notification
Schema MUST thêm bảng `notification_preferences` (user_id PK, morning_brief_enabled, morning_brief_time default 08:00, evening_review_enabled, evening_review_time default 21:00, push_token, updated_at) + RLS. Schema MUST thêm bảng `feature_flags` (flag_name PK, is_enabled) + seed `INSTANT_AUDIT_ENABLED=false`.

#### Scenario: Seed flag mặc định
- **WHEN** chạy schema mới trên database
- **THEN** tồn tại bảng `notification_preferences` + `feature_flags` với dòng `INSTANT_AUDIT_ENABLED=false`

### Requirement: Nội dung buổi sáng (tone cân bằng)
Tóm tắt ngắn Discipline Score hôm qua + rules hôm nay. Không dùng ngôn ngữ phán xét/hù dọa (VD tránh: "Bạn lại vi phạm rồi!", "lại thua", "sao bạn...", "thất bại") — thay bằng tông trung tính-khích lệ: "Discipline Score hôm nay: 82. Xem chi tiết?".

#### Scenario: Score cao
- **WHEN** score hôm qua = 82
- **THEN** nội dung: "Discipline Score hôm qua: 82. Rules hôm nay: Rủi ro tối đa 1 lệnh..." (trung tính-khích lệ)

#### Scenario: Score thấp vẫn không phán xét
- **WHEN** score hôm qua = 35
- **THEN** nội dung vẫn trung tính, không dùng từ phán xét (test banned words — các từ 'vi phạm rồi', 'lại thua', 'sao bạn', 'thất bại' không xuất hiện)

### Requirement: Nội dung cuối ngày — chỉ khi có lệnh đóng
Chỉ gửi thông báo cuối ngày nếu hôm đó có lệnh đóng; không có lệnh → không gửi (tránh notification rỗng gây khó chịu).

#### Scenario: Không có lệnh đóng trong ngày
- **WHEN** hôm đó user không đóng lệnh nào
- **THEN** `buildNotification(..., evening)` trả ok:false — không tạo nội dung, không gửi

#### Scenario: Có lệnh đóng
- **WHEN** hôm đó có lệnh đóng
- **THEN** nhắc review nhanh với tông trung tính (nội dung mẫu review thủ công ≥5 bộ dữ liệu — test assert)

### Requirement: Opt-in đúng ngữ cảnh
Permission request MUST chỉ hiển thị SAU khi user đã thấy Today Dashboard ít nhất 1 lần (markDashboardSeen ghi AsyncStorage) — không hỏi ngay mở app lần đầu; không hỏi lại lần 2 (kiểm tra getPermissionsAsync).

#### Scenario: Mở app lần đầu không hỏi
- **WHEN** user mở app lần đầu tiên (chưa từng thấy Dashboard)
- **THEN** không hiện permission request

#### Scenario: Đã thấy Dashboard rồi hỏi
- **WHEN** user đã thấy Today Dashboard ≥1 lần
- **THEN** hiện permission request; nếu user từ chối → không hỏi lại lần 2

### Requirement: Settings bật/tắt từng loại
User tắt được từng loại riêng biệt trong Settings (2 Switch riêng + 2 giờ HH:MM riêng, validate định dạng) → upsert `notification_preferences` + reschedule local notifications.

#### Scenario: Tắt evening, giữ morning
- **WHEN** user tắt evening_review_enabled, giữ morning_brief_enabled
- **THEN** chỉ còn schedule notification buổi sáng theo giờ cấu hình

#### Scenario: Giờ không hợp lệ
- **WHEN** user nhập giờ sai định dạng (vd 25:00)
- **THEN** validate chặn, hiển thị lỗi, không lưu

### Requirement: Hiển thị notification khi app mở
`configureNotificationHandler()` MUST được gọi (wire vào main layout) để notification hiển thị cả khi app foreground.

#### Scenario: App đang mở nhận notification
- **WHEN** app đang ở foreground và notification được kích hoạt
- **THEN** notification hiển thị (không bị nuốt bởi handler mặc định)
