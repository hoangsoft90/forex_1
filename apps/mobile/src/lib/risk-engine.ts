/**
 * Risk Engine — Module 3 (Trade Plan).
 *
 * Công thức lot size CHUẨN forex (mvp_scope mục 3):
 *   lotSize = (Balance × Risk%) / (khoảng cách Entry-SL theo pip × giá trị pip 1 lot)
 *
 * Pip value khác nhau theo từng cặp:
 *   - EURUSD: pip 0.0001, contract 100,000 đơn vị, quote USD → $10/pip/lot
 *   - USDJPY: pip 0.01, contract 100,000, quote JPY → (1000 JPY)/pip/lot, đổi USD theo giá
 *   - XAUUSD: pip 0.1, contract 100 oz, quote USD → $10/pip/lot
 *
 * KHÔNG tự sáng tạo công thức — giữ đúng chuẩn tài chính forex.
 */

export type PipValueConfig = {
  /** Kích thước 1 pip theo đơn vị giá của cặp */
  pipSize: number;
  /** Số đơn vị/oz trong 1 standard lot */
  contractSize: number;
  /**
   * Hệ số quy đổi pip value về USD theo giá hiện tại.
   * Quote USD → 1; quote JPY → 1/giá (vì pip value tính bằng JPY, chia cho tỷ giá).
   */
  quoteToUsdFactor: (price: number) => number;
};

export type SymbolKey = 'EURUSD' | 'XAUUSD' | 'USDJPY';

/** Cấu hình pip value theo từng cặp (giá trị chuẩn tài chính). */
export const SYMBOL_PIP_CONFIG: Record<SymbolKey, PipValueConfig> = {
  EURUSD: {
    pipSize: 0.0001,
    contractSize: 100_000,
    quoteToUsdFactor: () => 1,
  },
  USDJPY: {
    pipSize: 0.01,
    contractSize: 100_000,
    // 1 pip = 1000 JPY/lot → đổi USD: 1000 / USDJPY (giá hiện tại)
    quoteToUsdFactor: (price) => 1 / price,
  },
  XAUUSD: {
    pipSize: 0.1,
    contractSize: 100, // 100 oz / lot
    quoteToUsdFactor: () => 1,
  },
};

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
