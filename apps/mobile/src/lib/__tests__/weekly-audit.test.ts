import { generateWeeklyAudit } from '../weekly-audit';

/**
 * Test với ≥5 bộ dữ liệu mẫu khác nhau (mvp_scope mục 9):
 * tránh câu cụt/lặp khi count = 0.
 */
describe('generateWeeklyAudit — ≥5 bộ dữ liệu, tiếng Việt tự nhiên', () => {
  it('bộ 1: tuần đầy đủ — lệnh, theo plan, vi phạm, prevented, PnL dương', () => {
    const text = generateWeeklyAudit({
      totalTrades: 10,
      followedPlanPercent: 80,
      topViolation: { type: 'hope_trading', count: 2 },
      badTradesPrevented: 3,
      weekPnl: 150,
    });
    expect(text).toContain('10 lệnh');
    expect(text).toContain('80% theo đúng plan');
    expect(text).toContain('dời Stop Loss (2 lần)');
    expect(text).toContain('tránh 3 lệnh vi phạm');
    expect(text).toContain('+$150.00');
    // Không có dấu hiệu câu cụt: không kết thúc bằng dấu phẩy, không lặp "Vi phạm phổ biến nhất" 2 lần
    expect((text.match(/Vi phạm phổ biến nhất/g) ?? []).length).toBe(1);
  });

  it('bộ 2: count = 0 (không vi phạm, không prevented) — câu tự nhiên, không nói "(0 lần)"', () => {
    const text = generateWeeklyAudit({
      totalTrades: 5,
      followedPlanPercent: 100,
      topViolation: null,
      badTradesPrevented: 0,
      weekPnl: 80,
    });
    expect(text).toContain('không có vi phạm nào');
    expect(text).not.toContain('(0 lần)');
    expect(text).not.toContain('tránh 0 lệnh'); // không nói vô nghĩa khi prevented = 0
  });

  it('bộ 3: tuần không có lệnh nào', () => {
    const text = generateWeeklyAudit({
      totalTrades: 0,
      followedPlanPercent: 0,
      topViolation: null,
      badTradesPrevented: 0,
      weekPnl: 0,
    });
    expect(text).toContain('chưa có lệnh nào');
  });

  it('bộ 4: PnL âm — không nói câu lạc quan giả tạo, vẫn nhắc phân biệt chiến lược/hành vi', () => {
    const text = generateWeeklyAudit({
      totalTrades: 8,
      followedPlanPercent: 50,
      topViolation: { type: 'revenge_trading', count: 1 },
      badTradesPrevented: 1,
      weekPnl: -200,
    });
    expect(text).toContain('-$200.00');
    expect(text).toContain('do chiến lược hay do hành vi');
    expect(text).toContain('revenge trade (1 lần)');
  });

  it('bộ 5: topViolation count = 1 → dùng số ít "(1 lần)"', () => {
    const text = generateWeeklyAudit({
      totalTrades: 3,
      followedPlanPercent: 67,
      topViolation: { type: 'overconfidence_size', count: 1 },
      badTradesPrevented: 2,
      weekPnl: 30,
    });
    expect(text).toContain('vào lệnh quá khối lượng (1 lần)');
    expect(text).toContain('tránh 2 lệnh vi phạm');
  });

  it('bộ 6: prevented > 0 nhưng không vi phạm — cả 2 câu đều xuất hiện, không lặp', () => {
    const text = generateWeeklyAudit({
      totalTrades: 12,
      followedPlanPercent: 92,
      topViolation: null,
      badTradesPrevented: 4,
      weekPnl: 320,
    });
    expect(text).toContain('không có vi phạm nào');
    expect(text).toContain('tránh 4 lệnh vi phạm');
    expect(text).toContain('+$320.00');
  });

  it('không dùng LLM: hàm là thuần (pure) — cùng input cho cùng output', () => {
    const input = {
      totalTrades: 6,
      followedPlanPercent: 83,
      topViolation: { type: 'martingale_negative', count: 1 },
      badTradesPrevented: 2,
      weekPnl: 45,
    };
    expect(generateWeeklyAudit(input)).toBe(generateWeeklyAudit(input));
  });
});
