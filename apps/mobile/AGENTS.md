# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Quy tắc riêng của app này (bổ sung cho AGENTS.md root + .project/ai-rules.md)

### Independent Calculation (bắt buộc khi audit/test công thức tài chính)

Với MỌI công thức tài chính trong app — **lot size, R:R, Discipline Score, Edge Score, Cost of Indiscipline, delta Plan vs Reality** — khi audit hoặc test phải **TỰ TÍNH LẠI** kết quả bằng công thức viết tay/độc lập (từ input giả cụ thể, tính bằng tay theo `mvp_scope.md`/spec), rồi so sánh với output thực tế của code.

- **CẤM** đọc lại chính đoạn code đang audit để suy ra "trông có vẻ đúng" rồi công nhận.
- Nếu 2 kết quả lệch nhau → đó là **P0/P1 bug** tùy mức độ:
  - P0: sai dẫn tới quyết định giao dịch/tiền bạc sai (VD lot size, số tiền risk).
  - P1: lệch nhỏ nhưng sai bản chất công thức.
- KHÔNG phải "improvement suggestion" — phải báo user + sửa code (nếu code sai so với spec) hoặc dừng hỏi user (nếu spec mơ hồ), không tự chọn.
