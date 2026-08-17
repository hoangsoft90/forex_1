## 1. Module 0 — Fix & Verify MT4/MT5 Parser (P0, gate cứng)

- [x] 1.1 Thu thập format export/copy Account History MT4/MT5 thật (Exness/ICMarkets/XM) — do user cung cấp (chưa có; giữ gate đóng)
- [x] 1.2 Hardening parser trong Edge Function `parse-mt4`: xử lý locale decimal separator, định dạng ngày giờ, số cột, separator khác nhau
- [x] 1.3 Không silent-skip dòng lỗi — trả về danh sách lỗi kèm số dòng để user sửa/báo lại
- [x] 1.4 `raw_import_payload` vẫn lưu đầy đủ để debug
- [x] 1.5 Cờ `INSTANT_AUDIT_ENABLED` mặc định false (seed trong bảng `feature_flags`), chỉ bật sau khi ≥95% parse đúng trên dữ liệu thật + xác nhận thủ công
- [x] 1.6 Test tự động parser (fixture giả lập theo format chuẩn MetaQuotes + locale variants)

## 2. Module 1 — Fast Plan (P0)

- [x] 2.1 Form Fast Plan rút gọn 5 trường BẮT BUỘC (Symbol, Direction, Entry, SL, Risk%) hiển thị ngay
- [x] 2.2 SL chặn cứng (validate hard-block, không cảnh báo mềm) — bảo vệ Risk Engine
- [x] 2.3 Risk% prefill = `max_risk_per_trade` rule của user (sửa được)
- [x] 2.4 TP là optional thật sự — Plan vẫn lưu, Risk Engine vẫn tính lot đúng khi TP trống (R:R chỉ hiện khi có TP)
- [x] 2.5 Trường tùy chọn gấp gọn dưới "Chi tiết thêm" (TP, Thesis, Setup tag, Invalidation, Confidence) — nhắc nhẹ điền sau khi đóng lệnh
- [x] 2.6 Lot size / R:R / tiền risk tính real-time như Phase 1 (không đổi công thức)
- [x] 2.7 Unit test: 5 trường bắt buộc, SL chặn cứng, TP trống vẫn tính lot đúng

## 3. Module 2 — Today Dashboard (P0)

- [x] 3.1 Route mặc định `(main)/index` = Today Dashboard (Journal chuyển thành screen riêng trong nav grid)
- [x] 3.2 Discipline Score hiện tại + delta so với snapshot trước đó (từ `discipline_score_snapshots`)
- [x] 3.3 Danger Zone 1 dòng (ẩn nếu <30 lệnh hoặc pattern <5 lần — không hiện khối trống)
- [x] 3.4 Rules active hôm nay (từ `trading_rules` + RULE_TEMPLATES label tiếng Việt)
- [x] 3.5 Nút Quick Plan nổi bật → Fast Plan
- [x] 3.6 Card lệnh đang mở (PnL tạm tính — chờ nguồn giá thật Phase 3, không tự chế giá)
- [x] 3.7 User mới (0 lệnh): hướng dẫn 3 bước + nút nhập lệnh đầu tiên (không trống trơn)
- [x] 3.8 Load tối ưu (Promise.all, 5 query song song)

## 4. Module 3 — Onboarding Instant Audit (P0, có gate)

- [x] 4.1 Đọc `INSTANT_AUDIT_ENABLED` từ bảng `feature_flags` (async, fallback false an toàn khi lỗi)
- [x] 4.2 Fallback 3.3 (active khi flag=false): màn `weakness-summary` từ `weakness_profile` quiz — không code path gọi parser
- [x] 4.3 Path flag=true: màn `instant-audit` — dán lịch sử → edge `parse-mt4` → Behavior Engine hiện có (`detectViolations`) → câu "*Trong N lệnh gần đây, bạn đã revenge trade Z lần (mất khoảng $W)...*"
- [x] 4.4 Nút "Bỏ qua — tiếp tục" (không chặn luồng)
- [x] 4.5 Parse có dòng lỗi → hiển thị rõ số dòng lỗi + cảnh báo dữ liệu thiếu
- [x] 4.6 Unit test: flag=false mặc định, listWeaknesses (đủ/trống/key lạ), fallback không gọi parser

## 5. Module 4 — Cost of Indiscipline (P1)

- [x] 5.1 Lib `cost-of-indiscipline.ts` đúng công thức spec: hypothetical = Σ(PnL lệnh followed=true giữ nguyên) + Σ(PnL giả định tại planned_tp cho lệnh lệch plan có đủ entry/sl/tp) − actual
- [x] 5.2 Lệnh lệch plan thiếu planned_tp → bỏ qua (đếm skippedIncomplete, không suy đoán)
- [x] 5.3 Ngưỡng: ≥30 lệnh tổng VÀ ≥3 lệnh lệch plan → mới showable; dưới ngưỡng → hiddenReason "Cần thêm dữ liệu"
- [x] 5.4 Disclaimer cố định đúng nguyên văn spec, hiển thị ngay dưới con số ở MỌI nơi (Dashboard, Weekly Audit)
- [x] 5.5 Component `cost-of-indiscipline-card.tsx` dùng chung + snapshot test UI (4 test)
- [x] 5.6 Wire vào Today Dashboard + Weekly Audit
- [x] 5.7 Guard symbol không hỗ trợ (GBPUSD/EURJPY/USDCAD) → trả 0, không crash

## 6. Module 5 — Setup / Strategy Analytics (P1)

- [x] 6.1 Lib `setup-analytics.ts`: nhóm theo `setup_tag` (breakout/rejection/trend_continuation), null+'other' → "Chưa phân loại" (không bị loại)
- [x] 6.2 Chỉ số từng nhóm: count, winrate %, Avg R:R (actual entry/sl/tp), Total PnL
- [x] 6.3 Ngưỡng ≥30 lệnh đóng — dưới ngưỡng hiện progressText "Cần thêm N lệnh nữa (X/30)", không ẩn hoàn toàn
- [x] 6.4 `bestSetupInsight` (Pro): câu gợi ý so sánh nhóm ≥5 lệnh
- [x] 6.5 Màn hình `(main)/setup-analytics.tsx` + route + nút trong nav grid
- [x] 6.6 Unit test ≥8 case (ngưỡng, 3 nhóm, null/other gom nhóm)

## 7. Module 6 — Personal Danger Zone (P1)

- [x] 7.1 Mở rộng lib `danger-zone.ts`: pattern giờ trong ngày + pattern "lệnh thứ N+ trong ngày" (đếm theo entry_time, mỗi ngày từ 1)
- [x] 7.2 Ngưỡng: ≥30 lệnh đóng VÀ pattern ≥5 lần (MIN_CLOSED_TRADES/MIN_PATTERN_OCCURRENCE cố định)
- [x] 7.3 Loại `is_negative=false` (adaptive_decision) — không tính là vi phạm
- [x] 7.4 Màn chi tiết `(main)/danger-zone.tsx`: dưới ngưỡng → thông báo tiến độ, không kết luận; có pattern → 2 card tóm tắt + biểu đồ top 8 giờ
- [x] 7.5 Dashboard 1 dòng tap được → màn chi tiết
- [x] 7.6 Unit test (12): 25 lệnh ẩn / 36 lệnh pattern 6 lần hiện (cả 2 pattern)

## 8. Module 7 — Discipline Streak (P1)

- [x] 8.1 Lib `discipline-streak.ts`: streak theo LỆNH (không phải streak mở app) — sort theo entry_time tăng dần, đếm từ lệnh gần nhất lùi
- [x] 8.2 Điều kiện: `followed_plan = true` VÀ không có `rule_violations` gắn lệnh đó; reset 0 khi vi phạm/lệch plan
- [x] 8.3 Hiển thị Today Dashboard (Free, không gate)
- [x] 8.4 Unit test (7): test case 8 lệnh streak=8, lệnh 9 vi phạm → reset 0, truyền ngược thứ tự vẫn đúng

## 9. Module 8 — Push Notification (P1)

- [x] 9.1 Thêm bảng `notification_preferences` + `feature_flags` (seed INSTANT_AUDIT_ENABLED=false) vào schema.sql + data_model.md
- [x] 9.2 Lib `notification-content.ts` (tone Auditor cân bằng — banned words test) + 8 test (5 bộ dữ liệu)
- [x] 9.3 Evening CHỈ gửi khi có lệnh đóng trong ngày (ok:false nếu không)
- [x] 9.4 Lib `notification-manager.ts`: markDashboardSeen + hỏi permission SAU lần đầu thấy Dashboard (AsyncStorage), không hỏi lại lần 2
- [x] 9.5 Settings UI: bật/tắt từng loại riêng + giờ HH:MM (validate) → upsert + reschedule local notifications
- [x] 9.6 Wire `configureNotificationHandler()` vào `(main)/_layout` (hiển thị khi app foreground) + plugin expo-notifications trong app.json

## 10. Tổng hợp đợt

- [x] 10.1 Chạy toàn bộ test/lint/typecheck (147 → 224 test pass)
- [x] 10.2 Review toàn bộ code (3 bug: crash symbol lạ cost-of-indiscipline, biểu đồ danger-zone <30 lệnh, configureNotificationHandler không gọi) — fix + 2 test
- [x] 10.3 Cập nhật features.md sau từng module + working.md
- [x] 10.4 Tạo `can_lam.md` (việc cần user làm: SQL mục 13, deploy edge function, revoke token GitHub, cung cấp export MT4 thật...)
