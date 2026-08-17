-- ============================================================
-- Trading Discipline OS — Migration Phase 2 (chạy sau schema Phase 1)
-- Thêm mới:
--   1. Bảng pro_unlocks — audit mỗi lần user xem AdMob rewarded → mở Pro 24h
-- (Không sửa bảng/cột đã có — giữ nguyên cấu trúc Phase 1.)
--
-- Cách chạy: dán toàn bộ file này vào SQL Editor trên Supabase dashboard.
-- ============================================================

-- ------------------------------------------------------------
-- pro_unlocks — lịch sử mở Pro qua rewarded ad
-- ------------------------------------------------------------
create table pro_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_until timestamptz not null,
  method text not null check (method in ('admob_rewarded')),
  created_at timestamptz default now()
);

alter table pro_unlocks enable row level security;

create policy "pro_unlocks_select_own" on pro_unlocks
  for select using (user_id = auth.uid());
create policy "pro_unlocks_insert_own" on pro_unlocks
  for insert with check (user_id = auth.uid());
create policy "pro_unlocks_update_own" on pro_unlocks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pro_unlocks_delete_own" on pro_unlocks
  for delete using (user_id = auth.uid());

create index idx_pro_unlocks_user_granted on pro_unlocks(user_id, granted_at desc);
