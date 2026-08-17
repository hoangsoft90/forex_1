/**
 * pro-unlock.ts — Mở Pro 24h qua AdMob rewarded (Phase 2, Module P2-M1).
 *
 * Luồng:
 *   1. showRewardedAd() — user xem hết ad → onRewarded
 *   2. Nếu rewarded: upsert `user_profiles` (tier='pro', expires=now+24h)
 *   3. Insert `pro_unlocks` (method='admob_rewarded') để audit
 *
 * Không tạo bản ghi `subscriptions` — bảng đó dành cho thanh toán thật
 * (payment_provider check constraint không có 'admob').
 */

import { supabase } from '@/lib/supabase';
import { showRewardedAd } from '@/lib/admob';
import { proExpiry24h } from '@/lib/tier';

export type UnlockProResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: string };

/**
 * Chạy toàn bộ luồng: xem ad → ghi Pro 24h. Trả về kết quả cho UI.
 */
export async function unlockProViaAd(): Promise<UnlockProResult> {
  const ad = await showRewardedAd();
  if (!ad.rewarded) {
    return { ok: false, reason: ad.error ?? 'Chưa xem hết quảng cáo.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'Chưa đăng nhập.' };
  }

  const expiresAt = proExpiry24h();

  // Upsert profile: tier='pro' + hạn 24h (chỉ tăng hạn nếu hiện chưa Pro hoặc sắp hết)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const currentExpiry = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at as string).getTime()
    : 0;
  const newExpiry = new Date(expiresAt).getTime();
  const finalExpiry =
    profile?.subscription_tier === 'pro' && currentExpiry > newExpiry
      ? (profile.subscription_expires_at as string)
      : expiresAt;

  const { error: upsertErr } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      subscription_tier: 'pro',
      subscription_expires_at: finalExpiry,
    },
    { onConflict: 'id' },
  );
  if (upsertErr) {
    return { ok: false, reason: `Lỗi lưu Pro: ${upsertErr.message}` };
  }

  const { error: unlockErr } = await supabase.from('pro_unlocks').insert({
    user_id: user.id,
    granted_until: finalExpiry,
    method: 'admob_rewarded',
  });
  if (unlockErr) {
    // Pro đã được ghi — chỉ audit thất bại, không rollback quyền Pro.
    console.warn('pro_unlocks insert thất bại (không ảnh hưởng quyền Pro):', unlockErr.message);
  }

  return { ok: true, expiresAt: finalExpiry };
}
