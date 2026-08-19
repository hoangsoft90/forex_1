/**
 * Discipline Score + Edge Score — Module 8.
 *
 * Công thức Discipline Score Phase 1 (mvp_scope mục 8, GIỮ NGUYÊN — không tự sáng tạo):
 *   rule_adherence_rate = (số lệnh followed_plan=true) / (tổng số lệnh có plan) × 100
 *   violation_penalty    = min(violations_count × 5, 40)   -- trừ tối đa 40 điểm
 *   score                = clamp(rule_adherence_rate - violation_penalty, 0, 100)
 *
 * Edge Score (tách biệt, không liên quan Discipline): winrate, avg R:R, total PnL.
 */

export const VIOLATION_PENALTY_PER = 5;
export const MAX_VIOLATION_PENALTY = 40;

export type DisciplineScoreInput = {
  /** Số lệnh có plan mà followed_plan = true */
  followedPlanCount: number;
  /** Tổng số lệnh có plan */
  totalPlannedCount: number;
  /** Số violation trong kỳ */
  violationsCount: number;
};

export type DisciplineScoreResult = {
  ruleAdherenceRate: number; // 0-100
  violationPenalty: number;
  score: number; // 0-100
};

/** Tính điểm kỷ luật theo công thức Phase 1 (mvp_scope mục 8). */
export function computeDisciplineScore(input: DisciplineScoreInput): DisciplineScoreResult {
  const ruleAdherenceRate =
    input.totalPlannedCount > 0
      ? (input.followedPlanCount / input.totalPlannedCount) * 100
      : 0;
  const violationPenalty = Math.min(
    input.violationsCount * VIOLATION_PENALTY_PER,
    MAX_VIOLATION_PENALTY,
  );
  const score = clamp(ruleAdherenceRate - violationPenalty, 0, 100);
  return {
    ruleAdherenceRate: round(ruleAdherenceRate, 2),
    violationPenalty: round(violationPenalty, 2),
    score: round(score, 2),
  };
}

export type EdgeScoreInput = {
  pnls: number[];
  /** R:R của từng lệnh (null nếu không có TP) */
  riskRewards: (number | null)[];
};

export type EdgeScoreResult = {
  winrate: number; // %
  avgRiskReward: number | null;
  totalPnl: number;
};

/** Tính Edge Score từ danh sách lệnh đã đóng (không liên quan Discipline). */
export function computeEdgeScore(input: EdgeScoreInput): EdgeScoreResult {
  const total = input.pnls.length;
  const wins = input.pnls.filter((p) => p > 0).length;
  const winrate = total > 0 ? (wins / total) * 100 : 0;
  const rrs = input.riskRewards.filter((r): r is number => r != null);
  const avgRiskReward = rrs.length > 0 ? rrs.reduce((s, v) => s + v, 0) / rrs.length : null;
  const totalPnl = input.pnls.reduce((s, v) => s + v, 0);
  return {
    winrate: round(winrate, 2),
    avgRiskReward: avgRiskReward != null ? round(avgRiskReward, 2) : null,
    totalPnl: round(totalPnl, 2),
  };
}

/** weekBounds với timezone device-local (fallback khi không có timezone IANA). */
function deviceLocalBounds(day: Date): { start: string; end: string } {
  const d = new Date(day);
  const dow = (d.getDay() + 6) % 7; // 0 = Thứ 2
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Lấy period_start/period_end (date string) của tuần chứa một ngày (thứ 2 → Chủ nhật).
 *
 * P1-4: truyền `timezone` (IANA, VD 'Asia/Ho_Chi_Minh' từ user_profiles.timezone) để
 * ngày thứ 2/Chủ nhật tính theo CALENDAR DATE trong timezone đó — trước đây dùng
 * `toISOString()` đổi sang UTC nên user tz+ (VN) bị lệch 1 ngày (period_start = Chủ
 * nhật thay vì thứ 2 → snapshot key + cửa sổ query sai).
 */
export function weekBounds(day: Date, timezone?: string): { start: string; end: string } {
  const tz = timezone && timezone.trim() ? timezone : undefined;
  if (!tz) return deviceLocalBounds(day);
  try {
    const ymd = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d);
      const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
      return { y: get('year'), m: get('month'), d: get('day') };
    };
    const fmt = (v: { y: number; m: number; d: number }) =>
      `${v.y}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`;
    const today = ymd(day);
    // Weekday của 1 ngày dương lịch là cố định (không phụ thuộc timezone).
    const dow = (new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay() + 6) % 7; // 0 = Thứ 2
    const startNaive = new Date(Date.UTC(today.y, today.m - 1, today.d - dow));
    const endNaive = new Date(Date.UTC(today.y, today.m - 1, today.d - dow + 6));
    return {
      start: fmt({ y: startNaive.getUTCFullYear(), m: startNaive.getUTCMonth() + 1, d: startNaive.getUTCDate() }),
      end: fmt({ y: endNaive.getUTCFullYear(), m: endNaive.getUTCMonth() + 1, d: endNaive.getUTCDate() }),
    };
  } catch {
    // timezone không hợp lệ (không phải IANA) → fallback device-local
    return deviceLocalBounds(day);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
