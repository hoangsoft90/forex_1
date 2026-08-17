import { computeDeltas, ENTRY_DEVIATION_MAX_PIPS, RISK_DEVIATION_MAX_PERCENT } from '../deltas';

describe('deltas — test case mvp_scope mục 6', () => {
  it('Plan risk 1%, Actual risk 2.5% → risk_deviation = 1.5, followed_plan = false', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1002,
      plannedSl: 1.095,
      actualSl: 1.095,
      plannedRiskPercent: 1,
      actualRiskPercent: 2.5,
      slAdjustmentCount: 0,
    });
    expect(r.riskDeviationPercent).toBeCloseTo(1.5, 4);
    expect(r.followedPlan).toBe(false);
  });

  it('entry lệch 3 pip (trong ngưỡng) nhưng có SL adjustment → followed_plan = false', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1003, // 3 pips
      plannedSl: 1.095,
      actualSl: 1.0945,
      plannedRiskPercent: 1,
      actualRiskPercent: 1.1,
      slAdjustmentCount: 1,
    });
    expect(r.entryDeviationPips).toBeCloseTo(3, 4);
    expect(r.followedPlan).toBe(false);
  });

  it('theo đúng plan: entry lệch 2 pip, risk 0.1%, không adjustment → followed_plan = true', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1002,
      plannedSl: 1.095,
      actualSl: 1.095,
      plannedRiskPercent: 1,
      actualRiskPercent: 1.1,
      slAdjustmentCount: 0,
    });
    expect(r.followedPlan).toBe(true);
  });

  it('ngưỡng biên: entry đúng 5 pip → KHÔNG theo plan (yêu cầu < 5)', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1005, // đúng 5 pips
      plannedSl: 1.095,
      actualSl: 1.095,
      plannedRiskPercent: 1,
      actualRiskPercent: 1.0,
      slAdjustmentCount: 0,
    });
    expect(r.entryDeviationPips).toBeCloseTo(5, 4);
    expect(r.entryDeviationPips).not.toBeLessThan(ENTRY_DEVIATION_MAX_PIPS);
    expect(r.followedPlan).toBe(false);
  });

  it('ngưỡng biên risk: lệch đúng 0.2% → KHÔNG theo plan (yêu cầu < 0.2)', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1001,
      plannedSl: 1.095,
      actualSl: 1.095,
      plannedRiskPercent: 1,
      actualRiskPercent: 1.2, // đúng 0.2
      slAdjustmentCount: 0,
    });
    expect(r.riskDeviationPercent).toBeCloseTo(0.2, 4);
    expect(Math.abs(r.riskDeviationPercent)).not.toBeLessThan(RISK_DEVIATION_MAX_PERCENT);
    expect(r.followedPlan).toBe(false);
  });

  it('sl_deviation_pips dùng SL cuối: lệch đúng giá trị', () => {
    const r = computeDeltas('EURUSD', {
      plannedEntry: 1.1,
      actualEntry: 1.1,
      plannedSl: 1.095,
      actualSl: 1.093, // lệch 20 pips
      plannedRiskPercent: 1,
      actualRiskPercent: 1,
      slAdjustmentCount: 2,
    });
    expect(r.slDeviationPips).toBeCloseTo(20, 4);
  });

  it('pip size theo symbol: USDJPY pip = 0.01, XAUUSD pip = 0.1', () => {
    const rJpy = computeDeltas('USDJPY', {
      plannedEntry: 150,
      actualEntry: 150.03, // 3 pips
      plannedSl: 150.5,
      actualSl: 150.5,
      plannedRiskPercent: 1,
      actualRiskPercent: 1,
      slAdjustmentCount: 0,
    });
    expect(rJpy.entryDeviationPips).toBeCloseTo(3, 4);

    const rXau = computeDeltas('XAUUSD', {
      plannedEntry: 2400,
      actualEntry: 2400.3, // 3 pips
      plannedSl: 2390,
      actualSl: 2390,
      plannedRiskPercent: 1,
      actualRiskPercent: 1,
      slAdjustmentCount: 0,
    });
    expect(rXau.entryDeviationPips).toBeCloseTo(3, 4);
  });
});
