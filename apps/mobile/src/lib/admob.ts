/**
 * admob.ts — WEB STUB của AdMob wrapper.
 *
 * `react-native-google-mobile-ads` là native-only → KHÔNG import được trên web
 * (Metro vỡ). Bản native thật nằm ở `admob.native.ts` (Metro tự chọn file
 * platform-specific khi build Android/iOS). Bản này chỉ để web bundle pass
 * + giữ type contract cho TypeScript.
 */

import i18n from '@/i18n';

export type RewardResult = {
  rewarded: boolean;
  error?: string | null;
};

export function isAdmobConfigured(): boolean {
  return false;
}

/** No-op trên web (SDK AdMob không chạy web). */
export function initAdMob(): void {}

export async function showRewardedAd(): Promise<RewardResult> {
  return { rewarded: false, error: i18n.t('admob.webUnsupported') };
}
