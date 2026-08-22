import { Platform } from 'react-native';

/**
 * ads-config.ts — Cấu hình quảng cáo AdMob (Phase 2, Module P2-M1 mở rộng).
 *
 * Đây là FILE CẤU HÌNH DUY NHẤT cho ads — sửa ở đây, không sửa rải rác.
 *
 * Các chế độ:
 *   - `ENABLE_ADS = false` → TẮT toàn bộ ads (banner, rewarded, interstitial).
 *     App chạy normal, KHÔNG gọi AdMob SDK, KHÔNG hiển thị quảng cáo.
 *   - `ENABLE_ADS = true` + `TEST_ADS = true` → dùng TEST ad unit IDs của Google.
 *     Ad sẽ hiện "Test ad" (watermark), KHÔNG bị AdMob giới hạn tài khoản.
 *   - `ENABLE_ADS = true` + `TEST_ADS = false` → dùng ID THẬT từ AdMob dashboard.
 *     Chỉ dùng khi đã có AdMob account + ad unit thật + device test.
 */

/**
 * Master flag — bật/tắt toàn bộ ads.
 * false = ads tắt hoàn toàn (banner, rewarded, interstitial đều không chạy).
 * true = ads bật (xem TEST_ADS để biết test hay prod).
 */
export const ENABLE_ADS = true;

/**
 * Flag test ads — false khi dùng ad unit thật.
 * Đổi thành true nếu cần quay lại test mode.
 * Chỉ có hiệu lực khi ENABLE_ADS = true.
 */
export const TEST_ADS = false;

/** Test ad unit IDs chính thức của Google (an toàn 100%). */
export const TEST_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

/** Prod ad unit IDs — Hardcoded từ AdMob dashboard (public IDs, không phải secrets). */
const PROD_IDS = {
  android: {
    banner: 'ca-app-pub-6917313063209470/2681961047',
    interstitial: 'ca-app-pub-6917313063209470/5327627069',
    rewarded: 'ca-app-pub-6917313063209470/2079431012',
  },
  ios: {
    // Chưa có iOS ad units — dùng Android IDs làm placeholder
    // TODO: tạo iOS ad units trên AdMob dashboard rồi cập nhật
    banner: 'ca-app-pub-6917313063209470/2681961047',
    interstitial: 'ca-app-pub-6917313063209470/5327627069',
    rewarded: 'ca-app-pub-6917313063209470/2079431012',
  },
};

/**
 * Danh sách device ID được coi là "test device" — khi set qua
 * `mobileAds().setRequestConfiguration({ testDeviceIdentifiers })`,
 * các device này LUÔN nhận ads test kể cả khi dùng ad unit ID thật.
 *
 * Cách lấy device ID: chạy app 1 lần, xem log console — dòng dạng
 *   "Use RequestConfiguration.Builder.setTestDeviceIds([\"ABC123...\"])"
 * Copy chuỗi trong ngoặc kép vào mảng bên dưới.
 */
export const TEST_DEVICE_IDS: string[] = [
  // "ABC123-DEVICE-ID-CUA-BAN",
];

/** Chọn đúng ad unit ID theo nền tảng + chế độ test/prod. */
export function getAdUnitId(kind: 'banner' | 'interstitial' | 'rewarded'): string | null {
  const isIOS = typeof Platform !== 'undefined' && Platform.OS === 'ios';
  if (TEST_ADS) {
    return isIOS ? TEST_IDS.ios[kind] : TEST_IDS.android[kind];
  }
  const ids = isIOS ? PROD_IDS.ios : PROD_IDS.android;
  return ids[kind] || null;
}

/**
 * Kiểm tra AdMob đã được cấu hình chưa.
 * Trả false nếu ENABLE_ADS=false (tắt hoàn toàn).
 * Trả true nếu TEST_ADS=true (test IDs luôn có sẵn).
 */
export function isAdmobConfigured(): boolean {
  if (!ENABLE_ADS) return false;
  return TEST_ADS || Boolean(PROD_IDS.android.banner || PROD_IDS.android.rewarded);
}
