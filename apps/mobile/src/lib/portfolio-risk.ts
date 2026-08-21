/**
 * portfolio-risk.ts — Portfolio Risk / Correlation (Phase 2, Module P2-M3).
 *
 * - Tổng risk dồn: sum `actual_risk_percent` của các vị thế mở (chưa có exit_time).
 * - Cảnh báo khi tổng vượt ngưỡng: min(max_risk_per_trade × 3, max_daily_loss) — mức đỏ.
 * - Correlation: ma trận tương quan giữa các symbol đang mở.
 *
 * ⚠️ Correlation Phase 2 dùng HỆ SỐ ƯỚC LƯỢNG theo cặp chuẩn (quy ước thị trường)
 * khi chưa có đủ dữ liệu giá lịch sử — UI phải ghi rõ "ước lượng tham chiếu".
 */

export type OpenPosition = {
  symbol: string;
  direction: 'buy' | 'sell';
  lotSize: number;
  /** risk % của lệnh (actual_risk_percent); null → ước lượng từ lot */
  riskPercent: number | null;
  balance: number;
};

export type RiskThresholds = {
  /** rule max_risk_per_trade (%) */
  maxRiskPerTrade: number;
  /** rule max_daily_loss (%) */
  maxDailyLoss: number;
};

export type PortfolioRiskResult = {
  totalRiskPercent: number;
  /** Ngưỡng cảnh báo đỏ: min(maxRiskPerTrade×3, maxDailyLoss) */
  thresholdPercent: number;
  /** 'ok' | 'warn' (chạm ~70% ngưỡng) | 'danger' (vượt ngưỡng) */
  level: 'ok' | 'warn' | 'danger';
  positions: (OpenPosition & { riskPercentEffective: number })[];
};

/** Hệ số tương quan ước lượng giữa các cặp (quy ước thị trường, tham chiếu).
 * Ước lượng trung bình lịch sử — UI phải ghi rõ "ước lượng tham chiếu". */
export const ESTIMATED_CORRELATIONS: Record<string, Record<string, number>> = {
  // Forex Majors
  EURUSD: { USDJPY: 0.35, GBPUSD: 0.85, AUDUSD: 0.70, NZDUSD: 0.65, XAUUSD: -0.20, USDCAD: -0.55, USDCHF: -0.88 },
  GBPUSD: { USDJPY: 0.30, AUDUSD: 0.60, NZDUSD: 0.55, XAUUSD: -0.15, USDCAD: -0.50, USDCHF: -0.80 },
  AUDUSD: { USDJPY: 0.40, NZDUSD: 0.90, XAUUSD: 0.30, USDCAD: -0.45, USDCHF: -0.65 },
  NZDUSD: { USDJPY: 0.35, XAUUSD: 0.25, USDCAD: -0.40, USDCHF: -0.60 },
  USDJPY: { XAUUSD: -0.15, USDCAD: 0.30, USDCHF: 0.80 },
  USDCAD: { USDCHF: 0.55 },
  // Gold & Silver
  XAUUSD: { XAGUSD: 0.85, USOIL: -0.10 },
  XAGUSD: { USOIL: -0.05 },
  // Oil
  USOIL: { UKOIL: 0.95 },
  // Indices (tương quan cao giữa các chỉ số US)
  US30: { NAS100: 0.90, SPX500: 0.95 },
  NAS100: { SPX500: 0.92 },
  // JPY crosses (tương quan cao với USDJPY)
  EURJPY: { GBPJPY: 0.80, AUDJPY: 0.75 },
  GBPJPY: { AUDJPY: 0.70 },
};

export function correlationBetween(a: string, b: string): number | null {
  if (a === b) return 1;
  return ESTIMATED_CORRELATIONS[a]?.[b] ?? ESTIMATED_CORRELATIONS[b]?.[a] ?? null;
}

/**
 * Risk % hiệu dụng của 1 lệnh: dùng actual_risk_percent nếu có,
 * ngược lại ước lượng từ lot + balance (gần đúng: lot × 1000 / balance × 100 ... dùng
 * riskPercent=null → ước lượng 1% mặc định an toàn — ghi chú trong UI).
 */
export function effectiveRisk(pos: OpenPosition): number {
  if (pos.riskPercent != null) return pos.riskPercent;
  if (pos.balance <= 0) return 0.1; // không có balance → ước lượng tối thiểu an toàn
  // Ước lượng: 1 lot chuẩn 100k → $10/pip; coi SL trung bình 20 pips → risk ~ $200/lot.
  const approx = (pos.lotSize * 200) / pos.balance * 100;
  return Math.min(Math.max(approx, 0.1), 10);
}

export function computePortfolioRisk(
  positions: OpenPosition[],
  thresholds: RiskThresholds,
): PortfolioRiskResult {
  const withEffective = positions.map((p) => ({ ...p, riskPercentEffective: effectiveRisk(p) }));
  const totalRiskPercent = withEffective.reduce((s, p) => s + p.riskPercentEffective, 0);
  const thresholdPercent = Math.min(
    thresholds.maxRiskPerTrade * 3,
    thresholds.maxDailyLoss,
  );
  let level: PortfolioRiskResult['level'] = 'ok';
  if (totalRiskPercent >= thresholdPercent) level = 'danger';
  else if (totalRiskPercent >= thresholdPercent * 0.7) level = 'warn';
  return { totalRiskPercent, thresholdPercent, level, positions: withEffective };
}

/**
 * Ma trận correlation giữa các symbol đang mở (chỉ cặp khác nhau).
 * Trả về danh sách cặp + hệ số để UI vẽ.
 */
export function correlationMatrix(symbols: string[]): { a: string; b: string; value: number }[] {
  const uniq = [...new Set(symbols)];
  const pairs: { a: string; b: string; value: number }[] = [];
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const v = correlationBetween(uniq[i], uniq[j]);
      if (v != null) pairs.push({ a: uniq[i], b: uniq[j], value: v });
    }
  }
  return pairs;
}
