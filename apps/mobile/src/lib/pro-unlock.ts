/**
 * pro-unlock.ts — Mở Pro 24h qua AdMob rewarded (Phase 2, Module P2-M1).
 *
 * Luồng:
 *   1. showRewardedAd() — user xem hết ad → onRewarded
 *   2. Gọi edge `unlock-pro` — server kiểm tra cooldown 5 phút (đồng hồ SERVER,
 *      chống System Clock Attack — P1-5), upsert `user_profiles` (tier='pro',
 *      expires=now+24h), insert `pro_unlocks` để audit.
 *
 * Cooldown client-side (AsyncStorage) chỉ để hiện feedback/đếm ngược ngay;
 * nguồn chân lý là server — đổi giờ máy không qua được.
 *
 * Không tạo bản ghi `subscriptions` — bảng đó dành cho thanh toán thật
 * (payment_provider check constraint không có 'admob').
 */

import i18n from '@/i18n';
import { supabase } from '@/lib/supabase';
import {
  formatCooldown,
  getLastRewardedAt,
  getRemainingCooldownMs,
  recordRewardedAt,
} from '@/lib/ad-cooldown';
import { showRewardedAd } from '@/lib/admob';

export type UnlockProResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: string };

/**
 * Chạy toàn bộ luồng: xem ad → ghi Pro 24h. Trả về kết quả cho UI.
 *
 * Cooldown: sau mỗi lần xem hết ad phải chờ `AD_REWARD_COOLDOWN_MS`
 * (5 phút) mới xem lần tiếp theo — chống spam cộng dồn Pro liên tục.
 */
export async function unlockProViaAd(): Promise<UnlockProResult> {
  // Bước 0: kiểm tra cooldown trước khi hiện ad.
  const lastWatchedAt = await getLastRewardedAt();
  const remaining = getRemainingCooldownMs(lastWatchedAt);
  if (remaining > 0) {
    return {
      ok: false,
      reason: i18n.t('proUnlock.cooldown', { time: formatCooldown(remaining) }),
    };
  }

  const ad = await showRewardedAd();
  if (!ad.rewarded) {
    return { ok: false, reason: ad.error ?? i18n.t('proUnlock.notCompleted') };
  }

  // Server-side grant: cooldown thật + upsert profile + insert pro_unlocks.
  // KHÔNG recordRewardedAt() ở đây — chỉ ghi SAU khi server confirm thành công
  // để tránh trường hợp server fail → user bị cooldown 5 phút mà không có Pro.
  const { data, error: invokeErr } = await supabase.functions.invoke('unlock-pro', {});
  if (invokeErr) {
    // invokeErr.functionsHttpError chứa response body lỗi (VD 429 cooldown từ server).
    const body = invokeErr.context?.response
      ? await invokeErr.context.response.json().catch(() => null)
      : null;
    if (body?.ok === false && body.reason === 'cooldown' && typeof body.remainingMs === 'number') {
      return {
        ok: false,
        reason: i18n.t('proUnlock.cooldown', {
          time: formatCooldown(body.remainingMs),
        }),
      };
    }
    return { ok: false, reason: i18n.t('proUnlock.saveError', { message: invokeErr.message }) };
  }
  const result = data as { ok?: boolean; expiresAt?: string; error?: string };
  if (result?.ok !== true || !result.expiresAt) {
    return { ok: false, reason: result?.error ?? i18n.t('proUnlock.saveError', { message: 'unknown' }) };
  }

  // Server confirm thành công → giờ mới ghi client-side cooldown.
  await recordRewardedAt();

  return { ok: true, expiresAt: result.expiresAt };
}
