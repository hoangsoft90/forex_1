import {
  computeInstantAudit,
  formatInstantAudit,
  INSTANT_AUDIT_ENABLED_FALLBACK,
  listWeaknesses,
} from '@/lib/instant-audit';

describe('Onboarding Instant Audit (Module 3)', () => {
  it('GATE CỨNG: fallback flag mặc định false — không tự bật sớm (giá trị thật đọc từ feature_flags)', () => {
    expect(INSTANT_AUDIT_ENABLED_FALLBACK).toBe(false);
  });

  describe('Fallback 3.3 — listWeaknesses từ weakness_profile quiz', () => {
    it('liệt kê đúng các điểm user tự nhận (true)', () => {
      const profile = { revenge_trading: true, moves_sl: false, overtrades: true };
      const list = listWeaknesses(profile);
      expect(list.map((w) => w.key)).toEqual(['revenge_trading', 'overtrades']);
      expect(list[0].label).toBe('Revenge trading');
    });

    it('profile null/trống → danh sách rỗng (không lỗi)', () => {
      expect(listWeaknesses(null)).toEqual([]);
      expect(listWeaknesses({})).toEqual([]);
      expect(listWeaknesses({ moves_sl: false })).toEqual([]);
    });

    it('key lạ không có label → fallback bằng chính key', () => {
      const list = listWeaknesses({ unknown_key: true });
      expect(list[0].label).toBe('unknown_key');
    });
  });

  describe('Audit 3.2 — chạy Behavior Engine hiện có trên lệnh import', () => {
    const exec = (
      id: string,
      direction: 'buy' | 'sell',
      entry: string,
      exit: string,
      pnl: number,
      lot = 0.1,
    ) => ({
      id,
      direction,
      lot_size: lot,
      actual_risk_percent: null,
      entry_time: entry,
      exit_time: exit,
      pnl_amount: pnl,
    });

    it('detect revenge trade: lệnh trước lỗ + mở ngược chiều <10 phút', () => {
      const executions = [
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', -50),
        exec('b', 'sell', '2026-08-01T09:10:00Z', '2026-08-01T09:30:00Z', -20),
      ];
      const r = computeInstantAudit(executions);
      expect(r.totalTrades).toBe(2);
      expect(r.violations['revenge_trading']?.count).toBe(1);
      // chi phí ước tính = pnl âm của lệnh vi phạm (lệnh b) = $20
      expect(r.violations['revenge_trading']?.estimatedCost).toBeCloseTo(20);
    });

    it('không detect revenge khi lệnh trước không lỗ', () => {
      const executions = [
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', 30),
        exec('b', 'sell', '2026-08-01T09:10:00Z', '2026-08-01T09:30:00Z', -20),
      ];
      const r = computeInstantAudit(executions);
      expect(r.violations['revenge_trading']).toBeUndefined();
    });

    it('detect martingale: tăng lot > 1.8x sau lệnh thua', () => {
      const executions = [
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', -30, 0.1),
        exec('b', 'buy', '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', 10, 0.5),
      ];
      const r = computeInstantAudit(executions);
      expect(r.violations['martingale_negative']?.count).toBe(1);
    });

    it('sort theo entry_time (không theo thứ tự nhập)', () => {
      // Truyền ngược thứ tự thời gian: lệnh lỗ (cũ) đứng sau trong mảng
      const executions = [
        exec('b', 'sell', '2026-08-01T09:10:00Z', '2026-08-01T09:30:00Z', -20),
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', -50),
      ];
      const r = computeInstantAudit(executions);
      // vẫn phải detect revenge (a lỗ → b ngược chiều trong 10')
      expect(r.violations['revenge_trading']?.count).toBe(1);
    });

    it('format câu đúng dạng spec', () => {
      const r = computeInstantAudit([
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', -50),
        exec('b', 'sell', '2026-08-01T09:10:00Z', '2026-08-01T09:30:00Z', -20),
      ]);
      const s = formatInstantAudit(r);
      expect(s).toContain('Trong 2 lệnh gần đây');
      expect(s).toContain('revenge trade 1 lần');
      expect(s).toContain('$20.00');
    });

    it('không vi phạm → thông báo tích cực', () => {
      const r = computeInstantAudit([
        exec('a', 'buy', '2026-08-01T09:00:00Z', '2026-08-01T09:05:00Z', 30),
      ]);
      expect(r.violations).toEqual({});
      expect(formatInstantAudit(r)).toContain('chưa phát hiện vi phạm');
    });
  });
});
