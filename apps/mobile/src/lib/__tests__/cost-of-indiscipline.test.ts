import {
  computeCostOfIndiscipline,
  COST_DISCLAIMER,
  deviatedTradesBreakdown,
  hypotheticalPnlAtTp,
  MIN_DEVIATED_FOR_COST,
  MIN_TRADES_FOR_COST,
} from '@/lib/cost-of-indiscipline';

// helper: tạo execution
function exec(id: string, pnl: number, symbol = 'EURUSD', direction: 'buy' | 'sell' = 'buy', lot = 0.1) {
  return { id, symbol, direction, lot_size: lot, pnl_amount: pnl };
}

// helper: tạo plan giả định (TP đủ)
function plan(entry: number, sl: number, tp: number | null) {
  return { planned_entry: entry, planned_sl: sl, planned_tp: tp };
}

describe('Cost of Indiscipline (Module 4)', () => {
  it('ngưỡng cố định: 30 lệnh tổng + 3 lệnh lệch plan', () => {
    expect(MIN_TRADES_FOR_COST).toBe(30);
    expect(MIN_DEVIATED_FOR_COST).toBe(3);
  });

  it('disclaimer đúng nguyên văn spec (không rút gọn)', () => {
    expect(COST_DISCLAIMER()).toBe(
      'Đây là ước tính giả định dựa trên chênh lệch giữa kế hoạch và thực tế — không phải bảo đảm lợi nhuận. Kế hoạch ban đầu vẫn có thể sai.',
    );
  });

  describe('AC: bộ dữ liệu mẫu 35 lệnh, 5 lệch plan có đủ planned_tp → verify công thức', () => {
    it('tính đúng hypothetical/actual/cost', () => {
      // 30 lệnh theo plan: pnl thật giữ nguyên (vd tổng +$300)
      const executions = Array.from({ length: 30 }, (_, i) => exec(`p${i}`, 10));
      // 5 lệnh lệch plan: 3 có đủ planned_tp, 2 thiếu planned_tp (bỏ qua hypothetical)
      const dev1 = exec('d1', -25);
      const dev2 = exec('d2', -40);
      const dev3 = exec('d3', -15);
      const devNoTp1 = exec('d4', -30);
      const devNoTp2 = exec('d5', -20);
      executions.push(dev1, dev2, dev3, devNoTp1, devNoTp2);

      const followedByExec: Record<string, boolean> = {};
      executions.forEach((e) => {
        followedByExec[e.id] = !e.id.startsWith('d');
      });

      const plansByExec: Record<string, { planned_entry: number; planned_sl: number; planned_tp: number | null }> = {};
      // 3 lệnh lệch plan có đủ TP: giả định đạt TP
      plansByExec['d1'] = plan(1.1000, 1.0950, 1.1100); // buy +100 pips * pipvalue(0.1 lot EURUSD) 
      plansByExec['d2'] = plan(1.1000, 1.0950, 1.1150); // buy +150 pips
      plansByExec['d3'] = plan(1.1000, 1.0950, 1.1050); // buy +50 pips
      // 2 lệnh thiếu TP → không có trong map (hoặc tp null)

      const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec });

      expect(r.totalTrades).toBe(35);
      expect(r.deviatedCount).toBe(5);
      expect(r.skippedIncomplete).toBe(2);

      // actual_pnl = 30*10 + (-25-40-15-30-20) = 300 - 130 = 170
      expect(r.actualPnl).toBeCloseTo(170, 4);

      // hypothetical: 30 lệnh theo plan giữ pnl thật = 300
      // + 3 lệnh lệch plan thay bằng PnL tại TP:
      const pv = pipValueForEurUsdAt(1.1); // pip value 1 lot EURUSD @1.1 ≈ 10 USD → 0.1 lot = 1 USD/pip
      const h1 = 100 * pv * 0.1;
      const h2 = 150 * pv * 0.1;
      const h3 = 50 * pv * 0.1;
      expect(r.hypotheticalPnl).toBeCloseTo(300 + h1 + h2 + h3, 4);
      expect(r.cost).toBeCloseTo(300 + h1 + h2 + h3 - 170, 4);
      expect(r.showable).toBe(true);
      expect(r.hiddenReason).toBeNull();
    });
  });

  it('lệnh lệch plan thiếu planned_tp bị loại khỏi hypothetical, không gán giá trị suy đoán', () => {
    const executions = [
      ...Array.from({ length: 28 }, (_, i) => exec(`p${i}`, 5)),
      exec('d1', -50, 'EURUSD', 'buy', 0.1),
      exec('d2', -60, 'EURUSD', 'buy', 0.1),
      exec('d3', -70, 'EURUSD', 'buy', 0.1),
    ];
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = !e.id.startsWith('d')));
    // Không có plansByExec cho lệnh lệch plan → thiếu dữ liệu
    const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec: {} });
    expect(r.skippedIncomplete).toBe(3);
    // hypothetical chỉ còn pnl thật của lệnh theo plan (không cộng gì cho 3 lệnh lệch)
    expect(r.hypotheticalPnl).toBeCloseTo(28 * 5, 4);
  });

  it('không hiển thị nếu chưa đủ 30 lệnh tổng — kể cả khi có 3 lệnh lệch plan', () => {
    const executions = [
      ...Array.from({ length: 12 }, (_, i) => exec(`p${i}`, 5)),
      exec('d1', -10), exec('d2', -20), exec('d3', -30),
    ];
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = !e.id.startsWith('d')));
    const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec: {} });
    expect(r.showable).toBe(false);
    expect(r.hiddenReason).toContain('15/30');
  });

  it('không hiển thị nếu chưa đủ 3 lệnh lệch plan (30 lệnh nhưng 2 lệch)', () => {
    const executions = [
      ...Array.from({ length: 28 }, (_, i) => exec(`p${i}`, 5)),
      exec('d1', -10), exec('d2', -20),
    ];
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = !e.id.startsWith('d')));
    const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec: {} });
    expect(r.showable).toBe(false);
    expect(r.hiddenReason).toContain('2/3');
  });

  it('MODULE 4 FIX (Pro breakdown): liệt kê đúng lệnh lệch plan, hypothetical null khi thiếu TP', () => {
    const executions = [
      ...Array.from({ length: 28 }, (_, i) => exec(`p${i}`, 5)),
      exec('d1', -25, 'EURUSD', 'buy', 0.1),
      exec('d2', -40, 'EURUSD', 'buy', 0.1),
      exec('d3', -15, 'EURUSD', 'buy', 0.1),
    ];
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = !e.id.startsWith('d')));
    const plansByExec = {
      d1: plan(1.1, 1.095, 1.11), // đủ TP → hypothetical tính được
      d2: plan(1.1, 1.095, null), // thiếu TP → hypothetical null
      d3: plan(1.1, 1.095, 1.105), // đủ TP
    };
    const rows = deviatedTradesBreakdown({ executions, followedByExec, plansByExec });
    expect(rows).toHaveLength(3);
    const d1 = rows.find((r) => r.execId === 'd1')!;
    const d2 = rows.find((r) => r.execId === 'd2')!;
    expect(d1.actualPnl).toBe(-25);
    expect(d1.hypotheticalPnl).toBeCloseTo(100, 4); // buy 1.1→1.11 = +100 pips × $1/pip
    expect(d2.hypotheticalPnl).toBeNull(); // không suy đoán
  });

  it('followed_plan=null (không có delta) giữ nguyên PnL thật như lệnh theo plan', () => {
    const executions = [
      ...Array.from({ length: 30 }, (_, i) => exec(`x${i}`, 7)),
      exec('d1', -10), exec('d2', -10), exec('d3', -10),
    ];
    const followedByExec: Record<string, boolean> = { d1: false, d2: false, d3: false }; // x* không có key
    const plansByExec = { d1: plan(1.1, 1.09, 1.12), d2: plan(1.1, 1.09, 1.12), d3: plan(1.1, 1.09, 1.12) };
    const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec });
    // 30 lệnh x* (pnl 7) → hypothetical giữ nguyên 210; 3 lệnh d* thay bằng TP
    expect(r.hypotheticalPnl).toBeGreaterThan(210);
    expect(r.showable).toBe(true);
  });
});

/** Pip value 1 lot EURUSD tại entry (theo risk-engine) */
function pipValueForEurUsdAt(price: number): number {
  // EURUSD: contract 100000, pip 0.0001, quoteToUsdFactor = 1 (quote là USD)
  return 100000 * 0.0001 * 1;
}

describe('hypotheticalPnlAtTp', () => {
  it('buy EURUSD 0.1 lot từ 1.1000 → TP 1.1100 = +100 pips × $1/pip = +$100', () => {
    expect(hypotheticalPnlAtTp('EURUSD', 'buy', 0.1, 1.1, 1.11)).toBeCloseTo(100, 4);
  });
  it('sell EURUSD 0.1 lot từ 1.1000 → TP 1.0900 = -100 pips × $1/pip (ngược chiều) = -$100? Không: sell lời khi giá xuống → +$100', () => {
    // sell: entry 1.1 → TP 1.09 (giá xuống 100 pips) → lời
    expect(hypotheticalPnlAtTp('EURUSD', 'sell', 0.1, 1.1, 1.09)).toBeCloseTo(100, 4);
  });
  it('lot = 0 → 0 (không nhân suy đoán)', () => {
    expect(hypotheticalPnlAtTp('EURUSD', 'buy', 0, 1.1, 1.11)).toBe(0);
  });

  it('BUG-FIX: symbol ngoài 3 cặp hỗ trợ (GBPUSD import MT4) → 0, KHÔNG crash', () => {
    // trước đây crash vì pipValuePerLot(symbol as SymbolKey) với cfg undefined
    expect(hypotheticalPnlAtTp('GBPUSD', 'buy', 0.1, 1.27, 1.29)).toBe(0);
    expect(hypotheticalPnlAtTp('EURJPY', 'sell', 0.5, 161.5, 160.9)).toBe(0);
  });

  it('BUG-FIX: computeCostOfIndiscipline không crash với execution symbol lạ', () => {
    const executions = [
      ...Array.from({ length: 30 }, (_, i) => exec(`p${i}`, 5)),
      exec('d1', -25, 'GBPUSD', 'buy', 0.1),
      exec('d2', -40, 'GBPUSD', 'buy', 0.1),
      exec('d3', -15, 'GBPUSD', 'buy', 0.1),
    ];
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = !e.id.startsWith('d')));
    const plansByExec = {
      d1: plan(1.27, 1.26, 1.29),
      d2: plan(1.27, 1.26, 1.29),
      d3: plan(1.27, 1.26, 1.29),
    };
    // KHÔNG throw — lệnh lệch plan symbol lạ bị loại khỏi hypothetical (0 đóng góp)
    const r = computeCostOfIndiscipline({ executions, followedByExec, plansByExec });
    expect(r.skippedIncomplete).toBe(0); // vẫn đủ dữ liệu plan
    expect(r.hypotheticalPnl).toBeCloseTo(30 * 5, 4); // chỉ pnl thật của lệnh theo plan
  });
});
