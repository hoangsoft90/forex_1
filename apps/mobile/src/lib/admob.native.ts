/**
 * admob.native.ts — AdMob wrapper (native, Android/iOS).
 *
 * Dùng `react-native-google-mobile-ads` (Expo không còn hỗ trợ AdMob out-of-box,
 * `expo-ads-admob` đã deprecated). Package này cần dev build — KHÔNG chạy Expo Go.
 *
 * Cấu hình: xem `src/lib/ads-config.ts` — nơi duy nhất để đổi TEST_ADS,
 * test/prod ad unit IDs, test device IDs.
 *
 * ⚠️ Test device registration (tránh AdMob giới hạn tài khoản):
 *   - Ở chế độ TEST_ADS=true: ad unit là test → an toàn tuyệt đối.
 *   - Khi TEST_ADS=false (ID thật): bắt buộc đăng ký device qua `TEST_DEVICE_IDS`
 *     trong ads-config.ts (lấy ID từ log sau lần chạy đầu tiên).
 */

import {
  AdEventType,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import i18n from '@/i18n';
import { getAdUnitId, isAdmobConfigured, TEST_ADS, TEST_DEVICE_IDS } from '@/lib/ads-config';

/**
 * Khởi tạo AdMob + đăng ký test device (gọi 1 lần lúc app start).
 * Khi TEST_ADS=false và có TEST_DEVICE_IDS → các device đó luôn nhận test ads.
 */
export function initAdMob(): void {
  try {
    MobileAds().setRequestConfiguration({
      testDeviceIdentifiers: TEST_DEVICE_IDS,
    });
  } catch {
    // Native module chưa sẵn sàng (Expo Go / missing native) — bỏ qua, showRewardedAd sẽ fail-open.
    console.warn('[ads] MobileAds() init failed — native module may not be available.');
  }
  if (TEST_ADS) {
    console.log('[ads] Đang chạy chế độ TEST_ADS — ads hiện "Test ad", không tính doanh thu.');
  } else {
    // Khi dùng ID thật: chạy app 1 lần, AdMob in log dòng
    // "Use RequestConfiguration.Builder.setTestDeviceIds([\"<ID>\"])"
    // → copy ID đó vào TEST_DEVICE_IDS trong ads-config.ts để tránh bị khóa tài khoản.
    console.log('[ads] Chế độ PRODUCTION — đảm bảo device đã đăng ký trong TEST_DEVICE_IDS.');
  }
}

export type RewardResult = {
  rewarded: boolean;
  /** null nếu ad load fail hoặc user đóng sớm */
  error?: string | null;
};

/**
 * Hiển thị rewarded ad. Resolve `{rewarded: true}` khi user xem hết ad
 * (callback onRewarded). Resolve `{rewarded: false}` nếu load fail / đóng sớm.
 */
export async function showRewardedAd(): Promise<RewardResult> {
  const unitId = getAdUnitId('rewarded');
  if (!unitId || !isAdmobConfigured()) {
    return { rewarded: false, error: i18n.t('admob.notConfigured') };
  }

  // Wrap toàn bộ trong try-catch: native module (TurboModule) có thể
  // chưa sẵn sàng (Expo Go, build thiếu config) → ném TypeError thay vì crash.
  try {
    const rewardedAd = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    return new Promise<RewardResult>((resolve) => {
      // Timer an toàn: ad quá lâu không load → không treo app.
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ rewarded: false, error: i18n.t('admob.timeout') });
      }, 30_000);

      const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewardedAd.show();
      });
      const unsubEarned = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          cleanup();
          resolve({ rewarded: true });
        },
      );
      const unsubClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        resolve({ rewarded: false, error: i18n.t('admob.closedEarly') });
      });
      const unsubError = rewardedAd.addAdEventListener(AdEventType.ERROR, (err) => {
        cleanup();
        resolve({ rewarded: false, error: i18n.t('admob.loadError', { message: err.message }) });
      });

      function cleanup() {
        clearTimeout(timeout);
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
      }

      rewardedAd.load();
    });
  } catch (e) {
    // Native module chưa sẵn sàng — trả về lỗi rõ ràng, KHÔNG crash app.
    console.warn('[ads] showRewardedAd failed — native module error:', e);
    return { rewarded: false, error: i18n.t('admob.notConfigured') };
  }
}
