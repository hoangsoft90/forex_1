import {
  calculateLotSize,
  calculateRiskAmount,
  calculateRiskReward,
  distanceInPips,
  isRiskOverLimit,
  pipValuePerLot,
} from '../risk-engine';

describe('Risk Engine — lot size (test case mvp_scope mục 3)', () => {
  it('EURUSD: Balance $10k, Risk 1%, Entry 1.1000, SL 1.0950 (50 pips, pip $10) → 0.2 lot', () => {
    const lot = calculateLotSize({
      balance: 10_000,
      riskPercent: 1,
      symbol: 'EURUSD',
      entry: 1.1,
      sl: 1.095,
    });
    expect(lot).toBeCloseTo(0.2, 4);
  });

  it('XAUUSD: Balance $10k, Risk 1%, Entry 2400, SL 2390 → 0.1 lot (pip value khác)', () => {
    const lot = calculateLotSize({
      balance: 10_000,
      riskPercent: 1,
      symbol: 'XAUUSD',
      entry: 2400,
      sl: 2390,
    });
    expect(lot).toBeCloseTo(0.1, 4);
  });

  it('USDJPY: Balance $10k, Risk 1%, Entry 150.00, SL 150.50 → 0.3 lot (pip value khác)', () => {
    const lot = calculateLotSize({
      balance: 10_000,
      riskPercent: 1,
      symbol: 'USDJPY',
      entry: 150,
      sl: 150.5,
    });
    // pip value = 1000 / 150 = 6.6667; 50 pips → 100/(50×6.6667) = 0.3
    expect(lot).toBeCloseTo(0.3, 4);
  });

  it('làm tròn xuống bội số 0.01 (không vượt mức risk)', () => {
    // Risk $100, pip distance 30 × $10 = $300/lot → raw = 0.3333 → floor 0.33
    const lot = calculateLotSize({
      balance: 10_000,
      riskPercent: 1,
      symbol: 'EURUSD',
      entry: 1.1,
      sl: 1.097,
    });
    expect(lot).toBe(0.33);
  });
});

describe('Risk Engine — pip value & distance', () => {
  it('pip value EURUSD = $10/lot', () => {
    expect(pipValuePerLot('EURUSD', 1.1)).toBeCloseTo(10, 6);
  });

  it('pip value XAUUSD = $10/lot (100 oz × 0.1)', () => {
    expect(pipValuePerLot('XAUUSD', 2400)).toBeCloseTo(10, 6);
  });

  it('pip value USDJPY phụ thuộc giá: 1000/150 = $6.67', () => {
    expect(pipValuePerLot('USDJPY', 150)).toBeCloseTo(1000 / 150, 4);
  });

  it('distanceInPips EURUSD 50 pips', () => {
    expect(distanceInPips('EURUSD', 1.1, 1.095)).toBeCloseTo(50, 6);
  });

  it('distanceInPips USDJPY 50 pips', () => {
    expect(distanceInPips('USDJPY', 150, 150.5)).toBeCloseTo(50, 6);
  });
});

describe('Risk Engine — R:R, risk amount, limit check', () => {
  it('calculateRiskAmount: $10k × 1% = $100', () => {
    expect(calculateRiskAmount(10_000, 1)).toBeCloseTo(100, 6);
  });

  it('R:R: Entry 1.1, SL 1.095 (risk 50 pips), TP 1.115 (reward 150 pips) → 3.0', () => {
    expect(calculateRiskReward(1.1, 1.095, 1.115)).toBeCloseTo(3, 6);
  });

  it('R:R null khi không có TP', () => {
    expect(calculateRiskReward(1.1, 1.095, null)).toBeNull();
  });

  it('isRiskOverLimit: risk 2% > max 1% → true; risk 1% = max → false', () => {
    expect(isRiskOverLimit(2, 1)).toBe(true);
    expect(isRiskOverLimit(1, 1)).toBe(false);
    expect(isRiskOverLimit(0.5, 1)).toBe(false);
  });
});
