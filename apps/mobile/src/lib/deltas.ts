/**
 * Plan vs Reality — Module 6.
 *
 * Logic tính delta giữa Planned và Actual (mvp_scope mục 6):
 *   entry_deviation_pips  = |actual_entry - planned_entry|
 *   sl_deviation_pips     = |actual_sl - planned_sl| (SL cuối cùng từ adjustments nếu có)
 *   risk_deviation_percent = actual_risk_percent - planned_risk_percent
 *
 * followed_plan (Phase 1 HARDCODE ngưỡng, theo mvp_scope):
 *   - entry lệch < 5 pip
 *   - risk lệch < 0.2%
 *   - KHÔNG có SL adjustment nào
 */

import { pipSizeForSymbol } from './risk-engine';

export type DeltaInput = {
  plannedEntry: number;
  actualEntry: number;
  plannedSl: number;
  /** SL cuối cùng của lệnh (đã lấy từ trade_sl_adjustments nếu có) */
  actualSl: number;
  plannedRiskPercent: number;
  actualRiskPercent: number;
  /** Số lần dời SL (count trade_sl_adjustments) */
  slAdjustmentCount: number;
};

export type DeltaResult = {
  entryDeviationPips: number;
  slDeviationPips: number;
  riskDeviationPercent: number;
  followedPlan: boolean;
};

/** Ngưỡng hardcode Phase 1 (mvp_scope mục 6). */
export const ENTRY_DEVIATION_MAX_PIPS = 5;
export const RISK_DEVIATION_MAX_PERCENT = 0.2;

/** Re-export cho backward compat (nếu có caller bên ngoài dùng). */
export { pipSizeForSymbol };

/** Tính delta cho 1 execution vs plan. */
export function computeDeltas(symbol: string, input: DeltaInput): DeltaResult {
  const pip = pipSizeForSymbol(symbol);
  // Round TRƯỚC khi so sánh để tránh float error (VD 1.1005-1.1 = 0.0004999... → 5 pips thật)
  const entryDeviationPips = round(Math.abs(input.actualEntry - input.plannedEntry) / pip, 2);
  const slDeviationPips = round(Math.abs(input.actualSl - input.plannedSl) / pip, 2);
  const riskDeviationPercent = round(
    input.actualRiskPercent - input.plannedRiskPercent,
    4,
  );

  const followedPlan =
    entryDeviationPips < ENTRY_DEVIATION_MAX_PIPS &&
    Math.abs(riskDeviationPercent) < RISK_DEVIATION_MAX_PERCENT &&
    input.slAdjustmentCount === 0;

  return {
    entryDeviationPips,
    slDeviationPips,
    riskDeviationPercent,
    followedPlan,
  };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
