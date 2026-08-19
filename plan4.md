features.md
Tệp
guide.md
Tệp
Tài liệu hướng dẫn sử dụng guide.md & tính năng features.md về app mobile "Trading Discipline OS" , xem kỹ rồi viết tất cả các prompts bạn tự nghĩ ra theo tứ tự lần lượt gửi cho agent code, để:
- nhóm 1: hỏi ngược lại có thể AI nghĩ thêm tìm ra lỗ hổng/sai logic/rủi ro tiềm ẩn.
- nhóm 2: test tất cả từng tính năng, đảm bảo chúng hoạt động đúng.
--------------------
Được. Với **Trading Discipline OS**, mình không khuyên gửi agent một prompt kiểu “review toàn bộ app” duy nhất. Cách tốt hơn là ép agent đi qua **2 vòng độc lập**:

1.  **Nhóm 1 — Adversarial/Product Review:** không sửa code ngay, phải tìm lỗ hổng, sai logic, assumption, edge case, security/privacy, UX trap, data inconsistency.
    
2.  **Nhóm 2 — Verification/QA:** sau khi xử lý các vấn đề ở nhóm 1, test **từng tính năng từ đầu đến cuối**, test cả happy path, invalid input, boundary case, persistence, navigation và regression.
    

Dưới đây là bộ prompt mình sẽ dùng, **theo đúng thứ tự nên gửi cho coding agent**. Mỗi prompt được thiết kế để agent hoàn thành một nhiệm vụ rồi mới sang prompt tiếp theo.

* * *

QUY ƯỚC CHUNG — gửi prompt này trước
====================================

### Prompt 0 — Establish review protocol

Bạn đang làm việc trên mobile app "Trading Discipline OS".

  

Hãy đọc kỹ toàn bộ:

\- guide.md

\- features.md

\- source code hiện tại

\- database/schema/models

\- navigation

\- state management

\- services/repositories

\- tests hiện có

\- configuration/dependencies

  

Mục tiêu của chuỗi nhiệm vụ này là:

1\. tìm ra các lỗ hổng/sai logic/rủi ro tiềm ẩn trước khi sửa;

2\. sau đó kiểm thử toàn bộ tính năng;

3\. không tự ý bỏ qua các lỗi chỉ vì chúng chưa gây crash;

4\. ưu tiên correctness của business logic và data integrity hơn UI cosmetics.

  

QUY TẮC:

\- Không đoán nếu code/document không đủ bằng chứng.

\- Khi phát hiện vấn đề, chỉ rõ file, class/function/module liên quan.

\- Phân biệt rõ:

  A. confirmed bug

  B. likely bug

  C. design ambiguity

  D. missing requirement

  E. improvement suggestion

\- Không sửa code trong các prompt thuộc vòng Product/Logic Review nếu tôi chưa yêu cầu sửa.

\- Khi test, phải ghi rõ:

  PASS / FAIL / BLOCKED / NOT TESTED.

\- Với mỗi FAIL, ghi:

  actual behavior

  expected behavior

  reproduction steps

  likely root cause

  severity.

\- Severity:

  P0 = data corruption/security/core trading-risk logic

  P1 = core feature broken/wrong calculation

  P2 = important UX/secondary feature

  P3 = cosmetic/minor issue.

  

Sau mỗi nhiệm vụ, đưa ra report có cấu trúc rõ ràng và không kết luận "everything looks good" nếu chưa thực sự kiểm tra.

* * *

NHÓM 1 — ADVERSARIAL REVIEW
===========================

Prompt 1 — Đọc lại toàn bộ product và tìm contradiction
-------------------------------------------------------

Chưa sửa code.

  

Hãy thực hiện một Product Logic Audit toàn bộ Trading Discipline OS dựa trên guide.md, features.md và source code hiện tại.

  

Mục tiêu là tìm những điểm mà:

\- guide.md nói một thứ nhưng features.md nói thứ khác;

\- features.md mô tả một behavior nhưng code làm khác;

\- hai feature riêng lẻ đúng nhưng khi kết hợp lại tạo ra logic sai;

\- business rule không được định nghĩa rõ;

\- feature có thể hoạt động nhưng tạo ra kết quả người dùng hiểu sai.

  

Đặc biệt kiểm tra:

  

1\. Personal Trading Constitution

2\. Trade Plan

3\. Risk Engine

4\. Decision Interruption

5\. Execution Capture

6\. Plan vs Reality

7\. Behavior Engine

8\. Discipline Score

9\. Edge Score

10\. Weekly Audit

11\. Portfolio Risk

12\. Journal

13\. import/history

14\. account/balance state

15\. onboarding

16\. Today/Daily loop

17\. navigation

18\. persistence.

  

Hãy tạo bảng:

  

Feature | Document says | Code does | Problem | Severity | Recommendation

  

Cuối cùng trả lời:

"5 contradiction nguy hiểm nhất là gì?"

* * *

Prompt 2 — Tấn công business logic
----------------------------------

Chưa sửa code.

  

Hãy đóng vai một adversarial trading-domain reviewer.

  

Giả sử một trader thực tế sử dụng app này và cố tình tìm mọi cách khiến business logic đưa ra kết quả sai hoặc misleading.

  

Kiểm tra sâu:

  

\- risk per trade

\- position size

\- SL/TP

\- R:R

\- account balance

\- daily loss

\- open risk

\- cumulative risk

\- realized P&L

\- unrealized P&L

\- multiple positions

\- multiple accounts

\- consecutive losses

\- daily reset

\- timezone

\- leverage

\- currency conversion

\- lot size

\- pip size

\- pip value

\- symbols có decimal khác nhau

\- XAU/USD

\- indices nếu được hỗ trợ

\- account currency khác USD nếu code có hỗ trợ

\- long/short

\- partial close

\- multiple entries

\- modified SL/TP

\- deleted/cancelled plans

\- duplicate trades.

  

Tìm tất cả trường hợp mà app có thể:

1\. cho phép risk vượt rule nhưng không cảnh báo;

2\. cảnh báo sai;

3\. tính sai position size;

4\. tính sai daily loss;

5\. tính sai Discipline Score;

6\. đánh dấu violation sai;

7\. làm user tin rằng họ an toàn trong khi thực tế không phải vậy.

  

Không sửa code.

  

Kết quả phải có:

\- confirmed issues

\- edge cases

\- assumptions chưa được định nghĩa

\- test cases cần bổ sung.

* * *

Prompt 3 — Tấn công Personal Rules + Decision Interruption
----------------------------------------------------------

Chưa sửa code.

  

Audit cực sâu Personal Trading Constitution và Decision Interruption.

  

Hãy giả lập các tình huống:

  

\- user chưa tạo rule;

\- user tạo 1 rule;

\- user tạo nhiều rule;

\- user sửa rule sau khi đã có trade;

\- user xóa rule;

\- user thay đổi max risk từ 1% xuống 0.5%;

\- user tăng max risk;

\- user đạt daily loss limit;

\- user gần đạt limit;

\- user vượt limit;

\- user vừa thua và lập tức tạo trade mới;

\- user tạo trade nhưng sửa plan trước khi execute;

\- user tạo trade vi phạm rule rồi chọn Continue;

\- user hủy trade sau warning;

\- user quay lại app sau nhiều giờ;

\- qua midnight;

\- đổi timezone;

\- app bị kill giữa Decision Gate;

\- app offline giữa Decision Gate;

\- duplicate submit.

  

Kiểm tra:

\- rule nào được snapshot tại thời điểm trade?

\- nếu rule thay đổi sau này, historical trade có bị tính lại không?

\- Decision Gate kiểm tra planned risk hay actual risk?

\- violation được ghi ở thời điểm nào?

\- Continue có nghĩa là intentional override hay bị coi là bug?

\- override có được lưu evidence không?

  

Tìm mọi ambiguity.

  

Không sửa code.

* * *

Prompt 4 — Audit Plan vs Reality
--------------------------------

Chưa sửa code.

  

Hãy audit toàn bộ lifecycle:

  

CREATE PLAN

→ MODIFY PLAN

→ EXECUTE

→ MODIFY POSITION

→ CLOSE

→ REVIEW.

  

Kiểm tra Plan vs Reality với các trường hợp:

  

1\. actual entry = planned entry

2\. actual entry khác planned entry

3\. actual SL khác planned SL

4\. actual TP khác planned TP

5\. actual risk cao hơn planned

6\. actual risk thấp hơn planned

7\. user move SL

8\. user move TP

9\. user partial close

10\. multiple executions cho một plan

11\. trade không có plan

12\. plan không được execute

13\. plan bị cancel

14\. duplicate imported trade

15\. imported trade match với existing trade

16\. trade import đến sau khi manual journal đã tạo

17\. timezone khác nhau

18\. trade close sau midnight

19\. trade giữ qua nhiều ngày.

  

Đặc biệt xác định:

\- identity của một trade;

\- identity của một plan;

\- cách map plan ↔ execution;

\- cách tính delta;

\- cách tính followed\_plan;

\- cách xử lý missing data.

  

Tạo một state machine đề xuất nếu state machine hiện tại chưa đủ rõ.

  

Không sửa code.

* * *

Prompt 5 — Audit Behavior Engine
--------------------------------

Chưa sửa code.

  

Hãy audit Behavior Engine như một hệ thống detection chứ không phải AI.

  

Kiểm tra từng behavior:

\- overconfidence\_size

\- revenge\_trading

\- hope\_trading

\- martingale\_negative

\- mọi behavior khác đang có trong code/features.md.

  

Với mỗi behavior, hãy trả lời:

  

1\. Trigger chính xác là gì?

2\. Có false positive nào?

3\. Có false negative nào?

4\. Có trường hợp strategy hợp lệ nhưng bị đánh dấu violation không?

5\. Có cần context từ previous trade không?

6\. Có cần time window không?

7\. Có cần account/session context không?

8\. Có cần user-defined rules không?

9\. Behavior có được immutable sau khi tạo không?

10\. Nếu dữ liệu trade được import lại thì behavior có thay đổi không?

  

Đặc biệt không được coi:

\- tăng lot = revenge;

\- move SL = hope;

\- opposite trade = revenge

  

một cách tuyệt đối nếu chưa có đủ evidence.

  

Đề xuất detection rules an toàn hơn.

  

Không sửa code.

* * *

Prompt 6 — Audit Discipline Score / Edge Score
----------------------------------------------

Chưa sửa code.

  

Hãy audit toàn bộ scoring system.

  

Kiểm tra:

  

\- Discipline Score

\- Edge Score

\- weekly score

\- historical score

\- violation weighting

\- adherence calculation

\- missing trade data

\- imported trades

\- trades without plans

\- cancelled plans

\- partial data

\- zero trades

\- one trade

\- 1000+ trades.

  

Kiểm tra các vấn đề toán học:

  

\- score có thể >100 không?

\- score có thể <0 không?

\- division by zero?

\- NaN?

\- negative values?

\- rounding?

\- floating-point errors?

\- score có bị thay đổi ngược lại khi historical data thay đổi?

\- một trade có thể bị tính hai lần?

\- violation có bị tính nhiều lần?

  

Đặc biệt kiểm tra semantic correctness:

  

"Discipline" không được bị trộn với "profitability".

  

"Edge" không được bị biến thành "recent P&L = positive".

  

Đưa ra công thức thực tế mà code hiện tại đang dùng và test cases cho từng boundary.

Không sửa code.

* * *

Prompt 7 — Audit data integrity
-------------------------------

Chưa sửa code.

  

Hãy đóng vai database/data integrity engineer.

  

Audit:

  

\- user

\- account

\- trading rules

\- trade plans

\- executions

\- journal

\- violations

\- behavior events

\- scores

\- weekly snapshots

\- imported history

\- screenshots

\- settings

\- notifications.

  

Kiểm tra:

  

1\. primary key

2\. foreign key

3\. orphan records

4\. duplicate records

5\. cascade delete

6\. soft delete

7\. historical immutability

8\. timestamp consistency

9\. timezone

10\. migration

11\. app reinstall

12\. logout/login

13\. multiple accounts

14\. duplicate imports

15\. partial failed transaction

16\. app crash giữa transaction

17\. offline → online synchronization

18\. stale state.

  

Đặc biệt tìm khả năng:

\- trade bị mất;

\- trade bị duplicate;

\- score thay đổi bất thường;

\- historical result bị rewrite;

\- account này nhìn thấy data account khác.

  

Không sửa code.

* * *

Prompt 8 — Audit security/privacy
---------------------------------

Chưa sửa code.

  

Hãy thực hiện security/privacy audit cho Trading Discipline OS.

  

Đặc biệt kiểm tra:

  

\- account balance

\- P&L

\- trading history

\- screenshots

\- broker credentials nếu có

\- imported files

\- local database

\- logs

\- analytics

\- crash reports

\- notifications

\- screenshots trong app switcher

\- backups

\- API keys

\- authentication

\- biometric lock

\- read-only broker connection.

  

Tìm:

  

\- plaintext sensitive data;

\- secrets trong source code;

\- secrets trong logs;

\- credentials lưu không an toàn;

\- excessive permissions;

\- insecure local storage;

\- insecure network requests;

\- IDOR/data isolation;

\- accidental PII leakage;

\- backup leakage;

\- notification leakage.

  

Không sửa code.

  

Kết quả:

P0/P1/P2/P3 + reproduction/evidence + recommendation.

* * *

Prompt 9 — Audit onboarding & first-use experience
--------------------------------------------------

Chưa sửa code.

  

Hãy đóng vai một trader mới lần đầu cài app.

  

Thực hiện cognitive walkthrough từ:

  

Install

→ Open

→ Onboarding

→ Create rules

→ First plan

→ Risk calculation

→ Decision Gate

→ First journal

→ First review

→ Exit app.

  

Tìm mọi điểm có khả năng khiến user:

\- không hiểu app để làm gì;

\- thấy quá nhiều form;

\- không biết phải bấm gì;

\- không hiểu thuật ngữ;

\- sợ nhập dữ liệu;

\- thấy app đang "dạy đời";

\- thấy app phán xét;

\- không thấy immediate value;

\- bỏ app trước khi hoàn thành first trade.

  

Đặc biệt trả lời:

  

"What is the first aha moment?"

  

Nếu hiện tại chưa có, đề xuất flow mới.

  

Không sửa code.

* * *

Prompt 10 — Audit retention / daily loop
----------------------------------------

Chưa sửa code.

  

Hãy phân tích app dưới góc nhìn retention.

  

Trả lời:

  

1\. Vì sao user mở app lần đầu?

2\. Vì sao user mở app ngày thứ 2?

3\. Vì sao user mở app trước mỗi trade?

4\. Vì sao user quay lại cuối tuần?

5\. Giá trị nào tăng lên theo thời gian?

6\. App có "learn user" không?

7\. User có nhìn thấy progress không?

8\. Có đủ lý do để notification tồn tại không?

9\. App có trở thành một journal đơn thuần không?

10\. Có feature nào hữu ích nhưng user không có lý do để truy cập?

  

Sau đó đánh giá:

\- Today dashboard

\- Discipline Score

\- Danger Zones

\- Strategy Analytics

\- Weekly Audit

\- notifications

\- streak/progress.

  

Đề xuất tối đa 5 thay đổi có impact lớn nhất.

  

Không sửa code.

* * *

Prompt 11 — Audit integration/import/offline
--------------------------------------------

Chưa sửa code.

  

Hãy audit toàn bộ external-data và offline lifecycle.

  

Kiểm tra:

  

\- manual trade

\- CSV/history import

\- MT4/MT5 import nếu có

\- broker sync nếu có

\- network unavailable

\- slow network

\- timeout

\- retry

\- duplicate import

\- malformed file

\- partial file

\- unsupported symbol

\- unsupported decimal format

\- timezone mismatch

\- locale number format

\- comma/semicolon CSV

\- missing columns

\- extra columns

\- invalid dates

\- invalid prices

\- negative volume

\- duplicate rows.

  

Kiểm tra idempotency:

Nếu cùng một file được import 2 lần, kết quả có giống import 1 lần không?

  

Không sửa code.

* * *

Prompt 12 — Cross-feature adversarial scenarios
-----------------------------------------------

Chưa sửa code.

  

Đây là bài kiểm tra quan trọng nhất của vòng review.

  

Đừng test từng feature riêng lẻ.

  

Hãy tạo ít nhất 30 scenario kết hợp nhiều feature.

  

Ví dụ:

  

1\. User thua 2 lệnh → vượt risk → mở lệnh thứ 3.

2\. User sửa rule sau khi có historical trades.

3\. Import trade đã tồn tại + manual trade.

4\. Trade qua midnight + daily loss reset.

5\. Multiple accounts + same symbol.

6\. Partial close + Plan vs Reality.

7\. App offline → create plan → online → sync.

8\. Rule violation → Continue → close trade → Weekly Audit.

9\. Delete plan nhưng execution đã tồn tại.

10\. Change account balance sau historical trades.

11\. Duplicate notification.

12\. App killed giữa Decision Gate.

13\. User changes timezone.

14\. Import old trades into current account.

15\. Strategy tag changed after 100 trades.

  

Tự nghĩ thêm ít nhất 15 scenario khó hơn.

  

Với mỗi scenario:

\- expected behavior

\- actual behavior nếu có thể chạy

\- potential bug

\- severity.

  

Không sửa code.

* * *

Prompt 13 — Tổng kết vòng 1
===========================

Bây giờ hãy tổng hợp toàn bộ kết quả của 12 vòng audit trước.

  

Không sửa code.

  

Tạo:

  

\## P0 — Must fix before release

\## P1 — Must fix before beta

\## P2 — Should fix

\## P3 — Nice to have

  

Sau đó tạo:

  

\### Top 10 hidden risks

  

Mỗi risk:

\- vấn đề

\- tại sao nguy hiểm

\- feature liên quan

\- reproduction scenario

\- impact

\- recommendation.

  

Tiếp theo tạo:

  

\### Requirement ambiguities

  

Liệt kê những chỗ guide.md/features.md chưa định nghĩa đủ khiến developer có thể implement hai cách khác nhau.

  

Cuối cùng:

  

\### Proposed acceptance criteria

  

Cho từng P0/P1 issue viết acceptance criteria có thể dùng trực tiếp để QA test.

  

CHƯA SỬA CODE.

* * *

SAU KHI AGENT HOÀN THÀNH NHÓM 1
===============================

Lúc này **không nên nhảy ngay sang test**.

Bạn nên gửi:

Dựa trên toàn bộ findings của vòng audit, hãy sửa lần lượt P0 → P1.

  

Không refactor lớn nếu không cần thiết.

  

Với mỗi fix:

1\. giải thích root cause;

2\. sửa code;

3\. thêm regression test;

4\. chạy test;

5\. báo cáo kết quả.

  

Không được sửa một issue bằng cách phá behavior của feature khác.

  

Sau mỗi nhóm fix, chạy lại test liên quan.

Sau khi agent sửa xong mới bắt đầu **Nhóm 2**.

* * *

NHÓM 2 — FULL FEATURE TESTING
=============================

Prompt 14 — Build test inventory
--------------------------------

Bây giờ chuyển sang QA/Verification Mode.

  

Không được giả định feature hoạt động chỉ vì code tồn tại.

  

Đọc lại guide.md + features.md và source code.

  

Hãy lập một Feature Test Matrix bao phủ 100% feature hiện có.

  

Columns:

  

ID

Feature

Sub-feature

Happy path

Validation

Boundary cases

Error cases

Persistence

Offline behavior

Navigation

Cross-feature dependency

Expected result

Test status

  

Không test ngay ở bước này.

  

Chỉ lập test inventory hoàn chỉnh trước.

* * *

Prompt 15 — Test onboarding
===========================

Thực thi toàn bộ test onboarding.

  

Test:

  

1\. fresh install

2\. first launch

3\. skip nếu có

4\. baseline setup

5\. weakness quiz

6\. discipline vs edge explanation

7\. create first rules

8\. invalid input

9\. empty input

10\. duplicate rules

11\. edit rules

12\. delete rules

13\. force close

14\. reopen

15\. persistence

16\. back navigation

17\. onboarding completion

18\. onboarding incomplete state.

  

Không chỉ kiểm tra UI.

  

Kiểm tra database/state sau mỗi bước.

  

Report:

PASS/FAIL/BLOCKED

actual

expected

evidence

severity.

* * *

Prompt 16 — Test Personal Trading Constitution
==============================================

Test exhaustively Personal Trading Constitution.

  

Test:

\- create

\- read

\- edit

\- delete

\- max risk

\- max daily loss

\- max open risk

\- max trades

\- no revenge rule

\- news rule

\- invalid values

\- zero

\- negative

\- extremely large

\- decimal precision

\- duplicate rule

\- conflicting rules

\- rule ordering

\- rule changes after trades

\- persistence

\- restart

\- multiple accounts if supported.

  

Sau đó test rule enforcement bằng real Trade Plan.

  

Mỗi test phải chứng minh:

rule → evaluation → result → stored violation/override.

* * *

Prompt 17 — Test Trade Plan
===========================

Test Trade Plan end-to-end.

  

Cover:

  

\- pair/symbol

\- direction

\- entry

\- stop loss

\- take profit

\- risk

\- R:R

\- lot size

\- setup

\- thesis

\- invalidation

\- confidence.

  

Test:

\- valid plan

\- missing fields

\- zero

\- negative

\- SL on wrong side

\- TP on wrong side

\- TP below SL

\- huge values

\- decimal precision

\- edit

\- duplicate

\- cancel

\- execute

\- save draft

\- reopen draft

\- persistence

\- back navigation

\- app restart.

* * *

Prompt 18 — Test Risk Engine
============================

Đây là financial calculation test.

  

Không dùng vài test case đơn giản.

  

Tạo test suite bao phủ:

  

\- long

\- short

\- different entry/SL distances

\- 0.5%, 1%, 2%, 5% risk

\- different balances

\- decimal balances

\- different lot sizes

\- pip-based symbols

\- XAU/USD nếu supported

\- symbols có 2/3/4/5 decimal

\- currency differences nếu supported

\- leverage

\- rounding

\- min lot

\- max lot

\- lot step

\- very small SL

\- very large SL.

  

Kiểm tra:

position size

risk amount

R:R

potential loss

potential profit.

  

Đối chiếu bằng independent calculation.

  

Nếu phát hiện discrepancy dù nhỏ, report.

  

Không chấp nhận "looks correct".

* * *

Prompt 19 — Test Decision Interruption
======================================

Test Decision Interruption như một safety-critical component.

  

Test từng trigger:

  

\- risk exceeds max

\- daily loss exceeds limit

\- too many trades

\- revenge pattern

\- other configured rules.

  

Test:

  

1\. warning appears

2\. correct evidence shown

3\. user can cancel

4\. user can modify plan

5\. user can continue if allowed

6\. override is recorded

7\. violation is recorded correctly

8\. no duplicate violation

9\. app restart during gate

10\. background/foreground

11\. offline

12\. duplicate submit

13\. multiple simultaneous plans.

  

Kiểm tra không có path nào bypass gate ngoài intended behavior.

* * *

Prompt 20 — Test Execution Capture
==================================

Test Execution Capture với mục tiêu <20 seconds cho happy path.

  

Test:

\- create execution

\- manual entry

\- actual entry

\- actual SL

\- actual TP

\- volume

\- timestamp

\- screenshot nếu có

\- emotion

\- notes

\- plan linking.

  

Test invalid/partial input.

  

Test:

\- close immediately

\- edit

\- delete nếu allowed

\- duplicate submit

\- app killed

\- save retry

\- offline

\- persistence.

  

Đo thời gian happy path thực tế nếu có khả năng.

  

Báo cáo:

median interaction time

number of required taps

friction points.

* * *

Prompt 21 — Test Plan vs Reality
================================

Test toàn bộ Plan vs Reality engine.

  

Tạo ít nhất 20 test cases.

  

Bao gồm:

  

exact match

entry deviation

SL deviation

TP deviation

risk deviation

volume deviation

missing plan

multiple executions

partial close

plan cancelled

trade imported

manual trade

duplicate trade

modified SL

modified TP

timezone

midnight

multi-day trade.

  

Verify:

delta values

followed\_plan

violation

PnL

R-multiple

historical persistence.

  

Đặc biệt kiểm tra historical result không bị thay đổi sai khi rule/plan hiện tại thay đổi.

* * *

Prompt 22 — Test Journal
========================

Test Journal đầy đủ.

  

Test:

  

\- create journal

\- edit

\- delete

\- search

\- filter

\- sort

\- date range

\- symbol

\- setup

\- win/loss

\- notes

\- screenshot

\- emotion

\- linked plan

\- linked execution.

  

Test empty state.

Test large dataset.

Test duplicate entries.

Test persistence.

Test restart.

Test offline.

Test account isolation.

  

Kiểm tra journal không tạo duplicate khi user double-tap Save.

* * *

Prompt 23 — Test Behavior Engine
================================

Tạo deterministic test suite cho Behavior Engine.

  

Mỗi behavior phải có:

  

1\. positive case → phải detect

2\. negative case → không được detect

3\. boundary case

4\. missing data

5\. conflicting signals.

  

Test:

\- overconfidence\_size

\- revenge\_trading

\- hope\_trading

\- martingale\_negative

\- all other implemented patterns.

  

Kiểm tra behavior event:

\- không duplicate;

\- có timestamp;

\- liên kết đúng trade;

\- severity đúng;

\- historical behavior không tự thay đổi ngoài ý muốn.

  

Đặc biệt test false positive.

* * *

Prompt 24 — Test Discipline Score
=================================

Test Discipline Score bằng independent calculations.

  

Tạo dataset nhỏ:

  

0 trades

1 trade

2 trades

10 trades

100 trades

mixed violations

all compliant

all violations

missing plan

override

duplicate trade

deleted trade.

  

Tính expected score độc lập rồi so sánh code.

  

Kiểm tra:

\- min

\- max

\- rounding

\- division by zero

\- historical snapshot

\- weekly score

\- score after import

\- score after deletion

\- score after rule change.

  

Không chấp nhận score "trông hợp lý".

* * *

Prompt 25 — Test Edge Score & Strategy Analytics
================================================

Test Edge Score và Strategy Analytics.

  

Tạo datasets:

  

A. high win rate / low R:R

B. low win rate / high R:R

C. positive expectancy

D. negative expectancy

E. zero trades

F. one trade

G. many trades

H. different setups

I. different pairs

J. different sessions.

  

Verify app không đánh đồng:

profitability

discipline

win rate

expectancy

sample size.

  

Đặc biệt:

Một strategy có 2 trades và 100% win rate không được trình bày như một statistically reliable edge.

  

Kiểm tra empty/insufficient sample messaging.

* * *

Prompt 26 — Test Weekly Audit
=============================

Test Weekly Audit end-to-end.

  

Kiểm tra:

  

\- correct date range

\- timezone

\- number of trades

\- total P&L

\- win rate

\- average R

\- violations

\- discipline score

\- edge score

\- behavior patterns

\- best setup

\- worst setup

\- trend compared to previous week.

  

Test:

\- zero trades

\- one trade

\- week crossing month

\- week crossing year

\- timezone change

\- imported historical trades

\- deleted trades

\- incomplete data.

  

Đối chiếu mọi metric bằng independent calculation.

* * *

Prompt 27 — Test Portfolio Risk
===============================

Test Portfolio Risk.

  

Tạo scenarios:

  

1 trade

2 trades

5 trades

same pair

different pairs

correlated pairs

opposite positions

same currency exposure

different accounts.

  

Verify:

\- open risk

\- total risk

\- daily risk

\- correlation logic nếu implemented

\- max open risk

\- warning threshold.

  

Test positions being opened/closed/modified.

  

Đặc biệt kiểm tra duplicate counting.

* * *

Prompt 28 — Test import/history
===============================

Test import/history như production QA.

  

Chuẩn bị test files:

  

1\. valid file

2\. empty file

3\. missing columns

4\. extra columns

5\. invalid date

6\. invalid price

7\. invalid volume

8\. duplicate rows

9\. duplicate file

10\. mixed valid/invalid rows

11\. wrong delimiter

12\. different decimal separator

13\. timezone difference

14\. unsupported symbol

15\. huge file.

  

Verify:

\- parser

\- validation

\- partial import behavior

\- rollback behavior

\- duplicate detection

\- idempotency

\- error messages

\- imported trades matching existing trades.

  

Import cùng một file 3 lần.

  

Expected result phải rõ ràng và consistent.

* * *

Prompt 29 — Test multi-account/data isolation
=============================================

Nếu app hỗ trợ nhiều account, test data isolation.

  

Tạo:

Account A

Account B

  

Mỗi account có:

\- rules

\- trades

\- plans

\- journal

\- score

\- balance.

  

Kiểm tra:

  

A không thấy B.

B không thấy A.

  

Switch account liên tục.

  

Test:

\- create

\- edit

\- delete

\- import

\- score

\- notifications

\- portfolio risk.

  

Đặc biệt kiểm tra cached state và stale state sau account switching.

* * *

Prompt 30 — Test Today/Daily Dashboard
======================================

Test Today/Daily Dashboard.

  

Verify mọi metric trên màn hình đều lấy từ source of truth đúng.

  

Test:

  

\- no trades today

\- 1 trade

\- multiple trades

\- loss

\- profit

\- rule violation

\- daily loss

\- open risk

\- danger zone

\- weekly progress

\- notification state

\- date rollover

\- timezone.

  

Qua midnight phải đảm bảo:

Yesterday ≠ Today.

  

Không được để dữ liệu hôm qua hiển thị thành dữ liệu hôm nay.

* * *

Prompt 31 — Test notifications
==============================

Test notification system.

  

Test:

  

\- morning notification

\- session reminder

\- end-of-day review

\- danger warning

\- duplicate prevention

\- disabled notifications

\- timezone

\- daylight saving nếu relevant

\- app foreground

\- app background

\- force killed

\- notification tap/deep link

\- stale notification.

  

Không gửi notification nếu condition không còn đúng.

  

Ví dụ:

Nếu user đã đóng trade trước notification deadline thì notification phải được suppress nếu logic yêu cầu.

* * *

Prompt 32 — Test offline / crash / recovery
===========================================

Thực hiện resilience test.

  

Test:

  

\- airplane mode

\- slow network

\- network lost giữa Save

\- network restored

\- app killed giữa Save

\- app killed giữa import

\- app killed giữa Decision Gate

\- background/foreground

\- low storage nếu có thể

\- database error simulation nếu có thể.

  

Mục tiêu:

không mất trade,

không duplicate trade,

không corrupt state,

không tạo violation giả.

  

Report từng scenario.

* * *

Prompt 33 — Test navigation/UI state
====================================

Thực hiện navigation regression test toàn app.

  

Từ mọi màn hình:

  

\- back

\- close

\- cancel

\- save

\- edit

\- reopen

\- deep link

\- notification tap

\- tab switch

\- app background/foreground.

  

Kiểm tra:

\- unsaved changes

\- stale data

\- duplicated screens

\- broken navigation

\- unexpected reset

\- incorrect selected account

\- incorrect selected trade.

  

Không chỉ test visual.

* * *

Prompt 34 — Test large dataset/performance
==========================================

Tạo synthetic dataset lớn:

  

1,000 trades

5,000 trades

10,000 trades nếu database cho phép.

  

Test:

  

\- journal load

\- dashboard

\- score calculation

\- weekly audit

\- strategy analytics

\- behavior engine

\- search/filter

\- import

\- navigation.

  

Đo:

\- startup time

\- screen load time

\- query time

\- memory

\- UI freezes

\- ANR risk.

  

Tìm N+1 queries và unnecessary recalculation.

* * *

Prompt 35 — Test security
=========================

Thực hiện security regression test.

  

Kiểm tra:

  

\- authentication

\- local storage

\- sensitive fields

\- logs

\- screenshots

\- notifications

\- imported files

\- API calls

\- broker credentials

\- read-only permissions

\- account isolation

\- logout/login

\- biometric lock.

  

Thử các tình huống:

\- logged out → access protected data

\- account A → account B

\- malformed IDs

\- manipulated local state

\- invalid API response

\- expired session.

  

Không cần pentest destructive.

Chỉ xác định attack surface và thực hiện safe verification.

* * *

Prompt 36 — Test full user journeys
===================================

Đây là prompt mình **rất khuyên dùng**, vì từng feature PASS riêng lẻ vẫn chưa đảm bảo app hoạt động.

Bây giờ không test theo feature nữa.

  

Test 10 end-to-end user journeys.

  

Journey 1:

New trader

→ onboarding

→ create rules

→ create first plan

→ risk check

→ execute

→ journal

→ review.

  

Journey 2:

Experienced trader

→ import 100 historical trades

→ analyze discipline

→ strategy analytics

→ create rules.

  

Journey 3:

Trader makes losing trade

→ revenge pattern

→ next trade

→ Decision Interruption

→ override

→ journal

→ weekly audit.

  

Journey 4:

Trader exceeds daily loss.

  

Journey 5:

Trader modifies SL after execution.

  

Journey 6:

Trader has multiple open positions.

  

Journey 7:

Trader uses multiple accounts.

  

Journey 8:

Trader goes offline during a trade workflow.

  

Journey 9:

Trader returns after 7 days.

  

Journey 10:

Trader has 500+ historical trades and opens the app.

  

For each journey:

\- exact steps

\- expected state

\- actual state

\- database state

\- score changes

\- notifications

\- FAIL/BLOCKED/PASS.

  

Tìm cross-feature bugs.

* * *

Prompt 37 — Regression suite
============================

Bây giờ chạy regression test toàn bộ app sau tất cả các fixes.

  

Không chỉ chạy unit tests.

  

Chạy:

  

1\. unit

2\. integration

3\. database

4\. calculation

5\. import

6\. navigation

7\. end-to-end

8\. offline/recovery

9\. security checks.

  

Đặc biệt rerun toàn bộ P0/P1 scenarios đã phát hiện ở vòng Product Audit.

  

Tạo regression matrix:

  

Old bug

Fix

Regression test

Result

  

Không được đánh dấu PASS chỉ vì test file tồn tại.

Test phải thực sự execute.

* * *

Prompt 38 — Final release gate
==============================

Đây là prompt cuối cùng mình sẽ gửi agent.

Hãy thực hiện Final Release Readiness Audit cho Trading Discipline OS.

  

Không được sửa code.

  

Kiểm tra toàn bộ:

  

PRODUCT

\- guide/features consistency

\- onboarding

\- core loop

\- retention loop

  

BUSINESS LOGIC

\- rules

\- risk

\- plan

\- execution

\- plan vs reality

\- behavior

\- discipline

\- edge

\- portfolio

  

DATA

\- persistence

\- migrations

\- imports

\- duplicates

\- historical integrity

\- account isolation

  

UX

\- loading

\- empty states

\- errors

\- validation

\- navigation

\- offline state

  

RESILIENCE

\- crash

\- restart

\- background

\- network loss

\- retry

  

SECURITY

\- sensitive data

\- credentials

\- logs

\- authentication

\- biometric

\- privacy

  

PERFORMANCE

\- cold start

\- large data

\- calculation

\- database

  

Tạo release report:

  

\## RELEASE BLOCKERS

\## HIGH RISK

\## MEDIUM RISK

\## LOW RISK

  

Sau đó:

  

\### Core Feature Coverage

Feature | Tested | Pass | Fail | Blocked

  

\### P0/P1 Regression

Issue | Regression test | Result

  

\### Remaining Unknowns

Những thứ chưa thể verify và tại sao.

  

\### Final verdict

  

Chỉ được chọn một:

  

READY FOR RELEASE

READY FOR BETA

NOT READY

  

Nếu NOT READY, liệt kê chính xác những điều kiện phải hoàn thành trước release.

* * *

Thứ tự mình khuyên bạn thực sự chạy
===================================

Đừng gửi 38 prompt một cách máy móc. Mình sẽ chia thành **4 checkpoint**:

CHECKPOINT 1

Prompt 0

↓

1 → 2 → 3 → 4 → 5 → 6

↓

7 → 8 → 9 → 10 → 11 → 12

↓

13

**Dừng lại. Đọc report. Fix P0/P1.**

Sau đó:

CHECKPOINT 2

Prompt 14

↓

15 → 16 → 17 → 18 → 19 → 20

↓

21 → 22 → 23 → 24 → 25 → 26

**Dừng lại. Fix các FAIL.**

Sau đó:

CHECKPOINT 3

27 → 28 → 29 → 30 → 31 → 32

↓

33 → 34 → 35

Cuối cùng:

CHECKPOINT 4

36

↓

37

↓

38

* * *

Một điều mình đặc biệt muốn agent làm
-------------------------------------

Đối với app này, **đừng để agent chỉ test “nút bấm có hoạt động không”**.

Có 4 lớp phải test:

UI

 ↓

STATE

 ↓

BUSINESS LOGIC

 ↓

DATABASE

Ví dụ bấm **“Continue Anyway”**:

Không được chỉ kết luận:

> ✅ Popup đóng.

Phải kiểm tra:

Popup đóng

↓

Trade được tạo

↓

Override được ghi

↓

Violation được ghi

↓

Trade liên kết đúng Plan

↓

Discipline Score phản ánh đúng

↓

Weekly Audit phản ánh đúng

Đây mới là test đúng cho **Trading Discipline OS**.

Đặc biệt với app có **Risk Engine + Decision Gate + Behavior Engine + Discipline Score**, lỗi nguy hiểm nhất không phải crash app. **Nguy hiểm nhất là app chạy hoàn toàn bình thường nhưng đưa ra một kết luận trading/risk sai.**

Vì vậy mình sẽ ưu tiên **financial/business-logic test > data integrity test > cross-feature test > UX test > cosmetic UI test**.