# onboarding-instant-audit Specification

## Purpose
Thêm bước "Onboarding Instant Audit" vào luồng Onboarding: sau bước Quiz điểm yếu, dán lịch sử giao dịch → parser `parse-mt4` → Behavior Engine hiện có → câu tóm tắt điểm yếu thực tế. Bước này có gate cứng: chỉ bật khi `INSTANT_AUDIT_ENABLED = true` (Module 0 đạt ≥95%); khi false → fallback vĩnh viễn từ `weakness_profile` quiz (không có deadline ép).

## ADDED Requirements

### Requirement: Bước tùy chọn "Dán lịch sử" (khi flag=true)
Sau bước Quiz, thêm bước tùy chọn "Dán lịch sử giao dịch gần đây để xem điểm yếu thực tế" — có nút "Bỏ qua — tiếp tục". Dùng lại Edge Function `parse-mt4`, sau parse chạy Behavior Engine hiện có (`detectViolations` — không viết logic mới) và hiển thị dạng: *"Trong N lệnh gần đây, bạn đã dời SL X lần (mất khoảng $Y), revenge trade Z lần (mất khoảng $W)."*

#### Scenario: Bỏ qua bước paste
- **WHEN** `INSTANT_AUDIT_ENABLED = true` và user bấm "Bỏ qua"
- **THEN** luồng Onboarding tiếp tục bình thường, không chặn, không lỗi

#### Scenario: Parse thành công
- **WHEN** user dán export hợp lệ, parse không lỗi
- **THEN** hiển thị kết quả audit dựa trên Behavior Engine với số liệu thật (N lệnh, X lần dời SL, Z lần revenge trade)

#### Scenario: Parse có dòng lỗi
- **WHEN** `INSTANT_AUDIT_ENABLED = true` và parse báo lỗi dòng 7, 42, 88
- **THEN** hiển thị rõ số dòng lỗi VÀ cảnh báo "kết quả dưới đây dựa trên dữ liệu thiếu" — không hiển thị audit data thiếu mà không cảnh báo

### Requirement: Fallback từ weakness_profile (flag=false)
Khi `INSTANT_AUDIT_ENABLED = false`, hiển thị màn "Dự đoán điểm yếu của bạn" từ `weakness_profile` (jsonb) thu thập ở quiz — liệt kê các điểm user tự nhận dạng cá nhân hóa. Không có code path nào gọi parser ở path này.

#### Scenario: Có điểm yếu từ quiz
- **WHEN** user khai `weakness_profile` chứa revenge_trading
- **THEN** hiển thị "⚠️ Revenge trading — Mở lệnh ngược chiều ngay sau khi bị dừng lỗ" (cá nhân hóa)

#### Scenario: Không có điểm yếu
- **WHEN** `weakness_profile` trống
- **THEN** hiển thị thông báo tích cực "✅ Không có điểm yếu nổi bật" (không trống, không crash)

#### Scenario: Guard flag=false
- **WHEN** user vô tình điều hướng tới màn instant-audit khi flag=false
- **THEN** guard chuyển hướng về explain (không gọi parser, không hiển thị audit)

### Requirement: Giữ AC Onboarding ≤ 3 phút
Cơ chế `analytics_events` (`onboarding_started`/`onboarding_completed`) MUST giữ nguyên — bước thêm vào có nút Bỏ qua nên không chặn luồng.

#### Scenario: Onboarding không bị kéo dài
- **WHEN** user bấm Bỏ qua bước paste lịch sử
- **THEN** luồng Onboarding hoàn tất nhanh như khi chưa có bước này (vẫn ghi onboarding_completed)
