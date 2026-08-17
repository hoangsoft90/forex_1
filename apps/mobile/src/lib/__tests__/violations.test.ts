import {
  detectViolations,
  REVENGE_WINDOW_MINUTES,
  TradeContext,
} from '../violations';

function baseCtx(overrides: Partial<TradeContext> = {}): TradeContext {
  return {
    execution: {
      id: 'e-current',
      direction: 'sell',
      lot_size: 0.2,
      actual_risk_percent: 1,
      entry_time: '2026-08-17T10:00:00Z',
      exit_time: '2026-08-17T11:00:00Z',
    },
    plan: { planned_risk_percent: 1 },
    slAdjustmentCount: 0,
    previousClosed: null,
    ...overrides,
  };
}

describe('violations — ít nhất 1 test/violation_type (mvp_scope mục 7)', () => {
  it('overconfidence_size: risk thực > planned × 1.5', () => {
    const ctx = baseCtx({
      execution: {
        ...baseCtx().execution,
        actual_risk_percent: 2.5, // 1 × 1.5 = 1.5 → 2.5 > 1.5
      },
      plan: { planned_risk_percent: 1 },
    });
    const v = detectViolations(ctx);
    expect(v.some((x) => x.type === 'overconfidence_size')).toBe(true);
  });

  it('overconfidence_size: risk thực đúng 1.5× → KHÔNG vi phạm (yêu cầu >)', () => {
    const ctx = baseCtx({
      execution: {
        ...baseCtx().execution,
        actual_risk_percent: 1.5,
      },
      plan: { planned_risk_percent: 1 },
    });
    expect(detectViolations(ctx).some((x) => x.type === 'overconfidence_size')).toBe(false);
  });

  it('revenge_trading: lệnh trước lỗ + < 10 phút + ngược chiều', () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, direction: 'sell', entry_time: '2026-08-17T09:05:00Z' },
      previousClosed: {
        direction: 'buy',
        lot_size: 0.2,
        pnl_amount: -150,
        exit_time: '2026-08-17T09:00:00Z', // 5 phút trước
      },
    });
    const v = detectViolations(ctx);
    expect(v.some((x) => x.type === 'revenge_trading')).toBe(true);
  });

  it(`revenge_trading: > ${REVENGE_WINDOW_MINUTES} phút → không vi phạm`, () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, direction: 'sell', entry_time: '2026-08-17T09:30:00Z' },
      previousClosed: {
        direction: 'buy',
        lot_size: 0.2,
        pnl_amount: -150,
        exit_time: '2026-08-17T09:00:00Z', // 30 phút
      },
    });
    expect(detectViolations(ctx).some((x) => x.type === 'revenge_trading')).toBe(false);
  });

  it('revenge_trading: lệnh trước THẮNG → không vi phạm', () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, direction: 'sell', entry_time: '2026-08-17T09:05:00Z' },
      previousClosed: { direction: 'buy', lot_size: 0.2, pnl_amount: 100, exit_time: '2026-08-17T09:00:00Z' },
    });
    expect(detectViolations(ctx).some((x) => x.type === 'revenge_trading')).toBe(false);
  });

  it('hope_trading: count(sl_adjustments) > 2 → vi phạm', () => {
    const ctx = baseCtx({ slAdjustmentCount: 3 });
    const v = detectViolations(ctx);
    expect(v.some((x) => x.type === 'hope_trading')).toBe(true);
  });

  it('hope_trading: đúng 2 adjustment → không vi phạm (yêu cầu > 2)', () => {
    const ctx = baseCtx({ slAdjustmentCount: 2 });
    expect(detectViolations(ctx).some((x) => x.type === 'hope_trading')).toBe(false);
  });

  it('martingale_negative: lot mới > lot trước × 1.8 VÀ lệnh trước lỗ', () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, lot_size: 0.4 }, // 0.2 × 1.8 = 0.36 → 0.4 > 0.36
      previousClosed: { direction: 'buy', lot_size: 0.2, pnl_amount: -100, exit_time: '2026-08-17T08:00:00Z' },
    });
    const v = detectViolations(ctx);
    expect(v.some((x) => x.type === 'martingale_negative')).toBe(true);
  });

  it('martingale_negative: tăng lot nhưng lệnh trước THẮNG → không vi phạm', () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, lot_size: 0.4 },
      previousClosed: { direction: 'buy', lot_size: 0.2, pnl_amount: 100, exit_time: '2026-08-17T08:00:00Z' },
    });
    expect(detectViolations(ctx).some((x) => x.type === 'martingale_negative')).toBe(false);
  });

  it('martingale_negative: tăng lot không đủ 1.8× → không vi phạm', () => {
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, lot_size: 0.3 }, // 0.3 < 0.36
      previousClosed: { direction: 'buy', lot_size: 0.2, pnl_amount: -100, exit_time: '2026-08-17T08:00:00Z' },
    });
    expect(detectViolations(ctx).some((x) => x.type === 'martingale_negative')).toBe(false);
  });

  it('news_gambling: placeholder — detectViolations KHÔNG BAO GIỜ trả news_gambling', () => {
    // Đảm bảo không có dữ liệu tin tức giả được sinh ra (mvp_scope mục 7)
    const ctx = baseCtx({
      execution: { ...baseCtx().execution, direction: 'buy', entry_time: '2026-08-17T13:50:00Z' },
    });
    const v = detectViolations(ctx);
    expect(v.some((x) => x.type === 'news_gambling')).toBe(false);
  });

  it('có thể phát hiện nhiều loại cùng lúc (vd revenge + martingale)', () => {
    const ctx = baseCtx({
      execution: {
        ...baseCtx().execution,
        direction: 'sell',
        lot_size: 0.4,
        entry_time: '2026-08-17T09:05:00Z',
      },
      previousClosed: {
        direction: 'buy',
        lot_size: 0.2,
        pnl_amount: -150,
        exit_time: '2026-08-17T09:00:00Z',
      },
    });
    const types = detectViolations(ctx).map((v) => v.type);
    expect(types).toContain('revenge_trading');
    expect(types).toContain('martingale_negative');
  });
});
