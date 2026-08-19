/**
 * parse-number.ts — Parse số thập phân từ input tay của user.
 *
 * Vấn đề: `parseFloat("1,5")` = 1 (cắt tại dấu phẩy) → nhập theo locale EU/VI
 * (dấu phẩy thập phân) bị sai âm thầm. Helper này chấp nhận CẢ chấm lẫn phẩy
 * làm dấu thập phân:
 *   - "1.5" | "1,5"          → 1.5
 *   - "1 234,56"             → 1234.56 (bỏ khoảng trắng)
 *   - "1,234.56" | "1.234,56" → 1234.56 (dấu xuất hiện SAU CÙNG là dấu thập phân)
 *   - "1.234" (chỉ 1 dấu chấm) → 1.234  (giá/giá trị lẻ — trader gõ chấm thập phân)
 *   - "1.234.567" (nhiều chấm, nhóm 3) → 1234567 (phân cách hàng nghìn)
 *
 * Trả null nếu không phải số hợp lệ (KHÔNG trả NaN — gọi viên kiểm null).
 */
export function parseDecimalInput(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/\s/g, '');
  if (!s || s === '-' || s === '.' || s === ',') return null;

  if (s.includes('.') && s.includes(',')) {
    // Cả 2 dấu: dấu xuất hiện sau cùng là dấu thập phân.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Chỉ phẩy: phẩy là dấu thập phân ("1,5" → 1.5).
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    // Chỉ chấm: chấm đơn là thập phân ("1.1000"); chuỗi "1.234.567" là hàng nghìn.
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}
