## Context

Xem proposal.md — Why. Dự án mới từ đầu: repo trống (chỉ có docs plan/data_model/mvp_scope + AGENTS.md + openspec). Stack bắt buộc: React Native (Expo) + Supabase (Postgres + Auth + Storage + Edge Functions). User tự tạo Supabase project free tier, cung cấp keys qua `.env` — không dùng CLI local.

## Goals / Non-Goals

**Goals:**
- Scaffold Expo app (TypeScript, expo-router) với supabase client kết nối sẵn.
- Migration schema đầy đủ từ `data_model.md` + bảng bổ sung `analytics_events` (đã chốt với user), kèm RLS policies + indexes.
- Kiến trúc sạch để 9 module implement tuần tự, mỗi module có acceptance criteria.
- Backend logic (parse MT4, tính delta, violation detection, score) nằm ở Supabase Edge Functions (Deno/TypeScript) — deploy sau khi có keys.

**Non-Goals:**
- Không dùng Supabase CLI local / docker; schema chạy qua SQL Editor hoặc script user tự chạy trên project thật.
- Không dùng PostHog/dịch vụ analytics ngoài (Phase 1 tự ghi `analytics_events`).
- Không LLM/AI, không MT4 auto-sync, không Economic Calendar, không Accountability Circle UI.

## Decisions

1. **Vị trí code:** `apps/mobile/` — Expo app (SDK 57, template default TS + expo-router). Repo root giữ docs + openspec + supabase migration.
2. **Supabase client:** `@supabase/supabase-js` + `@react-native-async-storage/async-storage` (persist session) + `react-native-url-polyfill`. Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng server/edge function). File `src/lib/supabase.ts` khởi tạo client.
3. **Schema:** `supabase/schema.sql` — toàn bộ DDL từ data_model.md (users_profiles → subscriptions, đúng tên bảng/cột/check constraint) + bảng `analytics_events` + RLS policies (`user_id = auth.uid()`) cho mọi bảng cá nhân + 4 indexes ở mục 12 data_model.md. User chạy trên SQL Editor hoặc qua script.
4. **Edge Functions:** thư mục `supabase/functions/` — các function: `parse-mt4` (module 5), `compute-deltas` (module 6), `detect-violations` (module 7), `compute-scores` (module 8), `weekly-audit` (module 9). Mỗi function dùng `SUPABASE_SERVICE_ROLE_KEY` (bỏ qua RLS, xác thực qua Authorization header). Chạy local dev bằng Node service layer cho phép test nhanh.
5. **Config logic nghiệp vụ:** các công thức (lot size, delta ngưỡng, discipline score, violation) nằm trong thư mục `src/lib/` (typescript thuần) ĐƯỢC DÙNG CHUNG cho cả app và test — đảm bảo test tự động công thức (mục 11 mvp_scope) chạy được độc lập với Edge Function. Edge Functions có thể nhúng lại logic qua import (deno) hoặc duplicate có test đối chiếu.
6. **Analytics:** helper `src/lib/analytics.ts` ghi event vào bảng `analytics_events` (user_id, event_name, properties, created_at).
7. **Tier gating:** đọc `user_profiles.subscription_tier`; helper `src/lib/tier.ts`.

## Risks / Trade-offs

- **MT4 format giả định:** parser module 5 dựa trên format công khai MetaQuotes/community — chưa verify dữ liệu thật; đánh dấu rõ trong code + báo cáo, test bằng dữ liệu giả lập.
- **Expo SDK 57 template default** sinh sẵn nhiều màn hình mẫu — cần dọn để giữ code gọn (Ponytail).
- **RLS + Edge Function:** service role key bypass RLS — phải validate nghiệp vụ ở backend (vd adaptive condition chỉ decrease), không dựa vào DB constraint đơn thuần.
- **Chưa có Supabase project thật:** toàn bộ code kết nối viết trước, verify kết nối khi user có keys; schema chạy thủ công.
