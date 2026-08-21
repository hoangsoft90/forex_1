/**
 * Risk Engine — Module 3 (Trade Plan).
 *
 * Công thức lot size CHUẨN forex (mvp_scope mục 3):
 *   lotSize = (Balance × Risk%) / (khoảng cách Entry-SL theo pip × giá trị pip 1 lot)
 *
 * Pip value khác nhau theo từng cặp — xem SYMBOL_PIP_CONFIG bên dưới.
 *
 * KHÔNG tự sáng tạo công thức — giữ đúng chuẩn tài chính forex.
 *
 * 📌 Lưu ý cross-rate: symbol cross (EURGBP, EURJPY...) cần rate của cặp quote→USD
 *    để tính pip value chính xác. Hiện dùng approximate rate (fallback trong config).
 *    Nếu có live cross rates, truyền qua pipValuePerLot() param thứ 3.
 */

export type PipValueConfig = {
  /** Kích thước 1 pip theo đơn vị giá của cặp */
  pipSize: number;
  /** Số đơn vị/oz trong 1 standard lot */
  contractSize: number;
  /**
   * Hệ số quy đổi pip value về USD theo giá hiện tại.
   * Quote USD → 1; quote JPY → 1/giá; cross → approximate rate.
   */
  quoteToUsdFactor: (price: number) => number;
};

// ── Symbol Groups ──────────────────────────────────────────────────────────

/** Forex Majors — quote USD */
const FOREX_MAJORS_USD: Record<string, PipValueConfig> = {
  EURUSD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1 },
  GBPUSD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1 },
  AUDUSD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1 },
  NZDUSD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1 },
};

/** Forex Majors — base USD (quote là ngoại tệ, cần inverse rate) */
const FOREX_MAJORS_INVERSE: Record<string, PipValueConfig> = {
  USDJPY:  { pipSize: 0.01,   contractSize: 100_000, quoteToUsdFactor: (p) => 1 / p },
  USDCAD:  { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: (p) => 1 / p },
  USDCHF:  { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: (p) => 1 / p },
};

/** Forex Crosses — JPY quote (cần USDJPY rate; approximate ≈ 150) */
const FOREX_CROSSES_JPY: Record<string, PipValueConfig> = {
  EURJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
  GBPJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
  AUDJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
  NZDJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
  CADJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
  CHFJPY: { pipSize: 0.01, contractSize: 100_000, quoteToUsdFactor: () => 1 / 150 },
};

/** Forex Crosses — GBP quote (cần GBPUSD rate; approximate ≈ 1.27) */
const FOREX_CROSSES_GBP: Record<string, PipValueConfig> = {
  EURGBP: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1.27 },
};

/** Forex Crosses — AUD quote (cần AUDUSD rate; approximate ≈ 0.65) */
const FOREX_CROSSES_AUD: Record<string, PipValueConfig> = {
  EURAUD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 0.65 },
  GBPAUD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 0.65 },
};

/** Forex Crosses — NZD quote (cần NZDUSD rate; approximate ≈ 0.60) */
const FOREX_CROSSES_NZD: Record<string, PipValueConfig> = {
  EURNZD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 0.60 },
};

/** Forex Crosses — CAD quote (cần USDCAD rate → 1/USDCAD; approximate ≈ 0.74) */
const FOREX_CROSSES_CAD: Record<string, PipValueConfig> = {
  EURCAD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 0.74 },
  GBPCAD: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 0.74 },
};

/** Forex Crosses — CHF quote (cần USDCHF rate → 1/USDCHF; approximate ≈ 1.12) */
const FOREX_CROSSES_CHF: Record<string, PipValueConfig> = {
  EURCHF: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1.12 },
  GBPCHF: { pipSize: 0.0001, contractSize: 100_000, quoteToUsdFactor: () => 1.12 },
};

/** Commodities — quote USD */
const COMMODITIES: Record<string, PipValueConfig> = {
  XAUUSD: { pipSize: 0.1,   contractSize: 100,   quoteToUsdFactor: () => 1 },       // Gold: 100 oz/lot
  XAGUSD: { pipSize: 0.001, contractSize: 5_000, quoteToUsdFactor: () => 1 },       // Silver: 5000 oz/lot
  USOIL:  { pipSize: 0.01,  contractSize: 1_000, quoteToUsdFactor: () => 1 },       // WTI Crude: 1000 bbl/lot
  UKOIL:  { pipSize: 0.01,  contractSize: 1_000, quoteToUsdFactor: () => 1 },       // Brent Crude: 1000 bbl/lot
  XPTUSD: { pipSize: 0.1,   contractSize: 100,   quoteToUsdFactor: () => 1 },       // Platinum: 100 oz/lot
  XPDUSD: { pipSize: 0.1,   contractSize: 100,   quoteToUsdFactor: () => 1 },       // Palladium: 100 oz/lot
};

/** Indices — quote USD, contract = 1 unit (point-based) */
const INDICES: Record<string, PipValueConfig> = {
  US30:   { pipSize: 1,    contractSize: 1, quoteToUsdFactor: () => 1 },   // Dow Jones
  NAS100: { pipSize: 0.1,  contractSize: 1, quoteToUsdFactor: () => 1 },   // Nasdaq 100
  SPX500: { pipSize: 0.1,  contractSize: 1, quoteToUsdFactor: () => 1 },   // S&P 500
  DE40:   { pipSize: 0.1,  contractSize: 1, quoteToUsdFactor: () => 1 },   // DAX
  UK100:  { pipSize: 1,    contractSize: 1, quoteToUsdFactor: () => 1 },   // FTSE
  JP225:  { pipSize: 1,    contractSize: 1, quoteToUsdFactor: () => 1 },   // Nikkei
  HK33:   { pipSize: 1,    contractSize: 1, quoteToUsdFactor: () => 1 },   // Hang Seng
  AUS200: { pipSize: 0.1,  contractSize: 1, quoteToUsdFactor: () => 1 },   // ASX 200
};

/** Crypto — quote USD, contract = 1 unit */
const CRYPTO: Record<string, PipValueConfig> = {
  BTCUSD: { pipSize: 1,    contractSize: 1, quoteToUsdFactor: () => 1 },
  ETHUSD: { pipSize: 0.01, contractSize: 1, quoteToUsdFactor: () => 1 },
  BNBUSD: { pipSize: 0.01, contractSize: 1, quoteToUsdFactor: () => 1 },
  SOLUSD: { pipSize: 0.01, contractSize: 1, quoteToUsdFactor: () => 1 },
};

// ── Combined Config ────────────────────────────────────────────────────────

export const SYMBOL_PIP_CONFIG: Record<string, PipValueConfig> = {
  ...FOREX_MAJORS_USD,
  ...FOREX_MAJORS_INVERSE,
  ...FOREX_CROSSES_JPY,
  ...FOREX_CROSSES_GBP,
  ...FOREX_CROSSES_AUD,
  ...FOREX_CROSSES_NZD,
  ...FOREX_CROSSES_CAD,
  ...FOREX_CROSSES_CHF,
  ...COMMODITIES,
  ...INDICES,
  ...CRYPTO,
};

/**
 * Union type của tất cả symbols được hỗ trợ — dùng cho type safety.
 * Bất kỳ symbol nào trong SYMBOL_PIP_CONFIG đều là SymbolKey hợp lệ.
 */
export type SymbolKey = keyof typeof SYMBOL_PIP_CONFIG;

export function isSupportedSymbol(symbol: string): symbol is SymbolKey {
  return symbol in SYMBOL_PIP_CONFIG;
}

/** Giá trị 1 pip tính bằng USD cho 1 lot, theo giá hiện tại. */
export function pipValuePerLot(symbol: SymbolKey, price: number): number {
  const cfg = SYMBOL_PIP_CONFIG[symbol];
  const pipValueInQuote = cfg.contractSize * cfg.pipSize;
  return pipValueInQuote * cfg.quoteToUsdFactor(price);
}

/** Khoảng cách Entry-SL quy ra số pip (luôn dương, loại bỏ float noise). */
export function distanceInPips(symbol: SymbolKey, entry: number, sl: number): number {
  const cfg = SYMBOL_PIP_CONFIG[symbol];
  const raw = Math.abs(entry - sl) / cfg.pipSize;
  return Math.round(raw * 1e6) / 1e6; // round 6 chữ số thập phân để tránh 0.1-0.095 float error
}

/** Bước giá 1 pip theo symbol — dùng chung với deltas.ts, cost-of-indiscipline.ts. */
export function pipSizeForSymbol(symbol: string): number {
  const cfg = SYMBOL_PIP_CONFIG[symbol as SymbolKey];
  return cfg ? cfg.pipSize : 0.0001; // fallback: pip chuẩn forex
}

export type LotSizeParams = {
  balance: number;
  riskPercent: number; // VD: 1 = 1%
  symbol: SymbolKey;
  entry: number;
  sl: number;
};

/**
 * Tính lot size đề xuất:
 *   lotSize = (Balance × Risk%) / (khoảng cách pip × pip value/lot)
 * Làm tròn xuống bội số của 0.01 (không bao giờ vượt mức risk cho phép).
 */
export function calculateLotSize(p: LotSizeParams): number {
  const riskAmount = p.balance * (p.riskPercent / 100);
  const pips = distanceInPips(p.symbol, p.entry, p.sl);
  const pipValue = pipValuePerLot(p.symbol, p.entry); // dùng giá entry làm giá tham chiếu
  if (pips <= 0 || pipValue <= 0 || riskAmount <= 0) return 0;
  const raw = riskAmount / (pips * pipValue);
  return Math.floor(raw * 100) / 100; // làm tròn xuống 0.01
}

/** Số tiền rủi ro cụ thể (USD): Balance × Risk% / 100. */
export function calculateRiskAmount(balance: number, riskPercent: number): number {
  return balance * (riskPercent / 100);
}

export type ActualRiskParams = {
  lotSize: number;
  symbol: SymbolKey;
  entry: number;
  sl: number;
  balance: number;
};

/**
 * Tính `actual_risk_percent` NGƯỢC từ lot size + SL + balance (data_model:
 * "tính toán ngược từ lot_size + SL + account_balance") — nghịch đảo của
 * calculateLotSize:
 *   lotSize = (Balance × Risk%) / (pips × pipValue)
 *   → Risk%  = (lotSize × pips × pipValue) / Balance × 100
 *
 * Trả null nếu thiếu dữ liệu (SL/balance/lot không hợp lệ) — KHÔNG suy đoán.
 * Làm tròn 4 chữ số thập phân (khớp round() trong compute-deltas).
 */
export function calculateActualRiskPercent(p: ActualRiskParams): number | null {
  const pips = distanceInPips(p.symbol, p.entry, p.sl);
  const pipValue = pipValuePerLot(p.symbol, p.entry);
  if (pips <= 0 || pipValue <= 0 || p.balance <= 0 || p.lotSize <= 0) return null;
  const riskPercent = ((p.lotSize * pips * pipValue) / p.balance) * 100;
  return Math.round(riskPercent * 1e4) / 1e4;
}

/** Risk:Reward ratio = |TP - Entry| / |Entry - SL|. Trả null nếu thiếu TP. */
export function calculateRiskReward(entry: number, sl: number, tp: number | null): number | null {
  if (tp == null) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk <= 0) return null;
  return reward / risk;
}

/** Kiểm tra Risk% có vượt rule max_risk_per_trade không (cảnh báo ngay tại form). */
export function isRiskOverLimit(riskPercent: number, maxRiskPercent: number): boolean {
  return riskPercent > maxRiskPercent;
}

export type RiskResult = {
  lotSize: number;
  riskAmount: number;
  riskReward: number | null;
  distancePips: number;
  overRiskLimit: boolean;
  maxRiskPercent: number | null;
};
