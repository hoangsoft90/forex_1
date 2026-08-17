/**
 * Fast Plan (Retention Layer — Module 1).
 *
 * Form rút gọn: tối thiểu 5 trường BẮT BUỘC (Symbol, Direction, Entry, SL, Risk%).
 * SL là quy tắc bảo vệ Risk Engine — chặn cứng, không cảnh báo mềm.
 * TP là optional thật sự — Plan vẫn lưu được, Risk Engine vẫn tính lot size,
 * R:R chỉ hiển thị khi có TP.
 *
 * Tách validate ra hàm thuần để test trực tiếp các acceptance criteria.
 */

export const FAST_PLAN_REQUIRED_FIELDS = ['Symbol', 'Direction', 'Entry', 'SL', 'Risk%'] as const;

export type FastPlanInput = {
  symbol: string;
  direction: 'buy' | 'sell';
  entry: string;
  sl: string;
  riskPercent: string;
};

export type FastPlanValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validate 5 trường bắt buộc.
 * - entry/sl/riskPercent parse thành số > 0
 * - SL bắt buộc (chặn cứng — không bao giờ cho lưu khi thiếu)
 * - entry !== sl (khoảng cách SL = 0 là vô nghĩa cho lot size)
 */
export function validateFastPlan(input: FastPlanInput): FastPlanValidation {
  const entry = parseFloat(input.entry);
  const sl = parseFloat(input.sl);
  const risk = parseFloat(input.riskPercent);

  if (!input.symbol.trim()) {
    return { ok: false, reason: 'Vui lòng chọn Symbol.' };
  }
  if (!(entry > 0)) {
    return { ok: false, reason: 'Vui lòng nhập Entry hợp lệ (số > 0).' };
  }
  if (!(sl > 0)) {
    return { ok: false, reason: 'SL là bắt buộc — vui lòng nhập SL (chặn cứng để bảo vệ Risk Engine).' };
  }
  if (entry === sl) {
    return { ok: false, reason: 'Entry và SL phải khác nhau.' };
  }
  if (!(risk > 0)) {
    return { ok: false, reason: 'Vui lòng nhập Risk % hợp lệ (số > 0).' };
  }
  return { ok: true };
}

/**
 * Nhắc nhẹ (không chặn) điền bổ sung khi plan thiếu Thesis/Setup/Confidence
 * — hiển thị ở màn hình chi tiết lệnh sau khi đóng.
 */
export function missingOptionalDetails(plan: {
  thesis: string | null;
  setup_tag: string | null;
  confidence_level: number | null;
}): string[] {
  const missing: string[] = [];
  if (!plan.thesis) missing.push('Thesis');
  if (!plan.setup_tag) missing.push('Setup tag');
  if (plan.confidence_level == null) missing.push('Confidence');
  return missing;
}
