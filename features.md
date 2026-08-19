# Trading Discipline OS — Toàn bộ tính năng hiện có (Inventory)

> Mục đích file này: bức tranh **đầy đủ và CẬP NHẬT** các tính năng hiện có của app — cho AI nghiên cứu (đề xuất tính năng mới không trùng) VÀ cho người mới nắm nhanh sản phẩm.
>
> - Phần 1-3: bức tranh đầy đủ **tính năng HIỆN CÓ**.
> - Phần 4: **khoảng trống/hạn chế đã biết** — nơi dễ bổ sung giá trị.
> - Phần 5: **ràng buộc & nguồn tham chiếu** bắt buộc.
>
> Tài liệu hướng dẫn sử dụng cho user cuối: xem `guide.md`.
>
> Trạng thái cập nhật: 2026-08-18 (Phase 1 + Phase 2 + Retention M0–M8 + i18n vi/en + In-app Guidance — **269 test pass**).

---

## 1. Tổng quan sản phẩm

**Trading Discipline OS** — app kỷ luật giao dịch forex dành cho trader cá nhân (mobile-first, Expo SDK 57 / React Native + TypeScript + Supabase).

**Triết lý cốt lõi** (từ `plan1_final_v2.md`):
1. **Tách bạch Discipline vs Edge**: "tuân thủ kế hoạch" (Discipline Score) ≠ "chiến lược có lời" (Edge Score) — trader biết chính xác thua lỗ do hành vi hay do chiến lược.
2. **User tự đặt luật** ("Hiến pháp giao dịch"): app chỉ nhắc/kiểm tra/ngăn, không áp đặt.
3. **Chặn hành vi tự hủy hoại**: Decision Interruption chặn giữa chừng khi user sắp vi phạm chính luật của mình.
4. **Adaptive Rules chỉ GIẢM risk, không bao giờ tự nới lỏng** (khóa cứng DB trigger).
5. **Minh bạch, không AI ma thuật**: mọi score/audit đều rule-based, tính từ số liệu thật của user.

**Ngôn ngữ**: tiếng Việt + tiếng Anh (i18next + expo-localization, tự detect thiết bị, đổi trong Settings, fallback vi).

**Mô hình kiếm tiền**: Free (giới hạn 3 luật, ẩn trend score) + **Pro 24h qua xem AdMob rewarded ad** (banner ads bottom). Thanh toán thật (Momo/VNPay/store) chưa bật.

---

## 2. Tính năng hiện có — danh mục đầy đủ

### 2.1 Onboarding (đăng ký → sẵn sàng dùng)
| Tính năng | Chi tiết |
|---|---|
| Đăng ký / đăng nhập | Email + password (Supabase Auth), không cần confirm email (`mailer_autoconfirm=true`) |
| Nhập số dư baseline | `account_balance_baseline` — gốc tính % risk mọi chỗ |
| Quiz điểm yếu (7 câu) | `weakness_profile` jsonb: revenge trading, dời SL, tăng lot sau lỗ, vào lệnh trước tin, không có plan, over-trade, over-size |
| Giải thích Discipline vs Edge | Màn hình bắt buộc "Đã hiểu" |
| Tạo 2 luật bắt buộc | max_risk_per_trade + max_daily_loss (Free tối đa 3 luật, Pro không giới hạn) |
| Onboarding Instant Audit | **Fallback 3.3 active**: màn "Dự đoán điểm yếu" từ quiz (cá nhân hóa, không gọi parser). Path parser (paste → parse-mt4 → Behavior Engine) **code sẵn nhưng bị gate cứng** `INSTANT_AUDIT_ENABLED=false` — chỉ bật sau khi parser ≥95% trên data thật |
| Đo thời gian onboarding | `analytics_events.onboarding_started/completed` (AC: ≤ 3 phút) |

### 2.2 Hiến pháp giao dịch (Personal Trading Constitution)
| Tính năng | Chi tiết |
|---|---|
| 5 luật có sẵn (template) | max_risk_per_trade, max_daily_loss, no_revenge_trade (phút), no_trade_before_news (phút), max_open_positions (count) |
| Chỉnh luật mọi lúc | Settings → sửa giá trị, thêm/xóa luật (trừ 2 luật bắt buộc), lịch sử qua `updated_at` |
| Adaptive Rules theo ATR | Gắn condition cho rule max_risk_per_trade: khi ATR vượt ngưỡng → **tự đề xuất GIẢM risk** (VD 1% → 0.5%), chặn nhập risk cao hơn đề xuất |

### 2.3 Trade Plan + Risk Engine (lập kế hoạch trước khi vào lệnh)
| Tính năng | Chi tiết |
|---|---|
| Form tạo plan đầy đủ | Symbol (EURUSD/XAUUSD/USDJPY...), direction, thesis, setup tag (breakout/rejection/trend_continuation/other), Entry/SL/TP, Risk %, invalidation condition, confidence 1-5 |
| **Fast Plan** (M1) | Form rút gọn **5 trường BẮT BUỘC hiển thị ngay**: Symbol, Direction, Entry, SL, Risk% — SL **chặn cứng** (bảo vệ Risk Engine); Risk% **prefill = max_risk_per_trade rule** (sửa được); TP/Thesis/Setup/Invalidation/Confidence gấp dưới "Chi tiết thêm" (TP optional thật sự — R:R chỉ hiện khi có TP, Lot vẫn tính đúng); analytics `fast_plan_opened/saved` (AC ≤ 15 giây) |
| **Tính lot size tự động** | Công thức chuẩn forex theo từng cặp (pip value khác nhau EURUSD/USDJPY/XAUUSD), làm tròn xuống 0.01 |
| Tính Risk:Reward + tiền risk | Hiển thị real-time |
| Cảnh báo vượt giới hạn | Risk% > luật của user → chặn lưu |
| Chart TradingView | Widget ngay trong form, đồng bộ symbol đang chọn |
| Route thoát "lệnh không có plan" | Màn hình cảnh báo phụ → xác nhận → vào widget nhập lệnh thật |

### 2.4 Decision Interruption (chặn giữa chừng)
| Tính năng | Chi tiết |
|---|---|
| 3 trigger tự động | **over_risk** (risk > luật), **max_daily_loss** (lỗ hôm nay ≥ giới hạn), **revenge_pattern** (mở lệnh ngược chiều < 10' sau lệnh thua) |
| Evidence 2 tầng | < 15 lệnh → benchmark cộng đồng (hardcode); ≥ 15 lệnh → dữ liệu cá nhân thật ("lần trước bạn mất thêm $X khi làm vậy") |
| UI chặn + 2 lựa chọn | "Tiếp tục" hoặc "Quay lại chỉnh Plan"; ghi `decision_interruptions` với quyết định user |

### 2.5 Execution Capture (ghi nhận lệnh)
| Tính năng | Chi tiết |
|---|---|
| **Widget nhập nhanh** | Mục tiêu < 20 giây: symbol, direction, lot, entry, SL, TP, giá đóng — auto-suggest link plan khớp symbol+direction, 1 chạm link |
| Đóng lệnh ngay khi nhập | Nhập giá đóng → tự trigger tính delta |
| **Paste MT4/MT5 Account History** (M0) | Dán text → Edge Function `parse-mt4` (đã redeploy v3, nhận `lang` vi/en) → import nhiều lệnh + báo dòng lỗi kèm lý do. Hardening: locale-aware số (dấu phẩy/chấm), đa format ngày giờ (YYYY.MM.DD HH:MM / DD.MM.YYYY HH:MM / ISO), deal-based in/out (2 dòng = 1 lệnh đóng), skip balance/deposit/withdrawal có đếm rõ. ⚠️ VẪN CHƯA verify ≥95% trên data thật — gate M3 vẫn đóng |
| **Today Dashboard** (M2) | Route mặc định: Discipline Score + delta vs tuần trước, Danger Zone 1 dòng (ẩn nếu <30 lệnh), Rules active hôm nay, lệnh đang mở (PnL tạm chờ nguồn giá thật Phase 3), **⚡ Quick Plan → Fast Plan**, hướng dẫn user mới, nav grid. Toàn bộ Free |
| **Cost of Indiscipline** (M4) | Công thức spec: hypothetical (lệnh theo plan giữ PnL thật, lệnh lệch plan thay bằng PnL tại planned_tp nếu đủ entry/sl/tp, thiếu → bỏ qua không suy đoán) − actual; **chỉ hiển thị khi ≥30 lệnh tổng VÀ ≥3 lệnh lệch plan** (dưới ngưỡng → "Cần thêm dữ liệu..."); **disclaimer cố định đúng nguyên văn ở MỌI nơi có con số** (snapshot test UI); Free thấy con số tổng + disclaimer; ⚠️ giả định "lệnh theo plan đạt TP" cần user xác nhận |
| **Setup Analytics** (M5) | Nhóm lệnh đóng theo `setup_tag` (Breakout/Rejection/Trend Continuation; null + 'other' → "Chưa phân loại") → Winrate, Avg R:R (từ entry/sl/tp thực tế), Total PnL từng nhóm; **ngưỡng ≥30 lệnh đóng** (dưới ngưỡng → "Cần thêm N lệnh nữa (X/30)"); Free bảng tổng quan, Pro thêm `bestSetupInsight` (nhóm ≥5 lệnh) |
| **Personal Danger Zone** (M6) | 2 pattern: **giờ trong ngày** + **lệnh thứ N trong ngày** — đều ngưỡng ≥30 lệnh đóng VÀ pattern ≥5 lần (bất biến, test 25 lệnh ẩn / 36 lệnh pattern 6 lần hiện); 1 dòng tóm tắt Free ở Dashboard; màn chi tiết: nhiều pattern + biểu đồ phân bố vi phạm theo giờ (top 8) |
| **Discipline Streak** (M7) | **Streak theo LỆNH** (không phải streak mở app): đếm lệnh liên tiếp gần nhất có `followed_plan=true` VÀ không có `rule_violations`; reset 0 ngay khi vi phạm/lệch plan; tính theo `entry_time`; hiển thị ở Dashboard (Free) |
| **Push Notification** (M8) | 2 loại: (1) Morning brief mặc định 08:00 — Discipline Score hôm qua + rules hôm nay; (2) Evening review mặc định 21:00 — **CHỈ gửi khi có lệnh đóng trong ngày**. Tone Auditor cân bằng (banned words test). **Opt-in đúng ngữ cảnh**: hỏi permission SAU lần đầu thấy Dashboard (`has_seen_dashboard`). Settings bật/tắt TỪNG loại + giờ HH:MM. Bảng `notification_preferences` + `feature_flags` (seed `INSTANT_AUDIT_ENABLED=false`) — **đã chạy SQL trên project thật (2026-08-18)** |
| Đo thời gian widget | `execution_widget_opened/saved` (AC: ≤ 20 giây) |

### 2.6 Plan vs Reality (delta — học từ chênh lệch)
| Tính năng | Chi tiết |
|---|---|
| Tính delta tự động khi đóng lệnh | entry lệch (pip), SL lệch (pip), risk lệch (%) |
| `followed_plan` | Ngưỡng Phase 1: entry < 5 pip, risk < 0.2%, không dời SL → "Theo plan" |
| **Journal** | Danh sách lệnh: badge Theo plan/Lệch plan, PnL, lot, entry |
| **Insight thống kê** | ≥ 10 lệnh: "% lệnh theo plan có lời vs % lệch plan có lời" — bằng chứng số cho việc giữ kỷ luật |
| Chi tiết lệnh | So sánh Planned vs Actual side-by-side + delta + chart TradingView của lệnh |

### 2.7 Behavior Engine (phát hiện vi phạm)
| Tính năng | Chi tiết |
|---|---|
| 4 loại vi phạm tự động | **overconfidence_size** (risk > planned×1.5), **revenge_trading** (<10' ngược chiều sau lỗ), **hope_trading** (>2 lần dời SL), **martingale_negative** (lot > trước×1.8 sau lỗ) |
| Ghi không duplicate | `rule_violations` unique theo (execution, type) |
| news_gambling | ⚠️ CHƯA implement — cần nguồn Economic Calendar (Phase 3) |

### 2.8 Discipline Score + Edge Score
| Tính năng | Chi tiết |
|---|---|
| Discipline Score | adherence% − min(violations×5, 40), clamp 0-100 |
| Edge Score | winrate, avg R:R, total PnL tuần |
| Snapshot tuần | Ghi 1 lần/tuần (không tính trùng) |
| **Tiến bộ tuần này** | So với snapshot tuần trước (+/- điểm) |
| Tier gating | Free: chỉ số hiện tại; **Pro: trend 4/12 tuần + số lệnh vi phạm đã ngăn chặn** |

### 2.9 Weekly Performance Audit
| Tính năng | Chi tiết |
|---|---|
| Báo cáo tuần tự động | Rule-based (không LLM): số lệnh, % theo plan, vi phạm phổ biến nhất, lệnh đã ngăn, PnL tuần + lời khuyên định hướng |

### 2.10 Portfolio Risk (Phase 2)
| Tính năng | Chi tiết |
|---|---|
| Tổng risk dồn vị thế mở | Cảnh báo ok/warn/danger theo ngưỡng `min(maxRisk×3, maxDailyLoss)` |
| **Ma trận tương quan (Pro)** | EURUSD↔USDJPY↔XAUUSD hệ số ước lượng tham chiếu — tránh gom rủi ro cùng hướng |

### 2.11 Tiền tệ hóa (Monetization)
| Tính năng | Chi tiết |
|---|---|
| Pro 24h qua ad | Xem rewarded ad → Pro 24h (cộng dồn hạn), ghi audit `pro_unlocks` |
| **Cooldown 5 phút** | Chống spam xem ad liên tục |
| Banner ads bottom | Mọi màn hình `(main)`, an toàn với 3 nút Android (safe-area padding) |
| Chế độ TEST_ADS | Mặc định true (test ad units Google) — tránh bị khóa tài khoản khi chưa có ad unit thật |

### 2.12 Đa ngôn ngữ (i18n)
| Tính năng | Chi tiết |
|---|---|
| 2 ngôn ngữ | **vi** (mặc định/fallback) + **en** — i18next + react-i18next + expo-localization |
| Tự detect thiết bị | Locale hệ thống khớp → dùng; không khớp → vi |
| Đổi trong Settings | Mục "Ngôn ngữ" (tên native, đánh dấu ngôn ngữ đang dùng), áp dụng ngay không restart, lưu preference AsyncStorage (thắng auto-detect) |
| Phạm vi | 28 màn hình + 15 lib nội dung động + edge `parse-mt4` (dictionary vi/en) — mọi chuỗi UI qua keys, parity test chặn thiếu key |
| Mở rộng | Thêm ngôn ngữ = thêm file json + 1 dòng `SUPPORTED_LANGS` (kiến trúc sẵn sàng zh/ja/ko/es) |

### 2.13 In-app Guidance & Onboarding (mới nhất)
| Tính năng | Chi tiết |
|---|---|
| **FeatureBadge** | Dot/label "New" trên icon/button đánh dấu tính năng mới (vd mục Ngôn ngữ trong Settings); dismiss → ẩn vĩnh viễn (AsyncStorage `guidance.feature.<key>.dismissed`) |
| **Tooltip & Spotlight** | Highlight element target (làm mờ phần còn lại bằng 4 band, hở sáng đúng element), popup hướng dẫn đính kèm; **auto-position**: đo rect element qua ref (`measureInWindow` native / `getBoundingClientRect` web), placement ưu tiên → tự flip khi thiếu chỗ → clamp trong màn hình (responsive `useWindowDimensions`) |
| **DisabledStateHelper** | Wrap nút disabled: tap vào → tooltip lý do bị khóa + điều kiện unlock (vd nút Save khi đang lưu) |
| **Tour nhiều bước** (GuidanceProvider + useGuidance) | Step 1 → Step 2 → Finish, nút Skip / Done, lưu `stepCompleted` từng bước + `hasSeenTour` — **chỉ hiện 1 lần cho user mới**, không spam khi lặp lại action |
| Tích hợp hiện tại | Dashboard: tour 2 bước cho user mới (Quick Plan → Journal, điều kiện trùng card "How to start?"); Settings: FeatureBadge "Mới" + DisabledStateHelper nút Save |
| Kỹ thuật | Tự build từ RN core (KHÔNG thêm dep ngoài); position math tách lib thuần `guidance-position.ts` test được; i18n vi/en đầy đủ |

### 2.14 Hạ tầng (ẩn với user, quan trọng với AI nghiên cứu)
- **Navigation an toàn**: `safeBack` + fallback, `+not-found` 404, deep-link không treo
- **Analytics events** trong Supabase (không PostHog — free 100%)
- **Edge Functions** (Deno): parse-mt4 (nhận lang vi/en), compute-deltas, detect-violations, weekly-audit (đã deploy, JWT required)
- **RLS** mọi bảng — user chỉ thấy dữ liệu của mình
- **CI**: GitHub Actions build debug APK mỗi lần push main (không cần EAS token); plugin nhúng JS bundle vào debug APK (`debuggableVariants=[]` cho RN 0.86)
- **Env inject CI**: `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY/ADMOB_*` set trong workflow (public-by-design, lớp bảo vệ thật là RLS)
- **Test tự động**: **269 test** — công thức (lot size, delta, violation, score, ATR, portfolio, cooldown, parser), i18n (9 base + 7 content-en), guidance (20 lib + 7 component)
- **Identity**: package `com.trademind.trading`, tên app "Trading Discipline OS", icon Shield+Candlestick

---

## 3. Trải nghiệm "vòng lặp hàng ngày" hiện tại (daily loop)

```
Sáng:   mở app → Today Dashboard: Discipline Score hôm qua → Journal lệch plan nào?
        (notification morning brief 08:00 nếu bật)
Trước lệnh: tạo Plan (Fast Plan → Risk Engine tính lot) → nếu vi phạm bị chặn giữa chừng (interruption)
Trong lệnh: widget nhập nhanh < 20s (link plan tự động)
Đóng lệnh: nhập giá đóng → delta tự tính → lệch plan? badge ngay
Cuối ngày: notification evening review (chỉ khi có lệnh đóng) → journal + streak
Cuối tuần: Weekly Audit tổng kết → vi phạm nào lặp lại → chỉnh luật/adaptive
```

---

## 4. Khoảng trống & hạn chế ĐÃ BIẾT (nơi dễ bổ sung giá trị)

1. **Không có nguồn giá thật**: ATR + correlation đang là giá trị ƯỚC LƯỢNG theo symbol (UI ghi rõ). → Cần API market data (Phase 3) cho ATR/correlation/backtest thật.
2. **MT4 parser chưa verify** với dữ liệu thật — đã harden (M0) nhưng **chưa đạt ≥95% trên data thật** (chưa có export thật). Gate cứng Onboarding Instant Audit (M3) vẫn đóng.
3. **Không có Economic Calendar** → `news_gambling` chưa implement, rule `no_trade_before_news` không có dữ liệu chặn.
4. **Chưa có backtest / lịch sử hiệu quả chiến lược**: không biết "setup nào thực sự có edge" (Setup Analytics mới ở mức bảng + insight Pro đơn giản).
5. **Chưa có chế độ xem lịch sử dài hạn**: Journal giới hạn 100 lệnh, score 1 tuần hiện tại + trend Pro (4/12 tuần chưa vẽ hẳn).
6. **Chưa có on-device bảo mật/biometric** (khóa app).
7. **Chưa có dark mode tùy biến, widget home screen (Android/iOS), multi-account (nhiều tài khoản broker)**.
8. **Chưa có thanh toán thật** (Pro chỉ qua ad 24h — không có gói dài hạn).
9. **Chưa có export/backup dữ liệu** cho user sở hữu dữ liệu của mình.
10. **Chưa có community/accountability** (bảng `accountability_circles` có sẵn trong schema nhưng chưa có UI).
11. **Onboarding chưa có màn hình chọn mục tiêu** (VD: "kiếm thêm thu nhập / đang thua muốn dừng chảy máu / chuyên nghiệp hóa").
12. **In-app guidance mới chỉ phủ 2 màn hình** (Dashboard, Settings) — còn nhiều màn hình chưa có tour/badge.

---

## 5. Ràng buộc & nguồn tham chiếu khi đề xuất tính năng

### Ràng buộc kỹ thuật (KHÔNG được phá)
- **Stack**: Expo SDK 57 (React Native/TS/expo-router) + Supabase (Postgres/Auth/Edge Functions Deno) + AdMob. Không thêm dịch vụ ngoài trả phí (giữ 100% free ở Phase 1-2).
- **Công thức nghiệp vụ**: lot size, Discipline/Edge score, delta, violation, adaptive — KHÔNG tự sáng tạo, phải đúng `mvp_scope.md`; công thức mới cần user duyệt.
- **Schema**: đổi bảng = đổi `data_model.md` + `supabase/schema.sql` + migration — phải hỏi user trước.
- **Adaptive chỉ GIẢM risk** — khóa cứng (DB trigger + code), không có đường tự tăng.
- **Bất kỳ tính năng nào cần server logic phức tạp** → Edge Function (đã có mẫu 4 functions).
- **Native module mới** → cần dev build (GH Actions build APK), verify web export không vỡ (platform split `.native.ts(x)`).
- **i18n**: mọi chuỗi UI MỚI phải đi qua keys vi/en (`src/i18n/locales/`), không hardcode tiếng Việt.
- **Guidance**: UI hướng dẫn mới nên tận dụng hệ thống có sẵn (FeatureBadge/Tooltip/Tour) thay vì tự vẽ.

### Nguồn tham chiếu (đọc trước khi nghiên cứu)
| File | Nội dung |
|---|---|
| `plan1_final_v2.md` | Lý do thiết kế, triết lý sản phẩm, mapping hành vi |
| `mvp_scope.md` | Phạm vi Phase 1, acceptance criteria từng module, mục "KHÔNG bao gồm" |
| `data_model.md` | Schema đầy đủ (17 bảng) |
| `.project/README.md` | Knowledge Item: overview, architecture, patterns, state, modules |
| `openspec/specs/*` | 22 specs chính thức (source of truth sau archive) |
| `working.md` | Nhật ký phát triển (quyết định + giả định đã chốt) |
| `guide.md` | Hướng dẫn sử dụng chi tiết cho user cuối |

### Định hướng đề xuất (gợi ý tiêu chí, không bắt buộc)
Ưu tiên tính năng giúp: **(a)** user quay lại app mỗi ngày (habit loop, notification, streak), **(b)** user cảm thấy app "hiểu mình" (personal insight, cá nhân hóa), **(c)** trả lời câu hỏi "chiến lược của tôi có edge không" (phân tích, backtest), **(d)** tăng chuyển đổi Pro (giá trị gating đúng chỗ), **(e)** giảm ma sát nhập liệu (tự động hóa, widget, sync broker).

Với mỗi đề xuất nên nêu: **tính năng là gì → giá trị với user (tại sao giữ app) → nằm ở module/phase nào → phụ thuộc gì (API giá? Economic Calendar? bảng mới?) → ước lượng effort → rủi ro**.
