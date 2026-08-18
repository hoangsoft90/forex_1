/**
 * Weekly Performance Audit — Module 9.
 *
 * Rule-based text generation (KHÔNG dùng LLM — mvp_scope mục 9):
 * template có sẵn, điền số thật vào chỗ trống. Phải tự nhiên theo ngôn ngữ
 * đang dùng, xử lý đúng khi count = 0 (tránh câu cụt/lặp vô nghĩa).
 */

import i18n from '@/i18n';

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
  overconfidence_size: 'weeklyAudit.violation.overconfidenceSize',
  revenge_trading: 'weeklyAudit.violation.revengeTrading',
  hope_trading: 'weeklyAudit.violation.hopeTrading',
  martingale_negative: 'weeklyAudit.violation.martingaleNegative',
  news_gambling: 'weeklyAudit.violation.newsGambling',
  max_daily_loss_exceeded: 'weeklyAudit.violation.maxDailyLoss',
  checklist_skipped: 'weeklyAudit.violation.checklistSkipped',
};

/** Sinh báo cáo tuần theo template (mvp_scope mục 9) — không gọi AI. */
export function generateWeeklyAudit(input: WeeklyAuditInput): string {
  const parts: string[] = [];
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

  // Mở đầu: số lệnh + % theo plan
  if (input.totalTrades > 0) {
    parts.push(
      t('weeklyAudit.opening', {
        trades: input.totalTrades,
        pct: input.followedPlanPercent.toFixed(0),
      }),
    );
  } else {
    parts.push(t('weeklyAudit.noTrades'));
    return parts.join(' ');
  }

  // Vi phạm phổ biến nhất (chỉ khi có)
  if (input.topViolation && input.topViolation.count > 0) {
    const labelKey = VIOLATION_LABELS[input.topViolation.type] ?? input.topViolation.type;
    const label = i18n.exists(labelKey) ? t(labelKey) : labelKey;
    parts.push(
      input.topViolation.count === 1
        ? t('weeklyAudit.topViolationOne', { label })
        : t('weeklyAudit.topViolationMany', { label, count: input.topViolation.count }),
    );
  } else {
    parts.push(t('weeklyAudit.noViolations'));
  }

  // Bad trades prevented
  if (input.badTradesPrevented > 0) {
    parts.push(t('weeklyAudit.prevented', { count: input.badTradesPrevented }));
  }

  // PnL + kết luận
  if (input.weekPnl >= 0) {
    parts.push(t('weeklyAudit.positivePnl', { amount: input.weekPnl.toFixed(2) }));
  } else {
    parts.push(
      t('weeklyAudit.negativePnl', { amount: Math.abs(input.weekPnl).toFixed(2) }),
    );
  }

  return parts.join(' ');
}
