import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AD_REWARD_COOLDOWN_MS,
  formatCooldown,
  getLastRewardedAt,
  getRemainingCooldownMs,
  isCooldownActive,
  recordRewardedAt,
} from '../ad-cooldown';

// Mock AsyncStorage bằng in-memory store (tránh require() → lint clean,
// không phụ thuộc official mock của package).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
  };
});

const FIVE_MIN = AD_REWARD_COOLDOWN_MS;
const NOW = 1_800_000_000_000; // mốc giả định cố định

describe('getRemainingCooldownMs', () => {
  it('chưa từng xem ad (null) → 0, sẵn sàng xem', () => {
    expect(getRemainingCooldownMs(null, NOW)).toBe(0);
    expect(getRemainingCooldownMs(undefined as unknown as null, NOW)).toBe(0);
  });

  it('timestamp không hợp lệ → 0 (không crash)', () => {
    expect(getRemainingCooldownMs(NaN, NOW)).toBe(0);
  });

  it('vừa xem xong → còn đúng 5 phút chờ', () => {
    expect(getRemainingCooldownMs(NOW, NOW)).toBe(FIVE_MIN);
  });

  it('xem được 3 phút trước → còn 2 phút chờ', () => {
    expect(getRemainingCooldownMs(NOW - 3 * 60_000, NOW)).toBeCloseTo(2 * 60_000);
  });

  it('xem được 5 phút trước → hết cooldown (0)', () => {
    expect(getRemainingCooldownMs(NOW - FIVE_MIN, NOW)).toBe(0);
  });

  it('xem được 10 phút trước → 0 (không âm)', () => {
    expect(getRemainingCooldownMs(NOW - 10 * 60_000, NOW)).toBe(0);
  });
});

describe('isCooldownActive', () => {
  it('chưa xem → không active', () => {
    expect(isCooldownActive(null, NOW)).toBe(false);
  });

  it('trong 5 phút → active', () => {
    expect(isCooldownActive(NOW - 60_000, NOW)).toBe(true);
  });

  it('đúng mốc 5 phút → hết active', () => {
    expect(isCooldownActive(NOW - FIVE_MIN, NOW)).toBe(false);
  });
});

describe('formatCooldown', () => {
  it('0 → "0:00"', () => {
    expect(formatCooldown(0)).toBe('0:00');
  });

  it('còn đúng 5 phút → "5:00"', () => {
    expect(formatCooldown(FIVE_MIN)).toBe('5:00');
  });

  it('còn 4 phút 32 giây → "4:32"', () => {
    expect(formatCooldown(4 * 60_000 + 32_000)).toBe('4:32');
  });

  it('còn 59 giây → "0:59" (pad 2 số)', () => {
    expect(formatCooldown(59_000)).toBe('0:59');
  });

  it('âm (quá hạn) → "0:00" không âm', () => {
    expect(formatCooldown(-5000)).toBe('0:00');
  });
});

describe('AsyncStorage persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('chưa có dữ liệu → getLastRewardedAt() = null', async () => {
    expect(await getLastRewardedAt()).toBeNull();
  });

  it('recordRewardedAt() rồi đọc lại → đúng timestamp', async () => {
    await recordRewardedAt(NOW);
    expect(await getLastRewardedAt()).toBe(NOW);
  });

  it('record rồi cooldown active — đọc qua getRemainingCooldownMs', async () => {
    await recordRewardedAt(NOW - 60_000); // xem 1 phút trước
    const last = await getLastRewardedAt();
    expect(getRemainingCooldownMs(last, NOW)).toBeCloseTo(FIVE_MIN - 60_000);
    expect(isCooldownActive(last, NOW)).toBe(true);
  });

  it('record 2 lần → lần sau ghi đè (timestamp mới nhất)', async () => {
    await recordRewardedAt(NOW - FIVE_MIN);
    await recordRewardedAt(NOW);
    expect(await getLastRewardedAt()).toBe(NOW);
  });
});
