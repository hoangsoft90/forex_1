import {
  bestSetupInsight,
  computeSetupAnalytics,
  MIN_TRADES_FOR_SETUP_STATS,
  toSetupGroup,
} from '@/lib/setup-analytics';

function exec(id: string, pnl: number, setup_tag: string | null, entry = 1.1, sl = 1.09, tp: number | null = 1.12) {
  return { id, pnl_amount: pnl, actual_entry: entry, actual_sl: sl, actual_tp: tp, setup_tag };
}

describe('Setup / Strategy Analytics (Module 5)', () => {
  it('ngưỡng cố định 30 lệnh', () => {
    expect(MIN_TRADES_FOR_SETUP_STATS).toBe(30);
  });

  it('AC: dưới 30 lệnh → hiện thông báo tiến độ, KHÔNG hiện bảng', () => {
    const r = computeSetupAnalytics({
      executions: Array.from({ length: 12 }, (_, i) => exec(`e${i}`, 10, 'breakout')),
    });
    expect(r.showable).toBe(false);
    expect(r.progressText).toContain('Cần thêm 18 lệnh nữa');
    expect(r.progressText).toContain('12/30');
    expect(r.groups).toEqual([]);
  });

  it('AC: từ 30 lệnh trở lên → bảng tính đúng với ≥3 setup_tag khác nhau', () => {
    const executions = [
      // Breakout: 10 lệnh, 6 thắng, PnL +120
      ...Array.from({ length: 10 }, (_, i) => exec(`b${i}`, i < 6 ? 20 : -10, 'breakout')),
      // Rejection: 10 lệnh, 3 thắng, PnL -40
      ...Array.from({ length: 10 }, (_, i) => exec(`r${i}`, i < 3 ? 20 : -10, 'rejection')),
      // Trend continuation: 10 lệnh, 8 thắng, PnL +160
      ...Array.from({ length: 10 }, (_, i) => exec(`t${i}`, i < 8 ? 20 : -10, 'trend_continuation')),
    ];
    const r = computeSetupAnalytics({ executions });
    expect(r.showable).toBe(true);
    expect(r.progressText).toBeNull();
    expect(r.totalClosed).toBe(30);

    const byKey = Object.fromEntries(r.groups.map((g) => [g.key, g]));
    expect(byKey['breakout'].count).toBe(10);
    expect(byKey['breakout'].wins).toBe(6);
    expect(byKey['breakout'].winrate).toBeCloseTo(60, 4);
    expect(byKey['breakout'].totalPnl).toBeCloseTo(80, 4); // 6×20 − 4×10

    expect(byKey['rejection'].winrate).toBeCloseTo(30, 4);
    expect(byKey['rejection'].totalPnl).toBeCloseTo(-10, 4); // 3×20 − 7×10

    expect(byKey['trend_continuation'].winrate).toBeCloseTo(80, 4);
    expect(byKey['trend_continuation'].totalPnl).toBeCloseTo(140, 4); // 8×20 − 2×10
  });

  it('AC: setup_tag=null hoặc other → nhóm "Chưa phân loại", không bị loại', () => {
    const executions = [
      ...Array.from({ length: 25 }, (_, i) => exec(`x${i}`, 5, 'breakout')),
      ...Array.from({ length: 3 }, (_, i) => exec(`n${i}`, 10, null)),
      ...Array.from({ length: 2 }, (_, i) => exec(`o${i}`, -5, 'other')),
    ];
    const r = computeSetupAnalytics({ executions });
    expect(r.totalClosed).toBe(30);
    const uncat = r.groups.find((g) => g.key === 'uncategorized')!;
    expect(uncat.count).toBe(5); // 3 null + 2 other
    expect(uncat.label).toBe('Chưa phân loại');
    expect(uncat.totalPnl).toBeCloseTo(30 - 10, 4);
  });

  it('avg R:R tính từ entry/sl/tp thực tế; lệnh thiếu TP → null không kéo trung bình', () => {
    const executions = [
      ...Array.from({ length: 29 }, (_, i) => exec(`a${i}`, 10, 'breakout', 1.1, 1.09, 1.12)), // R:R = 2
      exec('noTp', 10, 'breakout', 1.1, 1.09, null), // không có TP → bỏ khỏi avg
    ];
    const r = computeSetupAnalytics({ executions });
    const g = r.groups.find((x) => x.key === 'breakout')!;
    expect(g.avgRiskReward).toBeCloseTo(2, 4); // chỉ 29 lệnh có TP được tính
  });

  it('toSetupGroup map đúng', () => {
    expect(toSetupGroup('breakout')).toBe('breakout');
    expect(toSetupGroup('other')).toBe('uncategorized');
    expect(toSetupGroup(null)).toBe('uncategorized');
  });

  describe('bestSetupInsight (Pro)', () => {
    it('so sánh đúng setup tốt nhất/thấp nhất (chỉ nhóm ≥5 lệnh)', () => {
      const s = bestSetupInsight([
        { key: 'breakout', label: 'Breakout', count: 10, wins: 6, winrate: 60, avgRiskReward: 2, totalPnl: 120 },
        { key: 'rejection', label: 'Rejection', count: 8, wins: 3, winrate: 37.5, avgRiskReward: 1.5, totalPnl: -40 },
      ]);
      expect(s).toContain('Breakout');
      expect(s).toContain('+$120');
      expect(s).toContain('Rejection');
    });

    it('trả null khi chưa nhóm nào đủ 5 lệnh', () => {
      expect(bestSetupInsight([])).toBeNull();
      expect(
        bestSetupInsight([
          { key: 'breakout', label: 'Breakout', count: 3, wins: 2, winrate: 66, avgRiskReward: 2, totalPnl: 10 },
        ]),
      ).toBeNull();
    });
  });
});
