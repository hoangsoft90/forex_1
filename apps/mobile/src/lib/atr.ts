/**
 * atr.ts — Adaptive Rules theo ATR (Phase 2, Module P2-M4).
 *
 * Nguyên tắc bắt buộc từ plan1_final_v2.md mục 3:
 *   "Adaptive Rules chỉ được phép tự động điều chỉnh GIẢM risk.
 *    Bất kỳ điều chỉnh tăng nào so với baseline đều phải đi qua Decision Interruption.
 *    App không bao giờ tự động nới lỏng luật."
 *
 * Vì vậy: `suggestAdaptiveRisk()` KHÔNG BAO GIỜ trả giá trị > base_value.
 * Nếu input bất thường (adjusted > base) → trả base_value (bỏ qua điều kiện lỗi),
 * không bao giờ đề xuất tăng.
 */

import i18n from '@/i18n';

export type Candle = {
  high: number;
  low: number;
  close: number;
  /** close của cây nến trước — null nếu là cây đầu tiên (TR dùng close trước) */
  prevClose: number | null;
};

/** ATR input theo quy ước plan: condition_value = "ATR gấp X lần trung bình". */
export type AdaptiveCondition = {
  id: string;
  condition_type: 'atr_threshold' | 'news_high_impact' | 'session_based';
  condition_operator: 'gt' | 'lt' | 'eq';
  /** VD 1.5 = ATR hiện tại > 1.5 × ATR trung bình */
  condition_value: number;
  /** Giá trị rule SAU điều chỉnh (phải <= base) */
  adjusted_value: number;
};

export type AdaptiveSuggestion = {
  /** true nếu điều kiện ATR kích hoạt → nên dùng adjusted_value */
  active: boolean;
  /** Giá trị risk đề xuất (luôn <= base_value) */
  suggestedRiskPercent: number;
  /** Lý do hiển thị cho user (tiếng Việt) */
  reason: string;
  /** id condition đã kích hoạt (để lưu applied_adaptive_condition_id) */
  appliedConditionId: string | null;
  /** ATR hiện tại (nếu tính được) */
  atrNow: number | null;
  /** ATR trung bình */
  atrAverage: number | null;
};

/** True Range của 1 cây nến. */
export function trueRange(c: Candle): number {
  const prevClose = c.prevClose ?? c.close;
  return Math.max(
    c.high - c.low,
    Math.abs(c.high - prevClose),
    Math.abs(c.low - prevClose),
  );
}

/** Tính ATR trung bình đơn giản (Wilder's smoothing đơn giản hóa: trung bình TR). */
export function averageTrueRange(candles: Candle[]): number | null {
  if (candles.length === 0) return null;
  const sum = candles.reduce((s, c) => s + trueRange(c), 0);
  return sum / candles.length;
}

/** ATR "hiện tại" = ATR của N nến gần nhất (mặc định 14, chuẩn ATR period). */
export function currentATR(candles: Candle[], period = 14): number | null {
  if (candles.length === 0) return null;
  const recent = candles.slice(-period);
  return averageTrueRange(recent);
}

/**
 * Đề xuất risk theo điều kiện ATR.
 * @param baseValue giá trị rule gốc (VD 1 = 1%)
 * @param condition điều kiện adaptive (condition_type='atr_threshold')
 * @param atrNow ATR hiện tại
 * @param atrAverage ATR trung bình (cùng đơn vị)
 */
export function suggestAdaptiveRisk(
  baseValue: number,
  condition: AdaptiveCondition,
  atrNow: number | null,
  atrAverage: number | null,
): AdaptiveSuggestion {
  const fallback: AdaptiveSuggestion = {
    active: false,
    suggestedRiskPercent: baseValue,
    reason: i18n.t('atr.notActive'),
    appliedConditionId: null,
    atrNow,
    atrAverage,
  };

  // Chỉ hỗ trợ atr_threshold ở Phase 2.
  if (condition.condition_type !== 'atr_threshold') return fallback;
  if (atrNow == null || atrAverage == null || atrAverage <= 0) {
    return {
      ...fallback,
      reason: i18n.t('atr.missingData'),
    };
  }

  const ratio = atrNow / atrAverage;
  let active = false;
  if (condition.condition_operator === 'gt') active = ratio > condition.condition_value;
  else if (condition.condition_operator === 'lt') active = ratio < condition.condition_value;
  else if (condition.condition_operator === 'eq') active = Math.abs(ratio - condition.condition_value) < 0.01;

  if (!active) return fallback;

  // BẢO VỆ: không bao giờ đề xuất tăng so với base.
  const suggested = Math.min(condition.adjusted_value, baseValue);
  return {
    active: true,
    suggestedRiskPercent: suggested,
    reason: i18n.t('atr.activeReason', {
      atrNow: atrNow.toFixed(2),
      ratio: ratio.toFixed(2),
      atrAverage: atrAverage.toFixed(2),
      threshold: condition.condition_value,
      base: baseValue,
      suggested,
    }),
    appliedConditionId: condition.id,
    atrNow,
    atrAverage,
  };
}
