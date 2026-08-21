import {
  calculateActualRiskPercent,
  calculateLotSize,
  calculateRiskAmount,
  calculateRiskReward,
  distanceInPips,
  isRiskOverLimit,
  isSupportedSymbol,
  pipSizeForSymbol,
  pipValuePerLot,
  SYMBOL_PIP_CONFIG,
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

describe('Actual Risk Percent — công thức ngược (tính tay độc lập)', () => {
  it('EURUSD lot 0.2, entry 1.1000, SL 1.0950 (50 pip × $10), balance $10k → 1%', () => {
    // Tính tay: risk $ = 0.2 lot × 50 pip × $10/pip/lot = $100 → 100/10000×100 = 1%
    const r = calculateActualRiskPercent({
      lotSize: 0.2,
      symbol: 'EURUSD',
      entry: 1.1,
      sl: 1.095,
      balance: 10_000,
    });
    expect(r).toBeCloseTo(1, 6);
  });

  it('USDJPY lot 0.3, entry 150.00, SL 150.50 (pip value 1000/150=$6.667), balance $10k → 1%', () => {
    // Tính tay: risk $ = 0.3 × 50 × 6.6667 = $100 → 1%
    const r = calculateActualRiskPercent({
      lotSize: 0.3,
      symbol: 'USDJPY',
      entry: 150,
      sl: 150.5,
      balance: 10_000,
    });
    expect(r).toBeCloseTo(1, 4);
  });

  it('XAUUSD lot 0.1, entry 2400, SL 2390 (100 pip × $10), balance $10k → 1%', () => {
    const r = calculateActualRiskPercent({
      lotSize: 0.1,
      symbol: 'XAUUSD',
      entry: 2400,
      sl: 2390,
      balance: 10_000,
    });
    expect(r).toBeCloseTo(1, 6);
  });

  it('Nghịch đảo của calculateLotSize: lot từ risk 1% → actual risk ≈ 1%', () => {
    const lot = calculateLotSize({ balance: 10_000, riskPercent: 1, symbol: 'EURUSD', entry: 1.1, sl: 1.095 });
    const r = calculateActualRiskPercent({ lotSize: lot, symbol: 'EURUSD', entry: 1.1, sl: 1.095, balance: 10_000 });
    // floor xuống 0.01 → risk thực ≤ 1% nhưng rất gần
    expect(r).not.toBeNull();
    expect(r!).toBeLessThanOrEqual(1);
    expect(r!).toBeGreaterThan(0.99);
  });

  it('balance = 0 hoặc thiếu SL hợp lệ → null (không suy đoán)', () => {
    expect(calculateActualRiskPercent({ lotSize: 0.2, symbol: 'EURUSD', entry: 1.1, sl: 1.095, balance: 0 })).toBeNull();
    // entry == sl → 0 pip → không tính được risk
    expect(calculateActualRiskPercent({ lotSize: 0.2, symbol: 'EURUSD', entry: 1.1, sl: 1.1, balance: 10_000 })).toBeNull();
    expect(calculateActualRiskPercent({ lotSize: 0, symbol: 'EURUSD', entry: 1.1, sl: 1.095, balance: 10_000 })).toBeNull();
  });
});

// ── Extended Symbol Support Tests ──────────────────────────────────────────

describe('Extended symbols — isSupportedSymbol', () => {
  it('hỗ trợ tất cả forex majors', () => {
    for (const s of ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCAD', 'USDCHF']) {
      expect(isSupportedSymbol(s)).toBe(true);
    }
  });

  it('hỗ trợ forex crosses', () => {
    for (const s of ['EURJPY', 'GBPJPY', 'AUDJPY', 'EURGBP', 'EURAUD', 'GBPAUD']) {
      expect(isSupportedSymbol(s)).toBe(true);
    }
  });

  it('hỗ trợ commodities', () => {
    for (const s of ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL']) {
      expect(isSupportedSymbol(s)).toBe(true);
    }
  });

  it('hỗ trợ indices', () => {
    for (const s of ['US30', 'NAS100', 'SPX500', 'DE40', 'UK100']) {
      expect(isSupportedSymbol(s)).toBe(true);
    }
  });

  it('hỗ trợ crypto', () => {
    for (const s of ['BTCUSD', 'ETHUSD']) {
      expect(isSupportedSymbol(s)).toBe(true);
    }
  });

  it('symbol không tồn tại → false', () => {
    expect(isSupportedSymbol('FAKEUSD')).toBe(false);
    expect(isSupportedSymbol('')).toBe(false);
  });
});

describe('Extended symbols — pipSizeForSymbol', () => {
  it('forex majors có pip 0.0001', () => {
    expect(pipSizeForSymbol('EURUSD')).toBe(0.0001);
    expect(pipSizeForSymbol('GBPUSD')).toBe(0.0001);
    expect(pipSizeForSymbol('AUDUSD')).toBe(0.0001);
  });

  it('JPY pairs có pip 0.01', () => {
    expect(pipSizeForSymbol('USDJPY')).toBe(0.01);
    expect(pipSizeForSymbol('EURJPY')).toBe(0.01);
    expect(pipSizeForSymbol('GBPJPY')).toBe(0.01);
  });

  it('gold pip 0.1, silver pip 0.001', () => {
    expect(pipSizeForSymbol('XAUUSD')).toBe(0.1);
    expect(pipSizeForSymbol('XAGUSD')).toBe(0.001);
  });

  it('oil pip 0.01', () => {
    expect(pipSizeForSymbol('USOIL')).toBe(0.01);
    expect(pipSizeForSymbol('UKOIL')).toBe(0.01);
  });

  it('indices: US30/UK100 pip 1, NAS100/SPX500/DE40 pip 0.1', () => {
    expect(pipSizeForSymbol('US30')).toBe(1);
    expect(pipSizeForSymbol('UK100')).toBe(1);
    expect(pipSizeForSymbol('NAS100')).toBe(0.1);
    expect(pipSizeForSymbol('SPX500')).toBe(0.1);
    expect(pipSizeForSymbol('DE40')).toBe(0.1);
  });

  it('crypto: BTC pip 1, ETH pip 0.01', () => {
    expect(pipSizeForSymbol('BTCUSD')).toBe(1);
    expect(pipSizeForSymbol('ETHUSD')).toBe(0.01);
  });

  it('symbol không biết → fallback 0.0001', () => {
    expect(pipSizeForSymbol('UNKNOWN')).toBe(0.0001);
  });
});

describe('Extended symbols — pipValuePerLot', () => {
  it('GBPUSD: 100k × 0.0001 × 1 = $10/lot', () => {
    expect(pipValuePerLot('GBPUSD', 1.27)).toBeCloseTo(10, 6);
  });

  it('USDCAD: 100k × 0.0001 / price', () => {
    // price 1.35 → 10 / 1.35 = $7.41
    expect(pipValuePerLot('USDCAD', 1.35)).toBeCloseTo(10 / 1.35, 4);
  });

  it('USDCHF: 100k × 0.0001 / price', () => {
    // price 0.89 → 10 / 0.89 = $11.24
    expect(pipValuePerLot('USDCHF', 0.89)).toBeCloseTo(10 / 0.89, 4);
  });

  it('EURJPY: 100k × 0.01 / 150 (approx) = $6.67', () => {
    expect(pipValuePerLot('EURJPY', 162)).toBeCloseTo(1000 / 150, 2);
  });

  it('EURGBP: 100k × 0.0001 × 1.27 = $12.70', () => {
    expect(pipValuePerLot('EURGBP', 0.85)).toBeCloseTo(10 * 1.27, 2);
  });

  it('XAGUSD: 5000 × 0.001 = $5/lot', () => {
    expect(pipValuePerLot('XAGUSD', 30)).toBeCloseTo(5, 6);
  });

  it('USOIL: 1000 × 0.01 = $10/lot', () => {
    expect(pipValuePerLot('USOIL', 75)).toBeCloseTo(10, 6);
  });

  it('NAS100: 1 × 0.1 = $0.10/lot', () => {
    expect(pipValuePerLot('NAS100', 20000)).toBeCloseTo(0.1, 6);
  });

  it('BTCUSD: 1 × 1 = $1/lot', () => {
    expect(pipValuePerLot('BTCUSD', 65000)).toBeCloseTo(1, 6);
  });

  it('ETHUSD: 1 × 0.01 = $0.01/lot', () => {
    expect(pipValuePerLot('ETHUSD', 3500)).toBeCloseTo(0.01, 6);
  });
});

describe('Extended symbols — lot size & actual risk', () => {
  it('GBPUSD: Balance $10k, Risk 1%, Entry 1.2700, SL 1.2650 (50 pip × $10) → 0.2 lot', () => {
    const lot = calculateLotSize({
      balance: 10_000, riskPercent: 1, symbol: 'GBPUSD', entry: 1.27, sl: 1.265,
    });
    expect(lot).toBeCloseTo(0.2, 4);
  });

  it('USDCAD: Balance $10k, Risk 1%, Entry 1.35, SL 1.3550 (50 pip × $7.41) → ~0.27 lot', () => {
    const lot = calculateLotSize({
      balance: 10_000, riskPercent: 1, symbol: 'USDCAD', entry: 1.35, sl: 1.355,
    });
    // pip value = 10/1.35 = 7.4074; 50 pips → 100/(50×7.4074) = 0.27
    expect(lot).toBeCloseTo(0.27, 1);
  });

  it('XAGUSD: Balance $10k, Risk 1%, Entry 30, SL 29.5 (500 pip × $5) → 0.4 lot', () => {
    // pip 0.001, so distance = 0.5/0.001 = 500 pips
    const lot = calculateLotSize({
      balance: 10_000, riskPercent: 1, symbol: 'XAGUSD', entry: 30, sl: 29.5,
    });
    // pip value = 5; 500 pips → 100/(500×5) = 0.04
    expect(lot).toBeCloseTo(0.04, 4);
  });

  it('NAS100: Balance $10k, Risk 1%, Entry 20000, SL 19950 (500 pip × $0.1) → 2 lot', () => {
    const lot = calculateLotSize({
      balance: 10_000, riskPercent: 1, symbol: 'NAS100', entry: 20000, sl: 19950,
    });
    // pip value = 0.1; 500 pips → 100/(500×0.1) = 2
    expect(lot).toBeCloseTo(2, 4);
  });

  it('BTCUSD: Balance $10k, Risk 1%, Entry 65000, SL 64500 (500 pip × $1) → 0.2 lot', () => {
    const lot = calculateLotSize({
      balance: 10_000, riskPercent: 1, symbol: 'BTCUSD', entry: 65000, sl: 64500,
    });
    // pip value = 1; 500 pips → 100/(500×1) = 0.2
    expect(lot).toBeCloseTo(0.2, 4);
  });

  it('nghịch đảo lot → actual risk cho GBPUSD', () => {
    const lot = calculateLotSize({ balance: 10_000, riskPercent: 1, symbol: 'GBPUSD', entry: 1.27, sl: 1.265 });
    const r = calculateActualRiskPercent({ lotSize: lot, symbol: 'GBPUSD', entry: 1.27, sl: 1.265, balance: 10_000 });
    expect(r).not.toBeNull();
    expect(r!).toBeLessThanOrEqual(1);
    expect(r!).toBeGreaterThan(0.99);
  });

  it('nghịch đảo lot → actual risk cho NAS100', () => {
    const lot = calculateLotSize({ balance: 10_000, riskPercent: 1, symbol: 'NAS100', entry: 20000, sl: 19950 });
    const r = calculateActualRiskPercent({ lotSize: lot, symbol: 'NAS100', entry: 20000, sl: 19950, balance: 10_000 });
    expect(r).not.toBeNull();
    expect(r!).toBeLessThanOrEqual(1);
    expect(r!).toBeGreaterThan(0.99);
  });
});

describe('SYMBOL_PIP_CONFIG — tổng quan', () => {
  it('có ≥20 symbols được cấu hình', () => {
    expect(Object.keys(SYMBOL_PIP_CONFIG).length).toBeGreaterThanOrEqual(20);
  });

  it('mỗi symbol có pipSize > 0 và contractSize > 0', () => {
    for (const [, cfg] of Object.entries(SYMBOL_PIP_CONFIG)) {
      expect(cfg.pipSize).toBeGreaterThan(0);
      expect(cfg.contractSize).toBeGreaterThan(0);
    }
  });
});
