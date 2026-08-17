/**
 * Setup / Strategy Analytics — Retention Layer Module 5 (P1).
 *
 * Nhóm `trade_executions` (qua `trade_plans.setup_tag`) theo:
 *   breakout / rejection / trend_continuation → nhãn tiếng Việt
 *   null hoặc 'other' → gom vào "Chưa phân loại" (KHÔNG loại khỏi thống kê)
 *
 * Ngưỡng thống nhất (BẤT BIẾN): chỉ hiện khi tổng lệnh ĐÃ ĐÓNG ≥ 30.
 * Dưới ngưỡng → "Cần thêm N lệnh nữa (hiện có X/30)" — không ẩn hoàn toàn.
 */

import { calculateRiskReward } from '@/lib/risk-engine';

export const MIN_TRADES_FOR_SETUP_STATS = 30;

export type SetupGroupKey = 'breakout' | 'rejection' | 'trend_continuation' | 'uncategorized';

export const SETUP_GROUP_LABELS: Record<SetupGroupKey, string> = {
  breakout: 'Breakout',
  rejection: 'Rejection',
  trend_continuation: 'Trend Continuation',
  uncategorized: 'Chưa phân loại',
};

export type SetupGroupResult = {
  key: SetupGroupKey;
  label: string;
  count: number;
  wins: number;
  winrate: number; // %
  avgRiskReward: number | null;
  totalPnl: number;
};

export type SetupAnalyticsInput = {
  /** Lệnh đã đóng, mỗi lệnh kèm setup_tag của plan liên kết */
  executions: {
    id: string;
    pnl_amount: number | null;
    actual_entry: number | null;
    actual_sl: number | null;
    actual_tp: number | null;
    setup_tag: string | null;
  }[];
};

export type SetupAnalyticsResult = {
  totalClosed: number;
  showable: boolean;
  progressText: string | null;
  groups: SetupGroupResult[];
};

/** Map setup_tag thô → nhóm (null/'other' → uncategorized). */
export function toSetupGroup(tag: string | null): SetupGroupKey {
  if (tag === 'breakout' || tag === 'rejection' || tag === 'trend_continuation') {
    return tag;
  }
  return 'uncategorized';
}

/**
 * Tính thống kê theo setup.
 * - < 30 lệnh → showable=false, progressText "Cần thêm N lệnh nữa (X/30)".
 * - ≥ 30 lệnh → nhóm đủ, kể cả nhóm 0 lệnh vẫn hiện (để user thấy bức tranh đầy đủ).
 */
export function computeSetupAnalytics(input: SetupAnalyticsInput): SetupAnalyticsResult {
  const totalClosed = input.executions.length;

  if (totalClosed < MIN_TRADES_FOR_SETUP_STATS) {
    return {
      totalClosed,
      showable: false,
      progressText: `Cần thêm ${MIN_TRADES_FOR_SETUP_STATS - totalClosed} lệnh nữa (hiện có ${totalClosed}/30) để phân tích đáng tin cậy.`,
      groups: [],
    };
  }

  // Gom theo nhóm
  const byGroup = new Map<SetupGroupKey, SetupGroupResult>();
  const init = (key: SetupGroupKey): SetupGroupResult => ({
    key,
    label: SETUP_GROUP_LABELS[key],
    count: 0,
    wins: 0,
    winrate: 0,
    avgRiskReward: null,
    totalPnl: 0,
  });
  for (const k of Object.keys(SETUP_GROUP_LABELS) as SetupGroupKey[]) {
    byGroup.set(k, init(k));
  }

  const rrByGroup = new Map<SetupGroupKey, number[]>();
  for (const e of input.executions) {
    const key = toSetupGroup(e.setup_tag);
    const g = byGroup.get(key)!;
    g.count += 1;
    const pnl = e.pnl_amount ?? 0;
    g.totalPnl += pnl;
    if (pnl > 0) g.wins += 1;

    // Avg R:R: dùng actual entry/sl/tp của lệnh (đúng R:R thực hiện, null nếu thiếu TP)
    if (e.actual_entry != null && e.actual_sl != null && e.actual_tp != null && e.actual_entry !== e.actual_sl) {
      const rr = calculateRiskReward(e.actual_entry, e.actual_sl, e.actual_tp);
      if (rr != null) {
        const list = rrByGroup.get(key) ?? [];
        list.push(rr);
        rrByGroup.set(key, list);
      }
    }
  }

  const groups: SetupGroupResult[] = [...byGroup.values()].map((g) => {
    const rrs = rrByGroup.get(g.key) ?? [];
    const avgRiskReward = rrs.length > 0 ? rrs.reduce((s, v) => s + v, 0) / rrs.length : null;
    const winrate = g.count > 0 ? (g.wins / g.count) * 100 : 0;
    return { ...g, winrate, avgRiskReward };
  });

  return { totalClosed, showable: true, progressText: null, groups };
}

/** Gợi ý dạng câu (Pro): setup nào đang có edge tốt nhất. */
export function bestSetupInsight(groups: SetupGroupResult[]): string | null {
  const candidates = groups
    .filter((g) => g.count >= 5) // cần đủ mẫu tối thiểu để so sánh (không so từ 1-2 lệnh)
    .filter((g) => g.totalPnl !== 0 || g.winrate > 0);
  if (candidates.length === 0) return null;
  const best = [...candidates].sort((a, b) => b.totalPnl - a.totalPnl)[0];
  const worst = [...candidates].sort((a, b) => a.totalPnl - b.totalPnl)[0];
  if (best.key === worst.key) {
    return `Setup "${best.label}" là nhóm giao dịch nhiều nhất với ${best.totalPnl >= 0 ? '+' : ''}$${best.totalPnl.toFixed(0)} PnL.`;
  }
  return `Setup "${best.label}" đang có edge tốt nhất (+$${best.totalPnl.toFixed(0)} PnL, winrate ${best.winrate.toFixed(0)}%) — trong khi "${worst.label}" thấp nhất (${worst.totalPnl >= 0 ? '+' : ''}$${worst.totalPnl.toFixed(0)}).`;
}
