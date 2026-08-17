# Data Model — Trading Discipline OS

> Stack tham chiếu: PostgreSQL (Supabase). Naming: snake_case cho bảng/cột. Mọi bảng có `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` trừ khi ghi chú khác.
> Row-Level Security (RLS): mọi bảng chứa dữ liệu cá nhân đều bật RLS, policy `user_id = auth.uid()`.

---

## 1. users (do Supabase Auth quản lý, mở rộng thêm profile)

```sql
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
```

---

## 2. trading_rules — Personal Trading Constitution

```sql
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
  ),
  base_value numeric not null,             -- giá trị mặc định, VD 1.0 (=1%)
  unit text check (unit in ('percent','currency','minutes','count')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Adaptive condition: rule có thể tự động ĐIỀU CHỈNH GIẢM theo bối cảnh thị trường.
-- Nguyên tắc bắt buộc (theo plan1_final_v2.md mục 3): chỉ cho phép điều chỉnh GIẢM tự động.
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
```

**Ghi chú thực thi quan trọng:** ở tầng application logic (không chỉ DB constraint), mọi request tạo/sửa `rule_adaptive_conditions` với `adjusted_value > base_value` của rule liên quan phải bị **từ chối ở API layer**, không chỉ dựa vào check constraint DB — vì logic so sánh phụ thuộc rule cụ thể (risk % thì "giảm" là số nhỏ hơn, nhưng nếu sau này có rule dạng khác thì "giảm" có thể nghĩa khác). Áp constraint tại DB (`adjusted_value <= base_value`) như một lớp phòng vệ cứng, nhưng validate ý nghĩa nghiệp vụ ở backend.

---

## 3. trade_plans — object trung tâm (PLANNED)

```sql
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
```

---

## 4. trade_executions — dữ liệu thực tế (ACTUAL)

```sql
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

-- Lịch sử sửa SL trong 1 lệnh (phục vụ phát hiện "Hope Trading" — dời SL nhiều lần)
create table trade_sl_adjustments (
  id uuid primary key default gen_random_uuid(),
  trade_execution_id uuid not null references trade_executions(id) on delete cascade,
  old_sl numeric not null,
  new_sl numeric not null,
  adjusted_at timestamptz not null default now()
);
```

---

## 5. plan_vs_reality_deltas — bảng tính sẵn (denormalized) phục vụ dashboard nhanh

```sql
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
```

---

## 6. rule_violations — Behavior Engine output

```sql
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
```

---

## 7. decision_interruptions — log mỗi lần app chặn/hỏi trước khi vào lệnh

```sql
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
```

---

## 8. discipline_score_snapshots & edge_score_snapshots — 2 trục điểm tách biệt (mục 9 plan v2)

```sql
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
```

**Lý do tách 2 bảng riêng thay vì gộp:** tránh nhầm lẫn khi query — Discipline (hành vi) và Edge (hiệu quả chiến lược) có chu kỳ tính toán, ý nghĩa, và mục đích hiển thị khác nhau (xem mục 9, plan1_final_v2.md).

---

## 9. accountability_circles — thay Community Trade Ideas

```sql
create table accountability_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table accountability_circle_members (
  circle_id uuid not null references accountability_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  share_discipline_score boolean default true,
  share_pnl boolean default false,          -- mặc định KHÔNG share P&L, theo mục 10 plan v2
  primary key (circle_id, user_id)
);
```

---

## 10. subscriptions — thanh toán (hỗ trợ cả quốc tế lẫn nội địa VN, mục 12 plan v2)

```sql
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
```

---

## 11. Quan hệ tổng quan (ERD dạng text)

```
user_profiles 1---N trading_rules 1---N rule_adaptive_conditions
user_profiles 1---N trade_plans ---0/1--- trade_executions 1---N trade_sl_adjustments
trade_plans + trade_executions ---1---1--- plan_vs_reality_deltas
trade_executions 1---N rule_violations ---N---1 trading_rules
user_profiles 1---N decision_interruptions ---0/1--- trade_plans
user_profiles 1---N discipline_score_snapshots
user_profiles 1---N edge_score_snapshots
user_profiles 1---N accountability_circle_members ---N---1 accountability_circles
user_profiles 1---N subscriptions
```

---

## 12. Chỉ mục (index) cần thiết cho query phân tích (Behavior Engine chạy nhanh)

```sql
create index idx_trade_executions_user_time on trade_executions(user_id, entry_time desc);
create index idx_rule_violations_user_type on rule_violations(user_id, violation_type);
create index idx_trade_plans_user_status on trade_plans(user_id, status);
create index idx_discipline_snapshots_user_period on discipline_score_snapshots(user_id, period_start);
```