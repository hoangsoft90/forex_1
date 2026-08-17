# mt4-parser Specification

## Purpose
Fix và verify Edge Function `parse-mt4` (parser Account History MT4/MT5) — hiện dựa trên format giả định chưa test với dữ liệu thật. Đây là gate cứng cho Onboarding Instant Audit: chỉ bật `INSTANT_AUDIT_ENABLED` sau khi ≥95% parse đúng trên dữ liệu thật từ ≥3 nguồn.

## ADDED Requirements

### Requirement: Parser xử lý đúng các biến thể format MT4/MT5
Parser xử lý khác nhau về separator (tab/comma), số cột, format ngày giờ (localized), decimal separator theo locale (dấu phẩy/dấu chấm), và khác biệt MT4 vs MT5.

#### Scenario: Locale decimal separator khác nhau
- **WHEN** dòng dữ liệu dùng dấu phẩy làm decimal separator (vd `1,23456`)
- **THEN** parser parse đúng giá trị số (1.23456), không lệch 1000 lần

#### Scenario: Định dạng ngày giờ localized
- **WHEN** ngày giờ ở định dạng `2026.08.17 14:30` hoặc `17.08.2026 14:30` hoặc `8/17/2026 2:30 PM`
- **THEN** parser chuyển đúng sang timestamp UTC lưu vào `trade_executions`

### Requirement: Dòng lỗi KHÔNG silent-skip
Với mỗi dòng không parse được, parser trả về danh sách lỗi kèm số dòng để user tự sửa tay hoặc báo lại — không im lặng bỏ qua.

#### Scenario: Có dòng lỗi trong export
- **WHEN** export có 100 dòng, 3 dòng không parse được (dòng 7, 42, 88)
- **THEN** response trả về danh sách lỗi rõ `[{line: 7, ...}, {line: 42, ...}, {line: 88, ...}]`, phần còn lại vẫn parse

### Requirement: Lưu raw payload đầy đủ
`raw_import_payload` vẫn được lưu nguyên vẹn để debug khi user thật báo lỗi sau này.

#### Scenario: Raw payload lưu đầy đủ
- **WHEN** user import một export bất kỳ
- **THEN** `raw_import_payload` chứa toàn bộ text gốc (không cắt, không biến đổi)

### Requirement: Feature flag gate cứng
Cờ `INSTANT_AUDIT_ENABLED` mặc định **false** (seed trong bảng `feature_flags`); chỉ set `true` sau khi đạt ≥95% parse đúng trên dữ liệu thật + được xác nhận thủ công.

#### Scenario: Flag mặc định false
- **WHEN** chưa có ai bật flag
- **THEN** `isInstantAuditEnabled()` trả false — luồng Onboarding dùng fallback quiz (3.3)

#### Scenario: Flag đọc từ bảng feature_flags
- **WHEN** bảng `feature_flags` có `INSTANT_AUDIT_ENABLED = true`
- **THEN** `isInstantAuditEnabled()` trả true; khi DB lỗi → fallback false an toàn (không bao giờ tự bật)
