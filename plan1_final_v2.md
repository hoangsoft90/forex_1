# Trading Discipline OS — Bản kế hoạch tổng hợp v2

> Kế thừa từ `plan1_final.md` + tổng hợp phản biện từ `plan1_final_review1-5.md` + lớp phản biện bổ sung (điểm mù tầng 2).
> Đây là bản tổng hợp toàn diện nhất, dùng làm tài liệu tham chiếu chính cho việc thiết kế chi tiết (data model, wireframe, interview script).

---

## 0. Định vị sản phẩm

**Tên:** *Trading Discipline OS*
**Lời hứa sản phẩm:** *"Turn emotional trading into a repeatable process."*

**Không phải:** app xem giá, app tín hiệu, app phân tích thị trường.
**Là:** hệ thống giúp trader trung cấp nhìn thấy khoảng cách giữa **kế hoạch họ đặt ra** và **hành vi thực tế họ thực hiện**, từ đó sửa hành vi thay vì chỉ ghi chép PnL.

**Câu hỏi trung tâm sản phẩm phải trả lời được trước khi build:**
> "Tại sao một trader đang dùng TradingView + MT5 + Notion/Excel lại phải cài thêm app này, và sẵn sàng trả tiền hàng tháng?"

Nếu câu trả lời (dựa trên interview thật, không phải giả định) chưa đủ sắc — chưa nên build.

---

## 1. Vòng lặp hành vi & Kiến trúc sản phẩm v2.1

Vòng lặp gốc (MARKET → ANALYZE → PLAN → RISK → TRADE → REVIEW → IMPROVE) được giữ làm xương sống triết lý, nhưng kiến trúc thực thi cụ thể hóa thành:

```
1. Onboarding: Weakness Profiling
2. Personal Trading Constitution (có Adaptive Rules)
3. Trade Plan (object trung tâm — không phải Journal)
4. Risk Engine (Portfolio + Correlation)
5. Decision Interruption (evidence-based, không timer cứng)
6. Execution Capture (Copy-Paste / EA nhẹ / Mobile Widget / Sync sau)
7. Plan vs Reality Mapping
8. Behavior Engine (Rule Violation + Pattern Detection)
9. Discipline Score + Trend
10. Weekly Performance Audit
11. Improve Rules
```

**MVP Phase 1 phải chứa đủ MỘT vòng lặp hoàn chỉnh** (không phải Risk + Journal rời rạc): Personal Rules cơ bản → Trade Plan → Risk Engine → Interruption → Execution Capture → Plan vs Reality → Discipline Score cơ bản → Weekly Audit đơn giản. Không cần realtime market, không cần full AI, không cần sync phức tạp.

---

## 2. Đối tượng người dùng

Giữ nguyên từ bản gốc: **Intermediate / Discipline-seeking traders** — đã từng cháy tài khoản hoặc trade vài tháng–vài năm, vướng bài toán quản vốn & tâm lý. Không nhắm Beginner (tìm signal ăn xổi).

**Lưu ý bổ sung:** phần lớn nhóm này tại VN giao dịch qua **MT4/MT5 trên mobile**, không phải desktop — điều này ảnh hưởng trực tiếp đến thiết kế Execution Capture (mục 4).

---

## 3. Personal Trading Constitution → Adaptive Rules

**Ý tưởng gốc:** user tự đặt luật cá nhân (Max risk 1%/lệnh, Max daily loss 3%, No revenge trade...).

**Vấn đề:** luật cứng bị phá vỡ khi thị trường thay đổi (VD: ngày có NFP/CPI, ATR tăng gấp 3, để đặt SL hợp lý buộc phải vượt risk % nếu giữ nguyên lot). Nếu app báo "Violation" một cách cứng nhắc, user sẽ khó chịu và bỏ app.

**Giải pháp — Adaptive Risk Engine:**
- Rule có thể gắn điều kiện thị trường: *Nếu ATR > X → tự động gợi ý giảm risk xuống 0.5%. Nếu đang trong phiên có tin HIGH IMPACT → tự động giảm Max Daily Loss.*
- App không coi đây là vi phạm, mà ghi nhận là "adaptive decision" → AI Coach/Auditor sau này có thể chỉ ra: *"Bạn trade tốt hơn vào phiên Âu vì bạn đã chủ động giảm risk trước tin tức."*

**⚠️ Điểm mù cần chặn (bổ sung tầng 2):** Adaptive Rules có thể bị lợi dụng để **hợp lý hóa hành vi xấu** — trader có thể viện lý do "thị trường volatile nên tôi tăng lot" (ngược hoàn toàn với mục đích ban đầu).
→ **Nguyên tắc bắt buộc:** Adaptive Rules chỉ được phép **tự động điều chỉnh giảm** risk. Bất kỳ điều chỉnh tăng nào so với baseline đều phải đi qua Decision Interruption + bắt buộc ghi lý do vào Journal. App không bao giờ tự động nới lỏng luật.

---

## 4. Execution Capture — giải quyết "Data Gravity" ở Phase 1

**Vấn đề cốt lõi (nhiều review độc lập chỉ ra cùng một điểm):** nếu Phase 1 chỉ dựa vào Manual Input hoặc CSV export/import cuối ngày/cuối tuần, feedback loop quá trễ → Behavior Engine không có dữ liệu kịp thời → không có "aha moment" → app chết vì thiếu dữ liệu trước khi kịp chứng minh giá trị.

**Giải pháp — Lightweight Bridge, ưu tiên theo thứ tự, KHÔNG đợi đến Phase 2 mới làm:**

| Ưu tiên | Phương án | Ghi chú |
|---|---|---|
| 1 | **Copy-Paste từ MT4/MT5 Account History** | Nhanh nhất, zero infrastructure, MT4 có sẵn nút Copy to Clipboard |
| 2 | **Mobile Widget nhập lệnh siêu nhanh (1 dòng lệnh)** | VD dạng `BUY XAU 0.5 SL 2340 TP 2360` — **quan trọng ngang hàng phương án 1**, vì phần lớn trader Intermediate tại VN giao dịch qua MT4/5 **trên điện thoại**, không phải desktop. EA (MQL4/5) không tiếp cận được nhóm này. |
| 3 | **MT4/MT5 EA siêu nhẹ (~50 dòng MQL)** ghi lệnh ra file CSV local | User tự host, không qua server trung gian → tránh rủi ro Investor Password/ToS broker. Phù hợp nhóm dùng desktop/VPS. |
| 4 | **Full read-only Auto-sync (MetaAPI/Investor Password)** | Chỉ làm khi đã có retention & willingness-to-pay xác nhận qua Phase 1, vì chi phí + rủi ro ToS cao |

**Nguyên tắc thiết kế:** mục tiêu là thời gian từ lúc đóng lệnh thực tế đến lúc dữ liệu có trong app phải < vài phút, không phải cuối ngày/cuối tuần. Đây là điều kiện tiên quyết để Decision Interruption và Discipline Score hoạt động có ý nghĩa.

---

## 5. Decision Interruption — Evidence-based, không phải Timer/Yes-No

**Vấn đề của thiết kế "cool-down timer 60s" hoặc pop-up Yes/No:** khi trader đang trong trạng thái cay cú (Revenge Mode), họ coi màn hình xác nhận như "Terms & Conditions" — bấm qua thật nhanh mà không thực sự dừng lại suy nghĩ.

**Giải pháp — dùng dữ liệu đối soát thời gian thực thay vì câu hỏi trắc nghiệm:**

> 🛑 *"Bạn vừa thua $180. Lần trước bạn tăng risk sau lệnh thua, bạn đã mất thêm $420 trong 40 phút. Lần này bạn đang định risk 2.1%. Bạn muốn tiếp tục hay quay lại plan gốc?"*

Đây không phải timer cứng — đây là interruption dựa trên bằng chứng hành vi thật của chính user, khó bị "bấm qua vô thức" hơn nhiều so với checkbox.

**⚠️ Điểm mù cần giải quyết (bổ sung tầng 2) — Cold-start problem:** cơ chế này phụ thuộc hoàn toàn vào việc đã có lịch sử hành vi cá nhân. Nhưng user mới tải app trong tuần đầu — lúc dễ revenge trade nhất — lại chưa có dữ liệu gì để đối chiếu. Đây là lúc cơ chế bảo vệ mạnh nhất lại chưa hoạt động được.

**Giải pháp 2 tầng:**
- **Tuần 1–2 (chưa đủ dữ liệu cá nhân, <10-15 lệnh):** dùng benchmark hành vi tổng hợp ẩn danh — *"73% trader tăng lot sau lệnh thua đều thua tiếp lệnh đó."*
- **Sau khi đủ ~10-15 lệnh:** chuyển sang evidence cá nhân hóa như thiết kế trên.

---

## 6. Plan vs Reality — Object trung tâm của toàn bộ trải nghiệm

Đây là ý tưởng mạnh nhất trong toàn bộ chuỗi review, cần được product hóa rõ ràng thay vì chỉ là một khái niệm mơ hồ.

Mỗi trade cần lưu 3 lớp dữ liệu:
- **Planned:** thesis, entry, SL, TP, risk %, invalidation, confidence level
- **Actual:** entry thực tế, SL thực tế, exit, risk thực tế, thời gian giữ lệnh
- **Delta:** sai lệch giữa Planned và Actual, mức độ vi phạm

**Insight mạnh nhất sản phẩm có thể tạo ra nằm ở đây, ví dụ:**
> *"73% lệnh theo đúng plan gốc có kết quả tốt hơn. 61% lệnh thua có liên quan đến việc thay đổi plan giữa chừng."*

Đây mới là "aha moment" thực sự — mạnh hơn nhiều so với chỉ hiển thị Winrate/Total Profit thông thường.

---

## 7. Behavior Engine — Auto-tag hành vi (giữ nguyên, không cần tag cảm xúc thủ công)

| Hành vi quan sát được | Tag tự động |
|---|---|
| Risk tính 1% nhưng vào lệnh với lot lớn hơn nhiều | Overconfidence / Revenge size |
| Đóng lệnh chạm SL, mở lệnh ngược chiều trong <10 phút | Revenge Trading |
| Dời SL ra xa hơn 2 lần trong cùng 1 lệnh | Hope Trading |
| Vào lệnh trong 15 phút trước tin HIGH IMPACT | News Gambling |
| Tăng lot gấp đôi sau mỗi lệnh thua liên tiếp | Martingale âm |
| Risk đã điều chỉnh giảm chủ động trước tin/ATR cao | Adaptive Decision (tích cực, không phải violation) |

---

## 8. Tone & Định vị AI: từ "Coach" sang "Auditor" — nhưng cần cân bằng

**Vấn đề:** "Coach" mang hàm ý động viên. Trader thua lỗ thường không cần động viên — họ cần một bên khách quan chỉ đúng lỗi sai.

**Đổi tên:** "AI Coach" → **"AI Performance Auditor"**

Ví dụ tone:
> *"Audit: 61% thua lỗ của bạn đến từ việc dời Stop Loss. Nếu giữ nguyên SL theo plan, winrate của bạn sẽ là 58% thay vì 41%."*

**⚠️ Điểm mù cần cân bằng (bổ sung tầng 2):** tone "Auditor lạnh lùng" liên tục, không có bất kỳ khung nào công nhận tiến bộ, có thể đẩy user vào vòng xoáy tự trách/né tránh mở app — phản tác dụng với chính mục tiêu giữ retention, đặc biệt với nhóm đã cháy tài khoản nhiều lần.

**Giải pháp cân bằng:**
- Giữ tone Auditor khách quan cho phần **dữ liệu/số liệu** — không nói giảm nói tránh.
- Tách riêng một khối nhỏ **"Tiến bộ tuần này"**, chỉ so sánh với chính user tuần trước (không so với chuẩn tuyệt đối), để tránh cảm giác bị phán xét liên tục.

---

## 9. Discipline Score — cần tách bạch với hiệu quả tài chính

**⚠️ Điểm mù chưa review nào đề cập:** Discipline Score đo "mức độ tuân thủ kế hoạch của chính mình", không đo "kế hoạch đó có lời hay không". Một trader có chiến lược tệ nhưng tuân thủ tuyệt đối vẫn nhận điểm cao trong khi tài khoản cạn dần. Nếu user thấy Discipline Score 90/100 mà PnL âm mà không được giải thích rõ từ đầu, họ sẽ mất niềm tin vào app ngay lập tức — nguy hiểm vì phá vỡ chính USP "công cụ đáng tin cậy hơn cảm tính".

**Giải pháp:** hiển thị **2 trục điểm số song song, tách biệt rõ ràng**:
- **Discipline Score:** đo tuân thủ hành vi/kế hoạch.
- **Edge/Strategy Score:** đo hiệu quả của chính chiến lược đang dùng.

Kèm giải thích ngay từ onboarding: *"Điểm kỷ luật cao không đảm bảo lời — nó đảm bảo bạn đang xác định được đúng nguyên nhân thua lỗ: do chiến lược hay do hành vi."*

---

## 10. Community → Accountability Circle (không phải Trade Ideas mở)

**Vấn đề với "Community Trade Ideas" (ý tưởng ban đầu):** dễ biến thành nơi quảng cáo "kèo VIP" trá hình, làm loãng định vị sản phẩm, và có nguy cơ vướng luật quảng cáo tài chính nếu không kiểm soát.

**Thay thế:** **Accountability Circle** — nhóm nhỏ theo dõi **Discipline Score + Rule Adherence** của nhau, **không bắt buộc share P&L**. Phù hợp hơn với thesis "kỷ luật", giảm rủi ro biến tướng thành signal group.

---

## 11. North Star Metric bổ sung: "Bad Trade Prevented"

Metric marketing mạnh, không cần hứa hẹn lợi nhuận:

> *"Tháng này app đã giúp bạn tránh 4 lệnh vi phạm rule của chính mình."*

Chỉ cần chứng minh "đã cứu bạn khỏi chính bạn" — đây là lời hứa giữ được, khác với các app signal hứa "kiếm tiền" (dễ vướng pháp lý và khó giữ lời hứa).

---

## 12. Mô hình kinh doanh — Psychological Monetization

**Vấn đề với mô hình Free rộng (Free = Unlimited Journal + Risk Calculator):** nếu Free đã đủ dùng, tỷ lệ chuyển đổi Pro sẽ rất thấp (<2%). Giới hạn kiểu "chỉ lưu 30 lệnh" cũng không đủ sức ép — trader trung cấp chỉ cần xem 30 lệnh gần nhất là đủ biết đang thắng hay thua, không cần trả tiền chỉ để lưu thêm log.

**Giải pháp — gate dựa trên "tò mò về tiến bộ bản thân" (động lực trả phí bền hơn giới hạn dung lượng thô):**

| Tầng | Giới hạn / Tính năng | Mục tiêu |
|---|---|---|
| **Free** | Journal giới hạn 30–50 lệnh gần nhất + Discipline Score **chỉ hiện điểm hiện tại** (không có trend) + tối đa 2–3 Personal Rules + Risk Calculator cơ bản | Đủ trải nghiệm để thấy giá trị, chưa đủ để thỏa mãn tò mò về tiến bộ |
| **Pro** | Unlimited Journal History + **Discipline Score Trend** (4/12 tuần) + **Bad Trade Prevented** + Full Trading Constitution + Adaptive Rules + Portfolio Risk (correlation) + Auto-sync MT4/MT5 + Performance Auditor đầy đủ + Session Analytics | Chuyển đổi dựa trên tò mò tiến bộ bản thân + nhu cầu tự động hóa |

**⚠️ Bổ sung tầng 2 — rào cản thanh toán tại VN chưa được tính đến:** mức giá đề xuất ($12–19/tháng) và phương thức thanh toán cần xác nhận thực tế tại thị trường VN:
- Mức giá tương đương VND có phù hợp thu nhập trader trung cấp VN không?
- Cần hỗ trợ thanh toán nội địa (Momo, VNPay, chuyển khoản) song song với thẻ quốc tế — phí subscription qua App Store/Play Store có thể đội giá ~30%, và nhiều user VN không quen trả qua thẻ tín dụng quốc tế.

---

## 13. Rủi ro cần xử lý trước khi build (giữ nguyên + bổ sung)

### 13.1. Kỹ thuật
- Auto-sync MT4/MT5 qua MetaAPI/Investor Password: cần POC thực tế (3-5 ngày) trước khi cam kết, kiểm tra chi phí + tính khả thi cho sync read-only, không mặc định "làm được".
- Phương án EA-local giảm rủi ro ToS broker nhưng chỉ phủ được nhóm dùng desktop/VPS — không thay thế được Mobile Widget cho nhóm mobile-only (đa số).

### 13.2. Pháp lý
- Dữ liệu tài khoản trading (nếu dùng Investor Password) là dữ liệu tài chính nhạy cảm — cần tuân thủ quy định bảo vệ dữ liệu cá nhân (VN: Nghị định 13/2023), không chỉ dừng ở disclaimer "không phải tín hiệu".
- Accountability Circle cần kiểm duyệt nhẹ để không biến tướng thành signal group trá hình.

### 13.3. Go-to-market
- Nghịch lý cổ điển: người cần kỷ luật nhất là người ít muốn tự nguyện bị soi lỗi. Đây là rủi ro lớn hơn rủi ro chọn tính năng.
- Cần xác định kênh phân phối cụ thể (mentor/coach trading, community sẵn có) trước khi build, không chỉ dựa vào tự quảng cáo.

### 13.4. Tâm lý sản phẩm (bổ sung tầng 2)
- Cold-start của Evidence-based Interruption (mục 5).
- Nguy cơ Adaptive Rules bị lợi dụng để hợp lý hóa hành vi xấu (mục 3).
- Nguy cơ tone Auditor liên tục gây né tránh mở app (mục 8).
- Nhầm lẫn giữa Discipline Score và hiệu quả tài chính thực tế (mục 9).

---

## 14. Checklist hành động trước khi viết dòng code đầu tiên

1. [ ] **Validation phỏng vấn 15–20 trader trung cấp**, câu hỏi gắn thẳng vào nỗi đau, ví dụ:
   - *"Bạn có sẵn sàng trả 300-450k VNĐ/tháng để biết chính xác lý do bạn đang cháy tài khoản không?"*
   - *"Bạn có sẵn sàng để một app làm chậm bạn 10-20 giây khi bạn đang muốn revenge trade không?"*
   - Xác nhận luôn thói quen thanh toán (thẻ quốc tế / Momo / chuyển khoản) và mức giá VND hợp lý.
2. [ ] **Prototype Figma** cho 3 màn hình ưu tiên: Decision Interruption (evidence-based), Plan vs Reality Dashboard, Audit Dashboard — test với 5 trader xem họ cảm thấy "bị làm phiền" hay "được thức tỉnh".
3. [ ] **POC data entry nhẹ:** Copy-Paste MT4 History + Mobile Widget nhập nhanh (ưu tiên ngang nhau) — đo thời gian từ lúc đóng lệnh thực đến lúc có dữ liệu trong app, mục tiêu < vài phút.
4. [ ] **POC kỹ thuật Auto-sync:** thử MetaAPI/Investor Password với 1-2 tài khoản thật (3-5 ngày), đánh giá chi phí + rủi ro ToS.
5. [ ] **Thiết kế Data Model cốt lõi:** `TradingRule` (kèm điều kiện Adaptive), `TradePlan`, `TradeExecution`, `RuleViolation`, `DisciplineScoreSnapshot`, `EdgeScoreSnapshot`.
6. [ ] **Xác định kênh phân phối cụ thể** (mentor/coach trading, community sẵn có) trước khi build MVP.
7. [ ] **Build MVP Phase 1** = một vòng lặp hoàn chỉnh (mục 1) — không phải Risk + Journal rời rạc.

---

## 15. Kết luận

Chuỗi phản biện từ `plan1.md` gốc qua 4 bản review đầu, tổng hợp thành `plan1_final.md`, rồi qua tiếp 5 bản review nữa, đã đưa sản phẩm từ một ý tưởng "app phân tích Forex" thành một **hệ thống thiết kế can thiệp hành vi (Behavioral System Design)** khá hoàn chỉnh — đạt khoảng 8-9/10 về tư duy sản phẩm theo đánh giá hội tụ của các review.

Những gì còn lại không phải là thiếu ý tưởng, mà là **các điểm mù ở tầng 2** — nơi chính những cơ chế thông minh nhất (Evidence-based Interruption, Adaptive Rules, Auditor tone, Discipline Score) lại tiềm ẩn rủi ro phụ nếu triển khai không cẩn thận: thiếu dữ liệu ban đầu, có thể bị lợi dụng để hợp lý hóa hành vi xấu, hoặc gây tác dụng tâm lý ngược.

**Câu hỏi duy nhất còn lại không thể trả lời bằng tư duy, chỉ trả lời được bằng thực nghiệm:** liệu trader trung cấp VN có thực sự trả tiền cho một hệ thống buộc họ đối diện với chính mình hay không. Bước tiếp theo bắt buộc là interview thật + prototype thật, không phải thêm một vòng phân tích nữa.