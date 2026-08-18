# i18n-content Specification

## Purpose

Nội dung sinh động từ dữ liệu (template, insight, quiz, notification, message lỗi) và message từ edge function phải theo ngôn ngữ hiện tại của app — không chỉ riêng label UI tĩnh.

## ADDED Requirements

### Requirement: Nội dung sinh động theo ngôn ngữ hiện tại
Các hàm tạo nội dung động phải sinh text theo ngôn ngữ đang dùng, giữ nguyên cấu trúc/ngưỡng/ý nghĩa: weekly-audit template, notification sáng/evening (M8), weakness-quiz, danger-zone insight, cost-of-indiscipline (con số + disclaimer), setup-analytics `bestSetupInsight`, discipline-streak text, instant-audit fallback quiz, message của risk-engine/violations/interruption.

#### Scenario: Weekly Audit tiếng Anh
- **WHEN** ngôn ngữ hiện tại là `en` và có dữ liệu tuần (N lệnh, X% theo plan, violation)
- **THEN** template sinh đúng tiếng Anh với số liệu thật, đúng ngữ pháp (kể cả count=0), không pha tiếng Việt

#### Scenario: Disclaimer cost-of-indiscipline được dịch
- **WHEN** con số cost hiển thị ở ngôn ngữ `en`
- **THEN** disclaimer hiển thị đúng bản dịch tiếng Anh, giữ nguyên văn phong (không rút gọn), snapshot test assert theo ngôn ngữ

#### Scenario: Notification không dùng từ phán xét ở mọi ngôn ngữ
- **WHEN** sinh notification morning ở ngôn ngữ bất kỳ trong số ngôn ngữ hỗ trợ
- **THEN** không chứa từ phán xét/hù dọa (test banned words chạy cho từng ngôn ngữ hỗ trợ)

### Requirement: Edge function parse-mt4 nhận tham số lang
`parse-mt4` nhận `lang` trong body invoke; message thành công/lỗi (kể cả `errorLines[].reason`) trả về theo `lang`. Không truyền `lang` → mặc định `vi` (không vỡ client cũ).

#### Scenario: Invoke với lang en
- **WHEN** client gửi `{ text, lang: "en" }`
- **THEN** message trả về tiếng Anh (import thành công / dòng lỗi), dữ liệu parse không đổi

#### Scenario: Không truyền lang
- **WHEN** client gửi `{ text }` (không có lang)
- **THEN** message trả về tiếng Việt — tương thích client cũ

### Requirement: Mọi key đều có đủ các ngôn ngữ hỗ trợ
Bộ dịch phải đầy đủ key như nhau giữa các ngôn ngữ hỗ trợ — không thiếu key ở bất kỳ ngôn ngữ nào (kiểm tra tự động trong test). Khi thêm ngôn ngữ mới sau này, test này chặn thiếu key.

#### Scenario: So khớp key giữa vi và en
- **WHEN** chạy test kiểm tra cấu trúc file dịch
- **THEN** mọi key có trong `vi.json` đều tồn tại trong `en.json` (không có key thiếu), và ngược lại không có key thừa chỉ ở một ngôn ngữ
