/**
 * Weekly Performance Audit — Module 9.
 *
 * Rule-based text generation (KHÔNG dùng LLM — mvp_scope mục 9):
 * template có sẵn, điền số thật vào chỗ trống. Phải tự nhiên tiếng Việt,
 * xử lý đúng khi count = 0 (tránh câu cụt/lặp vô nghĩa).
 */

export type WeeklyAuditInput = {
  /** Số lệnh trong tuần */
  totalTrades: number;
  /** % lệnh theo đúng plan */
  followedPlanPercent: number;
  /** Loại vi phạm phổ biến nhất + số lần (null nếu không có) */
  topViolation: { type: string; count: number } | null;
  /** Số lệnh vi phạm đã được ngăn chặn bởi Decision Interruption */
  badTradesPrevented: number;
  /** PnL tuần (USD) */
  weekPnl: number;
};

const VIOLATION_LABELS: Record<string, string> = {
  overconfidence_size: 'vào lệnh quá khối lượng',
  revenge_trading: 'revenge trade',
  hope_trading: 'dời Stop Loss',
  martingale_negative: 'tăng lot sau lệnh thua',
  news_gambling: 'vào lệnh trước tin lớn',
  max_daily_loss_exceeded: 'vượt mức lỗ tối đa trong ngày',
  checklist_skipped: 'bỏ qua checklist',
};

/** Sinh báo cáo tuần theo template (mvp_scope mục 9) — không gọi AI. */
export function generateWeeklyAudit(input: WeeklyAuditInput): string {
  const parts: string[] = [];

  // Mở đầu: số lệnh + % theo plan
  if (input.totalTrades > 0) {
    parts.push(
      `Tuần này bạn thực hiện ${input.totalTrades} lệnh, ${input.followedPlanPercent.toFixed(0)}% theo đúng plan.`,
    );
  } else {
    parts.push('Tuần này bạn chưa có lệnh nào được ghi nhận.');
    return parts.join(' ');
  }

  // Vi phạm phổ biến nhất (chỉ khi có)
  if (input.topViolation && input.topViolation.count > 0) {
    const label = VIOLATION_LABELS[input.topViolation.type] ?? input.topViolation.type;
    parts.push(
      input.topViolation.count === 1
        ? `Vi phạm phổ biến nhất: ${label} (1 lần).`
        : `Vi phạm phổ biến nhất: ${label} (${input.topViolation.count} lần).`,
    );
  } else {
    parts.push('Tuần này bạn không có vi phạm nào được ghi nhận — giữ vững nhé.');
  }

  // Bad trades prevented
  if (input.badTradesPrevented > 0) {
    parts.push(
      `App đã giúp bạn tránh ${input.badTradesPrevented} lệnh vi phạm rule của chính mình.`,
    );
  }

  // PnL + kết luận
  if (input.weekPnl >= 0) {
    parts.push(
      `Kết quả tuần: +$${input.weekPnl.toFixed(2)}. Tiếp tục duy trì kỷ luật như thế này.`,
    );
  } else {
    parts.push(
      `Kết quả tuần: -$${Math.abs(input.weekPnl).toFixed(2)}. Nhìn vào % theo plan để phân biệt do chiến lược hay do hành vi.`,
    );
  }

  return parts.join(' ');
}
