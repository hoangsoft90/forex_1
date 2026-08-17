import {
  computePortfolioRisk,
  correlationBetween,
  correlationMatrix,
  effectiveRisk,
  OpenPosition,
} from '../portfolio-risk';

const pos = (p: Partial<OpenPosition>): OpenPosition => ({
  symbol: 'EURUSD',
  direction: 'buy',
  lotSize: 0.2,
  riskPercent: 1,
  balance: 10_000,
  ...p,
});

const thr = { maxRiskPerTrade: 1, maxDailyLoss: 3 };

describe('computePortfolioRisk', () => {
  it('1 lệnh 1% → total 1%, level ok', () => {
    const r = computePortfolioRisk([pos({})], thr);
    expect(r.totalRiskPercent).toBeCloseTo(1);
    expect(r.thresholdPercent).toBeCloseTo(3); // min(1×3, 3)
    expect(r.level).toBe('ok');
  });

  it('2 lệnh 1.5% + 1.5% → total 3%, danger (đạt ngưỡng)', () => {
    const r = computePortfolioRisk([pos({ riskPercent: 1.5 }), pos({ riskPercent: 1.5 })], thr);
    expect(r.totalRiskPercent).toBeCloseTo(3);
    expect(r.level).toBe('danger');
  });

  it('2 lệnh 1% + 1% → total 2% (66% ngưỡng 3%) → ok (chưa chạm 70%)', () => {
    const r = computePortfolioRisk([pos({}), pos({})], thr);
    expect(r.totalRiskPercent).toBeCloseTo(2);
    expect(r.level).toBe('ok');
  });

  it('4 lệnh 1% → total 4% vượt ngưỡng 3% → danger', () => {
    const r = computePortfolioRisk([pos({}), pos({}), pos({}), pos({})], thr);
    expect(r.totalRiskPercent).toBeCloseTo(4);
    expect(r.thresholdPercent).toBeCloseTo(3);
    expect(r.level).toBe('danger');
  });

  it('ngưỡng = min(maxRisk×3, maxDailyLoss) — lấy cái nhỏ hơn', () => {
    const r = computePortfolioRisk([], { maxRiskPerTrade: 2, maxDailyLoss: 3 });
    expect(r.thresholdPercent).toBeCloseTo(3); // min(6, 3)
    const r2 = computePortfolioRisk([], { maxRiskPerTrade: 1, maxDailyLoss: 5 });
    expect(r2.thresholdPercent).toBeCloseTo(3); // min(3, 5)
  });

  it('0 lệnh → total 0, level ok', () => {
    const r = computePortfolioRisk([], thr);
    expect(r.totalRiskPercent).toBe(0);
    expect(r.level).toBe('ok');
  });

  it('position có riskPercent=null → dùng ước lượng, không crash', () => {
    const r = computePortfolioRisk([pos({ riskPercent: null, lotSize: 0.5 })], thr);
    expect(r.positions[0].riskPercentEffective).toBeGreaterThan(0);
  });
});

describe('effectiveRisk', () => {
  it('dùng actual_risk_percent nếu có', () => {
    expect(effectiveRisk(pos({ riskPercent: 1.5 }))).toBe(1.5);
  });

  it('ước lượng từ lot khi không có riskPercent', () => {
    // lot 0.5, balance 10000 → (0.5×200)/10000×100 = 1%
    expect(effectiveRisk(pos({ riskPercent: null, lotSize: 0.5 }))).toBeCloseTo(1);
  });

  it('lot lớn → ước lượng cao hơn nhưng clamp tối đa 10%', () => {
    expect(effectiveRisk(pos({ riskPercent: null, lotSize: 10, balance: 1000 }))).toBe(10);
  });

  it('clamp tối thiểu 0.1%', () => {
    expect(effectiveRisk(pos({ riskPercent: null, lotSize: 0.01, balance: 1_000_000 }))).toBe(0.1);
  });

  it('balance=0 → không crash, clamp về 0.1', () => {
    expect(effectiveRisk(pos({ riskPercent: null, lotSize: 0.2, balance: 0 }))).toBe(0.1);
  });
});

describe('correlationBetween', () => {
  it('cùng symbol → 1', () => {
    expect(correlationBetween('EURUSD', 'EURUSD')).toBe(1);
  });

  it('cặp có trong bảng → hệ số', () => {
    expect(correlationBetween('EURUSD', 'USDJPY')).toBe(0.35);
    expect(correlationBetween('USDJPY', 'EURUSD')).toBe(0.35); // đối xứng
    expect(correlationBetween('EURUSD', 'XAUUSD')).toBe(-0.2);
  });

  it('cặp không có → null', () => {
    expect(correlationBetween('EURUSD', 'GBPUSD')).toBeNull();
  });
});

describe('correlationMatrix', () => {
  it('2 symbol → 1 cặp', () => {
    const m = correlationMatrix(['EURUSD', 'XAUUSD']);
    expect(m).toHaveLength(1);
    expect(m[0]).toEqual({ a: 'EURUSD', b: 'XAUUSD', value: -0.2 });
  });

  it('3 symbol → 3 cặp (tổ hợp chập 2)', () => {
    const m = correlationMatrix(['EURUSD', 'USDJPY', 'XAUUSD']);
    expect(m).toHaveLength(3);
  });

  it('duplicate symbol → không sinh cặp trùng', () => {
    const m = correlationMatrix(['EURUSD', 'EURUSD', 'USDJPY']);
    expect(m).toHaveLength(1);
  });

  it('1 symbol → không có cặp nào', () => {
    expect(correlationMatrix(['EURUSD'])).toHaveLength(0);
  });

  it('symbol lạ → bỏ qua cặp không có hệ số', () => {
    const m = correlationMatrix(['EURUSD', 'GBPUSD']);
    expect(m).toHaveLength(0);
  });
});
