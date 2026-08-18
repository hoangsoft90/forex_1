/**
 * Decision Interruption — Module 4.
 *
 * Trigger rule-based (Phase 1, không ML) theo mvp_scope mục 4:
 *   - over_risk:        Risk% plan mới > max_risk_per_trade
 *   - max_daily_loss:   tổng lỗ hôm nay ≥ max_daily_loss
 *   - revenge_pattern:  lệnh trước lỗ + mở lệnh mới <10 phút + ngược chiều
 *
 * Evidence 2 tầng (mục 5 plan v2):
 *   - < 15 lệnh đã đóng → cohort_benchmark (câu benchmark tĩnh hardcode)
 *   - ≥ 15 lệnh đã đóng → personal (query dữ liệu thật của user)
 */

import i18n from '@/i18n';

export type TriggerType = 'over_risk' | 'max_daily_loss' | 'revenge_pattern';

export type Interruption = {
  triggerType: TriggerType;
  evidenceMode: 'personal' | 'cohort_benchmark';
  evidenceText: string;
};

/** Ngưỡng chuyển từ cohort sang personal evidence (mục 5 plan v2). */
export const PERSONAL_EVIDENCE_MIN_EXECUTIONS = 15;

/** Khoảng thời gian (phút) coi là "mở lệnh ngay sau lệnh thua" (revenge window). */
export const REVENGE_WINDOW_MINUTES = 10;

/** Câu benchmark tĩnh cho cold-start (< 15 lệnh) — theo ngôn ngữ đang dùng. */
export const COHORT_BENCHMARKS: Record<TriggerType, () => string> = {
  over_risk: () => i18n.t('interruption.benchmark.overRisk'),
  max_daily_loss: () => i18n.t('interruption.benchmark.maxDailyLoss'),
  revenge_pattern: () => i18n.t('interruption.benchmark.revengePattern'),
};

export type ClosedExecution = {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  lot_size: number;
  pnl_amount: number | null;
  entry_time: string;
  exit_time: string | null;
  trade_plan_id: string | null;
};

export type InterruptionCheckParams = {
  /** Risk % của plan mới */
  planRiskPercent: number;
  /** max_risk_per_trade đã đặt */
  maxRiskPercent: number | null;
  /** Tổng lỗ hôm nay (USD) — đã tính trước */
  todayLossAmount: number;
  /** max_daily_loss của user (USD, đã quy đổi từ % balance) */
  maxDailyLossAmount: number | null;
  /** Danh sách lệnh đã đóng (có exit_time), sắp theo entry_time desc */
  closedExecutions: ClosedExecution[];
  /** Direction của plan mới */
  newPlanDirection: 'buy' | 'sell';
  /** Thời điểm hiện tại (ISO) — mặc định now */
  nowIso?: string;
};

/**
 * Evidence personal cho revenge_pattern: tìm các lần trước đây user mở lệnh
 * ngược chiều trong REVENGE_WINDOW sau lệnh thua, tính PnL trung bình của
 * lệnh tiếp theo đó (số tiền thua thêm thực tế).
 */
export function buildPersonalRevengeEvidence(closed: ClosedExecution[], nowIso: string): string {
  // Sắp theo entry_time tăng dần để duyệt chuỗi
  const sorted = [...closed].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime(),
  );

  const revengePnl: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (prev.pnl_amount == null || prev.pnl_amount >= 0) continue; // lệnh trước phải LỖ
    if (!prev.exit_time) continue;
    const gapMin =
      (new Date(next.entry_time).getTime() - new Date(prev.exit_time).getTime()) / 60000;
    if (gapMin > REVENGE_WINDOW_MINUTES) continue; // phải < 10 phút
    if (next.direction === prev.direction) continue; // phải ngược chiều
    if (next.pnl_amount != null) revengePnl.push(next.pnl_amount);
  }

  if (revengePnl.length === 0) {
    // Fallback: vẫn có đủ 15 lệnh nhưng chưa có tiền lệ revenge lỗ → dùng cohort
    return COHORT_BENCHMARKS.revenge_pattern();
  }
  const avgLoss = revengePnl.reduce((s, v) => s + v, 0) / revengePnl.length;
  const lastLoss =
    sorted.filter((e) => e.pnl_amount != null && e.pnl_amount < 0).pop()?.pnl_amount ?? 0;
  return i18n.t('interruption.personalRevenge', {
    lastLoss: Math.abs(lastLoss).toFixed(0),
    avgLoss: Math.abs(avgLoss).toFixed(0),
  });
}

/**
 * Kiểm tra interruption trước khi user xác nhận tạo lệnh.
 * Trả về null nếu không có trigger nào.
 */
export function checkInterruption(p: InterruptionCheckParams): Interruption | null {
  const now = new Date(p.nowIso ?? new Date().toISOString()).getTime();
  const triggers: { type: TriggerType; text: string; mode: Interruption['evidenceMode'] }[] = [];

  const personalMode = p.closedExecutions.length >= PERSONAL_EVIDENCE_MIN_EXECUTIONS;

  // 1. over_risk
  if (p.maxRiskPercent != null && p.planRiskPercent > p.maxRiskPercent) {
    triggers.push({
      type: 'over_risk',
      mode: personalMode ? 'personal' : 'cohort_benchmark',
      text: personalMode
        ? i18n.t('interruption.personalOverRisk', {
            risk: p.planRiskPercent,
            limit: p.maxRiskPercent,
          })
        : COHORT_BENCHMARKS.over_risk(),
    });
  }

  // 2. max_daily_loss
  if (p.maxDailyLossAmount != null && p.todayLossAmount >= p.maxDailyLossAmount) {    triggers.push({
      type: 'max_daily_loss',
      mode: personalMode ? 'personal' : 'cohort_benchmark',
      text: personalMode
        ? i18n.t('interruption.personalMaxDailyLoss', {
            loss: p.todayLossAmount.toFixed(0),
            limit: p.maxDailyLossAmount.toFixed(0),
          })
        : COHORT_BENCHMARKS.max_daily_loss(),
    });
  }

  // 3. revenge_pattern
  const last = p.closedExecutions[0];
  if (last && last.pnl_amount != null && last.pnl_amount < 0) {
    const lastExit = last.exit_time ? new Date(last.exit_time).getTime() : null;
    if (lastExit != null && now - lastExit < REVENGE_WINDOW_MINUTES * 60_000) {
      const opposite = last.direction === 'buy' ? 'sell' : 'buy';
      if (p.newPlanDirection === opposite) {
        triggers.push({
          type: 'revenge_pattern',
          mode: personalMode ? 'personal' : 'cohort_benchmark',
          text: personalMode
            ? buildPersonalRevengeEvidence(p.closedExecutions, p.nowIso ?? new Date().toISOString())
            : COHORT_BENCHMARKS.revenge_pattern(),
        });
      }
    }
  }

  if (triggers.length === 0) return null;
  // Ưu tiên hiển thị trigger nghiêm trọng nhất: revenge > max_daily_loss > over_risk
  const priority: Record<TriggerType, number> = { revenge_pattern: 3, max_daily_loss: 2, over_risk: 1 };
  const top = triggers.sort((a, b) => priority[b.type] - priority[a.type])[0];
  return { triggerType: top.type, evidenceMode: top.mode, evidenceText: top.text };
}
