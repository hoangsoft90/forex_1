/**
 * ad-cooldown.ts — Cooldown giữa 2 lần xem rewarded ad.
 *
 * Mục đích: chống spam xem quảng cáo liên tục (user bấm xem ad 10 lần/ngày
 * để cộng dồn Pro). Sau khi xem hết 1 rewarded ad, phải chờ
 * `AD_REWARD_COOLDOWN_MS` (mặc định 5 phút) mới được xem lần tiếp theo.
 *
 * Lưu trữ: AsyncStorage (persist qua các lần mở app), key `tdos:last_rewarded_at`.
 *
 * ⚠️ Nguyên tắc: cooldown KHÔNG được chặn quyền Pro đã có — chỉ chặn lượt
 * xem ad MỚI. Nếu lưu timestamp thất bại (AsyncStorage lỗi), không chặn
 * user xem ad (fail-open) để tránh phá luồng trải nghiệm.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Khoảng cách tối thiểu giữa 2 lần xem rewarded ad (ms). Mặc định 5 phút. */
export const AD_REWARD_COOLDOWN_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'tdos:last_rewarded_at';

/** Số ms còn phải chờ trước khi được xem ad tiếp theo (0 = sẵn sàng). */
export function getRemainingCooldownMs(
  lastWatchedAt: number | null,
  now: number = Date.now(),
): number {
  if (!lastWatchedAt || !Number.isFinite(lastWatchedAt)) return 0;
  return Math.max(0, lastWatchedAt + AD_REWARD_COOLDOWN_MS - now);
}

/** Còn trong thời gian chờ hay không. */
export function isCooldownActive(
  lastWatchedAt: number | null,
  now: number = Date.now(),
): boolean {
  return getRemainingCooldownMs(lastWatchedAt, now) > 0;
}

/** Format "4:32" (phút:giây) cho UI đếm ngược. */
export function formatCooldown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Đọc timestamp lần xem rewarded gần nhất (null nếu chưa từng xem / lỗi). */
export async function getLastRewardedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = Number(raw);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/** Ghi timestamp lần xem rewarded vừa hoàn tất. Fail-open (không throw). */
export async function recordRewardedAt(now: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // Lỗi lưu cooldown không chặn quyền Pro — bỏ qua.
  }
}
