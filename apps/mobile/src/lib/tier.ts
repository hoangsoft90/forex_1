/**
 * tier.ts — Tier gating Free/Pro (Phase 2).
 *
 * Pro có thể đến từ:
 * - Thanh toán thật (bảng `subscriptions` — chưa có ở Phase 2)
 * - AdMob rewarded → user_profiles.subscription_tier='pro' + subscription_expires_at (Phase 2)
 *
 * Nguyên tắc: `isPro()` chỉ tin vào `subscription_expires_at > now()`.
 * Nếu tier='pro' nhưng hết hạn → coi như Free (không cần job xóa, check lúc đọc).
 */

export type ProStatus = {
  isPro: boolean;
  /** ISO string hoặc null */
  expiresAt: string | null;
  /** Còn bao nhiêu giờ (số thực) hoặc null nếu không Pro */
  hoursLeft: number | null;
};

/**
 * Kiểm tra user có đang Pro hay không.
 * @param tier  user_profiles.subscription_tier ('free' | 'pro')
 * @param expiresAt user_profiles.subscription_expires_at (ISO string | null)
 */
export function isPro(tier?: string | null, expiresAt?: string | null): boolean {
  return tier === 'pro' && expiresAt != null && new Date(expiresAt).getTime() > Date.now();
}

/**
 * Trả về trạng thái Pro đầy đủ (kèm giờ còn lại để UI hiển thị).
 */
export function getProStatus(tier?: string | null, expiresAt?: string | null): ProStatus {
  const pro = isPro(tier, expiresAt);
  if (!pro) {
    return { isPro: false, expiresAt: expiresAt ?? null, hoursLeft: null };
  }
  const msLeft = new Date(expiresAt!).getTime() - Date.now();
  return { isPro: true, expiresAt: expiresAt ?? null, hoursLeft: msLeft / 3_600_000 };
}

/**
 * Sinh thời điểm hết hạn khi mở Pro 24h (tính từ thời điểm hiện tại).
 */
export function proExpiry24h(from: Date = new Date()): string {
  const d = new Date(from.getTime() + 24 * 3_600_000);
  return d.toISOString();
}

/** Format "còn X giờ Y phút" cho UI. */
export function formatHoursLeft(hours: number | null): string {
  if (hours == null || hours <= 0) return 'hết hạn';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h <= 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}
