# i18n Specification

## Purpose

Hệ thống đa ngôn ngữ cốt lõi: app hỗ trợ 2 ngôn ngữ đợt này (`vi` + `en`), kiến trúc sẵn sàng mở rộng thêm ngôn ngữ sau. Tự động theo thiết bị khi lần đầu, đổi được thủ công trong Settings (lưu lại), không bao giờ lẫn ngôn ngữ hay hiện raw key.

## ADDED Requirements

### Requirement: Hỗ trợ tiếng Việt + tiếng Anh, tiếng Việt là mặc định
App hỗ trợ `vi` (mặc định/fallback) và `en`. Mọi chuỗi UI đều có bản dịch cho cả 2 ngôn ngữ. Danh sách ngôn ngữ + cơ chế resolve được thiết kế để thêm ngôn ngữ mới chỉ bằng file json + 1 dòng danh sách (không sửa logic).

#### Scenario: Không có ngôn ngữ nào được chọn
- **WHEN** user chưa từng chọn ngôn ngữ
- **THEN** app dùng tiếng Việt (mặc định)

### Requirement: Tự động detect locale thiết bị lần đầu
Khi mở app lần đầu (chưa có preference đã lưu), detect locale hệ thống; nếu khớp một trong 6 ngôn ngữ hỗ trợ → dùng ngôn ngữ đó, ngược lại → tiếng Việt.

#### Scenario: Thiết bị tiếng Anh
- **WHEN** locale thiết bị là `en-US` và chưa có preference
- **THEN** app hiển thị tiếng Anh

#### Scenario: Thiết bị ngôn ngữ không hỗ trợ
- **WHEN** locale thiết bị là `fr-FR` (ngoài 2 ngôn ngữ) và chưa có preference
- **THEN** app hiển thị tiếng Việt (fallback), không hiện lỗi

### Requirement: Đổi ngôn ngữ trong Settings, áp dụng ngay
Settings có mục "Ngôn ngữ" liệt kê các ngôn ngữ hỗ trợ bằng tên native (hiện tại: Tiếng Việt / English). Khi user chọn, toàn app chuyển ngôn ngữ ngay lập tức, không cần restart, và lựa chọn được lưu lại.

#### Scenario: Chọn ngôn ngữ khác
- **WHEN** user chọn "English" trong Settings
- **THEN** toàn bộ màn hình hiện tiếng Anh ngay (không restart) và lần mở app sau vẫn tiếng Anh

#### Scenario: Preference override auto-detect
- **WHEN** thiết bị locale `en` nhưng user đã chọn `vi` trong Settings
- **THEN** app vẫn hiển thị tiếng Việt (preference thắng auto-detect)

### Requirement: Không lẫn ngôn ngữ, không hiện raw key
Mọi màn hình trong cùng một phiên dùng đúng một ngôn ngữ. Nếu một key chưa có bản dịch trong ngôn ngữ hiện tại → fallback về bản tiếng Việt của key đó, không bao giờ hiển thị chuỗi key thô (vd `settings.title`).

#### Scenario: Key thiếu bản dịch
- **WHEN** một key chưa có trong file `en.json`
- **THEN** hiển thị bản tiếng Việt của key đó (fallback `vi`), không hiện tên key

### Requirement: Business logic giữ nguyên, chỉ thay ngôn ngữ
Việc i18n không đổi hành vi nghiệp vụ: công thức, ngưỡng, luồng navigation, gate Pro, trigger DB — giữ nguyên. Chỉ chuỗi hiển thị thay đổi theo ngôn ngữ.

#### Scenario: Test cũ vẫn pass
- **WHEN** chạy toàn bộ test suite hiện tại (assert chuỗi tiếng Việt)
- **THEN** tất cả vẫn pass (môi trường test dùng tiếng Việt mặc định)
