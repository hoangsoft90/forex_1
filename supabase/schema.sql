-- ============================================================
-- Trading Discipline OS — Schema (Phase 1)
-- Nguồn: data_model.md (giữ nguyên cấu trúc bảng/cột/constraint)
-- Bổ sung: bảng analytics_events (đã chốt với user, ghi event đo AC)
-- + RLS policies + trigger chặn adaptive condition tăng risk.
--
-- Cách chạy: dán toàn bộ file này vào SQL Editor trên Supabase dashboard
-- (hoặc chạy qua script nếu có connection string).
-- ============================================================

-- ------------------------------------------------------------
-- 1. user_profiles (mở rộng auth.users)
-- ------------------------------------------------------------
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  account_currency text default 'USD',
  account_balance_baseline numeric,       -- số dư tài khoản user khai báo lúc onboarding, dùng tính % risk
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  weakness_profile jsonb,                 -- kết quả Weakness Profiling onboarding, VD: {"revenge_trading": true, "moves_sl": true}
  timezone text default 'Asia/Ho_Chi_Minh',
  subscription_tier text default 'free' check (subscription_tier in ('free','pro')),
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "user_profiles_select_own" on user_profiles
  for select using (id = auth.uid());
create policy "user_profiles_insert_own" on user_profiles
  for insert with check (id = auth.uid());
create policy "user_profiles_update_own" on user_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- 2. trading_rules — Personal Trading Constitution
-- ------------------------------------------------------------
create table trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_type text not null check (rule_type in (
    'max_risk_per_trade',      -- % tối đa risk 1 lệnh
    'max_daily_loss',          -- % tối đa lỗ trong ngày
    'max_weekly_loss',
    'no_revenge_trade',        -- không mở lệnh ngược chiều trong X phút sau SL
    'no_trade_before_news',    -- không vào lệnh X phút trước tin HIGH IMPACT
    'max_open_positions',
    'custom'
  )),
  base_value numeric not null,             -- giá trị mặc định, VD 1.0 (=1%)
  unit text check (unit in ('percent','currency','minutes','count')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table trading_rules enable row level security;

create policy "trading_rules_select_own" on trading_rules
  for select using (user_id = auth.uid());
create policy "trading_rules_insert_own" on trading_rules
  for insert with check (user_id = auth.uid());
create policy "trading_rules_update_own" on trading_rules
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trading_rules_delete_own" on trading_rules
  for delete using (user_id = auth.uid());

-- Adaptive condition: chỉ cho phép điều chỉnh GIẢM (direction = 'decrease').
create table rule_adaptive_conditions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references trading_rules(id) on delete cascade,
  condition_type text not null check (condition_type in ('atr_threshold','news_high_impact','session_based')),
  condition_operator text check (condition_operator in ('gt','lt','eq')),
  condition_value numeric,                  -- VD: ATR > 1.5x trung bình 20 ngày
  adjusted_value numeric not null,          -- giá trị rule SAU khi điều chỉnh (phải <= base_value nếu là risk/loss rule)
  direction text not null default 'decrease' check (direction = 'decrease'), -- khóa cứng: chỉ decrease
  created_at timestamptz default now()
);

alter table rule_adaptive_conditions enable row level security;

-- Lớp phòng vệ cứng tại DB: adjusted_value phải <= base_value của rule cha.
-- (Ngoài ra backend phải validate ý nghĩa nghiệp vụ — xem data_model.md ghi chú thực thi.)
create or replace function enforce_adaptive_condition_decrease()
returns trigger
language plpgsql
as $$
declare
  v_base numeric;
begin
  select base_value into v_base from trading_rules where id = new.rule_id;
  if v_base is null then
    raise exception 'rule_id không tồn tại';
  end if;
  if new.adjusted_value > v_base then
    raise exception 'adjusted_value (% ) phải <= base_value (%), adaptive chỉ được điều chỉnh GIẢM',
      new.adjusted_value, v_base;
  end if;
  return new;
end;
$$;

create trigger trg_adaptive_condition_decrease
  before insert or update on rule_adaptive_conditions
  for each row execute function enforce_adaptive_condition_decrease();

create policy "adaptive_conditions_select_own" on rule_adaptive_conditions
  for select using (
    exists (select 1 from trading_rules r where r.id = rule_id and r.user_id = auth.uid())
  );
create policy "adaptive_conditions_insert_own" on rule_adaptive_conditions
  for insert with check (
    exists (select 1 from trading_rules r where r.id = rule_id and r.user_id = auth.uid())
  );
create policy "adaptive_conditions_update_own" on rule_adaptive_conditions
  for update using (
    exists (select 1 from trading_rules r where r.id = rule_id and r.user_id = auth.uid())
  );
create policy "adaptive_conditions_delete_own" on rule_adaptive_conditions
  for delete using (
    exists (select 1 from trading_rules r where r.id = rule_id and r.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3. trade_plans — object trung tâm (PLANNED)
-- ------------------------------------------------------------
create table trade_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,                     -- VD 'EURUSD', 'XAUUSD'
  direction text not null check (direction in ('buy','sell')),
  thesis text,                              -- lý do vào lệnh, dạng text tự do
  setup_tag text,                           -- VD 'breakout', 'rejection', 'trend_continuation'
  planned_entry numeric not null,
  planned_sl numeric not null,
  planned_tp numeric,
  planned_risk_percent numeric not null,    -- risk % user dự định, đối chiếu với trading_rules
  invalidation_condition text,              -- điều kiện huỷ kịch bản, VD "nếu mất 1.0835"
  confidence_level int check (confidence_level between 1 and 5),
  applied_adaptive_condition_id uuid references rule_adaptive_conditions(id), -- nếu plan này áp dụng 1 adaptive rule
  status text not null default 'planned' check (status in ('planned','executed','cancelled','expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table trade_plans enable row level security;

create policy "trade_plans_select_own" on trade_plans
  for select using (user_id = auth.uid());
create policy "trade_plans_insert_own" on trade_plans
  for insert with check (user_id = auth.uid());
create policy "trade_plans_update_own" on trade_plans
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trade_plans_delete_own" on trade_plans
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. trade_executions — dữ liệu thực tế (ACTUAL)
-- ------------------------------------------------------------
create table trade_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_plan_id uuid references trade_plans(id) on delete set null, -- null nếu lệnh không có plan trước (out-of-plan trade)
  symbol text not null,
  direction text not null check (direction in ('buy','sell')),
  lot_size numeric not null,
  actual_entry numeric not null,
  actual_sl numeric,
  actual_tp numeric,
  actual_risk_percent numeric,              -- tính toán ngược từ lot_size + SL + account_balance
  entry_time timestamptz not null,
  exit_time timestamptz,
  exit_price numeric,
  pnl_amount numeric,
  pnl_percent numeric,
  source text not null check (source in ('manual','copy_paste_mt4','mobile_widget','ea_csv','auto_sync')), -- theo mục 4 plan v2
  raw_import_payload jsonb,                 -- lưu dữ liệu gốc từ copy-paste/CSV để debug/audit
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table trade_executions enable row level security;

create policy "trade_executions_select_own" on trade_executions
  for select using (user_id = auth.uid());
create policy "trade_executions_insert_own" on trade_executions
  for insert with check (user_id = auth.uid());
create policy "trade_executions_update_own" on trade_executions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trade_executions_delete_own" on trade_executions
  for delete using (user_id = auth.uid());

-- Lịch sử sửa SL trong 1 lệnh (phục vụ phát hiện "Hope Trading" — dời SL nhiều lần)
create table trade_sl_adjustments (
  id uuid primary key default gen_random_uuid(),
  trade_execution_id uuid not null references trade_executions(id) on delete cascade,
  old_sl numeric not null,
  new_sl numeric not null,
  adjusted_at timestamptz not null default now()
);

alter table trade_sl_adjustments enable row level security;

create policy "sl_adjustments_select_own" on trade_sl_adjustments
  for select using (
    exists (select 1 from trade_executions e where e.id = trade_execution_id and e.user_id = auth.uid())
  );
create policy "sl_adjustments_insert_own" on trade_sl_adjustments
  for insert with check (
    exists (select 1 from trade_executions e where e.id = trade_execution_id and e.user_id = auth.uid())
  );
create policy "sl_adjustments_update_own" on trade_sl_adjustments
  for update using (
    exists (select 1 from trade_executions e where e.id = trade_execution_id and e.user_id = auth.uid())
  );
create policy "sl_adjustments_delete_own" on trade_sl_adjustments
  for delete using (
    exists (select 1 from trade_executions e where e.id = trade_execution_id and e.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 5. plan_vs_reality_deltas — bảng tính sẵn (denormalized) phục vụ dashboard nhanh
-- ------------------------------------------------------------
create table plan_vs_reality_deltas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_plan_id uuid references trade_plans(id),
  trade_execution_id uuid not null references trade_executions(id) on delete cascade,
  entry_deviation_pips numeric,
  sl_deviation_pips numeric,
  risk_deviation_percent numeric,           -- actual_risk_percent - planned_risk_percent
  followed_plan boolean,                    -- true nếu delta trong ngưỡng cho phép (ngưỡng cấu hình được)
  deviation_reason text,                    -- nếu có Decision Interruption, lý do user nhập khi bỏ qua/điều chỉnh
  computed_at timestamptz default now()
);

alter table plan_vs_reality_deltas enable row level security;

create policy "deltas_select_own" on plan_vs_reality_deltas
  for select using (user_id = auth.uid());
create policy "deltas_insert_own" on plan_vs_reality_deltas
  for insert with check (user_id = auth.uid());
create policy "deltas_update_own" on plan_vs_reality_deltas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "deltas_delete_own" on plan_vs_reality_deltas
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 6. rule_violations — Behavior Engine output
-- ------------------------------------------------------------
create table rule_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_execution_id uuid references trade_executions(id) on delete cascade,
  rule_id uuid references trading_rules(id),
  violation_type text not null check (violation_type in (
    'overconfidence_size',      -- risk thực > risk kế hoạch
    'revenge_trading',          -- mở lệnh ngược chiều <10' sau SL
    'hope_trading',             -- dời SL >2 lần
    'news_gambling',            -- vào lệnh <15' trước tin HIGH IMPACT
    'martingale_negative',      -- tăng lot sau chuỗi thua
    'max_daily_loss_exceeded',
    'checklist_skipped',
    'adaptive_decision'         -- KHÔNG phải violation thật, nhưng ghi nhận cùng cơ chế để phân tích. is_negative=false
  )),
  is_negative boolean not null default true, -- false cho 'adaptive_decision' (tích cực)
  severity int check (severity between 1 and 5),
  evidence_snapshot jsonb,      -- lưu dữ liệu evidence hiển thị lúc Interruption, phục vụ audit sau này
  user_acknowledged boolean default false,   -- user đã đọc/tick "tôi hiểu rủi ro"
  detected_at timestamptz default now()
);

alter table rule_violations enable row level security;

create policy "violations_select_own" on rule_violations
  for select using (user_id = auth.uid());
create policy "violations_insert_own" on rule_violations
  for insert with check (user_id = auth.uid());
create policy "violations_update_own" on rule_violations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "violations_delete_own" on rule_violations
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 7. decision_interruptions — log mỗi lần app chặn/hỏi trước khi vào lệnh
-- ------------------------------------------------------------
create table decision_interruptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_plan_id uuid references trade_plans(id),
  trigger_type text not null check (trigger_type in ('revenge_pattern','over_risk','max_daily_loss','news_window')),
  evidence_mode text not null check (evidence_mode in ('personal','cohort_benchmark')), -- xem mục 5 plan v2: cold-start dùng cohort_benchmark
  evidence_text text not null,              -- câu cảnh báo cụ thể đã hiển thị cho user
  user_decision text check (user_decision in ('proceeded','cancelled','reduced_risk')),
  shown_at timestamptz default now(),
  responded_at timestamptz
);

alter table decision_interruptions enable row level security;

create policy "interruptions_select_own" on decision_interruptions
  for select using (user_id = auth.uid());
create policy "interruptions_insert_own" on decision_interruptions
  for insert with check (user_id = auth.uid());
create policy "interruptions_update_own" on decision_interruptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "interruptions_delete_own" on decision_interruptions
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 8. discipline_score_snapshots & edge_score_snapshots — 2 trục điểm tách biệt
-- ------------------------------------------------------------
create table discipline_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  score numeric not null check (score between 0 and 100),
  rule_adherence_rate numeric,              -- % lệnh tuân thủ plan
  violations_count int default 0,
  bad_trades_prevented_count int default 0, -- North Star metric phụ, mục 11 plan v2
  computed_at timestamptz default now()
);

alter table discipline_score_snapshots enable row level security;

create policy "discipline_snapshots_select_own" on discipline_score_snapshots
  for select using (user_id = auth.uid());
create policy "discipline_snapshots_insert_own" on discipline_score_snapshots
  for insert with check (user_id = auth.uid());
create policy "discipline_snapshots_update_own" on discipline_score_snapshots
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "discipline_snapshots_delete_own" on discipline_score_snapshots
  for delete using (user_id = auth.uid());

create table edge_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  winrate numeric,
  avg_risk_reward numeric,
  total_pnl numeric,
  best_setup_tag text,
  best_session text check (best_session in ('asia','london','ny')),
  computed_at timestamptz default now()
);

alter table edge_score_snapshots enable row level security;

create policy "edge_snapshots_select_own" on edge_score_snapshots
  for select using (user_id = auth.uid());
create policy "edge_snapshots_insert_own" on edge_score_snapshots
  for insert with check (user_id = auth.uid());
create policy "edge_snapshots_update_own" on edge_score_snapshots
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "edge_snapshots_delete_own" on edge_score_snapshots
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 9. accountability_circles — thay Community Trade Ideas (giữ schema, chưa cần UI Phase 1)
-- ------------------------------------------------------------
create table accountability_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

alter table accountability_circles enable row level security;

create policy "circles_select_own" on accountability_circles
  for select using (owner_id = auth.uid());
create policy "circles_insert_own" on accountability_circles
  for insert with check (owner_id = auth.uid());
create policy "circles_update_own" on accountability_circles
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "circles_delete_own" on accountability_circles
  for delete using (owner_id = auth.uid());

create table accountability_circle_members (
  circle_id uuid not null references accountability_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  share_discipline_score boolean default true,
  share_pnl boolean default false,          -- mặc định KHÔNG share P&L, theo mục 10 plan v2
  primary key (circle_id, user_id)
);

alter table accountability_circle_members enable row level security;

create policy "circle_members_select_own" on accountability_circle_members
  for select using (user_id = auth.uid());
create policy "circle_members_insert_own" on accountability_circle_members
  for insert with check (user_id = auth.uid());
create policy "circle_members_update_own" on accountability_circle_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "circle_members_delete_own" on accountability_circle_members
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 10. subscriptions — thanh toán (hỗ trợ cả quốc tế lẫn nội địa VN)
-- ------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('pro_monthly','pro_yearly')),
  payment_provider text not null check (payment_provider in ('app_store','play_store','momo','vnpay','bank_transfer')),
  amount numeric not null,
  currency text not null default 'VND',
  status text not null check (status in ('active','cancelled','expired','pending')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "subscriptions_select_own" on subscriptions
  for select using (user_id = auth.uid());
create policy "subscriptions_insert_own" on subscriptions
  for insert with check (user_id = auth.uid());
create policy "subscriptions_update_own" on subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subscriptions_delete_own" on subscriptions
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- BỔ SUNG (chốt với user): analytics_events — ghi event đo acceptance criteria
-- Event mẫu: onboarding_started, onboarding_completed (đo ≤3 phút),
--            execution_widget_opened, execution_saved (đo ≤20 giây)
-- ------------------------------------------------------------
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_name text not null,
  properties jsonb,
  created_at timestamptz default now()
);

alter table analytics_events enable row level security;

create policy "analytics_events_select_own" on analytics_events
  for select using (user_id = auth.uid());
create policy "analytics_events_insert_own" on analytics_events
  for insert with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 12. Chỉ mục (index) cần thiết cho query phân tích
-- ------------------------------------------------------------
create index idx_trade_executions_user_time on trade_executions(user_id, entry_time desc);
create index idx_rule_violations_user_type on rule_violations(user_id, violation_type);
create index idx_trade_plans_user_status on trade_plans(user_id, status);
create index idx_discipline_snapshots_user_period on discipline_score_snapshots(user_id, period_start);
create index idx_analytics_events_user_event on analytics_events(user_id, event_name, created_at);
create index idx_trade_executions_user_plan on trade_executions(user_id, trade_plan_id);

-- ------------------------------------------------------------
-- 13. Notification preferences + Feature flags (Retention Layer Module 8)
-- ------------------------------------------------------------
-- Cấu hình notification riêng từng user (Retention M8)
create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_brief_enabled boolean default true,
  morning_brief_time time default '08:00',
  evening_review_enabled boolean default true,
  evening_review_time time default '21:00',
  push_token text,
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;

create policy "notification_prefs_select_own" on notification_preferences
  for select using (user_id = auth.uid());
create policy "notification_prefs_insert_own" on notification_preferences
  for insert with check (user_id = auth.uid());
create policy "notification_prefs_update_own" on notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Feature flags đơn giản (thay vì hardcode — dễ bật/tắt Instant Audit)
create table feature_flags (
  flag_name text primary key,
  is_enabled boolean not null default false,
  updated_at timestamptz default now()
);

alter table feature_flags enable row level security;

-- Flag mọi user đọc được (đọc-only, chỉ admin/service thay đổi)
create policy "feature_flags_select_all" on feature_flags
  for select using (true);

-- Seed: Instant Audit mặc định TẮT (gate cứng Module 0 — chỉ bật sau khi verify thật ≥95%)
insert into feature_flags (flag_name, is_enabled) values ('INSTANT_AUDIT_ENABLED', false)
on conflict (flag_name) do nothing;
