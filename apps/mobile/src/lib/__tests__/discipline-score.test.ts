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

  it('P1-4: tz +7 — local thứ 2 00:00 (UTC Chủ nhật 17:00) KHÔNG bị lệch 1 ngày', () => {
    // 2026-08-17T17:00Z = 2026-08-18 00:00 giờ VN (thứ 3) → tuần vẫn bắt đầu thứ 2 17/08
    const { start, end } = weekBounds(new Date('2026-08-17T17:00:00Z'), 'Asia/Ho_Chi_Minh');
    expect(start).toBe('2026-08-17');
    expect(end).toBe('2026-08-23');
  });

  it('P1-4: tz −7 — Chủ nhật 23:59 local (UTC thứ 2 06:59) thuộc tuần TRƯỚC', () => {
    // 2026-08-17 là thứ 2. 2026-08-17T06:59Z = 2026-08-16 23:59 giờ LA (Chủ nhật) → tuần 10/08
    const { start } = weekBounds(new Date('2026-08-17T06:59:00Z'), 'America/Los_Angeles');
    expect(start).toBe('2026-08-10');
    // 1 phút sau: 2026-08-17 00:00 giờ LA (thứ 2) → tuần 17/08
    const { start: nextStart } = weekBounds(new Date('2026-08-17T07:00:00Z'), 'America/Los_Angeles');
    expect(nextStart).toBe('2026-08-17');
  });

  it('P1-4: timezone không hợp lệ → fallback device-local, không throw', () => {
    expect(() => weekBounds(new Date('2026-08-19T12:00:00'), 'Not/AZone')).not.toThrow();
    const r = weekBounds(new Date('2026-08-19T12:00:00'), 'Not/AZone');
    expect(r.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
