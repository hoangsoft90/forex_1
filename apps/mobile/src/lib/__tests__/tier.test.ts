import { formatHoursLeft, getProStatus, isPro, proExpiry24h } from '../tier';

describe('isPro', () => {
  it('free tier → không Pro', () => {
    expect(isPro('free', null)).toBe(false);
    expect(isPro('free', new Date(Date.now() + 3600_000).toISOString())).toBe(false);
  });

  it('pro tier + còn hạn → Pro', () => {
    expect(isPro('pro', new Date(Date.now() + 3600_000).toISOString())).toBe(true);
  });

  it('pro tier nhưng hết hạn → không Pro', () => {
    expect(isPro('pro', new Date(Date.now() - 1000).toISOString())).toBe(false);
  });

  it('pro tier nhưng thiếu expiresAt → không Pro (không crash)', () => {
    expect(isPro('pro', null)).toBe(false);
    expect(isPro('pro', undefined)).toBe(false);
  });

  it('tier null/undefined → không Pro', () => {
    expect(isPro(null, null)).toBe(false);
    expect(isPro(undefined, undefined)).toBe(false);
  });
});

describe('proExpiry24h', () => {
  it('mở Pro từ mốc cố định → đúng +24h', () => {
    const from = new Date('2026-08-17T00:00:00.000Z');
    expect(proExpiry24h(from)).toBe('2026-08-18T00:00:00.000Z');
  });
});

describe('getProStatus', () => {
  it('Free → isPro=false, hoursLeft=null', () => {
    const s = getProStatus('free', null);
    expect(s.isPro).toBe(false);
    expect(s.hoursLeft).toBeNull();
  });

  it('Pro còn ~24h → hoursLeft ≈ 24', () => {
    const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();
    const s = getProStatus('pro', expiresAt);
    expect(s.isPro).toBe(true);
    expect(s.hoursLeft).toBeGreaterThan(23.9);
    expect(s.hoursLeft).toBeLessThan(24.1);
  });

  it('Pro hết hạn → isPro=false', () => {
    const s = getProStatus('pro', new Date(Date.now() - 5000).toISOString());
    expect(s.isPro).toBe(false);
  });
});

describe('formatHoursLeft', () => {
  it('null/0 → hết hạn', () => {
    expect(formatHoursLeft(null)).toBe('hết hạn');
    expect(formatHoursLeft(0)).toBe('hết hạn');
  });

  it('dưới 1 giờ → phút', () => {
    expect(formatHoursLeft(0.5)).toBe('30 phút');
  });

  it('trên 1 giờ → giờ + phút', () => {
    expect(formatHoursLeft(24.5)).toBe('24 giờ 30 phút');
  });

  it('đúng giờ chẵn → chỉ giờ', () => {
    expect(formatHoursLeft(3)).toBe('3 giờ');
  });
});
