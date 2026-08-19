# in-app-guidance Specification

## Purpose

Bộ công cụ hướng dẫn trong app: đánh dấu tính năng mới (FeatureBadge), giải thích phần UI qua tooltip + spotlight highlight element (auto-position theo màn hình), giải thích nút disabled (DisabledStateHelper), và tour nhiều bước nối tiếp có Skip/Done cho user mới — tất cả chỉ hiện đúng 1 lần, không spam.

## ADDED Requirements

### Requirement: FeatureBadge — dot/label "New" trên element, tự ẩn sau khi xem
Component nhỏ hiển thị dot hoặc label "New" (i18n) đính kèm icon/button. Khi user đã xem (dismiss) → ẩn vĩnh viễn (lưu AsyncStorage theo key `feature:<id>`), không hiện lại ở lần mở app sau.

#### Scenario: Badge hiển thị lần đầu
- **WHEN** một feature có badge chưa từng bị dismiss
- **THEN** hiển thị label "New" (hoặc dot) cạnh element, màu nổi bật

#### Scenario: Badge đã bị dismiss → không hiện lại
- **WHEN** user đã dismiss badge của feature đó (bấm vào badge hoặc gọi dismiss)
- **THEN** badge ẩn và không bao giờ hiện lại (trạng thái lưu AsyncStorage)

### Requirement: Tooltip & Spotlight — highlight element target, auto-position
Khi tour/hướng dẫn kích hoạt một step trỏ vào element target: phần còn lại của màn hình bị làm mờ (overlay), element target được "spotlight" (hở sáng), tooltip hiện cạnh element. Vị trí tooltip **tự tính toán**: đo rect của element qua ref (`measureInWindow` native / `getBoundingClientRect` web), đặt tooltip theo placement ưu tiên (top/bottom/left/right), **tự flip sang hướng ngược lại khi không đủ chỗ** và **clamp trong màn hình** (responsive theo `useWindowDimensions`).

#### Scenario: Có đủ chỗ theo placement ưu tiên
- **WHEN** element target ở giữa màn hình và placement ưu tiên `bottom`
- **THEN** tooltip hiện bên dưới element, căn giữa theo element

#### Scenario: Không đủ chỗ → flip
- **WHEN** element target sát mép trên màn hình và placement ưu tiên `top`
- **THEN** tooltip tự flip xuống `bottom` để không tràn khỏi màn hình

#### Scenario: Màn hình nhỏ → clamp
- **WHEN** element sát mép phải và tooltip tràn phải
- **THEN** tooltip bị clamp vào trong màn hình (không tràn, không cắt)

### Requirement: DisabledStateHelper — giải thích lý do nút disabled
Wrapper quanh một nút: khi nút disabled và user **tap vào** → hiện tooltip/modal ngắn nêu lý do bị khóa + điều kiện unlock (2 chuỗi i18n riêng). Khi nút không disabled → pass-through (không chặn tap, không đổi giao diện).

#### Scenario: Tap vào nút đang disabled
- **WHEN** nút đang disabled (vd đang lưu) và user tap vào nút
- **THEN** hiện tooltip: lý do ("Đang lưu...") + điều kiện unlock ("Chờ lưu xong rồi thử lại"), tự đóng khi tap ngoài

#### Scenario: Nút không disabled
- **WHEN** nút ở trạng thái bình thường
- **THEN** wrapper không ảnh hưởng gì — tap chạy hành vi gốc của nút

### Requirement: Tour nhiều bước nối tiếp — Step 1 → Step 2 → Finish
GuidanceProvider quản lý tour: mỗi tour có `tourId` + danh sách step (mỗi step: `targetKey` trỏ ref element + title/body i18n + placement). Step nối tiếp nhau, có nút **Skip** (bỏ qua cả tour) và **Done** (hoàn thành step cuối). Bước tiếp theo chỉ hiện khi bước trước đã qua (Next/Done). Trạng thái từng bước (`stepCompleted`) lưu AsyncStorage.

#### Scenario: Tour hoàn thành từng bước
- **WHEN** user bấm Next ở step 1, rồi Done ở step 2
- **THEN** cả 2 step được đánh dấu `stepCompleted` trong AsyncStorage và tour kết thúc

#### Scenario: Skip tour
- **WHEN** user bấm Skip ở giữa tour
- **THEN** tour dừng ngay, không hiện các step còn lại

### Requirement: Trigger chỉ hiện 1 lần — không spam
Tour/badge chỉ kích hoạt đúng 1 lần cho user mới (theo `tourId`/`featureKey`): sau khi user đã xem xong hoặc skip → lưu `hasSeenTour`/`dismissed` → lần sau mở app (hoặc lặp lại action) KHÔNG hiện lại. Tour dashboard chỉ chạy cho user mới (chưa có lệnh/score — trùng điều kiện card "How to start?" hiện có).

#### Scenario: User mới mở app lần đầu
- **WHEN** user mới (chưa có trade nào) vào Dashboard lần đầu, tour chưa từng hiện
- **THEN** tour 2 bước tự kích hoạt (spotlight + tooltip trên Quick Plan và Journal)

#### Scenario: Lần mở app sau — không hiện lại
- **WHEN** user đã xem xong (hoặc skip) tour ở lần trước, mở lại Dashboard
- **THEN** tour không hiện lại — chỉ còn card "How to start?" text tĩnh như cũ

### Requirement: i18n — mọi chuỗi guidance qua keys vi/en
Toàn bộ chuỗi hiển thị (title/body tooltip, label badge, nút Skip/Done/Next, lý do disabled) nằm trong `src/i18n/locales/{vi,en}.json` — dùng `t()` như mọi màn hình khác, tuân theo parity test (không thiếu key giữa vi↔en).

#### Scenario: Đổi ngôn ngữ
- **WHEN** user đổi ngôn ngữ sang English
- **THEN** toàn bộ guidance (tooltip, badge, nút tour, lý do disabled) hiển thị tiếng Anh
