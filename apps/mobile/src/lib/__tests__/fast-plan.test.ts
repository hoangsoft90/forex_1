import { missingOptionalDetails, validateFastPlan } from '@/lib/fast-plan';

describe('Fast Plan (Module 1)', () => {
  const base = { symbol: 'EURUSD', direction: 'buy' as const };

  describe('validateFastPlan — 5 trường bắt buộc', () => {
    it('ok khi đủ 5 trường hợp lệ', () => {
      expect(validateFastPlan({ ...base, entry: '1.1000', sl: '1.0950', riskPercent: '1' })).toEqual({ ok: true });
    });

    it('chặn cứng khi thiếu SL (không phải cảnh báo mềm)', () => {
      const r = validateFastPlan({ ...base, entry: '1.1000', sl: '', riskPercent: '1' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/SL là bắt buộc/i);
    });

    it('chặn khi SL không phải số > 0', () => {
      expect(validateFastPlan({ ...base, entry: '1.1000', sl: '0', riskPercent: '1' }).ok).toBe(false);
      expect(validateFastPlan({ ...base, entry: '1.1000', sl: '-0.5', riskPercent: '1' }).ok).toBe(false);
    });

    it('chặn khi entry/sl/risk rỗng hoặc NaN', () => {
      expect(validateFastPlan({ ...base, entry: '', sl: '1.0950', riskPercent: '1' }).ok).toBe(false);
      expect(validateFastPlan({ ...base, entry: '1.1000', sl: '1.0950', riskPercent: '' }).ok).toBe(false);
      expect(validateFastPlan({ ...base, entry: 'abc', sl: '1.0950', riskPercent: '1' }).ok).toBe(false);
    });

    it('chặn khi entry === sl (khoảng cách 0)', () => {
      expect(validateFastPlan({ ...base, entry: '1.1000', sl: '1.1000', riskPercent: '1' }).ok).toBe(false);
    });

    it('chặn khi thiếu symbol', () => {
      expect(validateFastPlan({ ...base, symbol: '', entry: '1.1000', sl: '1.0950', riskPercent: '1' }).ok).toBe(false);
    });
  });

  describe('missingOptionalDetails — nhắc nhẹ không chặn', () => {
    it('liệt kê đủ khi thiếu cả 3', () => {
      expect(missingOptionalDetails({ thesis: null, setup_tag: null, confidence_level: null })).toEqual([
        'Thesis',
        'Setup tag',
        'Confidence',
      ]);
    });

    it('trả về rỗng khi đủ hết', () => {
      expect(
        missingOptionalDetails({ thesis: 'x', setup_tag: 'breakout', confidence_level: 3 }),
      ).toEqual([]);
    });

    it('chỉ liệt kê cái thiếu', () => {
      expect(
        missingOptionalDetails({ thesis: '', setup_tag: 'breakout', confidence_level: null }),
      ).toEqual(['Thesis', 'Confidence']);
    });
  });
});
