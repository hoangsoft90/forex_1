## Purpose
User xem 1 quảng cáo rewarded (AdMob) → nhận Pro 24h: `subscription_tier='pro'` + `subscription_expires_at = now()+24h`, audit qua bảng `pro_unlocks`. Đây là cơ chế monetization thay thế gói trả phí (chưa có hạ tầng thanh toán), đúng mô hình "xem ad nhận thưởng" quen thuộc với user VN.

## ADDED Requirements

### Requirement: Bảng pro_unlocks
Bảng mới `pro_unlocks` lưu lịch sử mở Pro: `id uuid pk`, `user_id uuid not null references auth.users(id) on delete cascade`, `granted_at timestamptz default now()`, `granted_until timestamptz not null`, `method text not null check (method in ('admob_rewarded'))`. RLS: user chỉ thấy bản ghi của mình (select/insert own).

#### Scenario: Ghi nhận khi xem ad thành công
- **WHEN** user xem hết rewarded ad (onRewarded callback)
- **THEN** insert `pro_unlocks` (method='admob_rewarded', granted_until=now()+24h)

#### Scenario: RLS chặn đọc chéo
- **WHEN** user A query `pro_unlocks` của user B
- **THEN** trả về rỗng (không lộ dữ liệu)

### Requirement: Pro 24h qua rewarded ad
Xem ad xong: upsert `user_profiles.subscription_tier='pro'`, `subscription_expires_at=now()+interval '24 hours'`. Không tạo bản ghi `subscriptions` (bảng đó dành cho thanh toán thật).

#### Scenario: Mở Pro 24h
- **WHEN** user xem xong rewarded ad
- **THEN** profile có tier='pro' và expires = now+24h; `isPro()` trả true

#### Scenario: Hết hạn tự quay về Free
- **WHEN** `subscription_expires_at < now()`
- **THEN** `isPro()` trả false (không cần job xóa — check lúc đọc)

### Requirement: Handle graceful khi thiếu cấu hình AdMob
Chưa có App ID/Ad Unit ID (env trống) hoặc ad load fail → không crash, hiện thông báo "quảng cáo chưa sẵn sàng".

#### Scenario: Thiếu env AdMob
- **WHEN** `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` trống
- **THEN** nút "Xem quảng cáo" ẩn/disabled kèm text giải thích

#### Scenario: Ad fail to load
- **WHEN** rewarded ad load fail
- **THEN** hiện thông báo lỗi, KHÔNG ghi pro_unlocks, không crash
