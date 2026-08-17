import {
  computeDisciplineScore,
  computeEdgeScore,
  weekBounds,
} from '../discipline-score';

describe('Discipline Score — công thức Phase 1 (mvp_scope mục 8)', () => {
  it('test case: 10 lệnh có plan, 8 theo plan, 2 violations → score 70', () => {
    const r = computeDisciplineScore({
      followedPlanCount: 8,
      totalPlannedCount: 10,
      violationsCount: 2,
    });
    expect(r.ruleAdherenceRate).toBe(80);
    expect(r.violationPenalty).toBe(10); // min(2×5, 40)
    expect(r.score).toBe(70);
  });

  it('violation_penalty bị chặn tối đa 40 (15 violations)', () => {
    const r = computeDisciplineScore({
      followedPlanCount: 8,
      totalPlannedCount: 10,
      violationsCount: 15,
    });
    expect(r.violationPenalty).toBe(40); // min(75, 40)
    expect(r.score).toBe(40); // 80 - 40
  });

  it('score clamp về 0 khi adherence thấp + nhiều violations', () => {
    const r = computeDisciplineScore({
      followedPlanCount: 2,
      totalPlannedCount: 10, // adherence 20
      violationsCount: 10, // penalty 40
    });
    expect(r.score).toBe(0); // 20 - 40 = -20 → clamp 0
  });

  it('score clamp về 100 khi adherence 100 + không violations', () => {
    const r = computeDisciplineScore({
      followedPlanCount: 10,
      totalPlannedCount: 10,
      violationsCount: 0,
    });
    expect(r.score).toBe(100);
  });

  it('không có lệnh có plan → adherence 0', () => {
    const r = computeDisciplineScore({ followedPlanCount: 0, totalPlannedCount: 0, violationsCount: 0 });
    expect(r.ruleAdherenceRate).toBe(0);
    expect(r.score).toBe(0);
  });
});

describe('Edge Score — tách biệt với Discipline', () => {
  it('winrate, avg R:R, total PnL tính từ executions', () => {
    const r = computeEdgeScore({
      pnls: [100, -50, 200, -25, 75], // 3 thắng / 5 lệnh = 60%
      riskRewards: [2, 1.5, null, 3, 2.5],
    });
    expect(r.winrate).toBe(60);
    expect(r.totalPnl).toBe(300); // 100-50+200-25+75
    expect(r.avgRiskReward).toBeCloseTo(2.25, 4); // (2+1.5+3+2.5)/4
  });

  it('không có lệnh → winrate 0, avg RR null', () => {
    const r = computeEdgeScore({ pnls: [], riskRewards: [] });
    expect(r.winrate).toBe(0);
    expect(r.avgRiskReward).toBeNull();
    expect(r.totalPnl).toBe(0);
  });
});

describe('weekBounds — snapshot 1 lần/tuần', () => {
  it('thứ 4 → tuần chứa nó (thứ 2 → Chủ nhật)', () => {
    // 2026-08-19 là thứ 4
    const { start, end } = weekBounds(new Date('2026-08-19T12:00:00'));
    expect(start).toBe('2026-08-17'); // thứ 2
    expect(end).toBe('2026-08-23'); // chủ nhật
  });

  it('thứ 2 → bắt đầu chính nó', () => {
    const { start } = weekBounds(new Date('2026-08-17T10:00:00'));
    expect(start).toBe('2026-08-17');
  });

  it('chủ nhật → kết thúc chính nó', () => {
    const { end } = weekBounds(new Date('2026-08-23T10:00:00'));
    expect(end).toBe('2026-08-23');
  });
});
