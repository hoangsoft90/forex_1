/**
 * Discipline Streak — Retention Layer Module 7 (P1).
 *
 * ĐỊNH NGHĨA (theo đúng retention_layer_addendum.md):
 *   Đếm số lệnh liên tiếp GẦN NHẤT có `followed_plan = true` VÀ không có
 *   `rule_violations` nào gắn với lệnh đó.
 *   Reset về 0 ngay khi có 1 lệnh vi phạm hoặc lệch plan.
 *
 * ⚠️ KHÔNG phải streak mở app hàng ngày (kiểu Duolingo) — streak tuân thủ
 *    kỷ luật THEO LỆNH, đúng tinh thần Discipline Score.
 *
 * AC: tính theo thứ tự `entry_time` (không theo thứ tự nhập liệu).
 */

export type StreakInput = {
  /** Lệnh đã đóng (chỉ xét lệnh đã đóng), sắp xếp lại theo entry_time trong hàm */
  executions: {
    id: string;
    entry_time: string;
  }[];
  /** followed_plan theo trade_execution_id (delta) */
  followedByExec: Record<string, boolean>;
  /** trade_execution_id của các lệnh có rule_violations gắn */
  violatedExecIds: Set<string>;
};

export type StreakResult = {
  streak: number;
  /** Có lệnh nào được xét không */
  hasTrades: boolean;
};

/**
 * Tính streak: duyệt lệnh theo entry_time TĂNG DẦN (cũ → mới),
 * đếm từ cuối (lệnh gần nhất) lùi dần tới khi gặp lệnh vi phạm/lệch plan.
 */
export function computeDisciplineStreak(input: StreakInput): StreakResult {
  const sorted = [...input.executions].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime(),
  );
  if (sorted.length === 0) return { streak: 0, hasTrades: false };

  let streak = 0;
  // Duyệt từ lệnh gần nhất lùi dần
  for (let i = sorted.length - 1; i >= 0; i--) {
    const exec = sorted[i];
    const followed = input.followedByExec[exec.id];
    const violated = input.violatedExecIds.has(exec.id);
    if (followed === true && !violated) {
      streak += 1;
    } else {
      break; // reset — gặp lệnh vi phạm hoặc lệch plan (followed không true) thì dừng
    }
  }
  return { streak, hasTrades: true };
}
