/**
 * Cost of Indiscipline — Retention Layer Module 4 (P1).
 *
 * Công thức (theo ĐÚNG retention_layer_addendum.md, không tự sáng tạo):
 *
 *   hypothetical_pnl = tổng PnL NẾU mọi lệnh có followed_plan = true đều giữ nguyên PnL thật,
 *                      và mọi lệnh followed_plan = false được thay bằng PnL giả định
 *                      dựa trên planned_entry/planned_sl/planned_tp của chính lệnh đó
 *                      (nếu có đủ 3 giá trị; bỏ qua lệnh không đủ dữ liệu, không suy diễn)
 *   actual_pnl = tổng pnl_amount thật trong kỳ
 *   cost_of_indiscipline = hypothetical_pnl - actual_pnl
 *
 * Chỉ hiển thị khi: số lệnh followed_plan=false trong kỳ ≥ 3 VÀ tổng lệnh trong kỳ ≥ 30.
 *
 * ⚠️ GIẢ ĐỊNH (spec chưa ghi rõ cách tính "PnL giả định" cho lệnh lệch plan):
 *   Lệnh lệch plan được giả định là NẾU theo đúng plan thì giá đạt planned_tp
 *   → PnL giả định = PnL tại planned_tp (lấy planned_entry làm giá tham chiếu pip value).
 *   Đây là chi phí cơ hội của việc KHÔNG giữ kỷ luật. Cần user xác nhận — đừng coi là chốt.
 */

import { isSupportedSymbol, pipValuePerLot } from '@/lib/risk-engine';

export const MIN_TRADES_FOR_COST = 30;
export const MIN_DEVIATED_FOR_COST = 3;

/** Disclaimer CỐ ĐỊNH — bắt buộc hiển thị ngay dưới con số ở MỌI nơi, không rút gọn. */
export const COST_DISCLAIMER =
  'Đây là ước tính giả định dựa trên chênh lệch giữa kế hoạch và thực tế — không phải bảo đảm lợi nhuận. Kế hoạch ban đầu vẫn có thể sai.';

export type CostInput = {
  executions: {
    id: string;
    symbol: string;
    direction: 'buy' | 'sell';
    lot_size: number;
    pnl_amount: number | null;
  }[];
  /** followed_plan theo trade_execution_id (delta) */
  followedByExec: Record<string, boolean>;
  /** planned_entry/planned_sl/planned_tp theo trade_execution_id (qua trade_plan_id) */
  plansByExec: Record<
    string,
    { planned_entry: number; planned_sl: number; planned_tp: number | null }
  >;
};

export type CostResult = {
  totalTrades: number;
  deviatedCount: number;
  actualPnl: number;
  hypotheticalPnl: number;
  cost: number;
  /** Lệnh lệch plan thiếu dữ liệu plan (bỏ qua, không suy diễn) */
  skippedIncomplete: number;
  /** Có đủ ngưỡng để hiển thị không */
  showable: boolean;
  /** Lý do ẩn (khi showable=false) */
  hiddenReason: string | null;
};

/** PnL giả định (USD) của 1 lệnh nếu đạt planned_tp — dựa trên planned_entry/sl/tp + lot thật. */
export function hypotheticalPnlAtTp(
  symbol: string,
  direction: 'buy' | 'sell',
  lotSize: number,
  plannedEntry: number,
  plannedTp: number,
): number {
  if (!(plannedEntry > 0) || !(plannedTp > 0) || !(lotSize > 0)) return 0;
  // ⚠️ Symbol ngoài 3 cặp hỗ trợ (vd GBPUSD từ import MT4) → không có pip config →
  // không tính giả định (tránh crash + không suy đoán), lệnh vẫn được đếm là lệch plan.
  if (!isSupportedSymbol(symbol)) return 0;
  const pv = pipValuePerLot(symbol, plannedEntry);
  // Dấu theo hướng: buy lời khi TP > Entry, sell lời khi TP < Entry.
  const sign = direction === 'buy' ? 1 : -1;
  const pips = (plannedTp - plannedEntry) / pipStep(symbol);
  return sign * pips * pv * lotSize;
}

/** Bước giá 1 pip theo symbol (dùng chung với risk-engine). */
function pipStep(symbol: string): number {
  // USDJPY 3 chữ số thập phân; còn lại 5 (XAUUSD 2). Đúng cấu hình trong risk-engine.
  if (symbol === 'USDJPY') return 0.01;
  if (symbol === 'XAUUSD') return 0.1;
  return 0.0001;
}

/**
 * Tính cost_of_indiscipline theo công thức spec.
 * Bỏ qua lệnh lệch plan thiếu planned_entry/sl/tp (không gán giá trị suy đoán).
 */
export function computeCostOfIndiscipline(input: CostInput): CostResult {
  let actualPnl = 0;
  let hypotheticalPnl = 0;
  let deviatedCount = 0;
  let skippedIncomplete = 0;

  for (const e of input.executions) {
    const followed = input.followedByExec[e.id];
    const pnl = e.pnl_amount ?? 0;
    actualPnl += pnl;

    if (followed === false) {
      deviatedCount += 1;
      const plan = input.plansByExec[e.id];
      // Lệnh lệch plan nhưng thiếu dữ liệu plan → loại khỏi hypothetical (không suy diễn)
      if (!plan || plan.planned_tp == null || !(plan.planned_entry > 0) || !(plan.planned_sl > 0)) {
        skippedIncomplete += 1;
        continue;
      }
      hypotheticalPnl += hypotheticalPnlAtTp(
        e.symbol,
        e.direction,
        e.lot_size,
        plan.planned_entry,
        plan.planned_tp,
      );
    } else {
      // followed_plan = true (hoặc null — không phải lệch plan): giữ nguyên PnL thật
      hypotheticalPnl += pnl;
    }
  }

  const cost = hypotheticalPnl - actualPnl;
  const showable =
    input.executions.length >= MIN_TRADES_FOR_COST && deviatedCount >= MIN_DEVIATED_FOR_COST;
  const hiddenReason = !showable
    ? input.executions.length < MIN_TRADES_FOR_COST
      ? `Cần thêm dữ liệu để tính chỉ số này (hiện có ${input.executions.length}/30 lệnh).`
      : `Cần thêm dữ liệu để tính chỉ số này (hiện có ${deviatedCount}/3 lệnh lệch plan).`
    : null;

  return {
    totalTrades: input.executions.length,
    deviatedCount,
    actualPnl,
    hypotheticalPnl,
    cost,
    skippedIncomplete,
    showable,
    hiddenReason,
  };
}
