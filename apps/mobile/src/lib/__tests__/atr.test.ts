import {
  AdaptiveCondition,
  averageTrueRange,
  currentATR,
  suggestAdaptiveRisk,
  trueRange,
} from '../atr';

const cond = (overrides: Partial<AdaptiveCondition> = {}): AdaptiveCondition => ({
  id: 'cond-1',
  condition_type: 'atr_threshold',
  condition_operator: 'gt',
  condition_value: 1.5,
  adjusted_value: 0.5,
  ...overrides,
});

const mkCandles = (trs: number[]): Parameters<typeof currentATR>[0] =>
  trs.map((tr) => ({ high: 100 + tr, low: 100, close: 100 + tr / 2, prevClose: 100 }));

describe('trueRange', () => {
  it('TR = high - low khi không có gap', () => {
    expect(trueRange({ high: 105, low: 103, close: 104, prevClose: 103.5 })).toBe(2);
  });

  it('TR lấy max cả 3 khoảng cách', () => {
    // gap lớn so với prevClose → TR = |high - prevClose|
    expect(trueRange({ high: 105, low: 104, close: 104.5, prevClose: 100 })).toBe(5);
  });

  it('prevClose null → dùng close', () => {
    expect(trueRange({ high: 105, low: 103, close: 104, prevClose: null })).toBe(2);
  });
});

describe('averageTrueRange', () => {
  it('trung bình TR', () => {
    const c = mkCandles([2, 4, 6]);
    expect(averageTrueRange(c)).toBeCloseTo(4);
  });

  it('rỗng → null', () => {
    expect(averageTrueRange([])).toBeNull();
  });
});

describe('currentATR', () => {
  it('lấy 14 nến gần nhất', () => {
    const candles = mkCandles(Array.from({ length: 20 }, (_, i) => (i < 6 ? 2 : 10)));
    // 6 nến TR=2 + 14 nến TR=10 → currentATR (14 gần nhất) = 10
    expect(currentATR(candles, 14)).toBeCloseTo(10);
  });

  it('ít nến hơn period → trung bình toàn bộ', () => {
    expect(currentATR(mkCandles([2, 4]), 14)).toBeCloseTo(3);
  });

  it('rỗng → null', () => {
    expect(currentATR([], 14)).toBeNull();
  });
});

describe('suggestAdaptiveRisk', () => {
  const base = 1; // 1%

  it('ATR vượt ngưỡng (gt 1.5x) → active, đề xuất adjusted (giảm)', () => {
    const r = suggestAdaptiveRisk(base, cond({ condition_operator: 'gt', condition_value: 1.5 }), 18, 10);
    expect(r.active).toBe(true);
    expect(r.suggestedRiskPercent).toBe(0.5);
    expect(r.appliedConditionId).toBe('cond-1');
  });

  it('ATR dưới ngưỡng → không active, giữ base', () => {
    const r = suggestAdaptiveRisk(base, cond({ condition_operator: 'gt', condition_value: 1.5 }), 12, 10);
    expect(r.active).toBe(false);
    expect(r.suggestedRiskPercent).toBe(1);
    expect(r.appliedConditionId).toBeNull();
  });

  it('lt: ATR thấp hơn ngưỡng → active', () => {
    const r = suggestAdaptiveRisk(base, cond({ condition_operator: 'lt', condition_value: 0.8 }), 6, 10);
    expect(r.active).toBe(true);
    expect(r.suggestedRiskPercent).toBe(0.5);
  });

  it('eq: ATR xấp xỉ ngưỡng → active', () => {
    const r = suggestAdaptiveRisk(base, cond({ condition_operator: 'eq', condition_value: 1.5 }), 15, 10);
    expect(r.active).toBe(true);
  });

  it('⚠ KHÔNG BAO GIỜ đề xuất tăng: adjusted > base → trả về base', () => {
    const r = suggestAdaptiveRisk(
      base,
      cond({ condition_operator: 'gt', condition_value: 1.5, adjusted_value: 2 }),
      18,
      10,
    );
    expect(r.suggestedRiskPercent).toBeLessThanOrEqual(base);
    expect(r.suggestedRiskPercent).toBe(1);
  });

  it('condition không phải atr_threshold → fallback base', () => {
    const r = suggestAdaptiveRisk(
      base,
      cond({ condition_type: 'news_high_impact', condition_operator: 'gt', condition_value: 0, adjusted_value: 0.5 }),
      18,
      10,
    );
    expect(r.active).toBe(false);
    expect(r.suggestedRiskPercent).toBe(1);
  });

  it('thiếu ATR → fallback base, không tự điều chỉnh', () => {
    const r = suggestAdaptiveRisk(base, cond(), null, 10);
    expect(r.active).toBe(false);
    expect(r.suggestedRiskPercent).toBe(1);
  });

  it('atrAverage = 0 → fallback (tránh chia 0)', () => {
    const r = suggestAdaptiveRisk(base, cond(), 18, 0);
    expect(r.active).toBe(false);
    expect(r.suggestedRiskPercent).toBe(1);
  });

  it('reason mô tả đúng tình huống kích hoạt', () => {
    const r = suggestAdaptiveRisk(base, cond(), 18, 10);
    expect(r.reason).toContain('1.80x');
    expect(r.reason).toContain('0.5%');
  });
});
