import {
  buildPersonalRevengeEvidence,
  checkInterruption,
  ClosedExecution,
  COHORT_BENCHMARKS,
  REVENGE_WINDOW_MINUTES,
} from '../interruption';

function exec(
  id: string,
  direction: 'buy' | 'sell',
  pnl: number | null,
  entryIso: string,
  exitIso: string | null,
  symbol = 'EURUSD',
): ClosedExecution {
  return {
    id,
    symbol,
    direction,
    lot_size: 0.2,
    pnl_amount: pnl,
    entry_time: entryIso,
    exit_time: exitIso,
    trade_plan_id: id === 'plan' ? 'p1' : null,
  };
}

const T0 = '2026-08-17T08:00:00Z'; // mốc thời gian gốc

describe('interruption — trigger rule-based', () => {
  it('over_risk: risk 2% > max 1% → trigger over_risk', () => {
    const r = checkInterruption({
      planRiskPercent: 2,
      maxRiskPercent: 1,
      todayLossAmount: 0,
      maxDailyLossAmount: null,
      closedExecutions: [],
      newPlanDirection: 'buy',
    });
    expect(r?.triggerType).toBe('over_risk');
  });

  it('over_risk: risk 1% = max 1% → không trigger', () => {
    const r = checkInterruption({
      planRiskPercent: 1,
      maxRiskPercent: 1,
      todayLossAmount: 0,
      maxDailyLossAmount: null,
      closedExecutions: [],
      newPlanDirection: 'buy',
    });
    expect(r).toBeNull();
  });

  it('max_daily_loss: lỗ hôm nay ≥ giới hạn → trigger', () => {
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 320,
      maxDailyLossAmount: 300, // 3% của $10k
      closedExecutions: [],
      newPlanDirection: 'buy',
    });
    expect(r?.triggerType).toBe('max_daily_loss');
  });

  it('max_daily_loss: lỗ hôm nay < giới hạn → không trigger', () => {
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 100,
      maxDailyLossAmount: 300,
      closedExecutions: [],
      newPlanDirection: 'buy',
    });
    expect(r).toBeNull();
  });

  it('revenge_pattern: lệnh trước lỗ + <10 phút + ngược chiều → trigger', () => {
    const last = exec('e1', 'buy', -180, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 180,
      maxDailyLossAmount: null,
      closedExecutions: [last],
      newPlanDirection: 'sell', // ngược chiều với buy
      nowIso: '2026-08-17T07:55:00Z', // 4.5 phút sau exit
    });
    expect(r?.triggerType).toBe('revenge_pattern');
  });

  it('revenge_pattern: cùng chiều → không trigger', () => {
    const last = exec('e1', 'buy', -180, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 180,
      maxDailyLossAmount: null,
      closedExecutions: [last],
      newPlanDirection: 'buy', // cùng chiều
      nowIso: '2026-08-17T07:55:00Z',
    });
    expect(r).toBeNull();
  });

  it(`revenge_pattern: > ${REVENGE_WINDOW_MINUTES} phút → không trigger`, () => {
    const last = exec('e1', 'buy', -180, '2026-08-17T07:40:00Z', '2026-08-17T07:41:00Z');
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 180,
      maxDailyLossAmount: null,
      closedExecutions: [last],
      newPlanDirection: 'sell',
      nowIso: '2026-08-17T08:00:00Z', // 19 phút sau exit
    });
    expect(r).toBeNull();
  });

  it('lệnh trước THẮNG → không trigger revenge_pattern', () => {
    const last = exec('e1', 'buy', 250, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 0,
      maxDailyLossAmount: null,
      closedExecutions: [last],
      newPlanDirection: 'sell',
      nowIso: '2026-08-17T07:55:00Z',
    });
    expect(r).toBeNull();
  });
});

describe('interruption — evidence 2 tầng (test case mvp_scope mục 4)', () => {
  function makeHistory(n: number, opts?: { revengePnl?: number[] }): ClosedExecution[] {
    // tạo n lệnh lịch sử đã đóng, cách nhau 1 ngày
    const list: ClosedExecution[] = [];
    const base = new Date(T0).getTime() - n * 24 * 3600 * 1000;
    for (let i = 0; i < n; i++) {
      const t = new Date(base + i * 24 * 3600 * 1000).toISOString();
      list.push(exec(`h${i}`, i % 2 === 0 ? 'buy' : 'sell', i === 0 ? -420 : i % 3 === 0 ? -50 : 80, t, t));
    }
    return list;
  }

  it('test case 1: user có 20 lệnh, revenge trước đây lỗ thêm $420 → evidence personal hiển thị $420 thật', () => {
    // 20 lệnh đã đóng → personal mode
    const history = makeHistory(20);
    // Chèn lần revenge lỗ $420: lệnh trước lỗ, lệnh sau ngược chiều trong <10 phút
    const loss = exec('r1', 'buy', -100, '2026-08-10T05:00:00Z', '2026-08-10T05:05:00Z');
    const revenge = exec('r2', 'sell', -420, '2026-08-10T05:08:00Z', '2026-08-10T05:30:00Z');
    const all = [revenge, loss, ...history];

    const text = buildPersonalRevengeEvidence(all, T0);
    expect(text).toContain('420');
    expect(text).not.toContain('73%'); // không phải benchmark cứng
  });

  it('test case 2: user mới có 5 lệnh → dùng cohort_benchmark, không tính personal', () => {
    const history = makeHistory(5);
    const last = exec('last', 'buy', -50, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 0.5,
      maxRiskPercent: 1,
      todayLossAmount: 50,
      maxDailyLossAmount: null,
      closedExecutions: [last, ...history],
      newPlanDirection: 'sell',
      nowIso: '2026-08-17T07:55:00Z',
    });
    expect(r?.triggerType).toBe('revenge_pattern');
    expect(r?.evidenceMode).toBe('cohort_benchmark');
    expect(r?.evidenceText).toBe(COHORT_BENCHMARKS.revenge_pattern);
  });

  it('đúng 15 lệnh → personal mode (≥ 15)', () => {
    const history = makeHistory(15);
    expect(history.length).toBe(15);
    // Lệnh gần nhất THẮNG để không kích hoạt revenge_pattern (chỉ còn over_risk)
    const last = exec('last', 'buy', 250, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 2,
      maxRiskPercent: 1,
      todayLossAmount: 0,
      maxDailyLossAmount: null,
      closedExecutions: [last, ...history],
      newPlanDirection: 'sell',
      nowIso: '2026-08-17T07:55:00Z',
    });
    expect(r?.triggerType).toBe('over_risk');
    expect(r?.evidenceMode).toBe('personal');
  });
});

describe('interruption — ưu tiên trigger', () => {
  it('revenge_pattern được ưu tiên hiển thị hơn over_risk khi cả 2 kích hoạt', () => {
    const last = exec('e1', 'buy', -180, '2026-08-17T07:50:00Z', '2026-08-17T07:50:30Z');
    const r = checkInterruption({
      planRiskPercent: 2,
      maxRiskPercent: 1,
      todayLossAmount: 180,
      maxDailyLossAmount: null,
      closedExecutions: [last],
      newPlanDirection: 'sell',
      nowIso: '2026-08-17T07:55:00Z',
    });
    expect(r?.triggerType).toBe('revenge_pattern');
  });
});
