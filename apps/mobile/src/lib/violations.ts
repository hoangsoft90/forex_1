/**
 * Behavior Engine — Module 7 (rule-based, KHÔNG ML — mvp_scope mục 7).
 *
 * Áp đúng mapping ở mục 7 plan1_final_v2.md:
 *   - overconfidence_size:   actual_risk_percent > planned_risk_percent × 1.5
 *   - revenge_trading:       lệnh trước lỗ + mở lệnh này < 10 phút + ngược chiều
 *   - hope_trading:          count(trade_sl_adjustments) > 2 cho lệnh này
 *   - martingale_negative:   lot lệnh này > lot lệnh trước × 1.8 VÀ lệnh trước lỗ
 *   - news_gambling:         ⚠️ CHƯA IMPLEMENT — cần nguồn Economic Calendar ở Phase 3.
 *                            KHÔNG giả lập dữ liệu tin tức giả.
 */

export type ViolationType =
  | 'overconfidence_size'
  | 'revenge_trading'
  | 'hope_trading'
  | 'news_gambling'
  | 'martingale_negative';

export type ViolationDetection = {
  type: ViolationType;
  severity: number;
  evidence: Record<string, unknown>;
};

export type TradeContext = {
  /** Execution đang xét (lệnh vừa đóng) */
  execution: {
    id: string;
    direction: 'buy' | 'sell';
    lot_size: number;
    actual_risk_percent: number | null;
    entry_time: string;
    exit_time: string | null;
  };
  /** Plan liên kết (nếu có) */
  plan: { planned_risk_percent: number | null } | null;
  /** Số lần dời SL của lệnh này */
  slAdjustmentCount: number;
  /** Lệnh đóng gần nhất TRƯỚC lệnh này (để xét revenge/martingale) */
  previousClosed: {
    direction: 'buy' | 'sell';
    lot_size: number;
    pnl_amount: number | null;
    exit_time: string | null;
  } | null;
};

/** Ngưỡng theo mapping mục 7 plan v2. */
export const OVERCONFIDENCE_RISK_MULTIPLIER = 1.5;
export const REVENGE_WINDOW_MINUTES = 10;
export const MARTINGALE_LOT_MULTIPLIER = 1.8;
export const HOPE_TRADING_MAX_SL_ADJUSTMENTS = 2;

/** Kiểm tra 1 execution có vi phạm gì không — trả danh sách (có thể nhiều loại). */
export function detectViolations(ctx: TradeContext): ViolationDetection[] {
  const found: ViolationDetection[] = [];

  // 1. overconfidence_size
  if (ctx.plan?.planned_risk_percent != null && ctx.execution.actual_risk_percent != null) {
    if (ctx.execution.actual_risk_percent > ctx.plan.planned_risk_percent * OVERCONFIDENCE_RISK_MULTIPLIER) {
      found.push({
        type: 'overconfidence_size',
        severity: 3,
        evidence: {
          actual_risk_percent: ctx.execution.actual_risk_percent,
          planned_risk_percent: ctx.plan.planned_risk_percent,
        },
      });
    }
  }

  // 2. revenge_trading
  const prev = ctx.previousClosed;
  if (
    prev &&
    prev.pnl_amount != null &&
    prev.pnl_amount < 0 &&
    prev.exit_time != null
  ) {
    const gapMin =
      (new Date(ctx.execution.entry_time).getTime() - new Date(prev.exit_time).getTime()) /
      60000;
    if (gapMin <= REVENGE_WINDOW_MINUTES && prev.direction !== ctx.execution.direction) {
      found.push({
        type: 'revenge_trading',
        severity: 4,
        evidence: {
          previous_pnl: prev.pnl_amount,
          gap_minutes: Math.round(gapMin),
        },
      });
    }
  }

  // 3. hope_trading
  if (ctx.slAdjustmentCount > HOPE_TRADING_MAX_SL_ADJUSTMENTS) {
    found.push({
      type: 'hope_trading',
      severity: 3,
      evidence: { sl_adjustments_count: ctx.slAdjustmentCount },
    });
  }

  // 4. martingale_negative
  if (prev && prev.lot_size > 0 && ctx.execution.lot_size > prev.lot_size * MARTINGALE_LOT_MULTIPLIER) {
    if (prev.pnl_amount != null && prev.pnl_amount < 0) {
      found.push({
        type: 'martingale_negative',
        severity: 4,
        evidence: {
          previous_lot: prev.lot_size,
          current_lot: ctx.execution.lot_size,
        },
      });
    }
  }

  // 5. news_gambling — ⚠️ CHƯA IMPLEMENT (mvp_scope mục 7):
  //    cần nguồn Economic Calendar (HIGH IMPACT news) ở Phase 3.
  //    KHÔNG giả lập dữ liệu tin tức giả — chỉ để placeholder rõ ràng.

  return found;
}
